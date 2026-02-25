from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from schemas import (
    YesterdayReviewResponse, 
    ReviewSessionCreate, 
    ReviewSessionResponse,
    LearningItemResponse
)
from models import User, LearningItem, ReviewSession, ReviewItem, SRSState, Mistake
from dependencies import get_current_user
from utils import get_yesterday_start, calculate_next_review, score_to_quality
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/yesterday", response_model=YesterdayReviewResponse)
def get_yesterday_review(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get items for yesterday review
    - Items created in last 24 hours
    - Items due for review today (based on SRS)
    - Items with recent mistakes
    """
    yesterday = get_yesterday_start()
    today = datetime.utcnow()
    
    # Items created in last 24 hours
    new_items = db.query(LearningItem).filter(
        LearningItem.user_id == current_user.id,
        LearningItem.created_at >= yesterday
    ).all()
    
    # Items due for review (SRS)
    due_items_query = db.query(LearningItem).join(SRSState).filter(
        LearningItem.user_id == current_user.id,
        SRSState.next_review <= today
    )
    
    # Items with recent mistakes (last 7 days)
    mistake_cutoff = today - timedelta(days=7)
    mistake_items_query = db.query(LearningItem).join(Mistake).filter(
        LearningItem.user_id == current_user.id,
        Mistake.created_at >= mistake_cutoff
    )
    
    # Combine all items (remove duplicates)
    all_items = list(set(new_items) | set(due_items_query.all()) | set(mistake_items_query.all()))
    
    return YesterdayReviewResponse(
        items=[LearningItemResponse.model_validate(item) for item in all_items],
        count=len(all_items)
    )


@router.post("/submit", response_model=ReviewSessionResponse)
def submit_review(
    session_data: ReviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a review session and update SRS states"""
    # Create review session
    total_score = 0
    item_count = len(session_data.items)
    
    review_session = ReviewSession(
        user_id=current_user.id,
        mode=session_data.mode,
        date=datetime.utcnow()
    )
    db.add(review_session)
    db.flush()  # Get session ID
    
    # Process each review item
    for review_item_data in session_data.items:
        # Verify item belongs to user
        item = db.query(LearningItem).filter(
            LearningItem.id == review_item_data.item_id,
            LearningItem.user_id == current_user.id
        ).first()
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning item {review_item_data.item_id} not found"
            )
        
        # Create review item record
        review_item = ReviewItem(
            session_id=review_session.id,
            item_id=review_item_data.item_id,
            result=review_item_data.result,
            score=review_item_data.score
        )
        db.add(review_item)
        
        # Update SRS state
        srs_state = db.query(SRSState).filter(SRSState.item_id == item.id).first()
        if srs_state:
            # Convert score to quality (0-5)
            score = review_item_data.score if review_item_data.score else 0
            quality = score_to_quality(score)
            
            # Calculate next review interval
            new_ease, new_interval = calculate_next_review(
                srs_state.ease,
                srs_state.interval,
                quality
            )
            
            # Update SRS state
            srs_state.ease = new_ease
            srs_state.interval = new_interval
            srs_state.repetitions += 1
            srs_state.last_review = datetime.utcnow()
            srs_state.next_review = datetime.utcnow() + timedelta(days=new_interval)
        
        # Add to total score
        if review_item_data.score:
            total_score += review_item_data.score
    
    # Calculate average score
    review_session.score = total_score / item_count if item_count > 0 else 0
    
    db.commit()
    db.refresh(review_session)
    
    return review_session


@router.get("/history", response_model=List[ReviewSessionResponse])
def get_review_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's review history"""
    sessions = db.query(ReviewSession).filter(
        ReviewSession.user_id == current_user.id
    ).order_by(
        ReviewSession.date.desc()
    ).limit(limit).all()
    
    return sessions
