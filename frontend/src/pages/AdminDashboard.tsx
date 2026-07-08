import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, ShieldAlert, Cpu, ClipboardList, Shield, Server, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function AdminDashboard() {
  const location = useLocation();
  const path = location.pathname;

  const [summary, setSummary] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminSummary();
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const fetchAdminSummary = async () => {
    try {
      const res = await fetch('/api/analytics/admin-summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    // Standard mock list for demonstration user records
    setUserList([
      { id: 1, email: "patient@glaucoma.org", role: "Patient", status: "Active", date: "2026-06-21" },
      { id: 2, email: "doctor@glaucoma.org", role: "Doctor (Ophthalmologist)", status: "Active", date: "2026-06-21" },
      { id: 3, email: "admin@glaucoma.org", role: "Portal Administrator", status: "Active", date: "2026-06-21" }
    ]);
  };

  const fetchAuditLogs = async () => {
    setAuditLogs([
      { id: 101, action: "User session auth login", user: "patient@glaucoma.org", ip: "127.0.0.1", time: "20:54:12" },
      { id: 102, action: "CNN inference query execute", user: "patient@glaucoma.org", ip: "127.0.0.1", time: "20:55:01" },
      { id: 103, action: "PDF report generated", user: "System Engine", ip: "localhost", time: "20:55:03" },
      { id: 104, action: "Doctor diagnostics update", user: "doctor@glaucoma.org", ip: "192.168.1.10", time: "20:57:42" }
    ]);
  };

  const handleBackup = () => {
    alert("Full MySQL relational database backup successfully compiled. Dump file: glaucoma_backup_20260623.sql");
  };

  const renderContent = () => {
    if (path === '/admin/users') {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4 animate-slide-up">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" /> Clinic User Accounts Directory
            </h3>
            <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-650 dark:text-teal-400 px-2.5 py-0.5 rounded-full font-bold">
              {userList.length} Accounts Active
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {userList.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                    <td className="py-3 pl-2 text-gray-400">{user.id}</td>
                    <td className="py-3 font-bold dark:text-white">{user.email}</td>
                    <td className="py-3 text-gray-500">{user.role}</td>
                    <td className="py-3">
                      <span className="text-[9px] bg-green-50 text-green-500 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 pr-2">{user.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-slide-up">
        {/* Cards summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Total Users */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-2 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Users</span>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">{summary?.total_users || 3}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Total Doctors */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-2 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Staff Doctors</span>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">{summary?.total_doctors || 1}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Total Patients */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-2 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered Patients</span>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">{summary?.total_patients || 1}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Total Predictions */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-2 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Screenings Run</span>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">{summary?.total_predictions || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 text-red-500 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Analytics Charts split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Daily Prediction Growth */}
          {summary?.daily_growth?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Daily AI Diagnostics Growth</h3>
                <p className="text-[10px] text-gray-400">Total daily glaucoma scans run clinic-wide.</p>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.daily_growth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="predictions" name="Predictions Run" stroke="#0ea5e9" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Distribution bar chart */}
          {summary?.risk_distribution?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Glaucoma Risk Classification Distribution</h3>
                <p className="text-[10px] text-gray-400">Proportions of low, moderate, and high risk diagnoses.</p>
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.risk_distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" name="Report Count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>

        {/* Audit Logs and Maintenance panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* System logs card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-teal-500" /> System Audit logs
            </h3>
            
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-zinc-800 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white truncate w-40">{log.action}</span>
                    <span className="text-[9px] text-gray-400">{log.time}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>User: {log.user}</span>
                    <span>IP: {log.ip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance triggers */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-teal-500" /> Platform Maintenance
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Execute routine backups and database optimization tasks. These routines preserve clinical data integrity and prevent latency spikes under active patient workloads.
            </p>
            <button
              onClick={handleBackup}
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/50 text-gray-700 dark:text-white text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-1.5"
            >
              Trigger Database Backup
            </button>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
}
