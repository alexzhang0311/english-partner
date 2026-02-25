from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas import LearningItemCreate, LearningItemResponse
from models import User, LearningItem, SRSState
from dependencies import get_current_user
from utils import normalize_content
from config import settings
from typing import List
from datetime import datetime

router = APIRouter(prefix="/items", tags=["learning items"])


@router.post("", response_model=LearningItemResponse)
def create_learning_item(
    item: LearningItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new learning item with duplicate detection"""
    # Normalize content for duplicate detection
    normalized = normalize_content(item.content)
    
    # Check for duplicates
    existing = db.query(LearningItem).filter(
        LearningItem.user_id == current_user.id,
        LearningItem.normalized_content == normalized
    ).first()
    
    if existing:
        # Update seen count and timestamp
        existing.seen_count += 1
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        
        # Return reminder in the response (via HTTPException detail)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": settings.DUPLICATE_REMINDER_MESSAGE,
                "existing_item": {
                    "id": existing.id,
                    "content": existing.content,
                    "created_at": existing.created_at.isoformat(),
                    "seen_count": existing.seen_count
                }
            }
        )
    
    # Create new learning item
    new_item = LearningItem(
        user_id=current_user.id,
        type=item.type,
        content=item.content,
        normalized_content=normalized,
        example=item.example,
        tags=item.tags
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Initialize SRS state
    srs_state = SRSState(
        item_id=new_item.id,
        interval=1,
        ease=2.5,
        repetitions=0,
        next_review=datetime.utcnow()
    )
    db.add(srs_state)
    db.commit()
    
    return new_item


@router.get("", response_model=List[LearningItemResponse])
def get_learning_items(
    date: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get learning items, optionally filtered by date"""
    query = db.query(LearningItem).filter(LearningItem.user_id == current_user.id)
    
    if date:
        try:
            target_date = datetime.fromisoformat(date)
            # Get items created on this date
            query = query.filter(
                LearningItem.created_at >= target_date,
                LearningItem.created_at < target_date + timedelta(days=1)
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    items = query.order_by(LearningItem.created_at.desc()).all()
    return items


@router.get("/{item_id}", response_model=LearningItemResponse)
def get_learning_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific learning item"""
    item = db.query(LearningItem).filter(
        LearningItem.id == item_id,
        LearningItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning item not found"
        )
    
    return item


from datetime import timedelta
