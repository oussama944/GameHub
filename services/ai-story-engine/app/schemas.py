"""Schémas Pydantic (requêtes / réponses HTTP)."""
from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class StoryRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    max_tokens: Optional[int] = Field(default=None, ge=1, le=4096)


class ModelDecision(BaseModel):
    model: str
    tier: Literal["light", "heavy"]
    reason: str


class StoryMeta(BaseModel):
    latency_ms: int
    prompt_tokens: Optional[int] = None
    eval_count: Optional[int] = None


class StoryResponse(BaseModel):
    story: str
    decision: ModelDecision
    meta: StoryMeta


class HealthResponse(BaseModel):
    status: str
    ollama_reachable: bool
    loaded_models: List[str]
    version: str