from sqlalchemy import Column, Integer, String
from app.core.database import Base

class FoodMenu(Base):
    __tablename__ = "food_menus"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String, unique=True, index=True, nullable=False)  # "Monday", "Tuesday", etc.
    breakfast = Column(String, nullable=False)
    lunch = Column(String, nullable=False)
    snacks = Column(String, nullable=False)
    dinner = Column(String, nullable=False)
