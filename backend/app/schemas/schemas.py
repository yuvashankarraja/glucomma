from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str = Field(description="Must be 'patient', 'doctor', or 'admin'")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Patient & Doctor Profiles ---
class PatientProfileUpdate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    blood_pressure: Optional[str] = None
    diabetes: Optional[str] = None
    family_history: Optional[str] = None
    smoking: Optional[str] = None
    alcohol: Optional[str] = None
    previous_eye_disease: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    user_id: int
    name: str
    age: Optional[int]
    gender: Optional[str]
    phone: Optional[str]
    blood_pressure: Optional[str]
    diabetes: Optional[str]
    family_history: Optional[str]
    smoking: Optional[str]
    alcohol: Optional[str]
    previous_eye_disease: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorProfileUpdate(BaseModel):
    name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    hospital: Optional[str] = None
    availability_status: Optional[str] = None
    bio: Optional[str] = None

class DoctorResponse(BaseModel):
    id: int
    user_id: int
    name: str
    specialization: str
    phone: Optional[str]
    hospital: Optional[str]
    availability_status: str
    bio: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Prediction & Report Schemas ---
class PredictionResponse(BaseModel):
    id: int
    image_id: int
    disease_name: str
    is_glaucoma: bool
    probability: float
    confidence_score: float
    risk_level: str
    heatmap_path: Optional[str]
    recommendations: Optional[str]
    original_image_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PredictionHistoryResponse(BaseModel):
    id: int
    patient_id: int
    prediction_id: int
    date: datetime
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: int
    patient_id: int
    prediction_id: int
    pdf_path: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Appointment Schemas ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: datetime
    type: str = "video" # "video", "in-person"

class AppointmentUpdate(BaseModel):
    status: str # "accepted", "rejected"

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    status: str
    type: str
    room_id: Optional[str]
    created_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Prescription Schemas ---
class PrescriptionCreate(BaseModel):
    patient_id: int
    prediction_id: Optional[int] = None
    medicines: str
    dosage: Optional[str] = None
    instructions: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    prediction_id: Optional[int]
    medicines: str
    dosage: Optional[str]
    instructions: Optional[str]
    pdf_path: Optional[str]
    created_at: datetime
    doctor_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Chat & AI Chatbot Schemas ---
class ChatMessageCreate(BaseModel):
    receiver_id: int
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

class AIChatQuery(BaseModel):
    message: str
    prediction_id: Optional[int] = None

class AIChatResponse(BaseModel):
    response: str
    timestamp: datetime

# --- Dashboard & System Analytics ---
class AnalyticsCardSummary(BaseModel):
    total_predictions: int
    glaucoma_predictions: int
    normal_predictions: int
    average_confidence: float
    high_risk_alerts: int
    total_appointments: int

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
