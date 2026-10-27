import asyncio
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse
from starlette.types import Message, Receive, Scope, Send

from app.config import load_settings, settings
from app.main import app
from app.security import RequestLimitsMiddleware


def scope_for(path: str = "/v1/screenings/anemia", *, length: bytes | None = None) -> Scope:
    return {
        "type": "http", "method": "POST", "path": path,
        "headers": [] if length is None else [(b"content-length", length)],
    }


def test_body_limit_checks_streamed_bytes_and_exact_boundary() -> None:
    async def exercise(size: int, length: bytes | None) -> tuple[int, bool, int]:
        reached = False
        reads = 0
        messages: list[Message] = []

        async def send(message: Message) -> None:
            messages.append(message)

        async def receive() -> Message:
            nonlocal reads
            reads += 1
            return {"type": "http.request", "body": b"x" * size, "more_body": False}

        async def endpoint(scope: Scope, receive: Receive, send: Send) -> None:
            nonlocal reached
            reached = True
            assert len((await receive())["body"]) == size
            await JSONResponse({"ok": True})(scope, receive, send)

        middleware = RequestLimitsMiddleware(endpoint, replace(settings, max_capture_bytes=1))
        await middleware(scope_for(length=length), receive, send)
        return messages[0]["status"], reached, reads

    limit = 65538
    assert asyncio.run(exercise(limit, None)) == (200, True, 1)
    assert asyncio.run(exercise(limit + 1, None)) == (413, False, 1)
    assert asyncio.run(exercise(limit + 1, str(limit + 1).encode())) == (413, False, 0)
    assert asyncio.run(exercise(3, b"2")) == (400, False, 1)
    assert asyncio.run(exercise(3, b"invalid")) == (400, False, 0)


def test_busy_screening_does_not_queue_or_block_health_and_slot_is_released() -> None:
    async def exercise() -> None:
        entered = asyncio.Event()
        release = asyncio.Event()
        responses: dict[str, list[Message]] = {key: [] for key in ("first", "busy", "health", "retry")}

        async def receive() -> Message:
            return {"type": "http.request", "body": b"", "more_body": False}

        async def endpoint(scope: Scope, receive: Receive, send: Send) -> None:
            if scope["path"] != "/v1/health" and not release.is_set():
                entered.set()
                await release.wait()
            await JSONResponse({"ok": True})(scope, receive, send)

        middleware = RequestLimitsMiddleware(endpoint, replace(settings, max_concurrent_screenings=1))

        async def request(key: str, scope: Scope) -> None:
            async def send(message: Message) -> None:
                responses[key].append(message)
            await middleware(scope, receive, send)

        first = asyncio.create_task(request("first", scope_for()))
        await asyncio.wait_for(entered.wait(), timeout=1)
        await request("busy", scope_for())
        assert responses["busy"][0]["status"] == 503
        assert (b"retry-after", b"5") in responses["busy"][0]["headers"]
        health = {**scope_for("/v1/health"), "method": "GET"}
        await asyncio.wait_for(request("health", health), timeout=1)
        assert responses["health"][0]["status"] == 200
        release.set()
        await first
        await request("retry", scope_for())
        assert responses["retry"][0]["status"] == 200

    asyncio.run(exercise())


def test_upload_has_total_deadline_and_releases_capacity() -> None:
    async def exercise() -> None:
        responses: list[Message] = []

        async def send(message: Message) -> None:
            responses.append(message)

        async def slow_receive() -> Message:
            await asyncio.sleep(1)
            return {"type": "http.request", "body": b""}

        async def endpoint(scope: Scope, receive: Receive, send: Send) -> None:
            pytest.fail("Timed-out body reached the parser")

        middleware = RequestLimitsMiddleware(endpoint, replace(settings, upload_timeout_seconds=0.01))
        await middleware(scope_for(), slow_receive, send)
        assert responses[0]["status"] == 408
        assert middleware.slots.acquire(blocking=False)
        middleware.slots.release()

    asyncio.run(exercise())


def test_health_is_not_cacheable_and_untrusted_host_is_rejected() -> None:
    client = TestClient(app)
    response = client.get("/v1/health")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert client.get("/v1/health", headers={"Host": "attacker.invalid"}).status_code == 400


def test_production_requires_explicit_host_and_https_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BIOVISION_ENV", "production")
    monkeypatch.delenv("BIOVISION_ALLOWED_HOSTS", raising=False)
    with pytest.raises(ValueError, match="Production requires"):
        load_settings()
    monkeypatch.setenv("BIOVISION_ALLOWED_HOSTS", "api.example.com,localhost")
    monkeypatch.setenv("BIOVISION_ALLOWED_ORIGINS", "http://example.com")
    with pytest.raises(ValueError, match="exact HTTPS"):
        load_settings()
    monkeypatch.setenv("BIOVISION_ALLOWED_ORIGINS", "https://app.example.com")
    assert load_settings().allowed_hosts == ("api.example.com", "localhost")
