from __future__ import annotations

import time
from typing import Any, Dict

from fastapi import APIRouter, Depends

from ..schemas import (
    ModelDecision,
    StoryMeta,
    StoryRequest,
    StoryResponse,
)
from ..security import get_current_user
from ..services.model_router import model_router
from ..services.ollama_client import ollama_client
from ..services.prompt_builder import build_prompt

router = APIRouter(prefix="/story", tags=["story"])


@router.post("/generate", response_model=StoryResponse)
async def generate(
    req: StoryRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> StoryResponse:
    decision: ModelDecision = model_router.route(req.prompt)
    prompt = build_prompt(req.prompt)

    t0 = time.perf_counter()
    result = await ollama_client.generate(
        model=decision.model,
        prompt=prompt,
        max_tokens=req.max_tokens,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)

    return StoryResponse(
        story=result.get("response", ""),
        decision=decision,
        meta=StoryMeta(
            latency_ms=latency_ms,
            prompt_tokens=result.get("prompt_eval_count"),
            eval_count=result.get("eval_count"),
        ),
    )