from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Travel Service API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql+psycopg://trip:trip@postgres:5432/trip"
    redis_url: str = "redis://redis:6379/0"
    minio_endpoint: str = "minio:9000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
