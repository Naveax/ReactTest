from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "GPV"
    mongodb_collection: str = "certificates"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    enable_memory_fallback: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
