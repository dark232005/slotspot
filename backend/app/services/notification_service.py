from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    college_id: str,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "INFO"
) -> Notification:
    notif = Notification(
        college_id=college_id,
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False
    )
    db.add(notif)
    return notif
