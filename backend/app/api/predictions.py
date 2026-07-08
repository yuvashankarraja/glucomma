import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.db_models import User, Patient, RetinaImage, Prediction, PredictionHistory, Report, AuditLog
from app.schemas.schemas import PredictionResponse
from app.services.ml_service import get_prediction
from app.services.pdf_service import generate_pdf_report

router = APIRouter(prefix="/api/predictions", tags=["Predictions & Diagnostics"])

# Setup upload directories relative to the backend path
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ORIGINAL_DIR = os.path.join(UPLOAD_DIR, "original")
HEATMAP_DIR = os.path.join(UPLOAD_DIR, "heatmaps")
REPORTS_DIR = os.path.join(UPLOAD_DIR, "reports")

# Ensure folders exist
for folder in [ORIGINAL_DIR, HEATMAP_DIR, REPORTS_DIR]:
    os.makedirs(folder, exist_ok=True)

@router.post("/predict", response_model=PredictionResponse)
def upload_and_predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can upload scans and request predictions.")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found. Please complete registration details.")

    # Validate image files
    content_type = file.content_type
    if content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, JPEG, and PNG images are accepted.")

    # Generate unique filenames
    unique_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    if not ext:
        ext = ".jpg"
    
    filename = f"{unique_id}{ext}"
    original_path = os.path.join(ORIGINAL_DIR, filename)
    heatmap_filename = f"heatmap_{unique_id}.jpg"
    heatmap_path = os.path.join(HEATMAP_DIR, heatmap_filename)
    report_filename = f"report_{unique_id}.pdf"
    report_path = os.path.join(REPORTS_DIR, report_filename)

    # Save uploaded file locally
    try:
        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded image: {str(e)}")

    # Upload to configured storage
    try:
        from app.core.storage import storage_provider
        original_url = storage_provider.upload_file(original_path, f"original/{filename}")
    except Exception as e:
        print(f"Storage upload failed: {e}")
        original_url = f"/uploads/original/{filename}"

    # Add RetinaImage entry to database
    retina_image = RetinaImage(
        patient_id=patient.id,
        filename=filename,
        file_path=original_url
    )
    db.add(retina_image)
    db.commit()
    db.refresh(retina_image)

    # Run ML Inference / Grad-CAM visual simulation
    try:
        prediction_result = get_prediction(original_path, heatmap_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline failed: {str(e)}")

    # Build recommendations string based on risk classification
    risk = prediction_result["risk_level"]
    is_glauc = prediction_result["is_glaucoma"]
    
    if is_glauc:
        recommendations = (
            "• IMMEDIATE CARE: Schedule a comprehensive eye examination with Dr. Sarah Connor immediately.\n"
            "• Avoid rubbing your eyes, and do not perform heavy lifting or inversion exercises that raise head pressure.\n"
            "• Eye exercise: Perform blinking exercises regularly and look away to reduce eye strain.\n"
            "• Diet adjustments: Limit coffee and high-sodium intakes. Eat fish rich in Omega-3, green tea, and almonds.\n"
            "• Standard check: Keep track of your intraocular pressure (IOP) readings monthly."
        )
    else:
        recommendations = (
            "• Standard prevention: Your optic nerve structure is within normal parameters.\n"
            "• Eye strain care: Implement the 20-20-20 screen rule (look 20 feet away for 20 seconds every 20 minutes).\n"
            "• Healthy nutrition: Continue eating foods high in Vitamins A, C, and E (carrots, leafy greens, berries).\n"
            "• Routine check: Schedule regular preventive eye screenings every 1-2 years."
        )

    # Upload heatmap image to storage
    try:
        heatmap_url = storage_provider.upload_file(heatmap_path, f"heatmaps/{heatmap_filename}")
    except Exception as e:
        print(f"Heatmap upload failed: {e}")
        heatmap_url = f"/uploads/heatmaps/{heatmap_filename}"

    # Add Prediction details to database
    prediction = Prediction(
        image_id=retina_image.id,
        disease_name="Glaucoma",
        is_glaucoma=prediction_result["is_glaucoma"],
        probability=prediction_result["probability"],
        confidence_score=prediction_result["confidence_score"],
        risk_level=prediction_result["risk_level"],
        heatmap_path=heatmap_url,
        recommendations=recommendations
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # Add to PredictionHistory mapping
    history = PredictionHistory(
        patient_id=patient.id,
        prediction_id=prediction.id
    )
    db.add(history)

    # Create Patient demographic dict for PDF
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

    # Generate PDF Report
    try:
        generate_pdf_report(
            pdf_path=report_path,
            patient_info=patient_info_dict,
            prediction_info=prediction_info_dict,
            original_img_path=original_path,
            heatmap_img_path=heatmap_path
        )
    except Exception as e:
        print(f"Failed to generate report PDF: {e}")

    # Upload PDF to storage
    try:
        pdf_rel_path = storage_provider.upload_file(report_path, f"reports/{report_filename}")
    except Exception as e:
        print(f"PDF upload failed: {e}")
        pdf_rel_path = f"/uploads/reports/{report_filename}"

    # Save PDF report record to database
    report = Report(
        patient_id=patient.id,
        prediction_id=prediction.id,
        pdf_path=pdf_rel_path
    )
    db.add(report)
    db.commit()

    # Trigger clinical notifications and emergency check
    try:
        from app.services.notification_service import check_and_notify_emergency
        check_and_notify_emergency(db, prediction, patient.id)
    except Exception as e:
        print(f"Failed to execute notification workflow: {e}")

    prediction.original_image_path = original_url
    return prediction

@router.get("/history", response_model=list[PredictionResponse])
def get_prediction_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        
        # Get history entries
        history_records = db.query(PredictionHistory).filter(PredictionHistory.patient_id == patient.id).all()
        pred_ids = [h.prediction_id for h in history_records]
        preds = db.query(Prediction).filter(Prediction.id.in_(pred_ids)).order_by(Prediction.created_at.desc()).all()
        for p in preds:
            p.original_image_path = p.image.file_path if p.image else ""
        return preds
        
    elif current_user.role == "doctor":
        # Doctors can view history logs (limit for speed)
        preds = db.query(Prediction).order_by(Prediction.created_at.desc()).limit(100).all()
        for p in preds:
            p.original_image_path = p.image.file_path if p.image else ""
        return preds
    else:
        # Admins
        preds = db.query(Prediction).order_by(Prediction.created_at.desc()).all()
        for p in preds:
            p.original_image_path = p.image.file_path if p.image else ""
        return preds

@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction_details(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction details not found")
        
    # Check permissions (only owner patient, doctors or admin can access)
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        history_entry = db.query(PredictionHistory).filter(
            PredictionHistory.prediction_id == prediction_id,
            PredictionHistory.patient_id == patient.id
        ).first()
        if not history_entry:
            raise HTTPException(status_code=403, detail="Access denied. You do not own this prediction record.")

    prediction.original_image_path = prediction.image.file_path if prediction.image else ""
    return prediction

@router.get("/{prediction_id}/report/download")
def download_pdf_report(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.prediction_id == prediction_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="PDF report not found for this prediction.")

    # Permissions check
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if report.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Access denied.")

    # Locate report on disk
    filename = os.path.basename(report.pdf_path)
    file_disk_path = os.path.join(REPORTS_DIR, filename)

    if not os.path.exists(file_disk_path):
        raise HTTPException(status_code=404, detail="PDF file was not found on server disk storage.")

    return FileResponse(
        file_disk_path, 
        media_type="application/pdf", 
        filename=filename
    )

class PredictionOverride(BaseModel):
    is_glaucoma: bool
    risk_level: str
    recommendations: str

@router.put("/{prediction_id}/override", response_model=PredictionResponse)
def override_prediction(
    prediction_id: int,
    override_data: PredictionOverride,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Only doctors can override diagnostics.")

    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    retina_image = prediction.image
    if not retina_image:
        raise HTTPException(status_code=404, detail="Associated retina image record not found.")

    patient = retina_image.patient
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # 1. Update database entry
    prediction.is_glaucoma = override_data.is_glaucoma
    prediction.risk_level = override_data.risk_level
    prediction.recommendations = override_data.recommendations
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"Doctor overrode AI classification on prediction ID {prediction.id}. Result: Glaucoma={override_data.is_glaucoma}, Risk={override_data.risk_level}",
        ip_address="doctor-portal"
    )
    db.add(audit)
    db.commit()
    db.refresh(prediction)

    # 2. Re-compile paths and regenerate PDF Report
    try:
        filename = retina_image.filename
        unique_id = os.path.splitext(filename)[0]
        original_path = os.path.join(ORIGINAL_DIR, filename)
        heatmap_filename = f"heatmap_{unique_id}.jpg"
        if prediction.heatmap_path:
            heatmap_filename = os.path.basename(prediction.heatmap_path)
        heatmap_path = os.path.join(HEATMAP_DIR, heatmap_filename)
        report_filename = f"report_{unique_id}.pdf"
        report_path = os.path.join(REPORTS_DIR, report_filename)

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

        # Check if there is an existing prescription for this prediction to attach to PDF
        from app.models.db_models import Prescription
        presc = db.query(Prescription).filter(Prescription.prediction_id == prediction.id).first()
        presc_dict = None
        if presc:
            d_name = presc.doctor.name if presc.doctor else "Staff Doctor"
            presc_dict = {
                "doctor_name": d_name,
                "medicines": presc.medicines,
                "dosage": presc.dosage,
                "instructions": presc.instructions
            }

        generate_pdf_report(
            pdf_path=report_path,
            patient_info=patient_info_dict,
            prediction_info=prediction_info_dict,
            original_img_path=original_path,
            heatmap_img_path=heatmap_path,
            prescription_info=presc_dict
        )

        # Upload updated report to storage
        from app.core.storage import storage_provider
        pdf_rel_path = storage_provider.upload_file(report_path, f"reports/{report_filename}")
        
        # Update database path of PDF report
        from app.models.db_models import Report as ReportModel
        report_record = db.query(ReportModel).filter(ReportModel.prediction_id == prediction.id).first()
        if report_record:
            report_record.pdf_path = pdf_rel_path
            db.commit()
            
    except Exception as e:
        print(f"Failed to regenerate PDF on override: {e}")

    prediction.original_image_path = retina_image.file_path
    return prediction

