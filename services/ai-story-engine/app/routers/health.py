from __future__ import annotations

from fastapi import APIRouter

from ..config import settings
from ..schemas import HealthResponse
from ..services.ollama_client import ollama_client

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    try:
        models = await ollama_client.list_models()
        reachable = True
    except Exception:
        models = []
        reachable = False

    return HealthResponse(
        status="ok" if reachable else "degraded",
        ollama_reachable=reachable,
        loaded_models=models,
        version=settings.APP_VERSION,
    )