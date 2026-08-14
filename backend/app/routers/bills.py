from fastapi import APIRouter, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.responses import FileResponse
import os
import uuid
from app.core.config import settings
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.bill import Bill, Payment, PaymentSettings
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.schemas.bill import BillOut, BillCreate, BillUpdate, PaymentCreate, PaymentOut, PaymentSettingsOut
from app.dependencies.auth import get_current_active_user, get_current_admin

router = APIRouter(prefix="/bills", tags=["Bills & Payments"])

@router.post("/", response_model=BillOut, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: BillCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total = (
        bill_in.rent_amount + 
        bill_in.electricity_amount + 
        bill_in.food_amount + 
        bill_in.maintenance_amount + 
        bill_in.other_amount
    )
    
    new_bill = Bill(
        user_id=bill_in.user_id,
        rent_amount=bill_in.rent_amount,
        electricity_amount=bill_in.electricity_amount,
        food_amount=bill_in.food_amount,
        maintenance_amount=bill_in.maintenance_amount,
        other_amount=bill_in.other_amount,
        total_amount=total,
        due_date=bill_in.due_date,
        status="PENDING"
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)
    
    # Notify user
    notify = Notification(
        user_id=bill_in.user_id,
        title="New Bill Generated",
        message=f"A new bill of INR {total:,.2f} has been generated for you. Due date: {bill_in.due_date.strftime('%Y-%m-%d')}.",
        notification_type="bill",
        is_read=False,
        reference_id=new_bill.id,
        target_route="/dashboard/bills"
    )
    db.add(notify)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="create_bill",
        entity_name="bills",
        entity_id=new_bill.id,
        details=f"Admin created bill of INR {total:,.2f} for user id {bill_in.user_id}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return new_bill

@router.get("/", response_model=List[BillOut])
def get_bills(
    status_filter: Optional[str] = None,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Bill)
    if current_user.role == "tenant":
        query = query.filter(Bill.user_id == current_user.id)
    else:
        if status_filter:
            query = query.filter(Bill.status == status_filter)
            
    return query.order_by(Bill.due_date.asc()).all()

# --- STATIC PAYMENT SETTINGS & PROOFS ENDPOINTS FIRST ---

@router.get("/settings", response_model=PaymentSettingsOut)
def get_payment_settings(db: Session = Depends(get_db)):
    settings_record = db.query(PaymentSettings).first()
    if not settings_record:
        settings_record = PaymentSettings(upi_id="amigospg@upi")
        db.add(settings_record)
        db.commit()
        db.refresh(settings_record)
    return settings_record

@router.put("/settings", response_model=PaymentSettingsOut)
def update_payment_settings(
    upi_id: str = Form(...),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    upi_id = upi_id.replace(" ", "").strip()
    if not upi_id or upi_id.count("@") != 1:
        raise HTTPException(status_code=400, detail="Please enter a valid UPI ID.")
        
    parts = upi_id.split("@")
    if not parts[0] or not parts[1]:
        raise HTTPException(status_code=400, detail="Please enter a valid UPI ID.")
        
    settings_record = db.query(PaymentSettings).first()
    if not settings_record:
        settings_record = PaymentSettings()
        db.add(settings_record)
        
    settings_record.upi_id = upi_id
    db.commit()
    db.refresh(settings_record)
    return settings_record

@router.post("/settings/qr", response_model=PaymentSettingsOut)
async def upload_qr_code(
    qr_file: UploadFile = File(...),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    contents = await qr_file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Please upload a valid QR image under 5 MB.")
        
    mime_type = qr_file.content_type
    file_ext = os.path.splitext(qr_file.filename)[1].lower()
    
    allowed_mimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    allowed_exts = [".png", ".jpg", ".jpeg", ".webp"]
    
    if mime_type not in allowed_mimes and file_ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Please upload a valid QR image under 5 MB.")
        
    rooms_dir = os.path.join(settings.UPLOAD_DIR, "rooms")
    os.makedirs(rooms_dir, exist_ok=True)
    filename = f"qr_code_{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(rooms_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
        
    settings_record = db.query(PaymentSettings).first()
    if not settings_record:
        settings_record = PaymentSettings()
        db.add(settings_record)
        
    settings_record.qr_code_path = f"/uploads/rooms/{filename}"
    db.commit()
    db.refresh(settings_record)
    return settings_record

@router.delete("/settings/qr", response_model=PaymentSettingsOut)
def delete_qr_code(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings_record = db.query(PaymentSettings).first()
    if settings_record:
        settings_record.qr_code_path = None
        db.commit()
        db.refresh(settings_record)
    return settings_record

@router.get("/proofs/all", response_model=List[PaymentOut])
def get_payment_proofs(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Payment).filter(Payment.screenshot_path != None).order_by(Payment.submitted_at.desc()).all()

@router.get("/proofs/{payment_id}", response_model=PaymentOut)
def get_payment_proof(
    payment_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    pay = db.query(Payment).filter(Payment.id == payment_id).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment record not found.")
    return pay

@router.patch("/proofs/{payment_id}/status", response_model=PaymentOut)
def update_payment_proof_status(
    payment_id: int,
    status_update: str = Form(...),
    admin_notes: Optional[str] = Form(None),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    status_update = status_update.upper()
    if status_update not in ["RECEIVED", "SUCCESS", "FAILED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be RECEIVED, SUCCESS, or FAILED.")
        
    pay = db.query(Payment).filter(Payment.id == payment_id).first()
    if not pay:
        raise HTTPException(status_code=404, detail="Payment record not found.")
        
    bill = pay.bill
    pay.status = status_update
    pay.admin_notes = admin_notes
    pay.verified_at = datetime.utcnow()
    pay.verified_by = admin.id
    
    if status_update == "SUCCESS":
        bill.status = "PAID"
    else:
        bill.status = "PENDING"
        
    if status_update == "SUCCESS":
        n_title = "Payment Successful"
        n_msg = "Your payment for the submitted bill has been successfully verified."
    elif status_update == "RECEIVED":
        n_title = "Payment Proof Received"
        n_msg = "Your payment proof has been received and is currently under verification."
    else:
        n_title = "Payment Verification Failed"
        n_msg = "Your payment proof could not be verified. Please check the payment details and contact the PG administration."
        
    db.add(Notification(
        user_id=bill.user_id,
        title=n_title,
        message=n_msg,
        notification_type="bill",
        is_read=False,
        reference_id=bill.id,
        target_route="/dashboard/bills"
    ))
    db.commit()
    db.refresh(pay)
    return pay

@router.get("/proofs/{payment_id}/download")
def download_payment_screenshot(
    payment_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pay = db.query(Payment).filter(Payment.id == payment_id).first()
    if not pay or not pay.screenshot_path:
        raise HTTPException(status_code=404, detail="Payment proof not found.")
        
    if current_user.role == "tenant" and pay.bill.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access forbidden.")
        
    if not os.path.exists(pay.screenshot_path):
        raise HTTPException(status_code=404, detail="This document is not available.")
        
    import mimetypes
    mime_type, _ = mimetypes.guess_type(pay.screenshot_path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    filename = os.path.basename(pay.screenshot_path)
    return FileResponse(
        path=pay.screenshot_path,
        filename=filename,
        media_type=mime_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

# --- DYNAMIC BILL PATH ENDPOINTS LAST ---

@router.put("/{bill_id}", response_model=BillOut)
def update_bill(
    bill_id: int,
    bill_update: BillUpdate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found."
        )
        
    update_data = bill_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(bill, field, value)
        
    bill.total_amount = (
        bill.rent_amount + 
        bill.electricity_amount + 
        bill.food_amount + 
        bill.maintenance_amount + 
        bill.other_amount
    )
    
    db.commit()
    db.refresh(bill)
    
    audit = AuditLog(
        user_id=admin.id,
        action="update_bill",
        entity_name="bills",
        entity_id=bill.id,
        details=f"Admin updated bill details for bill id {bill.id}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return bill

@router.post("/{bill_id}/pay", response_model=PaymentOut)
def pay_bill(
    bill_id: int,
    payment_in: PaymentCreate,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found."
        )
        
    if current_user.role == "tenant" and bill.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )
        
    if bill.status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This bill has already been paid."
        )
        
    new_payment = Payment(
        bill_id=bill.id,
        amount_paid=payment_in.amount_paid,
        payment_method=payment_in.payment_method,
        transaction_id=payment_in.transaction_id,
        status="PENDING"
    )
    db.add(new_payment)
    
    from app.models.user import User
    admins = db.query(User).filter(User.role == "admin").all()
    for admin_user in admins:
        db.add(Notification(
            user_id=admin_user.id,
            title="Payment Submitted for Verification",
            message=f"Resident {current_user.first_name} submitted a payment of INR {payment_in.amount_paid:,.2f} for Bill #{bill.id} using {payment_in.payment_method}.",
            notification_type="bill",
            is_read=False,
            reference_id=bill.id,
            target_route="/admin/bills"
        ))
        
    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.put("/{bill_id}/payments/{payment_id}/approve", response_model=PaymentOut)
def approve_payment(
    bill_id: int,
    payment_id: int,
    approve: bool = True,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.bill_id == bill_id
    ).first()
    
    if not payment:
         raise HTTPException(
             status_code=status.HTTP_404_NOT_FOUND,
             detail="Payment record not found."
         )
         
    if payment.status != "PENDING":
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"Payment is already marked as {payment.status}."
         )
         
    bill = payment.bill
    
    if approve:
        payment.status = "SUCCESS"
        bill.status = "PAID"
        
        db.add(Notification(
            user_id=bill.user_id,
            title="Payment Approved & Settled",
            message=f"Your payment of INR {payment.amount_paid:,.2f} for Bill #{bill.id} has been verified and approved.",
            notification_type="bill",
            is_read=False,
            reference_id=bill.id,
            target_route="/dashboard/bills"
        ))
        
        details = f"Approved payment id {payment.id} for Bill {bill.id}"
    else:
        payment.status = "FAILED"
        
        db.add(Notification(
            user_id=bill.user_id,
            title="Payment Verification Failed",
            message=f"The payment transaction of INR {payment.amount_paid:,.2f} for Bill #{bill.id} was rejected by administrator.",
            notification_type="bill",
            is_read=False,
            reference_id=bill.id,
            target_route="/dashboard/bills"
        ))
        details = f"Rejected payment id {payment.id} for Bill {bill.id}"
        
    audit = AuditLog(
        user_id=admin.id,
        action="approve_payment",
        entity_name="payments",
        entity_id=payment.id,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{bill_id}/proof", response_model=PaymentOut)
async def submit_payment_proof(
    bill_id: int,
    amount_paid: float = Form(...),
    payment_method: str = Form(...),
    transaction_id: Optional[str] = Form(None),
    payment_date: str = Form(...),
    screenshot: UploadFile = File(...),
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")
        
    if bill.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access forbidden.")
        
    existing_active = db.query(Payment).filter(
        Payment.bill_id == bill_id,
        Payment.status.in_(["PENDING", "RECEIVED", "SUCCESS"])
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="A payment proof is already pending or has been approved for this bill."
        )
        
    try:
        p_date = datetime.strptime(payment_date, "%Y-%m-%d")
    except ValueError:
        try:
            p_date = datetime.fromisoformat(payment_date.replace("Z", ""))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    screenshot_content = await screenshot.read()
    if len(screenshot_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Please upload a valid payment screenshot under 5 MB.")
        
    file_ext = os.path.splitext(screenshot.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Please upload a valid payment screenshot under 5 MB.")
        
    secure_docs_dir = os.path.join(settings.UPLOAD_DIR, "documents")
    os.makedirs(secure_docs_dir, exist_ok=True)
    filename = f"payment_screenshot_{bill_id}_{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(secure_docs_dir, filename)
    with open(filepath, "wb") as f:
        f.write(screenshot_content)
        
    new_payment = Payment(
        bill_id=bill_id,
        amount_paid=amount_paid,
        payment_method=payment_method,
        transaction_id=transaction_id,
        payment_date=p_date,
        status="PENDING",
        screenshot_path=filepath,
        submitted_at=datetime.utcnow()
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    from app.models.user import User
    admins = db.query(User).filter(User.role == "admin").all()
    for admin_user in admins:
        db.add(Notification(
            user_id=admin_user.id,
            title="Payment Submitted for Verification",
            message=f"Resident {current_user.first_name} submitted a payment of INR {amount_paid:,.2f} for Bill #{bill.id}.",
            notification_type="bill",
            is_read=False,
            reference_id=bill.id,
            target_route="/admin/bills"
        ))
    db.commit()
    return new_payment
