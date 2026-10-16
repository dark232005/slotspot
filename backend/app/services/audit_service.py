import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent


def log_audit_event(
    db: Session,
    college_id: str,
    action: str,
    target_type: str,
    target_id: str,
    user_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditEvent:
    if isinstance(details, (dict, list)):
        details_str = json.dumps(details, default=str)
    else:
        details_str = str(details or "")

    event = AuditEvent(
        college_id=college_id,
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details_str,
        ip_address=ip_address
    )
    db.add(event)
    # Note: caller will commit or let outer transaction commit
    return event
