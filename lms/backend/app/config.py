from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LMS Student Portal"
    app_version: str = "0.1.0"
    environment: Literal["development", "production", "test"] = "development"
    database_url: str = "mysql+pymysql://root:change-me@127.0.0.1:3306/lms_db?charset=utf8mb4"
    jwt_secret_key: str = "super-secret-dev-key-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    admin_email: str = ""
    admin_password: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
