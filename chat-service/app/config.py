from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    catalog_service_url: str = "http://localhost:8082"
    mongodb_uri: str = "mongodb://localhost:27017/chat_db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"
    gemini_max_iterations: int = 4
    gemini_temperature: float = 0.4
    category_refresh_minutes: int = 30


settings = Settings()
