from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    learning_items = relationship("LearningItem", back_populates="user")
    review_sessions = relationship("ReviewSession", back_populates="user")


class LearningItem(Base):
    __tablename__ = "learning_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # word, phrase, sentence, etc.
    content = Column(Text, nullable=False)
    normalized_content = Column(String, index=True)  # for duplicate detection
    example = Column(Text)
    tags = Column(JSON)  # grammar, vocab, pronunciation
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    seen_count = Column(Integer, default=1)
    
    user = relationship("User", back_populates="learning_items")
    mistakes = relationship("Mistake", back_populates="item")
    srs_state = relationship("SRSState", back_populates="item", uselist=False)
    review_items = relationship("ReviewItem", back_populates="item")
    
    __table_args__ = (
        Index("ix_user_normalized", "user_id", "normalized_content"),
    )


class ReviewSession(Base):
    __tablename__ = "review_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    mode = Column(String, nullable=False)  # flashcard, cloze, listening, speaking, writing
    score = Column(Float)
    
    user = relationship("User", back_populates="review_sessions")
    review_items = relationship("ReviewItem", back_populates="session")


class ReviewItem(Base):
    __tablename__ = "review_items"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("review_sessions.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("learning_items.id"), nullable=False)
    result = Column(String, nullable=False)  # correct, incorrect, partial
    score = Column(Float)
    
    session = relationship("ReviewSession", back_populates="review_items")
    item = relationship("LearningItem", back_populates="review_items")


class Mistake(Base):
    __tablename__ = "mistakes"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("learning_items.id"), nullable=False)
    original = Column(Text, nullable=False)
    corrected = Column(Text, nullable=False)
    explanation = Column(Text)
    category = Column(String)  # grammar, vocab, pronunciation, spelling
    created_at = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("LearningItem", back_populates="mistakes")


class SRSState(Base):
    __tablename__ = "srs_states"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("learning_items.id"), unique=True, nullable=False)
    interval = Column(Integer, default=1)  # days until next review
    ease = Column(Float, default=2.5)  # ease factor (SM-2)
    repetitions = Column(Integer, default=0)
    next_review = Column(DateTime, default=datetime.utcnow, index=True)
    last_review = Column(DateTime)
    
    item = relationship("LearningItem", back_populates="srs_state")
