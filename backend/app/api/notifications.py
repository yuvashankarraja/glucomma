from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.db_models import User, Notification
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications System"])

@router.get("/", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all notifications for the authenticated user.
    """
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")
        
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    return notification

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes all notifications for the authenticated user.
    """
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return None
