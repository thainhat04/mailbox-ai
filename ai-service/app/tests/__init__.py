from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    AI_MODEL: str
    DATABASE_URL: str

    class Config: 
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()