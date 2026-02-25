from typing import Dict, List, Any
import openai
from ai.base import AIProvider, AIResponse, Correction, SpeakingResponse
from config import settings


class OpenAIProvider(AIProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
        self.model = settings.OPENAI_MODEL
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
    
    async def correct_text(self, text: str, context: str = "") -> AIResponse:
        """Correct text using GPT-4"""
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
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert English teacher."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        result = eval(response.choices[0].message.content)
        
        return AIResponse(
            corrections=[Correction(**c) for c in result.get("corrections", [])],
            explanations=result.get("explanations", []),
            score=result.get("score", 0),
            tags=result.get("tags", [])
        )
    
    async def score_speaking(self, audio_path: str, target_text: str) -> SpeakingResponse:
        """Transcribe audio using Whisper and score pronunciation"""
        # Transcribe audio
        with open(audio_path, "rb") as audio_file:
            transcript_response = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        transcript = transcript_response
        
        # Score pronunciation by comparing transcript to target
        prompt = f"""Compare the spoken transcript to the target sentence and score pronunciation.

Target: {target_text}
Transcript: {transcript}

Provide JSON with:
1. corrections: array of pronunciation errors {{original, corrected, explanation, category: "pronunciation"}}
2. score: 0-100 (pronunciation accuracy)
3. pronunciation_issues: array of specific issues

Be generous with minor variations but note significant mispronunciations.
"""
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert English pronunciation teacher."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        
        result = eval(response.choices[0].message.content)
        
        return SpeakingResponse(
            transcript=transcript,
            corrections=[Correction(**c) for c in result.get("corrections", [])],
            score=result.get("score", 0),
            pronunciation_issues=result.get("pronunciation_issues", [])
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
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert English teacher creating review materials."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        result = eval(response.choices[0].message.content)
        return result.get("items", [])
