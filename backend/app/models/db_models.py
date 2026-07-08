from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, DateTime, Numeric, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(191), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # 'patient', 'doctor', 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Medical Metrics
    blood_pressure = Column(String(20), nullable=True)
    diabetes = Column(String(10), nullable=True)
    family_history = Column(String(10), nullable=True)
    smoking = Column(String(10), nullable=True)
    alcohol = Column(String(10), nullable=True)
    previous_eye_disease = Column(String(255), nullable=True)
    is_high_priority = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    images = relationship("RetinaImage", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    notes = relationship("DoctorNote", back_populates="patient", cascade="all, delete-orphan")
    prediction_history = relationship("PredictionHistory", back_populates="patient", cascade="all, delete-orphan")
    chat_history = relationship("AIChatHistory", back_populates="patient", cascade="all, delete-orphan")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), default="Ophthalmologist")
    phone = Column(String(20), nullable=True)
    hospital = Column(String(150), nullable=True)
    availability_status = Column(String(50), default="Available")
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")
    notes = relationship("DoctorNote", back_populates="doctor", cascade="all, delete-orphan")

class RetinaImage(Base):
    __tablename__ = "retina_images"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="images")
    predictions = relationship("Prediction", back_populates="image", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("retina_images.id", ondelete="CASCADE"), nullable=False)
    disease_name = Column(String(100), default="Glaucoma")
    is_glaucoma = Column(Boolean, nullable=False)
    probability = Column(Numeric(5, 2), nullable=False)
    confidence_score = Column(Numeric(5, 2), nullable=False)
    risk_level = Column(String(20), nullable=False) # 'Low', 'Moderate', 'High'
    is_emergency = Column(Boolean, default=False)
    heatmap_path = Column(String(255), nullable=True)
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    image = relationship("RetinaImage", back_populates="predictions")
    history_entries = relationship("PredictionHistory", back_populates="prediction", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="prediction")
    reports = relationship("Report", back_populates="prediction", cascade="all, delete-orphan")

class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="prediction_history")
    prediction = relationship("Prediction", back_populates="history_entries")

class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), unique=True, nullable=False)
    blood_pressure = Column(String(20), nullable=True)
    diabetes = Column(String(10), nullable=True)
    family_history = Column(String(10), nullable=True)
    smoking = Column(String(10), nullable=True)
    alcohol = Column(String(10), nullable=True)
    previous_eye_disease = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending") # 'pending', 'accepted', 'rejected'
    type = Column(String(20), default="video") # 'video', 'in-person'
    room_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    calls = relationship("VideoCall", back_populates="appointment", cascade="all, delete-orphan")

class VideoCall(Base):
    __tablename__ = "video_calls"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(String(50), nullable=False)
    duration_seconds = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    appointment = relationship("Appointment", back_populates="calls")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)



class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    medicines = Column(Text, nullable=False)
    dosage = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)
    pdf_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    prediction = relationship("Prediction", back_populates="prescriptions")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False)
    pdf_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    prediction = relationship("Prediction", back_populates="reports")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DoctorNote(Base):
    __tablename__ = "doctor_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="notes")
    doctor = relationship("Doctor", back_populates="notes")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AIChatHistory(Base):
    __tablename__ = "ai_chat_history"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False) # 'user', 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="chat_history")
