from __future__ import annotations

from fastapi import FastAPI

from .routers import health, story

app = FastAPI(
    title="ai-story-engine",
    version="0.1.0",
    description="Génération d'histoires via Ollama (routeur light/heavy).",
)

app.include_router(health.router)
app.include_router(story.router)