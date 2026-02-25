from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # AI Provider
    AI_PROVIDER: Literal["openai", "anthropic"] = "openai"
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Anthropic Configuration
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com"
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Duplicate reminder
    DUPLICATE_REMINDER_MESSAGE: str = "You already recorded this before."
    
    class Config:
        env_file = ".env"


settings = Settings()
