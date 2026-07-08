import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (token: string, role: string, email: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient'); // patient, doctor, admin
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password }
      : { email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (isLogin) {
          onLoginSuccess(data.access_token, data.role, data.email);
          // Redirect to appropriate dashboard
          navigate(`/${data.role}`);
        } else {
          setSuccessMsg('Registration successful! Please log in.');
          setIsLogin(true);
          setPassword('');
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || 'Authentication failed. Please check credentials.');
      }
    } catch (e) {
      setErrorMsg('Failed to communicate with authorization server.');
    } finally {
      setLoading(false);
    }
  };

  // Preset demo account fillers
  const autoFillDemo = (demoRole: string) => {
    setEmail(`${demoRole}@glaucoma.org`);
    setPassword('password123');
    setRole(demoRole);
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 transition-colors duration-300">
      
      {/* Background radial effects */}
      <div className="absolute w-96 h-96 bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute w-80 h-80 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl -z-10 translate-x-32 translate-y-32" />

      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Logo and Greeting */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-400 to-blue-600 flex items-center justify-center text-white text-xl mx-auto shadow-md">
            👁️
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            {isLogin ? 'Welcome Back' : 'Create Portal Account'}
          </h2>
          <p className="text-xs text-gray-400">Clinical-Grade Glaucoma Screening Suite</p>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 bg-gray-50 dark:bg-gray-800/40 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              isLogin ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Portal Access
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              !isLogin ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* Alerts panel */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-500/10 text-green-600 rounded-xl border border-green-500/20 text-xs text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@clinic.org"
                className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-transparent dark:bg-gray-800 rounded-2xl text-xs focus:outline-none focus:border-teal-500 dark:text-white"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 border border-gray-200 dark:border-gray-700 bg-transparent dark:bg-gray-800 rounded-2xl text-xs focus:outline-none focus:border-teal-500 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-all"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Role selector (Registration only) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Select Portal Role</label>
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/40 p-1 rounded-2xl border border-gray-100 dark:border-gray-800">
                {['patient', 'doctor', 'admin'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 text-[10px] font-bold rounded-xl capitalize transition-all ${
                      role === r 
                        ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm border border-gray-100 dark:border-gray-800' 
                        : 'text-gray-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold rounded-2xl hover:scale-[1.01] active:scale-95 transition-all text-xs shadow-md shadow-teal-500/20"
          >
            {loading ? 'Processing Authentication...' : isLogin ? 'Access Portal Dashboard' : 'Register Account'}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fill Clinic Demo Accounts</span>
            <Shield className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => autoFillDemo('patient')}
              className="py-1.5 text-[9px] bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl border border-teal-100 dark:border-teal-900 transition-all"
            >
              Patient
            </button>
            <button
              onClick={() => autoFillDemo('doctor')}
              className="py-1.5 text-[9px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl border border-blue-100 dark:border-blue-900 transition-all"
            >
              Ophthalmologist
            </button>
            <button
              onClick={() => autoFillDemo('admin')}
              className="py-1.5 text-[9px] bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl border border-purple-100 dark:border-purple-900 transition-all"
            >
              Clinic Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
