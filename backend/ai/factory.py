from ai.base import AIProvider
from ai.openai_provider import OpenAIProvider
from ai.anthropic_provider import AnthropicProvider
from config import settings


class AIProviderFactory:
    """Factory to get the configured AI provider"""
    
    _instance: AIProvider = None
    
    @classmethod
    def get(cls) -> AIProvider:
        """Get AI provider based on configuration"""
        if cls._instance is None:
            if settings.AI_PROVIDER == "openai":
                cls._instance = OpenAIProvider()
            elif settings.AI_PROVIDER == "anthropic":
                cls._instance = AnthropicProvider()
            else:
                raise ValueError(f"Unknown AI provider: {settings.AI_PROVIDER}")
        
        return cls._instance
