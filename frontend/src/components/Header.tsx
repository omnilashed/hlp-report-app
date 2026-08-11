import { useState } from 'react';

interface HeaderProps {
  userRole: string;
  unreadCount: number;
  pendingApprovals: any[];
  setIsSidebarOpen: (val: boolean) => void;
  handleLogout: () => void;
  viewReportDetail: (report: any) => void;
}

export default function Header({ userRole, unreadCount, pendingApprovals, setIsSidebarOpen, handleLogout, viewReportDetail }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleUI = () => {
    switch(userRole) {
      case 'OFFICE': return { name: 'OFFICE', desc: 'Input Data', initial: 'OF', color: 'from-blue-500 to-indigo-500' };
      case 'SUPERVISOR': return { name: 'SUPERVISOR', desc: 'Approval & Input', initial: 'SP', color: 'from-purple-500 to-fuchsia-500' };
      case 'ASMEN': return { name: 'ASMEN', desc: 'Izin Cetak & Approval', initial: 'AM', color: 'from-emerald-500 to-teal-500' };
      case 'GUYS': return { name: 'GUEST', desc: 'Viewer Only', initial: 'GS', color: 'from-slate-400 to-gray-500' };
      default: return { name: '', desc: '', initial: '', color: '' };
    }
  };
  const roleUI = getRoleUI();

  return (
    <header className="relative z-[60] h-20 bg-white/30 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] w-full">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-500 hover:text-slate-800 bg-white/50 p-2 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <div className="flex items-center gap-4">
        {userRole !== 'GUYS' && (
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 bg-white/60 hover:bg-white rounded-xl transition-all shadow-sm border border-white">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-2xl border border-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96">
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 text-sm">Notifikasi Pekerjaan</span>
                  {unreadCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{unreadCount} pesan baru</span>}
                </div>
                <div className="overflow-y-auto p-2 flex-1 scrollbar-hide">
                  {pendingApprovals.length > 0 ? (
                    pendingApprovals.map((r, i) => {
                      const isRevisi = r.status === 'Revisi';
                      return (
                        <button key={i} onClick={() => { viewReportDetail(r); setShowNotifications(false); }} className={`w-full text-left p-3 rounded-xl mb-2 hover:bg-slate-50 border transition-all ${isRevisi ? 'border-red-100 bg-red-50/30' : 'border-blue-100 bg-blue-50/30'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isRevisi ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{r.status}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{r.tanggal}</span>
                          </div>
                          <div className="font-bold text-slate-700 text-sm mt-1">{r.kondisiFasilitas?.length > 0 && (!r.kegiatan || r.kegiatan.length === 0) ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Shift {r.dinas}</div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-medium">Belum ada antrean pekerjaan.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="text-right hidden sm:block">
          <div className="font-bold text-sm text-slate-800">{roleUI.name}</div>
          <div className="text-[10px] text-slate-500">{roleUI.desc}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleUI.color} flex items-center justify-center font-bold text-white shadow-md border border-white/20`}>{roleUI.initial}</div>
        <button onClick={handleLogout} className="text-red-400 hover:text-red-600 ml-1 p-2 bg-white/40 hover:bg-white/80 rounded-xl transition-all" title="Keluar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
      </div>
    </header>
  );
}