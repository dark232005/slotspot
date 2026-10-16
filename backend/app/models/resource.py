import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ResourceType(str, enum.Enum):
    PROJECT_ROOM = "PROJECT_ROOM"
    DISCUSSION_ROOM = "DISCUSSION_ROOM"
    EQUIPMENT = "EQUIPMENT"


class ResourceStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    college_id = Column(String(36), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(String(1000), default="", nullable=False)
    location = Column(String(255), default="", nullable=False)
    capacity = Column(Integer, nullable=True)
    operating_start_time = Column(String(10), default="08:00", nullable=False)
    operating_end_time = Column(String(10), default="20:00", nullable=False)
    max_booking_duration_minutes = Column(Integer, default=180, nullable=False)
    slot_granularity_minutes = Column(Integer, default=30, nullable=False)
    status = Column(String(50), default=ResourceStatus.ACTIVE.value, nullable=False)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    college = relationship("College", back_populates="resources")
    bookings = relationship("Booking", back_populates="resource", cascade="all, delete-orphan")
    manager_assignments = relationship("ResourceManagerAssignment", back_populates="resource", cascade="all, delete-orphan")
    maintenance_blocks = relationship("ResourceMaintenanceBlock", back_populates="resource", cascade="all, delete-orphan")


class ResourceManagerAssignment(Base):
    __tablename__ = "resource_manager_assignments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    college_id = Column(String(36), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="manager_assignments")
    user = relationship("User", back_populates="manager_assignments")
