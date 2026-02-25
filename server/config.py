from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_api_key: str
    google_client_id: str = ""
    google_client_secret: str = ""
    google_refresh_token: str = ""
    google_calendar_id: str = "primary"
    default_timezone: str = "America/Toronto"
    frontend_url: str = "http://localhost:3000"

    # Slack integration (optional)
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    # Chrome extension origin (optional — pin to extension ID for prod)
    extension_origin: str = ""

    # LangSmith tracing (auto-activates when LANGCHAIN_TRACING_V2=true)
    langchain_tracing_v2: str = "false"
    langchain_api_key: str = ""
    langchain_project: str = "cadenceai"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
