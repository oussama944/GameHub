"""Configuration centralisée (env + .env.local)."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Auth (doit matcher auth-service) ---
    JWT_SECRET: str = "change-me-must-match-auth-service"
    JWT_ALGORITHM: str = "HS256"

    # --- Ollama ---
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_TIMEOUT: float = 120.0

    # --- Modèles ---
    LIGHT_MODEL: str = "qwen2.5:0.5b"
    HEAVY_MODEL: str = "llama3.2:1b"

    APP_VERSION: str = "0.1.0"


settings = Settings()