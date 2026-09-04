from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class PersonProblemReport(Base):
    __tablename__ = "person_problem_reports"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_person_name = Column(String, nullable=False)
    target_room_number = Column(String, nullable=False)
    category = Column(String, nullable=False)  # "Noise", "Cleanliness", "Roommate issue", etc.
    description = Column(String, nullable=False)
    report_date = Column(DateTime, default=datetime.utcnow)
    attachment_path = Column(String, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="problem_reports")
    reporter = relationship("User", back_populates="problem_reports", foreign_keys=[reporter_id])
