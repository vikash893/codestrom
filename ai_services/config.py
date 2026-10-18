import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


settings = Settings()