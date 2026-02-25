from abc import ABC, abstractmethod
from typing import Dict, List, Any
from pydantic import BaseModel


class Correction(BaseModel):
    original: str
    corrected: str
    explanation: str
    category: str  # grammar, vocab, pronunciation, spelling


class AIResponse(BaseModel):
    corrections: List[Correction]
    explanations: List[str]
    score: float  # 0-100
    tags: List[str]


class SpeakingResponse(BaseModel):
    transcript: str
    corrections: List[Correction]
    score: float  # 0-100
    pronunciation_issues: List[str]


class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    @abstractmethod
    async def correct_text(self, text: str, context: str = "") -> AIResponse:
        """Correct text and provide explanations"""
        pass
    
    @abstractmethod
    async def score_speaking(self, audio_path: str, target_text: str) -> SpeakingResponse:
        """Transcribe audio and score pronunciation"""
        pass
    
    @abstractmethod
    async def generate_review_items(self, content: str, item_type: str) -> List[Dict[str, Any]]:
        """Generate review items from content"""
        pass
