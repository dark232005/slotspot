import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class College(Base):
    __tablename__ = "colleges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    timezone = Column(String(50), default="UTC", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="college", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="college", cascade="all, delete-orphan")
    settings = relationship("CollegeSettings", back_populates="college", uselist=False, cascade="all, delete-orphan")


class CollegeSettings(Base):
    __tablename__ = "college_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    college_id = Column(String(36), ForeignKey("colleges.id", ondelete="CASCADE"), unique=True, nullable=False)
    no_show_grace_minutes = Column(Integer, default=10, nullable=False)
    operating_start_time = Column(String(10), default="08:00", nullable=False)
    operating_end_time = Column(String(10), default="20:00", nullable=False)
    max_booking_duration_minutes = Column(Integer, default=180, nullable=False)
    max_advance_booking_days = Column(Integer, default=7, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    college = relationship("College", back_populates="settings")
