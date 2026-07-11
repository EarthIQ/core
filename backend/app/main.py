from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.module_loader import load_modules

app = FastAPI(title="Core App")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}

load_modules(app)