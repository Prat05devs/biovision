"""Offline check of the native FacePhys pipeline logic (mirrors ios/*.swift).

Runs BlazeFace decoding, Kalman box smoothing, area-averaged 36x36 crops, the recurrent
FacePhys model with name-mapped state, and PSD/SQI on a synthetic pulsing face video
built from MediaPipe's public test portrait. Exits non-zero if any rate is off by > 3 BPM.

    uv venv -p 3.11 .venv-facephys
    uv pip install -p .venv-facephys/bin/python ai-edge-litert numpy pillow
    .venv-facephys/bin/python tools/verify_pipeline.py
"""
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "assets"
PORTRAIT_URL = "https://storage.googleapis.com/mediapipe-assets/portrait.jpg"


def interpreter(name):
    model = Interpreter(model_path=str(ASSETS / name))
    model.allocate_tensors()
    return model


def blazeface(rgb, model):
    """Mirror of BlazeFaceDetector.swift."""
    h, w, _ = rgb.shape
    size = 128
    scale = size / max(w, h)
    pad_x, pad_y = (size - w * scale) / 2, (size - h * scale) / 2
    rows = ((np.arange(size) + 0.5 - pad_y) / scale)
    cols = ((np.arange(size) + 0.5 - pad_x) / scale)
    valid = (rows[:, None] >= 0) & (rows[:, None] < h) & (cols[None, :] >= 0) & (cols[None, :] < w)
    sample = rgb[np.clip(rows, 0, h - 1).astype(int)[:, None], np.clip(cols, 0, w - 1).astype(int)[None, :]]
    tensor = np.where(valid[..., None], sample / 127.5 - 1, -1).astype(np.float32)[None]
    model.set_tensor(model.get_input_details()[0]["index"], tensor)
    model.invoke()
    out = {d["name"]: model.get_tensor(d["index"]) for d in model.get_output_details()}
    regressors, scores = out["regressors"][0], out["classificators"][0, :, 0]
    anchors = [((x + 0.5) / (size // stride), (y + 0.5) / (size // stride))
               for stride, per_cell in ((8, 2), (16, 6))
               for y in range(size // stride) for x in range(size // stride) for _ in range(per_cell)]
    candidates = []
    for i, (ax, ay) in enumerate(anchors):
        score = 1 / (1 + math.exp(-max(-100, min(100, scores[i]))))
        if score < 0.5:
            continue
        cx, cy = regressors[i, 0] / size + ax, regressors[i, 1] / size + ay
        bw, bh = regressors[i, 2] / size, regressors[i, 3] / size
        candidates.append(((cx - bw / 2, cy - bh / 2, bw, bh), score))
    if not candidates:
        return None
    best = max(candidates, key=lambda c: c[1])

    def iou(a, b):
        left, top = max(a[0], b[0]), max(a[1], b[1])
        right, bottom = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
        inter = max(0, right - left) * max(0, bottom - top)
        return inter / (a[2] * a[3] + b[2] * b[3] - inter)

    cluster = [c for c in candidates if iou(c[0], best[0]) > 0.3]
    total = sum(c[1] for c in cluster)
    blended = [sum(c[0][k] * c[1] / total for c in cluster) for k in range(4)]
    return ((blended[0] * size - pad_x) / scale, (blended[1] * size - pad_y) / scale,
            blended[2] * size / scale, blended[3] * size / scale)


class Kalman:
    def __init__(self, value):
        self.x, self.p = value, 1.0

    def update(self, z):
        predicted = self.p + 1e-2
        gain = predicted / (predicted + 0.5)
        self.x += gain * (z - self.x)
        self.p = (1 - gain) * predicted
        return self.x


def area_crop(frame, box):
    """Mirror of FacePhysEngine.writeCrop."""
    bx, by, bw, bh = box
    h, w, _ = frame.shape
    crop = np.zeros((36, 36, 3), np.float32)
    for r in range(36):
        y0 = max(0, min(h - 1, int(by + r * bh / 36)))
        y1 = max(y0 + 1, min(h, int(by + (r + 1) * bh / 36)))
        for c in range(36):
            x0 = max(0, min(w - 1, int(bx + c * bw / 36)))
            x1 = max(x0 + 1, min(w, int(bx + (c + 1) * bw / 36)))
            crop[r, c] = frame[y0:y1, x0:x1].reshape(-1, 3).mean(0) / 255
    return crop


def run(bpm, portrait, seconds=20, fps=30.0):
    image = np.asarray(Image.open(portrait).convert("RGB").resize((540, 675))).astype(np.float32)
    detector = interpreter("blaze_face_short_range.tflite")
    x0, y0, w0, h0 = [int(v) for v in blazeface(image.astype(np.uint8), detector)]
    skin = np.zeros(image.shape[:2], bool)
    skin[y0:y0 + h0, x0:x0 + w0] = True

    rppg = interpreter("model.tflite")
    inputs = {d["name"]: d for d in rppg.get_input_details()}
    outputs = {d["name"]: d for d in rppg.get_output_details()}
    index = json.loads((ASSETS / "state_index.json").read_text())
    blob = np.fromfile(ASSETS / "state.bin", "<f4")
    state = {n: blob[e["offset"]:e["offset"] + e["count"]].reshape(inputs[n]["shape"]) for n, e in index.items()}

    rng = np.random.default_rng(1)
    kalman, raw, ring, dt = None, None, [], 1 / fps
    for f in range(int(fps * seconds)):
        t = f / fps
        pulse = math.sin(2 * math.pi * bpm / 60 * t)
        frame = image.copy()
        frame[skin] *= np.array([1 + 0.004 * pulse, 1 + 0.012 * pulse, 1 + 0.003 * pulse], np.float32)
        frame = np.roll(frame, int(3 * math.sin(t * 0.7)), axis=1)
        frame = np.clip(frame + rng.normal(0, 1.5, frame.shape), 0, 255).astype(np.uint8)
        if raw is None or f % 3 == 0:
            raw = blazeface(frame, detector)
        if kalman is None:
            kalman, box = [Kalman(v) for v in raw], raw
        else:
            box = [k.update(v) for k, v in zip(kalman, raw)]
        rppg.set_tensor(inputs["input"]["index"], area_crop(frame, box)[None, None])
        rppg.set_tensor(inputs["dt"]["index"], np.array([dt], np.float32))
        for name, value in state.items():
            rppg.set_tensor(inputs[name]["index"], value)
        rppg.invoke()
        for name in state:
            state[name] = rppg.get_tensor(outputs[f"Identity_{int(name.split('_')[-1]) + 1}"]["index"]).copy()
        ring = (ring + [float(rppg.get_tensor(outputs["Identity"]["index"])[0, 0])])[-450:]

    window = np.zeros((1, 450), np.float32)
    window[0, 450 - len(ring):] = ring
    psd, sqi = interpreter("psd_model.tflite"), interpreter("sqi_model.tflite")
    for model in (psd, sqi):
        model.set_tensor(model.get_input_details()[0]["index"], window)
        model.invoke()
    rate = float({d["name"]: psd.get_tensor(d["index"]) for d in psd.get_output_details()}["PartitionedCall_1:0"][0, 0])
    quality = float(sqi.get_tensor(sqi.get_output_details()[0]["index"])[0, 0])
    return rate / 30 / dt, quality


if __name__ == "__main__":
    portrait = Path(__file__).with_name("portrait.jpg")
    if not portrait.exists():
        urllib.request.urlretrieve(PORTRAIT_URL, portrait)
    failures = 0
    for bpm in (62, 78, 104):
        hr, quality = run(bpm, portrait)
        ok = abs(hr - bpm) <= 3 and quality >= 0.6
        failures += not ok
        print(f"{'PASS' if ok else 'FAIL'}  true {bpm} bpm -> {hr:.1f} bpm (SQI {quality:.2f})")
    sys.exit(1 if failures else 0)
