from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    rent_amount = Column(Float, default=0.0)
    electricity_amount = Column(Float, default=0.0)
    food_amount = Column(Float, default=0.0)
    maintenance_amount = Column(Float, default=0.0)
    other_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String, default="PENDING")  # "PENDING", "PAID", "OVERDUE"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="bills")
    user = relationship("User", back_populates="bills")
    booking = relationship("Booking")
    room = relationship("Room")
    payments = relationship("Payment", back_populates="bill", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # "UPI", "Net Banking", "Cash", etc.
    transaction_id = Column(String, nullable=True) # UTR/Reference Number
    payment_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PENDING")  # "PENDING", "RECEIVED", "SUCCESS", "FAILED"
    
    # New fields for payment proof uploads
    screenshot_path = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_notes = Column(String, nullable=True)

    # Relationships
    bill = relationship("Bill", back_populates="payments")

class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    upi_id = Column(String, nullable=True)
    qr_code_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
