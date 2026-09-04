from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

ALL_FEATURE_KEYS = [
    "dashboard",
    "rooms",
    "bookings",
    "users",
    "billing",
    "complaints",
    "food_menu",
    "notifications",
    "analytics",
    "problems_with_persons",
    "reports"
]

class TenantFeature(Base):
    __tablename__ = "tenant_features"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String, nullable=False, index=True)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="features")

    __table_args__ = (
        UniqueConstraint("tenant_id", "feature_key", name="uix_tenant_feature"),
    )
