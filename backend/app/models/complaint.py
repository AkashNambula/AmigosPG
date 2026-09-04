from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)  # "Electricity", "Water", "Wi-Fi", "Cleaning", etc.
    subject = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="LOW")  # "LOW", "MEDIUM", "HIGH"
    status = Column(String, default="OPEN")  # "OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"
    attachment_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="complaints")
    user = relationship("User", back_populates="complaints")
    updates = relationship("ComplaintUpdate", back_populates="complaint", cascade="all, delete-orphan")

class ComplaintUpdate(Base):
    __tablename__ = "complaint_updates"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status_change = Column(String, nullable=False)
    response_message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="updates")
