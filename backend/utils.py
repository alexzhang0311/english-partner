import re
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session


def normalize_content(content: str) -> str:
    """Normalize content for duplicate detection"""
    # Convert to lowercase
    normalized = content.lower()
    # Remove punctuation and extra spaces
    normalized = re.sub(r'[^\w\s]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    normalized = normalized.strip()
    return normalized


def get_yesterday_start() -> datetime:
    """Get the start of yesterday (24 hours ago)"""
    return datetime.utcnow() - timedelta(hours=24)


def calculate_next_review(ease: float, interval: int, quality: int) -> tuple[float, int]:
    """
    Calculate next review using SM-2 algorithm
    
    Args:
        ease: Current ease factor
        interval: Current interval in days
        quality: Quality of recall (0-5)
            5: perfect response
            4: correct response with hesitation
            3: correct response with difficulty
            2: incorrect but remembered
            1: incorrect, barely remembered
            0: complete blackout
    
    Returns:
        tuple of (new_ease, new_interval)
    """
    if quality < 3:
        # Reset interval on failure
        new_interval = 1
        new_ease = ease
    else:
        # Calculate new ease factor
        new_ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ease = max(1.3, new_ease)  # Minimum ease factor
        
        # Calculate new interval
        if interval == 0:
            new_interval = 1
        elif interval == 1:
            new_interval = 6
        else:
            new_interval = int(interval * new_ease)
    
    return new_ease, new_interval


def score_to_quality(score: float) -> int:
    """Convert 0-100 score to SM-2 quality (0-5)"""
    if score >= 95:
        return 5
    elif score >= 85:
        return 4
    elif score >= 70:
        return 3
    elif score >= 50:
        return 2
    elif score >= 30:
        return 1
    else:
        return 0
