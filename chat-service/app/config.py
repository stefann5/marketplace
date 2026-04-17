from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    catalog_service_url: str = "http://localhost:8082"
    mongodb_uri: str = "mongodb://localhost:27017/chat_db"
    groq_api_key: str = ""
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"
    llm_max_iterations: int = 3
    llm_temperature: float = 0.4
    category_refresh_minutes: int = 30
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    reranker_enabled: bool = True
    reranker_top_k: int = 10


settings = Settings()
