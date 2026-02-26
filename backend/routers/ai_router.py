from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas import TextCorrectionRequest, TextCorrectionResponse, SpeakingScoreResponse, TranslationRequest, TranslationResponse
from models import User, Mistake
from dependencies import get_current_user
from ai.factory import AIProviderFactory
from ai.base import Correction
import os
import tempfile

router = APIRouter(prefix="/ai", tags=["AI corrections"])


@router.post("/correct-text", response_model=TextCorrectionResponse)
async def correct_text(
    request: TextCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Correct text using AI and provide explanations"""
    ai_provider = AIProviderFactory.get()
    
    try:
        # Get AI corrections
        result = await ai_provider.correct_text(request.text, request.context)
        
        # Convert corrections to dict format
        corrections_dict = [
            {
                "original": c.original,
                "corrected": c.corrected,
                "explanation": c.explanation,
                "category": c.category
            }
            for c in result.corrections
        ]
        
        return TextCorrectionResponse(
            corrections=corrections_dict,
            explanations=result.explanations,
            score=result.score,
            tags=result.tags
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI correction failed: {str(e)}"
        )


@router.post("/speaking-score", response_model=SpeakingScoreResponse)
async def score_speaking(
    audio: UploadFile = File(...),
    target_text: str = "",
    item_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Score speaking by transcribing audio and comparing to target"""
    ai_provider = AIProviderFactory.get()
    
    # Save uploaded audio to temporary file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
        
        # Get AI scoring
        result = await ai_provider.score_speaking(temp_audio_path, target_text)
        
        # Store mistakes if item_id provided
        if item_id and result.corrections:
            for correction in result.corrections:
                mistake = Mistake(
                    item_id=item_id,
                    original=correction.original,
                    corrected=correction.corrected,
                    explanation=correction.explanation,
                    category=correction.category
                )
                db.add(mistake)
            db.commit()
        
        # Convert corrections to dict
        corrections_dict = [
            {
                "original": c.original,
                "corrected": c.corrected,
                "explanation": c.explanation,
                "category": c.category
            }
            for c in result.corrections
        ]
        
        return SpeakingScoreResponse(
            transcript=result.transcript,
            corrections=corrections_dict,
            score=result.score,
            pronunciation_issues=result.pronunciation_issues
        )
        
    except NotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speaking score failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    current_user: User = Depends(get_current_user)
):
    """Translate text and provide explanation using AI"""
    ai_provider = AIProviderFactory.get()
    
    try:
        from openai import AsyncOpenAI
        from anthropic import AsyncAnthropic
        from config import settings
        
        # Direct API call for better translation control
        if settings.AI_PROVIDER == "openai":
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": f"You are a professional translator. Translate {request.source_lang} to {request.target_lang}."},
                    {"role": "user", "content": f"Translate: {request.text}\n\nProvide only the translation and a brief explanation of meaning/usage in 1-2 sentences."}
                ],
                temperature=0.3
            )
            content = response.choices[0].message.content
        else:
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = await client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=200,
                messages=[
                    {"role": "user", "content": f"Translate this {request.source_lang} to {request.target_lang}: {request.text}\n\nProvide only the translation and a brief explanation of meaning/usage in 1-2 sentences."}
                ],
                temperature=0.3
            )
            content = response.content[0].text
        
        # Parse response - expect format "Translation: ... Explanation: ..."
        lines = content.strip().split('\n')
        translation = lines[0].replace("Translation:", "").replace("翻译:", "").strip() if lines else request.text
        explanation = lines[1].replace("Explanation:", "").replace("说明:", "").strip() if len(lines) > 1 else None
        
        return TranslationResponse(
            translation=translation,
            explanation=explanation
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )
