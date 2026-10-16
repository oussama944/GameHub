"""Choisit le modèle Ollama selon la complexité du prompt."""
from __future__ import annotations

from typing import Optional

from ..config import settings
from ..schemas import ModelDecision

HEAVY_KEYWORDS = {
    "chapitre final", "final", "twist", "dramatique", "epique", "épique",
    "long", "complet", "detaille", "détaillé", "complexe",
    "arc narratif", "conclusion", "saga", "scenario entier", "scénario entier",
}


class ModelRouter:
    def __init__(
        self,
        light: Optional[str] = None,
        heavy: Optional[str] = None,
    ) -> None:
        self.light = light or settings.LIGHT_MODEL
        self.heavy = heavy or settings.HEAVY_MODEL

    def route(self, prompt: str) -> ModelDecision:
        text = prompt.lower()
        matches = [k for k in HEAVY_KEYWORDS if k in text]

        if matches:
            return ModelDecision(
                model=self.heavy,
                tier="heavy",
                reason=f"heavy keywords: {', '.join(matches[:3])}",
            )
        if len(prompt) > 400:
            return ModelDecision(
                model=self.heavy,
                tier="heavy",
                reason="prompt long",
            )
        return ModelDecision(
            model=self.light,
            tier="light",
            reason="default fast path",
        )


model_router = ModelRouter()