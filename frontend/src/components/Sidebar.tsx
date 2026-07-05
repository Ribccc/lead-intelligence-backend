import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [dbStatus, setDbStatus] = useState<'Successful' | 'Verifying' | 'Failed'>('Verifying');
  const [apiHealth, setApiHealth] = useState<'Online' | 'Offline'>('Verifying' as any);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Syncing...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:5000/health');
        if (res.ok) {
          const data = await res.json();
          setApiHealth('Online');
          if (data.dbConnection === 'Successful' || data.dbConnection === 'Connected') {
            setDbStatus('Successful');
            const now = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formatted = `${months[now.getMonth()]} ${now.getDate()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            setLastSyncTime(formatted);
          } else {
            setDbStatus('Failed');
          }
        } else {
          setApiHealth('Offline');
          setDbStatus('Failed');
        }
      } catch (err) {
        setApiHealth('Offline');
        setDbStatus('Failed');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/leads', label: 'Leads', icon: 'person_search' },
    { to: '/pipeline', label: 'AI Scoring', icon: 'psychology_alt' },
    { to: '/outreach', label: 'Outreach', icon: 'send_money' },
    { to: '/crm', label: 'CRM Sync', icon: 'sync_alt' },
    { to: '/discovery', label: 'Lead Discovery', icon: 'travel_explore' },
    { to: '/analytics', label: 'Analytics', icon: 'monitoring' },
    { to: '#', label: 'Settings', icon: 'settings', disabled: true }
  ];

  return (
    <aside className="w-64 bg-surface border-r border-neutral-200/50 h-screen fixed left-0 top-0 flex flex-col p-4 z-40 select-none">
      {/* Top Branding Section */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-blue-500/10 shrink-0">
          <span className="material-symbols-outlined font-semibold text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            psychology
          </span>
        </div>
        <div>
          <h1 className="font-extrabold text-base text-[#1E3A8A] tracking-tight leading-none">Deuglo AI</h1>
          <p className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider mt-1">ENTERPRISE INTELLIGENCE</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          if (item.disabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3.5 py-2.5 text-neutral-400 rounded-xl cursor-not-allowed text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-lg leading-none">{item.icon}</span>
                <span>{item.label}</span>
                {item.label === 'Lead Discovery' && (
                  <span className="text-[8px] bg-violet-50 border border-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-bold ml-auto uppercase tracking-tighter">NEW</span>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:translate-x-0.5 active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#0070f3] shadow-[0_1px_2px_rgba(0,112,243,0.05)] border-l-[3px] border-primary rounded-l-none'
                    : 'text-[#475569] hover:bg-neutral-50 hover:text-[#0F172A]'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-4 border-t border-neutral-200/50 space-y-3.5">
        
        {/* Live Database/API status bar */}
        <div className="p-3 bg-slate-50 border border-neutral-200/60 rounded-xl space-y-2 select-text shadow-sm">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-md leading-none ${
              dbStatus === 'Successful' ? 'text-[#10B981]' : 'text-amber-500'
            }`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {dbStatus === 'Successful' ? 'check_circle' : 'pending'}
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-bold text-slate-800">
                DB Status: {dbStatus}
              </p>
              <p className="text-[8px] text-[#64748B] font-semibold mt-0.5">
                API Link: <span className="text-primary">{apiHealth}</span>
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[7px] text-slate-400 font-mono font-bold">
            <span>SYNCED: {lastSyncTime}</span>
            <button
              onClick={() => alert(`Prisma SQLite details:\nConnection: ${dbStatus}\nAPI Health: ${apiHealth}\nTimestamp: ${lastSyncTime}\nWorkspace Mode: Local Enterprise`)}
              className="text-primary hover:underline text-[8px]"
            >
              Details
            </button>
          </div>
        </div>

        {/* Manage Plan button */}
        <button
          onClick={() => alert('Your workspace is at the Global Enterprise tier!')}
          className="w-full bg-gradient-to-r from-[#0070f3] to-[#7928ca] text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-semibold animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          Manage Plan
        </button>

        {/* User Card - Admin / Administrator */}
        <div className="flex items-center gap-3 px-1 pt-1.5">
          <div className="w-9 h-9 rounded-full border border-neutral-200 bg-neutral-100 flex items-center justify-center text-neutral-400 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-800 leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
            </p>
            <p className="text-[9px] text-neutral-400 font-semibold mt-0.5">
              {user ? user.role : 'Administrator'}
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 border border-neutral-200 hover:border-red-200 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-xs font-bold">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
