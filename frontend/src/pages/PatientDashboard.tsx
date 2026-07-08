import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, Calendar, ShieldAlert, Award, ChevronRight, 
  Dribbble, ArrowUpRight, Download, Activity, CheckCircle, Clock, Video, BookOpen
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

import WebRTCVideoCall from '../components/WebRTCVideoCall';
import AIChatbot from '../components/AIChatbot';

export default function PatientDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Application states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Predictions history
  const [history, setHistory] = useState<any[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);

  // Appointments
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState('1'); // Default to first doctor seed
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      
      // 1. Fetch Analytics Summary
      const summaryRes = await fetch('/api/analytics/patient-summary', { headers });
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummaryData(data);
        if (data.latest_prediction) {
          setSelectedPrediction(data.latest_prediction);
        }
      }

      // 2. Fetch History List
      const historyRes = await fetch('/api/predictions/history', { headers });
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }

      // 3. Fetch Appointments
      const apptRes = await fetch('/api/appointments/', { headers });
      if (apptRes.ok) {
        const data = await apptRes.json();
        setAppointments(data);
      }

      // 4. Fetch Prescriptions
      const prescRes = await fetch('/api/appointments/prescriptions', { headers });
      if (prescRes.ok) {
        const data = await prescRes.json();
        setPrescriptions(data);
      }

    } catch (e) {
      console.error(e);
    }
  };

  // Image Drag & Drop handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Simulate progress bar movement
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 80 ? prev + 15 : prev));
    }, 200);

    try {
      const res = await fetch('/api/predictions/predict', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.ok) {
        const data = await res.json();
        setSelectedPrediction(data);
        setSelectedFile(null);
        setFilePreview(null);
        // Refresh metrics
        fetchDashboardData();
      } else {
        const err = await res.json();
        alert(err.detail || "Prediction failure.");
      }
    } catch (e) {
      alert("Network transmission error occurred.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) return;

    try {
      const res = await fetch('/api/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          doctor_id: parseInt(bookingDoctor),
          appointment_date: bookingDate,
          type: 'video'
        })
      });

      if (res.ok) {
        setBookingDate('');
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
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

  // UI styling calculations
  const getRiskColor = (risk: string) => {
    if (risk === 'High') return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
    if (risk === 'Moderate') return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900';
    return 'text-green-500 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
  };

  // Sub-routes view renderer
  const renderContent = () => {
    switch (path) {
      case '/patient/predict':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
            {/* Left Column: Image Upload & Prediction Result Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-teal-500" /> Upload Retinal Fundus Scan
                </h3>
                
                <div className="border-2 border-dashed border-slate-100 dark:border-zinc-850 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative hover:border-teal-500/50 transition-all bg-slate-50/50 dark:bg-zinc-950/30">
                  {!filePreview ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center mb-3">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">Drag & drop retina fundus scan here</p>
                      <p className="text-[10px] text-gray-400 mt-1">Accepts JPG, JPEG, and PNG formats (max size 10MB)</p>
                      
                      <label className="mt-4 px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 hover:dark:bg-zinc-700/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer dark:text-white shadow-sm transition-all hover:scale-[1.02]">
                        Browse File
                        <input type="file" onChange={handleFileSelect} className="hidden" accept="image/*" />
                      </label>
                    </>
                  ) : (
                    <div className="space-y-4 w-full max-w-sm">
                      <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
                        <img src={filePreview} className="w-full h-full object-contain" alt="Retina preview" />
                      </div>
                      
                      {uploading ? (
                        <div className="space-y-2">
                          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-teal-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400">Processing CNN classification weights...</p>
                        </div>
                      ) : (
                        <div className="flex gap-3 justify-center">
                          <button 
                            onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                            className="px-4 py-2 text-[10px] font-bold text-red-500 border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={triggerUpload}
                            className="px-4 py-2 text-[10px] font-bold bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02]"
                          >
                            Start Diagnostic Predict
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Prediction Result panel */}
              {selectedPrediction ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">AI Diagnostic report summary</h3>
                      <span className="text-[10px] text-gray-400">Scanned on {new Date(selectedPrediction.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                    
                    <button 
                      onClick={() => downloadReportPDF(selectedPrediction.id, new Date(selectedPrediction.created_at || Date.now()).toLocaleDateString())}
                      className="px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Report
                    </button>
                  </div>

                  {/* Grid: Stats & Speedometer */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Speedometer card */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-center h-full shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prediction Probability</span>
                      <div className="relative w-36 h-20 flex items-center justify-center overflow-hidden mt-3">
                        <div className="absolute inset-0 w-36 h-36 border-[12px] border-slate-100 dark:border-slate-800 rounded-full" />
                        <div 
                          className={`absolute inset-0 w-36 h-36 border-[12px] rounded-full transform -rotate-180 origin-center transition-all ${
                            selectedPrediction.is_glaucoma ? 'border-red-500' : 'border-teal-500'
                          }`}
                          style={{ transform: `rotate(${-180 + (selectedPrediction.probability * 1.8)}deg)` }}
                        />
                        <div className="absolute bottom-0 text-center">
                          <h4 className="text-2xl font-black text-gray-900 dark:text-white">{selectedPrediction.probability}%</h4>
                          <span className="text-[9px] font-semibold text-gray-400">IOP pressure index</span>
                        </div>
                      </div>
                    </div>

                    {/* General parameters */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                          <span className="text-[9px] text-gray-400 uppercase block font-semibold">Detection Result</span>
                          <p className={`text-xs font-bold mt-1 ${selectedPrediction.is_glaucoma ? 'text-red-500' : 'text-teal-500'}`}>
                            {selectedPrediction.is_glaucoma ? 'Glaucoma Detected' : 'Normal / No Glaucoma'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                          <span className="text-[9px] text-gray-400 uppercase block font-semibold">Model Confidence</span>
                          <p className="text-xs font-bold mt-1 text-slate-900 dark:text-white">{selectedPrediction.confidence_score}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                          <span className="text-[9px] text-gray-400 uppercase block font-semibold">Risk Level</span>
                          <p className="text-xs font-bold mt-1 text-slate-900 dark:text-white">{selectedPrediction.risk_level}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-xl text-center shadow-sm">
                          <span className="text-[9px] text-gray-400 uppercase block font-semibold">Image ID</span>
                          <p className="text-[10px] font-bold mt-1 text-slate-900 dark:text-white truncate">IMG-{selectedPrediction.image_id || '001'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-side Images (Original vs Heatmap) */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ocular Diagnostic Imaging</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="aspect-video bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
                          <img 
                            src={selectedPrediction.original_image_path} 
                            className="w-full h-full object-contain" 
                            onError={(e: any) => { e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400"; }}
                            alt="Original fundus scan"
                          />
                        </div>
                        <p className="text-[10px] text-center text-gray-400">1. Original Retinal Fundus Scan</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="aspect-video bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center">
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
                  </div>

                  {/* Recommendations and Lifestyle modifications */}
                  <div className="bg-teal-50/40 dark:bg-teal-950/20 border-l-4 border-teal-500 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> AI Recommendations & Precautions
                    </span>
                    <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {selectedPrediction.recommendations}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-10 text-center text-gray-400 shadow-sm">
                  Upload a retinal fundus image above to run classification diagnostics and construct Grad-CAM visual heatmaps.
                </div>
              )}
            </div>

            {/* Right Column: Scan History List */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-500" /> Screening Scan History
                </h3>
                
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No previous screenings run.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {history.map((pred) => {
                      const isSelected = selectedPrediction?.id === pred.id;
                      return (
                        <button
                          key={pred.id}
                          onClick={() => setSelectedPrediction(pred)}
                          className={`w-full p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left border transition-all ${
                            isSelected 
                              ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/60 shadow-sm' 
                              : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-slate-100 dark:border-zinc-850'
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">Scan Date: {new Date(pred.created_at).toLocaleDateString()}</h4>
                            <p className="text-[9px] text-gray-400">Confidence: {pred.confidence_score}% • ID: IMG-{pred.image_id || '001'}</p>
                          </div>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full capitalize ${getRiskColor(pred.risk_level)}`}>
                            {pred.risk_level}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case '/patient/appointments':
        return (
          <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-6">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-500" /> Book Consultations & View Appointments
              </h3>

              {/* Book form */}
              <form onSubmit={handleBooking} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Book Telehealth Video consultation</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Select Specialist</label>
                    <select
                      value={bookingDoctor}
                      onChange={(e) => setBookingDoctor(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                    >
                      <option value="1">Dr. Sarah Connor (Ophthalmology Specialist)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Consultation Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/20 active:scale-95 transition-all"
                >
                  Request Appointment Slot
                </button>
              </form>

              {/* Bookings Queue */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">My Booked Sessions</span>
                
                {appointments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No appointments scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-4 shadow-sm animate-fade-in">
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{appt.doctor_name}</h4>
                          <p className="text-[10px] text-gray-400">{new Date(appt.appointment_date).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            appt.status === 'accepted' ? 'bg-green-50 text-green-500 border border-green-200 dark:bg-green-950/20 dark:border-green-900' : appt.status === 'rejected' ? 'bg-red-50 text-red-500 border border-red-200 dark:bg-red-950/20 dark:border-red-900' : 'bg-amber-50 text-amber-500 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                          }`}>
                            {appt.status}
                          </span>
                          
                          {appt.status === 'accepted' && (
                            <button
                              onClick={() => setActiveCallRoom(appt.room_id)}
                              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02]"
                              title="Join Consultation Video Call"
                            >
                              <Video className="w-3.5 h-3.5" /> Join Room
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case '/patient/prescriptions':
        return (
          <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" /> Clinic Doctors Prescriptions
              </h3>

              {prescriptions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No active clinician prescriptions logged to your medical history.</p>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((presc) => (
                    <div key={presc.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-800 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">Written By: {presc.doctor_name}</h4>
                          <span className="text-[9px] text-gray-400">Date Issued: {new Date(presc.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {presc.prediction_id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const pred = history.find(h => h.id === presc.prediction_id);
                                if (pred) {
                                  setSelectedPrediction(pred);
                                  navigate('/patient/predict');
                                }
                              }}
                              className="text-[9.5px] text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                            >
                              View Retina Scan
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              onClick={() => downloadReportPDF(presc.prediction_id, new Date(presc.created_at).toLocaleDateString())}
                              className="text-[9.5px] text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center gap-0.5"
                            >
                              <Download className="w-3 h-3" /> Report PDF
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs leading-normal space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-zinc-950/20 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                          <p className="text-gray-700 dark:text-gray-300"><b>💊 Medicines:</b> <br/> <span className="text-[11px] font-semibold text-slate-800 dark:text-white">{presc.medicines}</span></p>
                          <p className="text-gray-700 dark:text-gray-300"><b>⏱️ Dosage:</b> <br/> <span className="text-[11px] font-semibold text-slate-800 dark:text-white">{presc.dosage}</span></p>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] pl-1"><b>📝 Instructions & Guidelines:</b> <br/> {presc.instructions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case '/patient':
      default:
        return (
          <div className="space-y-6 animate-slide-up">
            {/* Active Appointment Alert Banner */}
            {appointments.find(a => a.status === 'accepted') && (
              <div className="bg-teal-500 text-white p-4.5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-teal-500/15 border border-teal-400">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg animate-bounce">
                    📞
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Live Telehealth Consultation is Ready!</h4>
                    <p className="text-[10px] text-teal-100 mt-0.5">Your doctor is waiting. Click to join the secure HD video consult room.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveCallRoom(appointments.find(a => a.status === 'accepted').room_id)}
                  className="px-4 py-2 bg-white text-teal-600 hover:bg-teal-50 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 shrink-0"
                >
                  Join Call Now
                </button>
              </div>
            )}

            {/* Top Banner Greeting */}
            <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-100 dark:border-zinc-850 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Welcome back to EyeCare Portal</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Glaucoma diagnostics screening agent powered by deep convolutional networks.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-xs bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-zinc-800 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm">
                  <Activity className="w-3.5 h-3.5 text-teal-500" /> Normal-tension IOP
                </span>
                <span className="text-xs bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-zinc-800 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> HIPAA Secured
                </span>
              </div>
            </div>

            {/* Cards summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Reports Count */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Scans Uploaded</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{summaryData?.total_reports || 0}</h3>
                  <span className="text-[10px] text-teal-500 font-bold">Reports</span>
                </div>
              </div>

              {/* Current Risk Status */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">My Glaucoma Risk</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className={`text-2xl font-black uppercase ${
                    summaryData?.risk_status === 'High' ? 'text-red-500' : summaryData?.risk_status === 'Moderate' ? 'text-amber-500' : 'text-green-500'
                  }`}>
                    {summaryData?.risk_status || 'None'}
                  </h3>
                </div>
              </div>

              {/* Assigned Doctor */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Doctor</span>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate mt-1">
                    {summaryData?.assigned_doctor || 'Dr. Sarah Connor'}
                  </h3>
                </div>
                <p className="text-[9px] text-gray-400">Ophthalmology Specialist</p>
              </div>

              {/* Upcoming Teleconsultation */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Next Appointment</span>
                  <h3 className="text-[11px] font-bold text-gray-900 dark:text-white truncate mt-1">
                    {summaryData?.upcoming_appointment ? new Date(summaryData.upcoming_appointment).toLocaleString() : 'No booked appointments'}
                  </h3>
                </div>
                <p className="text-[9px] text-teal-500">Virtual Video Room</p>
              </div>
            </div>

            {/* Recharts graph panel */}
            {summaryData?.chart_data?.length > 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Intraocular diagnostic metric trend</h3>
                  <p className="text-[10px] text-gray-400">Probability of Glaucoma levels recorded over successive uploads.</p>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summaryData.chart_data}>
                      <defs>
                        <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
                      <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', background: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                      <Area type="monotone" dataKey="probability" name="Probability %" stroke="#10b981" fillOpacity={1} fill="url(#colorProb)" strokeWidth={3} isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-10 text-center text-gray-400 shadow-sm">
                No diagnostic trend data. Run your first retina scan screening to construct metrics charting.
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      
      {/* RTC Consultation Video overlay */}
      {activeCallRoom && (
        <WebRTCVideoCall
          roomId={activeCallRoom}
          role="patient"
          onClose={() => setActiveCallRoom(null)}
        />
      )}

      {/* Floating AI Ophthalmology Chatbot */}
      <AIChatbot predictionId={selectedPrediction?.id} />
    </div>
  );
}
