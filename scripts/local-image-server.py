"""Private, loopback-only image generation service for After Now's image canvas."""

from __future__ import annotations

import json
import os
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8765
MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"
DIMENSIONS = {
    "16:9": (1024, 576), "9:16": (576, 1024), "4:3": (1024, 768),
    "3:4": (768, 1024), "1:1": (768, 768), "3:2": (960, 640), "2:3": (640, 960),
}
STYLE_HINTS = {
    "after": ", experimental editorial visual, vivid acid green and cobalt blue accents, sculptural forms, minimal art direction, no text",
    "photo": ", cinematic photography, natural light, detailed textures",
    "original": "",
}
PIPELINE = None
MODEL_ERROR = None
GENERATION_LOCK = threading.Lock()


def load_pipeline():
    global PIPELINE, MODEL_ERROR
    if PIPELINE is not None:
        return PIPELINE
    if MODEL_ERROR:
        raise RuntimeError(MODEL_ERROR)
    try:
        import torch
        from diffusers import Flux2KleinPipeline

        if not torch.cuda.is_available():
            raise RuntimeError("没有检测到可用的 NVIDIA CUDA 显卡；请确认已安装 NVIDIA 驱动和 CUDA 版 PyTorch。")
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        pipeline = Flux2KleinPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
        pipeline.enable_model_cpu_offload(device="cuda")
        PIPELINE = pipeline
        return PIPELINE
    except Exception as error:
        MODEL_ERROR = str(error)
        raise


class Handler(BaseHTTPRequestHandler):
    server_version = "AfterNowLocalImage/1.0"

    def send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path != "/health":
            self.send_json(404, {"error": "Not found"})
            return
        self.send_json(200, {
            "ok": True,
            "model": MODEL_ID,
            "model_loaded": PIPELINE is not None,
            "model_error": MODEL_ERROR,
            "cuda_available": self.cuda_available(),
        })

    @staticmethod
    def cuda_available():
        try:
            import torch
            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def do_POST(self):
        if self.path != "/generate":
            self.send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 4000:
                self.send_json(400, {"error": "请求为空或超出长度限制。"})
                return
            body = json.loads(self.rfile.read(length))
            prompt = body.get("prompt")
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1500:
                self.send_json(400, {"error": "请输入 1–1500 字的画面描述。"})
                return
            width, height = DIMENSIONS.get(body.get("ratio"), DIMENSIONS["16:9"])
            prompt = prompt.strip() + STYLE_HINTS.get(body.get("style"), "")

            with GENERATION_LOCK:
                pipeline = load_pipeline()
                image = pipeline(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=4,
                    guidance_scale=1.0,
                ).images[0]

            output = BytesIO()
            image.save(output, format="PNG", optimize=True)
            payload = output.getvalue()
            data_root = Path(os.environ.get("AFTER_NOW_LOCAL_DATA", Path(__file__).parent.parent / ".local-image-runtime"))
            output_dir = data_root / "outputs"
            output_dir.mkdir(parents=True, exist_ok=True)
            image_id = str(uuid.uuid4())
            (output_dir / f"{image_id}.png").write_bytes(payload)
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("X-Canvas-Image-Id", image_id)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
        except Exception as error:
            print(f"生成失败：{error}", flush=True)
            self.send_json(503, {"error": f"本地模型尚未就绪或生成失败：{error}"})

    def log_message(self, format, *args):
        print("[本地生图] " + format % args, flush=True)


if __name__ == "__main__":
    os.environ.setdefault("HF_HOME", os.path.join(os.path.dirname(__file__), "..", ".local-image-runtime", "cache"))
    print(f"After Now 本地生图服务：http://{HOST}:{PORT}", flush=True)
    print(f"模型：{MODEL_ID}（首次生成会下载模型文件）", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
