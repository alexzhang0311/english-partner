from typing import Dict, List, Any
import anthropic
from ai.base import AIProvider, AIResponse, Correction, SpeakingResponse
from config import settings


class AnthropicProvider(AIProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            base_url=settings.ANTHROPIC_BASE_URL
        )
        self.model = settings.ANTHROPIC_MODEL
    
    async def correct_text(self, text: str, context: str = "") -> AIResponse:
        """Correct text using Claude"""
        prompt = f"""You are an English teacher. Analyze this text and provide corrections.
        
Text: {text}
Context: {context}

Provide a JSON response with:
1. corrections: array of {{original, corrected, explanation, category}}
2. explanations: array of general writing tips
3. score: 0-100 based on quality
4. tags: categories like ["grammar", "vocabulary", "style"]

Only include actual errors in corrections. If text is perfect, return empty corrections array with score 100.
"""
        
        message = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        result = eval(message.content[0].text)
        
        return AIResponse(
            corrections=[Correction(**c) for c in result.get("corrections", [])],
            explanations=result.get("explanations", []),
            score=result.get("score", 0),
            tags=result.get("tags", [])
        )
    
    async def score_speaking(self, audio_path: str, target_text: str) -> SpeakingResponse:
        """
        Note: Anthropic doesn't have native speech-to-text.
        For MVP, we recommend using OpenAI Whisper for transcription,
        then Claude for scoring. This is a hybrid approach.
        """
        # For now, raise NotImplementedError
        # In production, use OpenAI Whisper for transcription + Claude for analysis
        raise NotImplementedError(
            "Anthropic provider doesn't support speech transcription. "
            "Use OpenAI provider for speaking features, or implement hybrid approach."
        )
    
    async def generate_review_items(self, content: str, item_type: str) -> List[Dict[str, Any]]:
        """Generate review items from learning content"""
        prompt = f"""Generate review items for this {item_type}:

Content: {content}

Create engaging review questions/prompts as JSON array:
[
  {{"question": "...", "answer": "...", "hint": "..."}},
  ...
]

Generate 2-3 items that test understanding in different ways.
"""
        
        message = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        result = eval(message.content[0].text)
        return result.get("items", [])
