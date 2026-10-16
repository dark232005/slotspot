import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class BookingStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    EXPIRED = "EXPIRED"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    college_id = Column(String(36), ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default=BookingStatus.CONFIRMED.value, nullable=False, index=True)

    # Secure QR verification: stores sha256 hash of random token
    qr_token_hash = Column(String(64), nullable=False, index=True)
    # Human-readable manual lookup fallback
    qr_lookup_code = Column(String(16), nullable=False, index=True)

    check_in_time = Column(DateTime, nullable=True)
    cancellation_time = Column(DateTime, nullable=True)
    cancellation_reason = Column(String(500), nullable=True)
    no_show_time = Column(DateTime, nullable=True)
    
    equipment_issued_at = Column(DateTime, nullable=True)
    equipment_returned_at = Column(DateTime, nullable=True)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="bookings")
    student = relationship("User", back_populates="bookings")

    __table_args__ = (
        Index("ix_bookings_resource_times", "resource_id", "start_time", "end_time"),
        Index("ix_bookings_college_status", "college_id", "status"),
    )
