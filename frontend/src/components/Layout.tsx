import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, Calendar, MessageSquare, Settings, LogOut, Sun, Moon, 
  User as UserIcon, Bell, Users, ShieldAlert, FileText, CheckSquare, Heart
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  userRole: string;
  userEmail: string;
  onLogout: () => void;
}

export default function Layout({ children, userRole, userEmail, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Apply dark mode toggling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const navItems = {
    patient: [
      { name: 'Dashboard', path: '/patient', icon: Activity },
      { name: 'AI Prediction', path: '/patient/predict', icon: ShieldAlert },
      { name: 'Appointments', path: '/patient/appointments', icon: Calendar },
      { name: 'Prescriptions', path: '/patient/prescriptions', icon: FileText }
    ],
    doctor: [
      { name: 'Overview', path: '/doctor', icon: Activity },
      { name: 'Patient Queue', path: '/doctor/patients', icon: Users },
      { name: 'Consultations', path: '/doctor/appointments', icon: Calendar }
    ],
    admin: [
      { name: 'System Summary', path: '/admin', icon: Activity },
      { name: 'User Directory', path: '/admin/users', icon: Users }
    ]
  };

  const currentNav = navItems[userRole as 'patient' | 'doctor' | 'admin'] || [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col justify-between p-5 z-20">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-100 dark:shadow-none">
              👁️
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-tight">EyeCare AI</h1>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold tracking-wider uppercase">{userRole} Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400' 
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-teal-500' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-bold">
              {userEmail[0].toUpperCase()}
            </div>
            <div className="truncate w-36">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{userEmail}</p>
              <span className="text-[10px] text-gray-400 capitalize">{userRole} account</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Clinical Decision Support System</span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-4">
            
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Alert */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDrawer(!showNotifDrawer)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 relative transition-all"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </button>

              {/* Notification dropdown drawer */}
              {showNotifDrawer && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-4 space-y-3 z-50 animate-slide-up">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                    <button 
                      onClick={() => setNotifications([])} 
                      className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No new updates.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-xs">
                          <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">{n.title}</h4>
                          <p className="text-gray-500 dark:text-gray-400 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Dashboard Pages Root Router Slot */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
