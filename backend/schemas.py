from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(value) > 64:
            raise ValueError("Password must be at most 64 characters.")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long. Please use 64 characters or less.")
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must include at least one letter and one number.")
        return value


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class LearningItemCreate(BaseModel):
    type: str
    content: str
    example: Optional[str] = None
    tags: Optional[List[str]] = None


class LearningItemResponse(BaseModel):
    id: int
    type: str
    content: str
    example: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    seen_count: int
    
    class Config:
        from_attributes = True


class ReviewItemCreate(BaseModel):
    item_id: int
    result: str  # correct, incorrect, partial
    score: Optional[float] = None


class ReviewSessionCreate(BaseModel):
    mode: str  # flashcard, cloze, listening, speaking, writing
    items: List[ReviewItemCreate]


class ReviewSessionResponse(BaseModel):
    id: int
    date: datetime
    mode: str
    score: Optional[float]
    
    class Config:
        from_attributes = True


class TextCorrectionRequest(BaseModel):
    text: str
    context: Optional[str] = ""


class TextCorrectionResponse(BaseModel):
    corrections: List[dict]
    explanations: List[str]
    score: float
    tags: List[str]


class SpeakingScoreResponse(BaseModel):
    transcript: str
    corrections: List[dict]
    score: float
    pronunciation_issues: List[str]


class YesterdayReviewResponse(BaseModel):
    items: List[LearningItemResponse]
    count: int


class TranslationRequest(BaseModel):
    text: str
    source_lang: Optional[str] = "English"
    target_lang: Optional[str] = "Chinese"


class TranslationResponse(BaseModel):
    translation: str
    explanation: Optional[str] = None


class ClassifyTextRequest(BaseModel):
    text: str


class ClassifyTextResponse(BaseModel):
    type: str  # word, phrase, sentence, paragraph
    confidence: float
    explanation: str
