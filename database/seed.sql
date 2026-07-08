-- Glaucoma Detection App Seed Script
USE glaucoma_db;

-- Clear tables (respect foreign keys by disabling checks first)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE doctor_notes;
TRUNCATE TABLE notifications;
TRUNCATE TABLE reports;
TRUNCATE TABLE prescriptions;
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE video_calls;
TRUNCATE TABLE appointments;
TRUNCATE TABLE medical_history;
TRUNCATE TABLE prediction_history;
TRUNCATE TABLE predictions;
TRUNCATE TABLE retina_images;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Users (Password: password123, bcrypt hashed)
-- Hash: $2b$12$e7T32a6nC6JlyQ1tC2v7iOszQ9F7rU/3JmD4kP6wM0s1X.sHq92iG
INSERT INTO users (id, email, password_hash, role) VALUES
(1, 'patient@glaucoma.org', '$2b$12$e7T32a6nC6JlyQ1tC2v7iOszQ9F7rU/3JmD4kP6wM0s1X.sHq92iG', 'patient'),
(2, 'doctor@glaucoma.org', '$2b$12$e7T32a6nC6JlyQ1tC2v7iOszQ9F7rU/3JmD4kP6wM0s1X.sHq92iG', 'doctor'),
(3, 'admin@glaucoma.org', '$2b$12$e7T32a6nC6JlyQ1tC2v7iOszQ9F7rU/3JmD4kP6wM0s1X.sHq92iG', 'admin');

-- 2. Insert Patient Profile
INSERT INTO patients (id, user_id, name, age, gender, phone, blood_pressure, diabetes, family_history, smoking, alcohol, previous_eye_disease) VALUES
(1, 1, 'John Doe', 45, 'Male', '+15550192', '120/80', 'No', 'Yes', 'No', 'Occasional', 'None');

-- 3. Insert Doctor Profile
INSERT INTO doctors (id, user_id, name, specialization, phone, hospital, availability_status, bio) VALUES
(1, 2, 'Dr. Sarah Connor', 'Ophthalmology Specialist', '+15550198', 'Metro Eye Care Clinic', 'Available', 'Dr. Sarah Connor has over 15 years of experience specializing in optic nerve disorders and glaucoma screening.');

-- 4. Insert Medical History
INSERT INTO medical_history (id, patient_id, blood_pressure, diabetes, family_history, smoking, alcohol, previous_eye_disease) VALUES
(1, 1, '120/80', 'No', 'Yes', 'No', 'Occasional', 'None');

-- 5. Insert Sample Appointment
INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, status, type, room_id) VALUES
(1, 1, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), 'pending', 'video', 'room-glaucoma-3928');

-- 6. Insert System Notifications
INSERT INTO notifications (id, user_id, title, message, is_read) VALUES
(1, 1, 'Welcome to Glaucoma EyeCare AI', 'Your account has been successfully registered. You can upload retina scans to check for glaucoma.', FALSE),
(2, 2, 'New Appointment Booking Request', 'Patient John Doe has requested a video consultation session.', FALSE);

-- 7. Insert Audit Logs
INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES
(1, 1, 'User registration', '127.0.0.1'),
(2, 2, 'Doctor registration', '127.0.0.1'),
(3, 3, 'Admin login', '127.0.0.1');
