from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.db_models import User, Patient, Doctor, Appointment, Prediction, RetinaImage

router = APIRouter(prefix="/api/analytics", tags=["Dashboard Metrics & Analytics"])

@router.get("/patient-summary")
def get_patient_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
         raise HTTPException(status_code=403, detail="Access denied.")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # 1. Total reports
    total_scans = db.query(RetinaImage).filter(RetinaImage.patient_id == patient.id).count()

    # 2. Latest Prediction details
    latest_scan = db.query(RetinaImage).filter(RetinaImage.patient_id == patient.id).order_by(RetinaImage.upload_date.desc()).first()
    latest_pred = None
    if latest_scan:
        latest_pred = db.query(Prediction).filter(Prediction.image_id == latest_scan.id).first()

    # 3. Upcoming Appointment
    upcoming_appt = db.query(Appointment).filter(
        Appointment.patient_id == patient.id,
        Appointment.appointment_date >= datetime.utcnow(),
        Appointment.status != "rejected"
    ).order_by(Appointment.appointment_date.asc()).first()

    assigned_doctor_name = "None"
    if upcoming_appt:
        doc = db.query(Doctor).filter(Doctor.id == upcoming_appt.doctor_id).first()
        if doc:
            assigned_doctor_name = doc.name

    # 4. Intraocular Pressure / Prediction trends over time for Recharts
    scans = db.query(RetinaImage).filter(RetinaImage.patient_id == patient.id).order_by(RetinaImage.upload_date.asc()).all()
    chart_data = []
    for s in scans:
        pred = db.query(Prediction).filter(Prediction.image_id == s.id).first()
        if pred:
            chart_data.append({
                "date": s.upload_date.strftime("%b %d"),
                "probability": float(pred.probability),
                "confidence": float(pred.confidence_score)
            })

    return {
        "total_reports": total_scans,
        "latest_prediction": {
            "id": latest_pred.id if latest_pred else None,
            "disease_name": latest_pred.disease_name if latest_pred else "N/A",
            "is_glaucoma": latest_pred.is_glaucoma if latest_pred else False,
            "probability": float(latest_pred.probability) if latest_pred else 0.0,
            "risk_level": latest_pred.risk_level if latest_pred else "Unknown",
            "date": latest_pred.created_at.strftime("%Y-%m-%d") if latest_pred else None
        } if latest_pred else None,
        "risk_status": latest_pred.risk_level if latest_pred else "None",
        "upcoming_appointment": upcoming_appt.appointment_date.strftime("%Y-%m-%d %H:%M") if upcoming_appt else None,
        "assigned_doctor": assigned_doctor_name,
        "chart_data": chart_data
    }

@router.get("/doctor-summary")
def get_doctor_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Access denied.")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    # 1. Total appointments with doctor
    total_appts = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).count()

    # 2. Today's appointments count
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    todays_appts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date >= today_start,
        Appointment.appointment_date < today_end
    ).all()

    # 3. High risk patients booked with this doctor
    # Get patients who have high risk status
    subquery = db.query(RetinaImage.patient_id).join(Prediction).filter(Prediction.risk_level == "High").subquery()
    high_risk_patients_count = db.query(Appointment.patient_id).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.patient_id.in_(subquery)
    ).distinct().count()

    # 4. Total patients registered clinic-wide
    total_patients = db.query(Patient).count()

    # 5. Charts data: prediction distribution (Normal vs Glaucoma)
    glaucoma_count = db.query(Prediction).filter(Prediction.is_glaucoma == True).count()
    normal_count = db.query(Prediction).filter(Prediction.is_glaucoma == False).count()

    return {
        "total_appointments": total_appts,
        "today_appointments_count": len(todays_appts),
        "high_risk_patients_count": high_risk_patients_count,
        "total_patients": total_patients,
        "distribution": [
            {"name": "Normal", "value": normal_count},
            {"name": "Glaucoma", "value": glaucoma_count}
        ]
    }

@router.get("/admin-summary")
def get_admin_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Access denied.")

    # 1. Broad statistics
    total_users = db.query(User).count()
    total_doctors = db.query(Doctor).count()
    total_patients = db.query(Patient).count()
    total_predictions = db.query(Prediction).count()

    # 2. Daily prediction growth (last 7 days)
    chart_daily = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        cnt = db.query(Prediction).filter(
            Prediction.created_at >= day_start,
            Prediction.created_at <= day_end
        ).count()
        chart_daily.append({
            "day": day.strftime("%a"),
            "predictions": cnt
        })

    # 3. Disease risk distribution
    low_cnt = db.query(Prediction).filter(Prediction.risk_level == "Low").count()
    mod_cnt = db.query(Prediction).filter(Prediction.risk_level == "Moderate").count()
    high_cnt = db.query(Prediction).filter(Prediction.risk_level == "High").count()

    return {
        "total_users": total_users,
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_predictions": total_predictions,
        "daily_growth": chart_daily,
        "risk_distribution": [
            {"name": "Low Risk", "value": low_cnt},
            {"name": "Moderate Risk", "value": mod_cnt},
            {"name": "High Risk", "value": high_cnt}
        ]
    }
