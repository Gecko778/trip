from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Travel Service API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql+psycopg://trip:trip@postgres:5432/trip"
    redis_url: str = "redis://redis:6379/0"
    minio_endpoint: str = "minio:9000"
    jwt_secret_key: str = "local-dev-change-me-minimum-32-bytes"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    bootstrap_admin_email: str = "admin@trip.local"
    bootstrap_admin_password: str = "ChangeMe123!"
    bootstrap_admin_display_name: str = "System Admin"
    google_oauth_client_id: str = ""
    apple_oauth_client_id: str = ""
    apple_oauth_bundle_id: str = ""
    cors_allow_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
