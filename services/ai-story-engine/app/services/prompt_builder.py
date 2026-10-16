"""Construit le prompt envoyé à Ollama."""
from __future__ import annotations

SYSTEM_PROMPT = (
    "Tu es un conteur d'histoires immersif pour un jeu vidéo. "
    "Réponds en français, avec un style narratif vivant et cohérent. "
    "Reste concis et évite les digressions hors-sujet."
)


def build_prompt(user_prompt: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"Consigne du joueur : {user_prompt.strip()}\n\n"
        f"Raconte la suite en gardant un style fluide."
    )