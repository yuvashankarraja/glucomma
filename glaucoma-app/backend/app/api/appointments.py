from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.db_models import User, Patient, Doctor, Appointment, Prescription, DoctorNote, Prediction, RetinaImage
from app.schemas.schemas import AppointmentCreate, AppointmentResponse, AppointmentUpdate, PrescriptionCreate, PrescriptionResponse

router = APIRouter(prefix="/api/appointments", tags=["Appointments & Consultations"])

@router.post("/", response_model=AppointmentResponse)
def book_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments.")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # Generate a unique video room ID
    room_id = f"room-glaucoma-{current_user.id}-{int(datetime.utcnow().timestamp())}"

    new_appointment = Appointment(
        patient_id=patient.id,
        doctor_id=appointment_data.doctor_id,
        appointment_date=appointment_data.appointment_date,
        type=appointment_data.type,
        status="pending",
        room_id=room_id
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Appointment)
    
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        appointments = query.filter(Appointment.patient_id == patient.id).all()
    elif current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        appointments = query.filter(Appointment.doctor_id == doctor.id).all()
    else:
        appointments = query.all()

    # Dynamic annotation for names in output response
    response_list = []
    for appt in appointments:
        p_name = db.query(Patient.name).filter(Patient.id == appt.patient_id).scalar() or "Patient"
        d_name = db.query(Doctor.name).filter(Doctor.id == appt.doctor_id).scalar() or "Doctor"
        
        resp = AppointmentResponse.model_validate(appt)
        resp.patient_name = p_name
        resp.doctor_name = d_name
        response_list.append(resp)
        
    return response_list

@router.put("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    status_update: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can approve/reject appointments.")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == doctor.id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or not assigned to you.")

    if status_update.status not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status option.")

    appointment.status = status_update.status
    db.commit()
    db.refresh(appointment)
    
    return appointment

@router.post("/prescription", response_model=PrescriptionResponse)
def add_prescription(
    prescription_data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can write prescriptions.")

    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
         raise HTTPException(status_code=404, detail="Doctor profile not found.")

    new_prescription = Prescription(
        patient_id=prescription_data.patient_id,
        doctor_id=doctor.id,
        prediction_id=prescription_data.prediction_id,
        medicines=prescription_data.medicines,
        dosage=prescription_data.dosage,
        instructions=prescription_data.instructions
    )
    db.add(new_prescription)
    db.commit()
    db.refresh(new_prescription)

    # Trigger custom report rebuilding including the prescription detail
    if prescription_data.prediction_id:
        prediction = db.query(Prediction).filter(Prediction.id == prescription_data.prediction_id).first()
        patient = db.query(Patient).filter(Patient.id == prescription_data.patient_id).first()
        if prediction and patient:
            # Rebuild PDF containing doctor note/medication
            original_img = db.query(RetinaImage).filter(RetinaImage.id == prediction.image_id).first()
            if original_img:
                from app.services.pdf_service import generate_pdf_report
                
                # Setup correct paths
                backend_dir = os.path.join(os.path.dirname(__file__), "..", "..")
                original_disk = os.path.join(backend_dir, original_img.file_path.lstrip("/"))
                heatmap_disk = os.path.join(backend_dir, prediction.heatmap_path.lstrip("/"))
                
                # Fetch PDF file name
                pdf_filename = f"report_{os.path.basename(original_img.file_path).split('.')[0]}.pdf"
                pdf_disk_path = os.path.join(backend_dir, "uploads", "reports", pdf_filename)
                
                patient_info_dict = {
                    "name": patient.name,
                    "age": patient.age or 30,
                    "gender": patient.gender or "Unknown",
                    "blood_pressure": patient.blood_pressure or "N/A",
                    "diabetes": patient.diabetes or "N/A",
                    "family_history": patient.family_history or "N/A"
                }
                
                prediction_info_dict = {
                    "id": prediction.id,
                    "is_glaucoma": prediction.is_glaucoma,
                    "probability": float(prediction.probability),
                    "confidence_score": float(prediction.confidence_score),
                    "risk_level": prediction.risk_level,
                    "recommendations": prediction.recommendations,
                    "created_at": prediction.created_at.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                presc_dict = {
                    "doctor_name": doctor.name,
                    "medicines": new_prescription.medicines,
                    "dosage": new_prescription.dosage,
                    "instructions": new_prescription.instructions
                }
                
                try:
                    generate_pdf_report(
                        pdf_path=pdf_disk_path,
                        patient_info=patient_info_dict,
                        prediction_info=prediction_info_dict,
                        original_img_path=original_disk,
                        heatmap_img_path=heatmap_disk,
                        prescription_info=presc_dict
                    )
                except Exception as e:
                    print(f"Error rebuilding prescription report: {e}")

    return new_prescription

@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def get_prescriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Prescription)
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        prescriptions = query.filter(Prescription.patient_id == patient.id).all()
    elif current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        prescriptions = query.filter(Prescription.doctor_id == doctor.id).all()
    else:
        prescriptions = query.all()

    # Annotate doctor names
    response_list = []
    for presc in prescriptions:
        d_name = db.query(Doctor.name).filter(Doctor.id == presc.doctor_id).scalar() or "Staff Doctor"
        resp = PrescriptionResponse.model_validate(presc)
        resp.doctor_name = d_name
        response_list.append(resp)
        
    return response_list

@router.get("/patients/all")
def get_all_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    patients = db.query(Patient).all()
    response_data = []
    for p in patients:
        latest_pred = db.query(Prediction).join(RetinaImage).filter(RetinaImage.patient_id == p.id).order_by(Prediction.created_at.desc()).first()
        
        response_data.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "phone": p.phone,
            "risk_status": latest_pred.risk_level if latest_pred else "Unknown",
            "is_glaucoma": latest_pred.is_glaucoma if latest_pred else False,
            "latest_prediction_date": latest_pred.created_at if latest_pred else None
        })
    return response_data

