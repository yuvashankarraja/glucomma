from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM
from app.models.db_models import User, Patient, Doctor
from app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, PatientProfileUpdate, PatientResponse, DoctorProfileUpdate, DoctorResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form-compat", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create the user
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize corresponding profile record based on role
    if user_data.role == "patient":
        new_patient = Patient(
            user_id=new_user.id,
            name=user_data.email.split("@")[0].capitalize(),
            age=30,
            gender="Unknown",
            blood_pressure="120/80",
            diabetes="No",
            family_history="No",
            smoking="No",
            alcohol="No",
            previous_eye_disease="None"
        )
        db.add(new_patient)
    elif user_data.role == "doctor":
        new_doctor = Doctor(
            user_id=new_user.id,
            name="Dr. " + user_data.email.split("@")[0].capitalize(),
            specialization="Ophthalmologist",
            availability_status="Available",
            hospital="City Eye Clinic"
        )
        db.add(new_doctor)
        
    db.commit()
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

# Compatibility login endpoint for OAuth2PasswordRequestForm if needed by interactive swagger docs
from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login-compat", response_model=Token, include_in_schema=False)
def login_compat(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/profile/patient", response_model=PatientResponse)
def get_patient_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Access denied. User is not a patient.")
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    return patient

@router.put("/profile/patient", response_model=PatientResponse)
def update_patient_profile(
    profile_data: PatientProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Access denied. User is not a patient.")
    
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
        
    for field, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
        
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/profile/doctor", response_model=DoctorResponse)
def get_doctor_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Access denied. User is not a doctor.")
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")
    return doctor

@router.put("/profile/doctor", response_model=DoctorResponse)
def update_doctor_profile(
    profile_data: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Access denied. User is not a doctor.")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")
        
    for field, value in profile_data.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
        
    db.commit()
    db.refresh(doctor)
    return doctor
