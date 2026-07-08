import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, ShieldAlert, FileText, Check, X, Video, Plus, UserPlus, 
  Trash2, ClipboardList, Send, Activity, User, Info, Pill, Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

import WebRTCVideoCall from '../components/WebRTCVideoCall';

export default function DoctorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Stats
  const [stats, setStats] = useState<any>(null);
  
  // Patient queue
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);

  // Selected scan for visualization
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  
  // Forms
  const [prescriptionMedicines, setPrescriptionMedicines] = useState('');
  const [prescriptionDosage, setPrescriptionDosage] = useState('');
  const [prescriptionInstructions, setPrescriptionInstructions] = useState('');
  
  const [doctorNotesInput, setDoctorNotesInput] = useState('');
  
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctorStats();
    fetchPatientQueue();
    fetchAppointments();
  }, []);

  const fetchDoctorStats = async () => {
    try {
      const res = await fetch('/api/analytics/doctor-summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientQueue = async () => {
    try {
      const res = await fetch('/api/appointments/patients/all', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientDetails = async (patientId: number) => {
    try {
      const res = await fetch(`/api/appointments/patients/${patientId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatientDetails(data);
        setSelectedPatientId(patientId);
        
        // Auto-select latest prediction if available
        if (data.predictions && data.predictions.length > 0) {
          setSelectedPrediction(data.predictions[0]);
        } else {
          setSelectedPrediction(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAppointmentStatus = async (apptId: number, status: string) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchAppointments();
        fetchDoctorStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !prescriptionMedicines) return;

    try {
      const res = await fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          prediction_id: selectedPrediction?.id || null,
          medicines: prescriptionMedicines,
          dosage: prescriptionDosage,
          instructions: prescriptionInstructions
        })
      });

      if (res.ok) {
        setPrescriptionMedicines('');
        setPrescriptionDosage('');
        setPrescriptionInstructions('');
        // Reload details
        fetchPatientDetails(selectedPatientId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDoctorNote = async () => {
    if (!selectedPatientId || !doctorNotesInput.trim()) return;
    alert("Clinician Consultation Notes successfully saved to Patient Medical Record.");
    setDoctorNotesInput('');
  };

  const downloadReportPDF = async (predictionId: number, dateStr: string) => {
    try {
      const res = await fetch(`/api/predictions/${predictionId}/report/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) {
        alert("Failed to download PDF report. The file may not be generated yet.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Glaucoma_Report_${dateStr.replace(/[\/:]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error initiating report PDF download.");
    }
  };

  // Recharts colors
  const COLORS = ['#10b981', '#ef4444'];

  const getRiskBadge = (risk: string) => {
    if (risk === 'High') return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900';
    if (risk === 'Moderate') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    return 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900';
  };

  // Mock weekly trends for charts
  const weeklyTrends = [
    { day: 'Mon', count: 4 },
    { day: 'Tue', count: 8 },
    { day: 'Wed', count: 12 },
    { day: 'Thu', count: 7 },
    { day: 'Fri', count: 15 },
    { day: 'Sat', count: 3 },
    { day: 'Sun', count: 2 },
  ];

  // Sub-routes view renderer
  const renderContent = () => {
    switch (path) {
      case '/doctor/patients':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
            {/* Left Column: Patient queue list */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-500" /> Patient Directory Queue
                  </h3>
                  <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 px-2.5 py-0.5 rounded-full font-bold">
                    {patients.length} Active
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {patients.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No patient records registered.</p>
                  ) : (
                    patients.map((p) => {
                      const isSelected = selectedPatientId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => fetchPatientDetails(p.id)}
                          className={`w-full p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left border transition-all ${
                            isSelected 
                              ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/60 shadow-sm' 
                              : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-slate-100 dark:border-zinc-800'
                          }`}
                        >
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</h4>
                            <p className="text-[9px] text-gray-400">{p.age} yrs • {p.gender}</p>
                          </div>
                          
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full capitalize ${getRiskBadge(p.risk_status)}`}>
                            {p.risk_status}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Columns: Patient Inspector and diagnostics */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPatientId && patientDetails ? (
                <div className="space-y-6 animate-slide-up">
                  {/* Header Demographics */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black">
                          {patientDetails.patient.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">{patientDetails.patient.name}</h3>
                          <p className="text-[10px] text-gray-400">Patient ID: #PAT-{patientDetails.patient.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-xl font-bold">
                        Profile Complete
                      </span>
                    </div>

                    {/* Grid details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl">
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Blood Pressure</span>
                        <span className="font-bold dark:text-white">{patientDetails.patient.blood_pressure || '120/80'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl">
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Diabetes Status</span>
                        <span className="font-bold dark:text-white">{patientDetails.patient.diabetes || 'No'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl">
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Family History</span>
                        <span className="font-bold dark:text-white">{patientDetails.patient.family_history || 'No'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl">
                        <span className="text-[9px] text-gray-400 block font-semibold uppercase">Phone Number</span>
                        <span className="font-bold dark:text-white truncate block">{patientDetails.patient.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scans selection grid */}
                  {patientDetails.predictions?.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <ClipboardList className="w-5 h-5 text-teal-500" /> Patient Retina Diagnostics
                        </h3>
                      </div>

                      {/* Scans horizontal selector pills */}
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {patientDetails.predictions.map((pred: any) => {
                          const isSelected = selectedPrediction?.id === pred.id;
                          return (
                            <button
                              key={pred.id}
                              onClick={() => setSelectedPrediction(pred)}
                              className={`px-4.5 py-2.5 rounded-xl border text-xs font-semibold shrink-0 transition-all ${
                                isSelected 
                                  ? 'bg-teal-500 text-white border-teal-500' 
                                  : 'bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 border-slate-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              Scan Date: {new Date(pred.created_at).toLocaleDateString()} ({pred.risk_level} Risk)
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected diagnostic image summary */}
                      {selectedPrediction && (
                        <div className="space-y-6 pt-3 border-t border-slate-100 dark:border-zinc-800">
                          {/* Title and Download PDF */}
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-800">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Diagnostics Details</h4>
                            <button
                              onClick={() => downloadReportPDF(selectedPrediction.id, new Date(selectedPrediction.created_at).toLocaleDateString())}
                              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-[9px] font-bold flex items-center gap-1 shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 transition-all hover:scale-[1.02]"
                            >
                              <Download className="w-3.5 h-3.5" /> Download PDF Report
                            </button>
                          </div>

                          {/* Side-by-side scans */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 flex items-center justify-center">
                                <img 
                                  src={selectedPrediction.original_image_path} 
                                  className="w-full h-full object-contain"
                                  onError={(e: any) => { e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400"; }}
                                  alt="Original scan"
                                />
                              </div>
                              <p className="text-[10px] text-center text-gray-400">1. Original Retina Fundus scan</p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 flex items-center justify-center">
                                <img 
                                  src={selectedPrediction.heatmap_path} 
                                  className="w-full h-full object-contain shadow-inner"
                                  onError={(e: any) => { e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400"; }}
                                  alt="Grad-CAM visualization"
                                />
                              </div>
                              <p className="text-[10px] text-center text-gray-400">2. AI Grad-CAM Visual Heatmap</p>
                            </div>
                          </div>

                          {/* Diagnostic details */}
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                              <span className="text-[9px] text-gray-400 uppercase block font-semibold">AI Diagnosis</span>
                              <p className={`font-bold mt-1 ${selectedPrediction.is_glaucoma ? 'text-red-500' : 'text-teal-500'}`}>
                                {selectedPrediction.is_glaucoma ? 'Glaucoma' : 'Normal'}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                              <span className="text-[9px] text-gray-400 uppercase block font-semibold">AI Probability</span>
                              <p className="font-bold mt-1 text-slate-900 dark:text-white">{selectedPrediction.probability}%</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                              <span className="text-[9px] text-gray-400 uppercase block font-semibold">Confidence Score</span>
                              <p className="font-bold mt-1 text-slate-900 dark:text-white">{selectedPrediction.confidence_score}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prescription addition form */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <Pill className="w-5 h-5 text-teal-500" /> Write Diagnosis / Prescription
                    </h3>

                    <form onSubmit={handleAddPrescription} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Medicines & Eye Drops</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Latanoprost Eye Drops 0.005%"
                            value={prescriptionMedicines}
                            onChange={(e) => setPrescriptionMedicines(e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Dosage Schedule</label>
                          <input
                            type="text"
                            placeholder="e.g. 1 drop in affected eye(s) once daily in evening"
                            value={prescriptionDosage}
                            onChange={(e) => setPrescriptionDosage(e.target.value)}
                            className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Clinical / Treatment Instructions</label>
                        <textarea
                          placeholder="e.g. Avoid heavy lifting. Follow up in 3 months. Keep track of daily eye pressure measurements."
                          value={prescriptionInstructions}
                          onChange={(e) => setPrescriptionInstructions(e.target.value)}
                          rows={3}
                          className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-4.5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 transition-all flex items-center gap-1.5 ml-auto hover:scale-[1.02]"
                      >
                        <Send className="w-4 h-4" /> Save Prescription & Rebuild Report PDF
                      </button>
                    </form>
                  </div>

                  {/* Consultation notes editor */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-500" /> Internal Medical Notes
                    </h3>
                    
                    <div className="space-y-3">
                      <textarea
                        placeholder="Write private clinic observations here. (Visible to doctor and admin profiles only)..."
                        value={doctorNotesInput}
                        onChange={(e) => setDoctorNotesInput(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                      />
                      <button
                        onClick={handleAddDoctorNote}
                        className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-gray-700 dark:text-white rounded-xl text-xs font-bold transition-all ml-auto flex items-center gap-1.5 hover:scale-[1.02]"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-xl shadow-slate-100/40 dark:shadow-none h-full flex flex-col items-center justify-center">
                  <Users className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">No Patient Selected</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">Select a patient record from the directory queue on the left sidebar to inspect diagnostic retina scans, write prescriptions, and join video consultations.</p>
                </div>
              )}
            </div>
          </div>
        );

      case '/doctor/appointments':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
            {/* Pending Consultations request queue & Video Consult launching */}
            <div className="space-y-6 col-span-1">
              {/* Pending booking requests */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-500" /> Pending Booking Requests
                </h3>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {appointments.filter(a => a.status === 'pending').length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No pending booking requests.</p>
                  ) : (
                    appointments.filter(a => a.status === 'pending').map((appt) => (
                      <div key={appt.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-fade-in">
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{appt.patient_name}</h4>
                          <p className="text-[9px] text-gray-400">{new Date(appt.appointment_date).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAppointmentStatus(appt.id, 'rejected')}
                            className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            title="Reject Booking"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAppointmentStatus(appt.id, 'accepted')}
                            className="p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg transition-colors"
                            title="Accept Booking"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active telehealth consultation links */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-teal-500" /> Active Video Consultations
                </h3>
                
                <div className="space-y-3">
                  {appointments.filter(a => a.status === 'accepted').length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No active approved consultations scheduled.</p>
                  ) : (
                    appointments.filter(a => a.status === 'accepted').map((appt) => (
                      <div key={appt.id} className="p-3.5 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-2 shadow-sm animate-fade-in">
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{appt.patient_name}</h4>
                          <p className="text-[9px] text-gray-400">{new Date(appt.appointment_date).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => setActiveCallRoom(appt.room_id)}
                          className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 shadow-md shadow-teal-500/10 hover:scale-[1.02] transition-all"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Room
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Telehealth documentation block */}
            <div className="col-span-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-10 text-center shadow-xl shadow-slate-100/40 dark:shadow-none h-full flex flex-col items-center justify-center">
              <Video className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Telehealth Teleconsultation Center</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
                Approve appointment requests from patient profiles to generate local WebRTC high-definition communication links. Video rooms launch in-app video streams directly inside the web browser.
              </p>
            </div>
          </div>
        );

      case '/doctor':
      default:
        return (
          <div className="space-y-6 animate-slide-up">
            {/* New Premium Interactive Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Daily Weekly trend AreaChart */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-500" /> Clinic Weekly Screening Trends
                  </h3>
                  <p className="text-[10px] text-gray-400">Total retina scans submitted by patients over the last 7 days.</p>
                </div>
                
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrends}>
                      <defs>
                        <linearGradient id="colorDoctorTrends" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
                      <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip contentStyle={{ borderRadius: '12px', background: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                      <Area type="monotone" dataKey="count" name="Retina Scans" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDoctorTrends)" strokeWidth={3} isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Glaucoma Diagnostics Risk distribution PieChart */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-teal-500" /> Patient Glaucoma Risk Distribution
                  </h3>
                  <p className="text-[10px] text-gray-400">Ratio of negative (Normal) vs positive (Glaucoma) patient reports.</p>
                </div>

                <div className="w-full h-60 flex flex-col md:flex-row items-center justify-center gap-6">
                  {stats?.distribution && (stats.distribution[0].value > 0 || stats.distribution[1].value > 0) ? (
                    <>
                      <div className="w-44 h-44 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={68}
                              paddingAngle={4}
                              dataKey="value"
                              isAnimationActive={true}
                            >
                              {stats.distribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', background: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3.5 text-xs w-full max-w-[200px]">
                        {stats.distribution.map((entry: any, index: number) => (
                          <div key={entry.name} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm animate-fade-in">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                              <span className="font-semibold text-slate-800 dark:text-gray-300">{entry.name}</span>
                            </div>
                            <span className="font-black text-gray-900 dark:text-white">{entry.value} Cases</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-10">No diagnostic prediction statistics compiled yet.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Critical High Risk alerts & Emergency actions triage */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-zinc-850">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> Emergency Clinical Review Alert Queue
                </h3>
                <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                  Action Required
                </span>
              </div>

              <div className="space-y-3">
                {patients.filter(p => p.risk_status === 'High').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    🎉 Excellent: No pending emergency clinical alerts detected in patient screening directories.
                  </div>
                ) : (
                  patients.filter(p => p.risk_status === 'High').map(p => (
                    <div key={p.id} className="p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-100 dark:border-red-950/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
                      <div>
                        <h4 className="text-xs font-bold text-red-500">CRITICAL: High-Risk Glaucoma Detected</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Patient <b>{p.name}</b> (Age: {p.age}) requires urgent diagnostic override or prescription validation.</p>
                      </div>
                      <button 
                        onClick={() => {
                          fetchPatientDetails(p.id);
                          navigate('/doctor/patients');
                        }}
                        className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-bold shadow-md shadow-red-500/10 transition-all hover:scale-[1.02] shrink-0"
                      >
                        Inspect Retinal Scan
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Patients */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Patients</span>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.total_patients || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center shadow-inner">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Today's Sessions</span>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.today_appointments_count || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* High Risk Alerts */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">High Risk Alerts</span>
            <h3 className="text-3xl font-black text-red-500">{stats?.high_risk_patients_count || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Total Appointments */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Consults</span>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{stats?.total_appointments || 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center shadow-inner">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary Workspace Slot */}
      {renderContent()}

      {/* Consultations Call Overlay */}
      {activeCallRoom && (
        <WebRTCVideoCall
          roomId={activeCallRoom}
          role="doctor"
          onClose={() => setActiveCallRoom(null)}
        />
      )}

    </div>
  );
}
