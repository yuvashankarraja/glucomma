import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'));

  const handleLoginSuccess = (newToken: string, newRole: string, newEmail: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('email', newEmail);
    setToken(newToken);
    setRole(newRole);
    setEmail(newEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    setToken(null);
    setRole(null);
    setEmail(null);
    navigate('/');
  };

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={token ? <Navigate to={`/${role}`} replace /> : <LandingPage />} />
      <Route 
        path="/login" 
        element={token ? <Navigate to={`/${role}`} replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} 
      />

      {/* Patient Routes */}
      <Route 
        path="/patient/*" 
        element={
          token && role === 'patient' ? (
            <Layout userRole="patient" userEmail={email || ''} onLogout={handleLogout}>
              <PatientDashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Doctor Routes */}
      <Route 
        path="/doctor/*" 
        element={
          token && role === 'doctor' ? (
            <Layout userRole="doctor" userEmail={email || ''} onLogout={handleLogout}>
              <DoctorDashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Admin Routes */}
      <Route 
        path="/admin/*" 
        element={
          token && role === 'admin' ? (
            <Layout userRole="admin" userEmail={email || ''} onLogout={handleLogout}>
              <AdminDashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
