from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    catalog_service_url: str = "http://localhost:8082"
    mongodb_uri: str = "mongodb://localhost:27017/chat_db"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.together.xyz/v1"
    llm_model: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo"
    llm_max_iterations: int = 3
    llm_temperature: float = 0.4
    category_refresh_minutes: int = 30
    chat_max_products: int = 10
    chat_score_threshold: int = 50


settings = Settings()
