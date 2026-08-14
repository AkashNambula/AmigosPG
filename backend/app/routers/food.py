from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.food import FoodMenu
from app.models.audit import AuditLog
from app.schemas.food import FoodMenuOut, FoodMenuUpdate, FoodMenuCreate
from app.dependencies.auth import get_current_active_user, get_current_admin

router = APIRouter(prefix="/food-menu", tags=["Food Menu"])

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@router.get("/", response_model=List[FoodMenuOut])
def get_food_menu(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Ensure all days exist in database (seed dynamically if missing)
    for day in DAYS_OF_WEEK:
        existing = db.query(FoodMenu).filter(FoodMenu.day_of_week == day).first()
        if not existing:
            default_menu = FoodMenu(
                day_of_week=day,
                breakfast="Not configured yet",
                lunch="Not configured yet",
                snacks="Not configured yet",
                dinner="Not configured yet"
            )
            db.add(default_menu)
            db.commit()
            
    return db.query(FoodMenu).order_by(
        # Custom ordering to start with Monday
        FoodMenu.id
    ).all()

@router.put("/{day_name}", response_model=FoodMenuOut)
def update_food_menu(
    day_name: str,
    menu_update: FoodMenuUpdate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Normalize day name
    normalized_day = day_name.strip().capitalize()
    if normalized_day not in DAYS_OF_WEEK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid day name. Allowed: {', '.join(DAYS_OF_WEEK)}."
        )
        
    menu = db.query(FoodMenu).filter(FoodMenu.day_of_week == normalized_day).first()
    if not menu:
        menu = FoodMenu(day_of_week=normalized_day)
        db.add(menu)
        
    menu.breakfast = menu_update.breakfast
    menu.lunch = menu_update.lunch
    menu.snacks = menu_update.snacks
    menu.dinner = menu_update.dinner
    
    db.commit()
    db.refresh(menu)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="update_food_menu",
        entity_name="food_menus",
        entity_id=menu.id,
        details=f"Admin updated food menu for {normalized_day}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return menu
