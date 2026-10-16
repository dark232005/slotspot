import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class ResourceMaintenanceBlock(Base):
    __tablename__ = "resource_maintenance_blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    college_id = Column(String(36), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    reason = Column(String(500), nullable=False)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="maintenance_blocks")
    created_by = relationship("User")

    __table_args__ = (
        Index("ix_maint_resource_times", "resource_id", "start_time", "end_time"),
    )
