import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  userRole: string;
  unreadCount: number;
  pendingApprovals: any[];
  setIsSidebarOpen: (val: boolean) => void;
  handleLogout: () => void;
  viewReportDetail: (report: any) => void;
  setIsProfileOpen: (val: boolean) => void;
  readNotifIds: string[];
}

export default function Header({ userRole, unreadCount, pendingApprovals, setIsSidebarOpen, handleLogout, viewReportDetail, setIsProfileOpen, readNotifIds }: HeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayNotifs = pendingApprovals.slice(0, 15);

  return (
    <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-white/60 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-[100] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-white/80 hover:bg-white rounded-xl text-slate-600 shadow-sm border border-slate-100 transition-all md:hidden">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)} 
            className="p-2.5 bg-white/80 hover:bg-white rounded-xl text-blue-600 shadow-sm border border-slate-100 transition-all relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">{unreadCount}</span>}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110] animate-fadeIn">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Notifikasi</h3>
                {unreadCount > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{unreadCount} Baru</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {displayNotifs.length === 0 ? (
                  <div className="p-6 text-center text-sm font-medium text-slate-400">Belum ada notifikasi laporan.</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {displayNotifs.map((rep) => {
                      const notifKey = `${rep._id}_${rep.status}`;
                      const isUnread = !readNotifIds.includes(notifKey);
                      return (
                        <div 
                          key={notifKey} 
                          onClick={() => { viewReportDetail(rep); setIsNotifOpen(false); }} 
                          className={`p-4 cursor-pointer transition-colors group ${isUnread ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'hover:bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${isUnread ? 'text-blue-800' : 'text-slate-700'}`}>
                              {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>}
                              {rep.fungsi || 'Laporan'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border">{rep.tanggal}</span>
                          </div>
                          <p className={`text-[11px] font-medium ${isUnread ? 'text-slate-600' : 'text-slate-500'}`}>
                            Shift {rep.dinas} - Status: <span className="font-bold text-amber-600">{rep.status}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="w-10 h-10 bg-blue-50 text-blue-600 font-bold rounded-xl flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm overflow-hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </button>

          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110] animate-fadeIn origin-top-right">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-extrabold text-slate-800">Akun Anda</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{userRole}</p>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <button 
                  onClick={() => { setIsProfileOpen(true); setIsProfileDropdownOpen(false); }} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Info & Ganti Password
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                <button 
                  onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Keluar (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}