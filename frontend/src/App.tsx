import { useState, useEffect, useRef } from 'react';
import ReportForm from './pages/ReportForm';
import FasilitasForm from './pages/FasilitasForm';
import Login from './pages/Login';
import ReportDetail from './pages/ReportDetail';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TableRiwayat from './components/TableRiwayat';
import { PrintTemplate, PrintFasilitasTemplate } from './PrintTemplate';

type UserRole = 'OFFICE' | 'SUPERVISOR' | 'ASMEN' | 'GUYS';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('OFFICE');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'MALAM'>('PAGI');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  
  const printLogbookRef = useRef<HTMLDivElement>(null);
  const printFasilitasRef = useRef<HTMLDivElement>(null);

  const fetchReports = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/reports?t=${new Date().getTime()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal dari server');
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Fetch error:', err); } 
    finally { if (!silent) setIsLoading(false); }
  };

  useEffect(() => {
    if (isLoggedIn && (currentView === 'dashboard' || currentView === 'riwayat')) {
      fetchReports();
      const interval = setInterval(() => { fetchReports(true); }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentView, isLoggedIn]);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar dari aplikasi?')) {
      setIsLoggedIn(false); setReports([]); setSelectedReport(null); 
      setCurrentView('dashboard'); setReadNotifIds([]);
    }
  };

  const handleUpdateStatus = async (report: any, newStatus: string, catatan: string = '') => {
    const payloadOnly: any = { status: newStatus };
    if (catatan) {
      if (userRole === 'SUPERVISOR') payloadOnly.catatanSpv = catatan;
      if (userRole === 'ASMEN') payloadOnly.catatanAsmen = catatan;
    }
    try {
      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadOnly)
      });
      if (response.ok) {
        const resData = await response.json();
        const updatedReport = resData.data || { ...report, ...payloadOnly };
        setReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setSelectedReport(updatedReport); 
        alert(`✅ Laporan berhasil di-${newStatus}!`);
        fetchReports(true);
      } else { alert('❌ Terjadi kesalahan! Database menolak pembaruan status.'); }
    } catch (e) { alert('Tidak bisa terhubung ke server backend.'); }
  };

  const handleApprove = (report: any) => {
    let nextStatus = 'Approved';
    let confirmMsg = 'Setujui laporan ini dan izinkan dicetak?';
    if (userRole === 'SUPERVISOR') {
      nextStatus = 'Menunggu Asmen';
      confirmMsg = 'Setujui laporan ini dan teruskan ke Asmen?';
    }
    if (window.confirm(confirmMsg)) handleUpdateStatus(report, nextStatus, '');
  };

  const handleReject = (report: any) => {
    const catatan = window.prompt('Masukkan alasan Revisi / Catatan Perbaikan:');
    if (catatan !== null) handleUpdateStatus(report, 'Revisi', catatan);
  };

  const openForm = (shift: 'PAGI' | 'MALAM') => { setSelectedReport(null); setSelectedShift(shift); setCurrentView('form'); setIsSidebarOpen(false); };

  const editReport = (report: any) => {
    setSelectedReport(report);
    if (report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0)) setCurrentView('fasilitasForm');
    else { setSelectedShift(report.dinas); setCurrentView('form'); }
  };

  const deleteReport = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus laporan ini? Tindakan ini permanen.')) {
      try {
        const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
        if (response.ok) setReports(reports.filter(r => r._id !== id));
      } catch (e) { alert('Tidak bisa terhubung ke server.'); }
    }
  };

  const viewReportDetail = (report: any) => { 
    setSelectedReport(report); 
    setCurrentView('detail'); 
    if (!readNotifIds.includes(report._id)) setReadNotifIds(prev => [...prev, report._id]);
  };

  // Jika belum login, tampilkan halaman Login
  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  // Variabel Turunan
  const canInput = userRole === 'OFFICE' || userRole === 'SUPERVISOR';
  
  const pendingApprovals = reports.filter(r => {
    if (userRole === 'SUPERVISOR') return r.status === 'Menunggu SPV';
    if (userRole === 'ASMEN') return r.status === 'Menunggu Asmen';
    if (userRole === 'OFFICE') return r.status === 'Revisi';
    return false;
  }).sort((a, b) => new Date(a.createdAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.updatedAt || 0).getTime());
  
  const unreadCount = pendingApprovals.filter(r => !readNotifIds.includes(r._id)).length;

  let canSpvApprove = false;
  let canAsmenApprove = false;
  if (selectedReport) {
    const status = selectedReport.status || 'Draft';
    canSpvApprove = userRole === 'SUPERVISOR' && (status === 'Draft' || status === 'Menunggu SPV' || status === 'Revisi');
    canAsmenApprove = userRole === 'ASMEN' && status === 'Menunggu Asmen';
  }

  // Tampilan Utama (Sudah sangat ringkas!)
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-sm overflow-hidden relative text-slate-800">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <Sidebar currentView={currentView} userRole={userRole} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} handleMenuClick={(view: string) => setCurrentView(view)} openForm={openForm} onFasilitasClick={() => { setSelectedReport(null); setCurrentView('fasilitasForm'); setIsSidebarOpen(false); }} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative z-10">
        <Header userRole={userRole} unreadCount={unreadCount} pendingApprovals={pendingApprovals} setIsSidebarOpen={setIsSidebarOpen} handleLogout={handleLogout} viewReportDetail={viewReportDetail} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 w-full scrollbar-hide">
          {(currentView === 'dashboard' || currentView === 'riwayat') && (
            <TableRiwayat reports={reports} isLoading={isLoading} canInput={canInput} viewReportDetail={viewReportDetail} editReport={editReport} deleteReport={deleteReport} />
          )}

          {currentView === 'detail' && selectedReport && (
            <ReportDetail selectedReport={selectedReport} userRole={userRole} canSpvApprove={canSpvApprove} canAsmenApprove={canAsmenApprove} handleApprove={handleApprove} handleReject={handleReject} setCurrentView={setCurrentView} printLogbookRef={printLogbookRef} printFasilitasRef={printFasilitasRef} />
          )}
          
          {currentView === 'form' && <ReportForm shift={selectedShift} initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'fasilitasForm' && <FasilitasForm initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />}
        </main>
      </div>

      {selectedReport && (
        <div className="hidden">
          <PrintTemplate ref={printLogbookRef} data={selectedReport} />
          <PrintFasilitasTemplate ref={printFasilitasRef} data={selectedReport} />
        </div>
      )}
    </div>
  );
}