@router.get("/patients/{patient_id}")
def get_patient_details_by_id(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["doctor", "admin"]:
         raise HTTPException(status_code=403, detail="Access denied.")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Get predictions
    images = db.query(RetinaImage).filter(RetinaImage.patient_id == patient_id).all()
    img_ids = [img.id for img in images]
    predictions = db.query(Prediction).filter(Prediction.image_id.in_(img_ids)).order_by(Prediction.created_at.desc()).all() if img_ids else []
    
    # Annotate original_image_path for front-end mapping
    for p in predictions:
        p.original_image_path = p.image.file_path if p.image else ""

    # Get prescriptions
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()

    # Get medical notes
    notes = db.query(DoctorNote).filter(DoctorNote.patient_id == patient_id).all()

    return {
        "patient": patient,
        "predictions": predictions,
        "prescriptions": prescriptions,
        "doctor_notes": notes
    }

from pydantic import BaseModel

class ReschedulePayload(BaseModel):
    appointment_date: datetime

class FollowupPayload(BaseModel):
    followup_date: datetime

@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")
        
    # Check permissions
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Access denied.")
            
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    
    # Notify other party
    try:
        from app.services.notification_service import create_notification
        other_user_id = appointment.doctor.user_id if current_user.role == "patient" else appointment.patient.user_id
        create_notification(
            db, other_user_id,
            title="Appointment Cancelled",
            message=f"The consultation scheduled for {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} has been cancelled."
        )
    except Exception as e:
        print(f"Failed to send cancellation notification: {e}")
        
    return appointment

@router.put("/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(
    appointment_id: int,
    payload: ReschedulePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")
        
    # Check permissions
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if appointment.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Access denied.")
            
    appointment.appointment_date = payload.appointment_date
    # Reset status to pending if patient reschedules, otherwise keep accepted
    if current_user.role == "patient":
        appointment.status = "pending"
        
    db.commit()
    db.refresh(appointment)
    
    # Notify other party
    try:
        from app.services.notification_service import create_notification
        other_user_id = appointment.doctor.user_id if current_user.role == "patient" else appointment.patient.user_id
        create_notification(
            db, other_user_id,
            title="Appointment Rescheduled",
            message=f"The consultation has been rescheduled to {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')}."
        )
    except Exception as e:
        print(f"Failed to send reschedule notification: {e}")
        
    return appointment

@router.put("/{appointment_id}/complete", response_model=AppointmentResponse)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can mark appointments as completed.")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == doctor.id
    ).first()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or not assigned to you.")
        
    appointment.status = "completed"
    db.commit()
    db.refresh(appointment)
    
    return appointment

@router.post("/{appointment_id}/followup", response_model=AppointmentResponse)
def schedule_followup(
    appointment_id: int,
    payload: FollowupPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can schedule follow-up appointments.")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    source_appointment = db.query(Appointment).filter(
        source_appointment_filter := Appointment.id == appointment_id,
        Appointment.doctor_id == doctor.id
    ).first()
    
    if not source_appointment:
        raise HTTPException(status_code=404, detail="Original appointment not found or not assigned to you.")
        
    # Generate new video room ID
    room_id = f"room-glaucoma-{source_appointment.patient.user_id}-{int(datetime.utcnow().timestamp())}"
    
    # Create new follow-up appointment (automatically approved/accepted by default since doctor scheduled it)
    new_appt = Appointment(
        patient_id=source_appointment.patient_id,
        doctor_id=doctor.id,
        appointment_date=payload.followup_date,
        type=source_appointment.type,
        status="accepted",
        room_id=room_id
    )
    
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    
    # Notify patient
    try:
        from app.services.notification_service import create_notification
        create_notification(
            db, source_appointment.patient.user_id,
            title="📅 Follow-up Consultation Scheduled",
            message=(
                f"Dr. {doctor.name} has scheduled a follow-up appointment for you on "
                f"{payload.followup_date.strftime('%Y-%m-%d %H:%M')}. Status is automatically accepted."
            )
        )
    except Exception as e:
        print(f"Failed to send follow-up notification: {e}")
        
    return new_appt
