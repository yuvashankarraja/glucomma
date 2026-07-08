import os
from sqlalchemy.orm import Session
from app.models.db_models import Notification, Patient, Doctor, Prediction, User, AuditLog

def create_notification(db: Session, user_id: int, title: str, message: str) -> Notification:
    """
    Creates an in-app notification for a user and simulates an email dispatch.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Simulate email notifications (log file output representing production email service)
    user = db.query(User).filter(User.id == user_id).first()
    email_address = user.email if user else "patient@glaucoma.org"
    try:
        print(f"\n[EMAIL SYSTEM ALERT] Dispatching to {email_address}...")
        print(f"Subject: {title}")
        print(f"Message: {message}\n")
    except UnicodeEncodeError:
        safe_title = title.encode('ascii', 'ignore').decode('ascii')
        safe_msg = message.encode('ascii', 'ignore').decode('ascii')
        print(f"\n[EMAIL SYSTEM ALERT] Dispatching to {email_address}...")
        print(f"Subject: {safe_title}")
        print(f"Message: {safe_msg}\n")
    
    return notification

def check_and_notify_emergency(db: Session, prediction: Prediction, patient_id: int) -> bool:
    """
    Core clinical workflow engine.
    Checks if a prediction meets high-risk emergency criteria:
    - Risk Level = High
    - Confidence Score > 95%
    
    If met:
    - Mark patient as High Priority.
    - Mark prediction as Emergency.
    - Notify assigned doctor immediately via dashboard alerts.
    - Log audit entry.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return False
        
    is_emergency = False
    
    # Emergency Criteria
    if prediction.risk_level == "High" and float(prediction.confidence_score) >= 95.0:
        is_emergency = True
        prediction.is_emergency = True
        patient.is_high_priority = True
        db.commit()
        
        # 1. Notify the patient
        create_notification(
            db=db,
            user_id=patient.user_id,
            title="⚠️ Clinical Alert: Urgent Specialist Review Pending",
            message=(
                f"Your recent scan indicates high risk of Glaucoma with a confidence of {prediction.confidence_score}%. "
                "The clinical team has been notified immediately, and your profile is added to the Emergency Review Queue. "
                "Please ensure your phone number is correct and check the appointments tab."
            )
        )
        
        # 2. Notify all doctors / assigned doctors
        doctors = db.query(Doctor).all()
        for doc in doctors:
            create_notification(
                db=db,
                user_id=doc.user_id,
                title="🚨 CLINICAL EMERGENCY: High-Risk Glaucoma Detection",
                message=(
                    f"Urgent action required: Patient {patient.name} (Age: {patient.age}) "
                    f"has been categorized as EMERGENCY PRIORITY after uploading scan ID IMG-{prediction.image_id}. "
                    f"AI Classification: Glaucoma Detected with {prediction.probability}% probability and {prediction.confidence_score}% confidence."
                )
            )
            
        # 3. Log Audit trail
        audit = AuditLog(
            user_id=patient.user_id,
            action=f"CLINICAL EMERGENCY raised for prediction ID {prediction.id}. Patient priority escalated to High.",
            ip_address="system-trigger"
        )
        db.add(audit)
        db.commit()
        
    elif prediction.risk_level in ["High", "Moderate"]:
        # Standard notification for high/moderate cases
        # Notify doctors
        doctors = db.query(Doctor).all()
        for doc in doctors:
            create_notification(
                db=db,
                user_id=doc.user_id,
                title="📋 New Screening Upload: Doctor Review Due",
                message=(
                    f"Patient {patient.name} uploaded a scan classified as {prediction.risk_level} Risk. "
                    f"AI classification probability is {prediction.probability}%."
                )
            )
        # Notify patient
        create_notification(
            db=db,
            user_id=patient.user_id,
            title="Scan Uploaded & Analysis Complete",
            message=(
                f"Your retinal fundus scan has been uploaded and analyzed. Risk classification: {prediction.risk_level}. "
                "Your doctor has been notified for clinical verification."
            )
        )
    else:
        # Low risk notification
        create_notification(
            db=db,
            user_id=patient.user_id,
            title="Scan Analysis Complete",
            message="Your scan has been processed. Risk level is Low. Continue regular annual eye checkups."
        )
        
    return is_emergency
