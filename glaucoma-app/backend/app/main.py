import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import engine, Base
from app.api import auth, predictions, appointments, webrtc, analytics, notifications, chatbot

# SQLite initialization helper: Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Glaucoma EyeCare AI Platform API",
    description="Enterprise-grade AI backend featuring CNN diagnostics, Grad-CAM visualization, RAG LLM Chatbot, and WebRTC signaling.",
    version="1.0.0"
)

# CORS Setup: Allow React local frontend server connection
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory as Static File server
# This allows the client to fetch original retina images, heatmaps, and PDFs directly
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(appointments.router)
app.include_router(webrtc.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(chatbot.router)

# Seed database automatically if empty
@app.on_event("startup")
def seed_if_empty():
    from sqlalchemy.orm import Session
    from app.core.database import SessionLocal
    from app.models.db_models import User, Patient, Doctor, MedicalHistory, Notification
    from app.core.security import get_password_hash

    db: Session = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("Database is empty. Seeding initial accounts...")
            
            # Hash password 'password123'
            hashed_pwd = get_password_hash("password123")
            
            # Users
            patient_user = User(email="patient@glaucoma.org", password_hash=hashed_pwd, role="patient")
            doctor_user = User(email="doctor@glaucoma.org", password_hash=hashed_pwd, role="doctor")
            admin_user = User(email="admin@glaucoma.org", password_hash=hashed_pwd, role="admin")
            
            db.add_all([patient_user, doctor_user, admin_user])
            db.commit()
            
            # Patient Profile
            patient = Patient(
                user_id=patient_user.id,
                name="John Doe",
                age=45,
                gender="Male",
                phone="+15550192",
                blood_pressure="120/80",
                diabetes="No",
                family_history="Yes",
                smoking="No",
                alcohol="Occasional",
                previous_eye_disease="None"
            )
            db.add(patient)
            
            # Doctor Profile
            doctor = Doctor(
                user_id=doctor_user.id,
                name="Dr. Sarah Connor",
                specialization="Ophthalmology Specialist",
                phone="+15550198",
                hospital="Metro Eye Care Clinic",
                availability_status="Available",
                bio="Dr. Sarah Connor has over 15 years of experience specializing in optic nerve disorders and glaucoma screening."
            )
            db.add(doctor)
            db.commit()

            # Medical History
            med_hist = MedicalHistory(
                patient_id=patient.id,
                blood_pressure="120/80",
                diabetes="No",
                family_history="Yes",
                smoking="No",
                alcohol="Occasional",
                previous_eye_disease="None"
            )
            db.add(med_hist)

            # Notifications
            notif1 = Notification(
                user_id=patient_user.id,
                title="Welcome to Glaucoma EyeCare AI",
                message="Your account has been successfully registered. You can upload retina scans to check for glaucoma.",
                is_read=False
            )
            notif2 = Notification(
                user_id=doctor_user.id,
                title="Welcome to the Portal",
                message="You can manage patient records and start WebRTC video consultations.",
                is_read=False
            )
            db.add_all([notif1, notif2])
            db.commit()
            
            print("Database successfully seeded.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Glaucoma EyeCare AI Platform API is running."}
