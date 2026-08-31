import { useState } from 'react';

interface SidebarProps {
  currentView: string;
  userRole: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  handleMenuClick: (view: string) => void;
  openForm: (shift: 'PAGI' | 'MALAM') => void;
  onFasilitasClick: () => void;
}

export default function Sidebar({ currentView, userRole, isSidebarOpen, setIsSidebarOpen, handleMenuClick, openForm, onFasilitasClick }: SidebarProps) {
  const [isLaporanMenuOpen, setIsLaporanMenuOpen] = useState(true);
  const canInput = userRole === 'ADMIN' || userRole === 'OFFICE' || userRole === 'SUPERVISOR';
  
  const getMenuClass = (menuName: string) => `w-full flex items-center px-4 py-3 transition-all text-left rounded-xl mb-1 ${currentView === menuName ? 'bg-white/60 shadow-sm border border-white/60 text-blue-700 font-bold' : 'hover:bg-white/30 text-slate-600'}`;
  const getSubMenuClass = (menuName: string) => `w-full flex items-center pl-12 pr-4 py-2.5 text-left transition-all rounded-xl mb-1 ${currentView === menuName ? 'bg-white/60 shadow-sm border border-white/60 text-blue-700 font-bold' : 'hover:bg-white/30 text-slate-500 hover:text-slate-800'}`;

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`fixed inset-y-0 left-0 z-50 h-full w-[260px] bg-white/40 backdrop-blur-2xl border-r border-white/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-white/40">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md mr-3">H</div>
          <div><span className="font-extrabold text-lg tracking-wide text-slate-800 leading-none block">ELIT KSO</span><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jakarta Airport</span></div>
          <button className="md:hidden text-slate-500 ml-auto" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <ul className="space-y-1">
            <li><button onClick={() => handleMenuClick('dashboard')} className={getMenuClass('dashboard')}><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Beranda</button></li>
            
            {(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'ASMEN') && (
              <>
                <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manajerial</li>
                <li>
                  <button onClick={() => handleMenuClick('rekap')} className={getMenuClass('rekap')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> Evaluasi Kinerja (KPI)
                  </button>
                </li>
              </>
            )}

            {userRole === 'ADMIN' && (
              <>
                <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</li>
                <li>
                  <button onClick={() => handleMenuClick('personel')} className={getMenuClass('personel')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Personnel Management
                  </button>
                </li>
              </>
            )}

            <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layanan Pengaduan</li>
            <li>
              <button onClick={() => setIsLaporanMenuOpen(!isLaporanMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 rounded-xl transition-all mb-1 text-slate-600">
                <div className="flex items-center font-medium"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Laporan Masuk</div>
                <svg className={`w-4 h-4 transform transition-transform ${isLaporanMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              {isLaporanMenuOpen && (
                <ul className="mb-2">
                  {canInput && (
                    <>
                      <li><button onClick={() => openForm('PAGI')} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3"></div>Buat Laporan</button></li>
                      <li><button onClick={onFasilitasClick} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3"></div>Pengecekan Fasilitas</button></li>
                    </>
                  )}
                  <li><button onClick={() => handleMenuClick('riwayat')} className={getSubMenuClass('riwayat')}><div className="w-1.5 h-1.5 rounded-full bg-current mr-3"></div>Riwayat Laporan</button></li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}