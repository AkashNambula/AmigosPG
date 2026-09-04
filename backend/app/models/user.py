from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    state = Column(String, nullable=False)
    city = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="tenant")  # "super_admin", "admin", "tenant"
    account_status = Column(String, default="pending")  # "active", "pending", "inactive"
    joining_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)
    profile_image = Column(String, nullable=True)
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    bookings = relationship("Booking", back_populates="user")
    complaints = relationship("Complaint", back_populates="user")
    bills = relationship("Bill", back_populates="user")
    problem_reports = relationship("PersonProblemReport", back_populates="reporter", foreign_keys="[PersonProblemReport.reporter_id]")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

    @property
    def room_number(self):
        for b in self.bookings:
            if b.status == "APPROVED" and b.room:
                return b.room.room_number
        return "N/A"
