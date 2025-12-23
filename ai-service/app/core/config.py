from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "AI Email Summarization Service"
    VERSION: str = "1.0.0"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Gemini API Configuration (only needed for summarization, not for embeddings)
    GOOGLE_API_KEY: str = ""  # Optional: only required if using Gemini for summarization
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Local Embedding Configuration
    USE_LOCAL_EMBEDDINGS: bool = True  # Use local sentence-transformers model for embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384  # Dimension of all-MiniLM-L6-v2 embeddings

    # Summarization Configuration
    MAX_SUMMARY_LENGTH: int = 200
    TEMPERATURE: float = 0.3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


settings = Settings()
