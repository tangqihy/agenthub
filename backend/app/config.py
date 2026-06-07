from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    storage_backend: str = "sqlite"
    database_path: str = "./data/agenthub.db"
    database_url: str = "postgresql://agenthub:agenthub@localhost:5432/agenthub"
    hermes_data_dir: str = "./fixtures/hermes"
    sync_interval_seconds: int = 5
    cron_mock: bool = True
    hermes_bin: str = "hermes"
    api_bearer_token: str = ""

    # OpenAI-compatible chat runtime. Keep provider details in environment.
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""


settings = Settings()
