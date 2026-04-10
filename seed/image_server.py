"""
Run this on the GPU server (A100s).
Usage:  python image_server.py --model stabilityai/sdxl-turbo --port 8888
        python image_server.py --model black-forest-labs/FLUX.1-schnell --port 8888

Requires: pip install torch diffusers transformers accelerate fastapi uvicorn pillow
"""

import argparse, io, torch
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel
from diffusers import AutoPipelineForText2Image

app = FastAPI()
pipe = None
model_defaults = {}


class GenerateRequest(BaseModel):
    prompt: str
    num_inference_steps: int | None = None
    guidance_scale: float | None = None
    width: int = 512
    height: int = 512


# known good defaults per model family
MODEL_PRESETS = {
    "sdxl-turbo":    {"num_inference_steps": 4,  "guidance_scale": 0.0},
    "flux":          {"num_inference_steps": 4,  "guidance_scale": 0.0},
    "default":       {"num_inference_steps": 20, "guidance_scale": 7.5},
}


def detect_preset(model_id: str) -> dict:
    model_lower = model_id.lower()
    if "sdxl-turbo" in model_lower:
        return MODEL_PRESETS["sdxl-turbo"]
    if "flux" in model_lower:
        return MODEL_PRESETS["flux"]
    return MODEL_PRESETS["default"]


@app.get("/health")
def health():
    return {"status": "ok", "model": app.state.model_id}


@app.post("/generate")
def generate(req: GenerateRequest):
    steps = req.num_inference_steps or model_defaults["num_inference_steps"]
    guidance = req.guidance_scale if req.guidance_scale is not None else model_defaults["guidance_scale"]

    image = pipe(
        req.prompt,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=req.width,
        height=req.height,
    ).images[0]

    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85, optimize=True)
    return Response(content=buf.getvalue(), media_type="image/jpeg")


def main():
    global pipe, model_defaults

    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="stabilityai/sdxl-turbo", help="HuggingFace model ID")
    parser.add_argument("--device", default="cuda:0", help="CUDA device (e.g. cuda:7)")
    parser.add_argument("--port", type=int, default=8888)
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    app.state.model_id = args.model
    model_defaults = detect_preset(args.model)
    print(f"Loading {args.model} on {args.device}  (defaults: {model_defaults})")

    pipe = AutoPipelineForText2Image.from_pretrained(
        args.model, torch_dtype=torch.float16, variant="fp16"
    ).to(args.device)
    print(f"Model loaded, serving on {args.host}:{args.port}")

    import uvicorn
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
