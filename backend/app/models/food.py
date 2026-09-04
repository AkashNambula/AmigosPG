from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class FoodMenu(Base):
    __tablename__ = "food_menus"
    __table_args__ = (
        UniqueConstraint("tenant_id", "day_of_week", name="uix_tenant_day_of_week"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    day_of_week = Column(String, index=True, nullable=False)  # "Monday", "Tuesday", etc.
    breakfast = Column(String, nullable=False)
    lunch = Column(String, nullable=False)
    snacks = Column(String, nullable=False)
    dinner = Column(String, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="food_menus")
