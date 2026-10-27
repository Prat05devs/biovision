"""Bound public uploads before multipart parsing; never queue unbounded inference."""
from __future__ import annotations

import asyncio
from threading import BoundedSemaphore

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import Settings


class RequestLimitsMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self.settings = settings
        # Process-local. Production intentionally runs one Uvicorn worker.
        self.slots = BoundedSemaphore(settings.max_concurrent_screenings)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def safe_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                ])
                message = {**message, "headers": headers}
            await send(message)

        async def reject(code: int, detail: str) -> None:
            headers = {"Retry-After": "5"} if code == 503 else None
            await JSONResponse({"detail": detail}, status_code=code, headers=headers)(
                scope, receive, safe_send
            )

        if scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, safe_send)
            return
        lengths = [v for k, v in scope["headers"] if k.lower() == b"content-length"]
        if lengths and (len(lengths) != 1 or not lengths[0].isdigit()):
            await reject(400, "Invalid Content-Length.")
            return
        if lengths and int(lengths[0]) > self.settings.max_request_bytes:
            await reject(413, "Request body is too large.")
            return
        if not self.slots.acquire(blocking=False):
            await reject(503, "Screening capacity is busy. Please retry shortly.")
            return
        try:
            # Read at most one bounded request before the multipart parser runs.
            # This also prevents partial oversized uploads leaving parser temp files.
            chunks: list[bytes] = []
            total = 0
            try:
                async with asyncio.timeout(self.settings.upload_timeout_seconds):
                    while True:
                        message = await receive()
                        if message["type"] == "http.disconnect":
                            return
                        chunk = message.get("body", b"")
                        total += len(chunk)
                        if total > self.settings.max_request_bytes:
                            await reject(413, "Request body is too large.")
                            return
                        chunks.append(chunk)
                        if not message.get("more_body", False):
                            break
            except TimeoutError:
                await reject(408, "Upload timed out.")
                return
            if lengths and total != int(lengths[0]):
                await reject(400, "Content-Length does not match the request body.")
                return
            body = b"".join(chunks)
            chunks.clear()
            delivered = False

            async def replay() -> Message:
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return await receive()

            await self.app(scope, replay, safe_send)
        finally:
            self.slots.release()
