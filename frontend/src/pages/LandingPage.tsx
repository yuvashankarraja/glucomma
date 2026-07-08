import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Video, ShieldAlert, Cpu, Heart, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { title: 'AI-Powered Diagnostics', desc: 'Screen for glaucoma instantly using deep learning convolutional neural network models.', icon: ShieldAlert },
    { title: 'Grad-CAM Heatmaps', desc: 'Observe visual explanations of diagnostic indicators mapped to optic cup/disc structural changes.', icon: Cpu },
    { title: 'RAG Medical Copilot', desc: 'Ask specific questions about eye exercises, dietary safety, and screening probability metrics.', icon: ShieldCheck },
    { title: 'HD Telehealth Consulates', desc: 'Initiate low-latency WebRTC video consulting sessions with clinic ophthalmologists.', icon: Video }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-between text-gray-800 dark:text-gray-200">
      
      {/* Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-white text-lg">👁️</div>
          <span className="font-bold text-gray-900 dark:text-white text-lg">EyeCare AI</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/login')} 
            className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-teal-500 hover:dark:text-teal-400 transition-all"
          >
            Portal Login
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="text-sm bg-teal-500 text-white font-semibold px-4.5 py-2 rounded-xl hover:bg-teal-600 shadow-md shadow-teal-500/20 active:scale-95 transition-all"
          >
            Get Screened
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-1">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5" /> Next-Generation Medical screening
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white leading-tight">
            AI-Driven <br/>
            <span className="bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">Glaucoma Screening</span> <br/>
            & Consultations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed text-sm md:text-base">
            Upload retinal fundus images, generate Grad-CAM localization heatmaps, receive RAG-validated clinical summaries, and consult with ophthalmology specialists in real-time.
          </p>

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all text-sm"
            >
              Start AI Screening
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-sm"
            >
              Doctor Login
            </button>
          </div>
        </div>

        {/* Visual Right side */}
        <div className="relative flex justify-center items-center">
          <div className="absolute w-72 h-72 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute w-60 h-60 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl -z-10 top-1/2 left-1/3" />
          
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] bg-red-500/20 text-red-500 font-semibold px-2.5 py-1 rounded-full border border-red-500/30">
                High Risk Warning
              </span>
              <span className="text-[10px] text-gray-400">Diagnosis ID: #8293</span>
            </div>

            {/* Mock eye scan graphic layout */}
            <div className="w-full h-48 bg-gray-950 rounded-2xl mb-4 relative overflow-hidden flex items-center justify-center">
              {/* Outer circle */}
              <div className="w-40 h-40 rounded-full border-4 border-orange-500/30 flex items-center justify-center">
                {/* Inner nerve */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-600 via-orange-600 to-red-700/80 animate-pulse relative flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-yellow-400" />
                </div>
              </div>
              <span className="absolute bottom-2.5 left-2.5 bg-gray-900/80 text-[8px] text-teal-400 px-2 py-0.5 rounded border border-white/5 font-semibold uppercase tracking-wider">
                Grad-CAM Heatmap overlay
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-500">AI Probability</span>
                <span className="font-black text-gray-900 dark:text-white">88.5%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-500">Neural Network Model Confidence</span>
                <span className="font-black text-gray-900 dark:text-white">96.8%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Clinical Platform Features</h2>
            <p className="text-gray-400 text-sm mt-2">Fully integrated clinical decision support pipeline developed for modern healthcare practices.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-16 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Glaucoma EyeCare AI Platform. Medical decision support system only.
      </footer>

    </div>
  );
}
