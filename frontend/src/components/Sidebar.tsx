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

export default function Sidebar({ currentView, userRole, isSidebarOpen, setIsSidebarOpen, handleMenuClick, openForm, onFasilitasClick: _onFasilitasClick }: SidebarProps) {
  const [isLaporanMenuOpen, setIsLaporanMenuOpen] = useState(true);
  const [isPeralatanMenuOpen, setIsPeralatanMenuOpen] = useState(true);
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

            <>
              <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {userRole === 'ADMIN' ? 'Administrator' : 'Direktori & Master'}
              </li>
              <li>
                <button onClick={() => handleMenuClick('personel')} className={getMenuClass('personel')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 
                  {userRole === 'ADMIN' ? 'Personnel Management' : 'Personil'}
                </button>
              </li>
              <li>
                <button onClick={() => handleMenuClick('absensi')} className={getMenuClass('absensi')}>
                  <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Management Absensi
                </button>
              </li>
              <li>
                <button onClick={() => handleMenuClick('datamaster')} className={getMenuClass('datamaster')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> 
                  Data Master Fasilitas
                </button>
              </li>
            </>

            <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layanan Pengaduan</li>
            <li>
              <button onClick={() => setIsLaporanMenuOpen(!isLaporanMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 rounded-xl transition-all mb-1 text-slate-600">
                <div className="flex items-center font-medium"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Laporan Masuk</div>
                <svg className={`w-4 h-4 transform transition-transform ${isLaporanMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              {isLaporanMenuOpen && (
                <ul className="mb-2">
                  {canInput && (
                    <li><button onClick={() => { const h = new Date().getHours(); openForm(h >= 7 && h < 19 ? 'PAGI' : 'MALAM'); }} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3"></div>Buat Laporan</button></li>
                  )}
                  <li><button onClick={() => handleMenuClick('riwayat')} className={getSubMenuClass('riwayat')}><div className="w-1.5 h-1.5 rounded-full bg-current mr-3"></div>Riwayat Laporan</button></li>
                </ul>
              )}
            </li>

            <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pelaporan Peralatan</li>
            <li>
              <button onClick={() => setIsPeralatanMenuOpen(!isPeralatanMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 rounded-xl transition-all mb-1 text-slate-600">
                <div className="flex items-center font-medium">
                  <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Laporan Peralatan
                </div>
                <svg className={`w-4 h-4 transform transition-transform ${isPeralatanMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {isPeralatanMenuOpen && (
                <ul className="mb-2">
                  <li>
                    <button onClick={() => handleMenuClick('laporanKondisiBulanan')} className={getSubMenuClass('laporanKondisiBulanan')}>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3"></div>
                      Kondisi Peralatan Bulanan
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleMenuClick('laporanStockPeralatan')} className={getSubMenuClass('laporanStockPeralatan')}>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-3"></div>
                      Laporan Stock Peralatan
                    </button>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <button onClick={() => handleMenuClick('laporanKerusakan')} className={getMenuClass('laporanKerusakan')}>
                <svg className="w-5 h-5 mr-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Laporan Kerusakan
              </button>
            </li>
            <li>
              <button onClick={() => handleMenuClick('laporanPerbaikan')} className={getMenuClass('laporanPerbaikan')}>
                <svg className="w-5 h-5 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Laporan Perbaikan
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}