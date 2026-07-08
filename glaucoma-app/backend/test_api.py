import os
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test environment variables
os.environ["SECRET_KEY"] = "testsecretkey123"
os.environ["DATABASE_URL"] = "sqlite:///./test_glaucoma.db"
os.environ["STORAGE_PROVIDER"] = "local"

from app.main import app
from app.core.database import Base, get_db
from app.models.db_models import User, Patient, Doctor, Prediction, RetinaImage, Notification, Appointment, Report

# Create test database
engine = create_engine("sqlite:///./test_glaucoma.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_full_application_workflow():
    print("===================================================")
    print("  GLAUCOMA EYECARE PLATFORM - INTEGRATION TESTING")
    print("===================================================\n")

    # 1. Clean up database
    db = TestingSessionLocal()
    db.query(User).delete()
    db.query(Notification).delete()
    db.commit()
    db.close()

    # 2. Register Patient
    print("[1/8] Registering Patient...")
    reg_res = client.post("/api/auth/register", json={
        "email": "test_patient@eye.org",
        "password": "password123",
        "role": "patient"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    print("-> Patient registered successfully.")

    # 3. Login Patient
    print("\n[2/8] Logging in Patient...")
    login_res = client.post("/api/auth/login", json={
        "email": "test_patient@eye.org",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("-> Patient logged in. Token acquired.")

    # 4. Update Patient Profile
    print("\n[3/8] Updating Patient Profile...")
    profile_res = client.put("/api/auth/profile/patient", headers=headers, json={
        "name": "Jane Doe",
        "age": 34,
        "gender": "Female",
        "phone": "+123456789",
        "blood_pressure": "115/75",
        "diabetes": "No",
        "family_history": "Yes",
        "smoking": "No",
        "alcohol": "Occasional",
        "previous_eye_disease": "None"
    })
    assert profile_res.status_code == 200, f"Profile update failed: {profile_res.text}"
    print(f"-> Profile updated. Name: {profile_res.json()['name']}, Family History: {profile_res.json()['family_history']}")

    # 5. Register & Login Doctor
    print("\n[4/8] Setting up Doctor Profile...")
    doc_reg = client.post("/api/auth/register", json={
        "email": "test_doctor@eye.org",
        "password": "password123",
        "role": "doctor"
    })
    assert doc_reg.status_code == 200
    doc_login = client.post("/api/auth/login", json={
        "email": "test_doctor@eye.org",
        "password": "password123"
    })
    assert doc_login.status_code == 200
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    print("-> Doctor registered and logged in.")

    # 6. Upload Retina Scan & AI Inference
    print("\n[5/8] Uploading retinal scan and executing AI model prediction...")
    import cv2
    import numpy as np
    canvas = np.zeros((400, 400, 3), dtype=np.uint8)
    cv2.circle(canvas, (200, 200), 180, (15, 35, 120), -1)
    cv2.circle(canvas, (250, 200), 40, (120, 220, 255), -1)
    _, buf = cv2.imencode('.png', canvas)
    dummy_image = buf.tobytes()
    file_payload = {"file": ("test_scan.png", io.BytesIO(dummy_image), "image/png")}
    
    pred_res = client.post("/api/predictions/predict", headers=headers, files=file_payload)
    assert pred_res.status_code == 200, f"Prediction failed: {pred_res.text}"
    pred_data = pred_res.json()
    prediction_id = pred_data["id"]
    print("-> AI Screening Completed.")
    print(f"   Diagnosis: {'Glaucoma Detected' if pred_data['is_glaucoma'] else 'Normal'}")
    print(f"   Risk level: {pred_data['risk_level']}")
    print(f"   Probability: {pred_data['probability']}%")
    print(f"   Original scan URL: {pred_data['original_image_path']}")
    print(f"   Heatmap overlay URL: {pred_data['heatmap_path']}")

    # 7. Check Database Notifications & In-App Alerts
    print("\n[6/8] Checking Patient Alerts and Notifications...")
    notif_res = client.get("/api/notifications/", headers=headers)
    assert notif_res.status_code == 200
    notifications = notif_res.json()
    print(f"-> Total Patient Notifications: {len(notifications)}")
    for n in notifications[:2]:
        print(f"   * [{n['title']}]: {n['message']}")

    # 8. Doctor Overrides AI Diagnosis
    print("\n[7/8] Testing Doctor Review & Override workflow...")
    override_res = client.put(
        f"/api/predictions/{prediction_id}/override",
        headers=doc_headers,
        json={
            "is_glaucoma": False,
            "risk_level": "Low",
            "recommendations": "Doctor overrode diagnostic: healthy optic nerve head structure, no signs of disk cupping."
        }
    )
    assert override_res.status_code == 200, f"Override failed: {override_res.text}"
    overridden_data = override_res.json()
    print("-> Doctor Override Completed successfully.")
    print(f"   Updated Diagnosis: {'Glaucoma Detected' if overridden_data['is_glaucoma'] else 'Normal'}")
    print(f"   Updated Risk level: {overridden_data['risk_level']}")
    print(f"   Updated recommendations: {overridden_data['recommendations']}")

    # 9. Book and manage Teleconsultations
    print("\n[8/8] Testing Appointment Booking and Cancellation...")
    
    # Book
    book_res = client.post("/api/appointments/", headers=headers, json={
        "doctor_id": 2, # Doctor profile auto-created is ID 2 (patient was ID 1)
        "appointment_date": "2026-07-01T10:00:00",
        "type": "video"
    })
    assert book_res.status_code == 200, f"Booking failed: {book_res.text}"
    appt_id = book_res.json()["id"]
    print(f"-> Patient booked appointment ID: {appt_id}")

    # Cancel
    cancel_res = client.put(f"/api/appointments/{appt_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200, f"Cancellation failed: {cancel_res.text}"
    print(f"-> Appointment successfully cancelled. Status: {cancel_res.json()['status']}")

    print("\n===================================================")
    print("  INTEGRATION TESTING COMPLETED: ALL TESTS PASSED!")
    print("===================================================\n")

if __name__ == "__main__":
    test_full_application_workflow()
    
    # Cleanup DB file
    try:
        os.remove("test_glaucoma.db")
    except Exception:
        pass
