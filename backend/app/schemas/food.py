from pydantic import BaseModel

class FoodMenuBase(BaseModel):
    breakfast: str
    lunch: str
    snacks: str
    dinner: str

class FoodMenuCreate(FoodMenuBase):
    day_of_week: str

class FoodMenuUpdate(FoodMenuBase):
    pass

class FoodMenuOut(FoodMenuBase):
    id: int
    day_of_week: str
    class Config:
        from_attributes = True
