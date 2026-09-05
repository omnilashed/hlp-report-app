import { useState, useEffect, useRef } from 'react';
import ReportForm from './pages/ReportForm';
import FasilitasForm from './components/FormFasilitas';
import Login from './pages/Login';
import ReportDetail from './pages/ReportDetail';
import DataPersonel from './pages/DataPersonel';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TableRiwayat from './components/TableRiwayat';
import ProfileModal from './components/ProfileModal';
import RejectModal from './components/RejectModal';
import { PrintTemplate, PrintFasilitasTemplate } from './PrintTemplate';
import RekapBulanan from './components/RekapBulanan';

type UserRole = 'ADMIN' | 'OFFICE' | 'SUPERVISOR' | 'ASMEN' | 'GUEST';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('GUEST');
  const [loginUsername, setLoginUsername] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'MALAM'>('PAGI');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [reports, setReports] = useState<any[]>([]);
  const [notifReports, setNotifReports] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  
  const printLogbookRef = useRef<HTMLDivElement>(null);
  const printFasilitasRef = useRef<HTMLDivElement>(null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [reportToReject, setReportToReject] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem('token');
          return;
        }
        setUserRole(payload.role as UserRole);
        setLoginUsername(payload.username);
        setUserFullName(payload.namaLengkap || payload.username);
        setIsLoggedIn(true);

        const saved = localStorage.getItem(`readNotifs_${payload.username}`);
        if (saved) setReadNotifIds(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
  }, []);

  const fetchReports = async (page = 1, silent = false) => {
    if (!silent) setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const resTable = await fetch(`/api/reports?page=${page}&limit=10&t=${new Date().getTime()}`, { 
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store' 
      });
      if (resTable.ok) {
        const resultTable = await resTable.json();
        setReports(resultTable.data || []);
        setCurrentPage(resultTable.currentPage || 1);
        setTotalPages(resultTable.totalPages || 1);
      }

      const resNotif = await fetch(`/api/reports?page=1&limit=100&t=${new Date().getTime()}`, { 
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store' 
      });
      if (resNotif.ok) {
        const resultNotif = await resNotif.json();
        setNotifReports(resultNotif.data || []);
      }

    } catch (err) {} 
    finally { if (!silent) setIsLoading(false); }
  };

  useEffect(() => {
    if (isLoggedIn && (currentView === 'dashboard' || currentView === 'riwayat')) {
      fetchReports(currentPage);
      const interval = setInterval(() => { fetchReports(currentPage, true); }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentView, isLoggedIn, currentPage]);

  const handleLogin = (role: UserRole, uname: string) => {
    setUserRole(role);
    setLoginUsername(uname);
    
    const token = localStorage.getItem('token');
    let fName = uname;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.namaLengkap) fName = payload.namaLengkap;
      } catch(e) {}
    }
    setUserFullName(fName);

    setIsLoggedIn(true);
    setCurrentView('dashboard');
    
    const saved = localStorage.getItem(`readNotifs_${uname}`);
    if (saved) setReadNotifIds(JSON.parse(saved));
    else setReadNotifIds([]);
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar dari aplikasi?')) {
      localStorage.removeItem('token');
      setIsLoggedIn(false); 
      setReports([]); setNotifReports([]); 
      setSelectedReport(null); 
      setCurrentView('dashboard'); 
      setReadNotifIds([]); setLoginUsername(''); setUserFullName('');
    }
  };

  const handleUpdateStatus = async (report: any, newStatus: string, catatan: string = '') => {
    const payloadOnly: any = { status: newStatus };
    if (catatan) {
      const finalCatatan = `(Dari: ${userFullName || loginUsername}) - ${catatan}`;
      if (userRole === 'SUPERVISOR' || (userRole === 'ADMIN' && report.status === 'Menunggu SPV')) {
        payloadOnly.catatanSpv = finalCatatan;
      } else if (userRole === 'ASMEN' || (userRole === 'ADMIN' && report.status === 'Menunggu Asmen')) {
        payloadOnly.catatanAsmen = finalCatatan;
      }
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadOnly)
      });
      if (response.ok) {
        const resData = await response.json();
        const updatedReport = resData.data || { ...report, ...payloadOnly };
        
        setReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setNotifReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setSelectedReport(updatedReport); 

        alert(`Berhasil! Status laporan kini menjadi: ${newStatus}`);
        fetchReports(currentPage, true);
      } else { alert('Terjadi kesalahan! Database menolak pembaruan status.'); }
    } catch (e) { alert('Tidak bisa terhubung ke server backend.'); }
  };

  const handleApprove = (report: any) => {
    let nextStatus = 'Approved';
    let confirmMsg = 'Setujui laporan ini?';
    
    if (report.status === 'Draft' || report.status === 'Revisi' || report.status === 'Menunggu SPV') {
      if (userRole === 'ASMEN') return alert('🛑 AKSES DITOLAK: Asmen hanya bisa menyetujui laporan yang sudah lolos tahap SPV.');
      
      nextStatus = 'Menunggu Asmen';
      confirmMsg = 'Tahap 1: Setujui laporan ini dan teruskan ke Asmen?';
    } else if (report.status === 'Menunggu Asmen') {
      if (userRole === 'SUPERVISOR') return alert('🛑 AKSES DITOLAK: SPV tidak berhak menyetujui Tahap 2. Persetujuan final hanya boleh dilakukan oleh ASMEN.');
      
      nextStatus = 'Approved';
      confirmMsg = 'Tahap 2 (Final): Setujui laporan ini secara Final dan izinkan tim untuk mendownload PDF/Excel?';
    } else {
      return alert('Laporan ini sudah disetujui secara Final.');
    }

    if (window.confirm(confirmMsg)) {
      handleUpdateStatus(report, nextStatus, '');
    }
  };

  const handleReject = (report: any) => {
    setReportToReject(report);
    setRejectNote('');
    setIsRejectModalOpen(true);
  };

  const processReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectNote.trim()) {
      alert('Catatan revisi tidak boleh kosong!');
      return;
    }

    const report = reportToReject;
    const catatan = rejectNote;
    setIsRejectModalOpen(false);
      
    const payloadOnly: any = { status: 'Revisi' };
    const finalCatatan = `(Dari: ${userFullName || loginUsername}) - ${catatan}`;
    
    if (userRole === 'SUPERVISOR' || (userRole === 'ADMIN' && report.status === 'Menunggu SPV')) {
      payloadOnly.catatanSpv = finalCatatan;
    } else if (userRole === 'ASMEN' || (userRole === 'ADMIN' && report.status === 'Menunggu Asmen')) {
      payloadOnly.catatanAsmen = finalCatatan;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadOnly)
      });
      
      if (response.ok) {
        const resData = await response.json();
        const updatedReport = resData.data || { ...report, ...payloadOnly };
        
        setReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setNotifReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setSelectedReport(updatedReport); 
        fetchReports(currentPage, true);
        
        try {
          const userRes = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
          if (userRes.ok) {
            const usersData = await userRes.json();
            const userArray = Array.isArray(usersData) ? usersData : (usersData.data || []);
            
            let targetUser = userArray.find((u: any) => 
              (u.namaLengkap || '').toLowerCase() === (report.createdBy || '').toLowerCase() ||
              (u.username || '').toLowerCase() === (report.createdBy || '').toLowerCase()
            );

            if (!targetUser || !targetUser.noWA || targetUser.noWA.trim() === '') {
              const allTim = [
                ...(report.personil?.apindo || []),
                ...(report.personil?.osIass || []),
                ...(report.personil?.omNti || []),
                ...(report.personil?.omIassNti || [])
              ];
              
              for (const tim of allTim) {
                const found = userArray.find((u: any) => (u.namaLengkap || '').toLowerCase() === (tim.nama || '').toLowerCase());
                if (found && found.noWA && found.noWA.trim() !== '') {
                  targetUser = found; break;
                }
              }
            }

            let nomorWA = targetUser?.noWA;
            
            if (nomorWA && nomorWA.trim() !== '') {
              const waText = `*[NOTIFIKASI HLP LOGBOOK]* \n\nHalo *${targetUser.namaLengkap || targetUser.username}*,\nLaporan Kegiatan Harian untuk Shift *${report.dinas}* (Tanggal: ${report.tanggal}) membutuhkan perbaikan.\n\n*Catatan Revisi dari Asmen/SPV:*\n_"${catatan}"_\n\nMohon segera masuk ke sistem aplikasi dan perbaiki laporan tersebut.\nTerima kasih.`;
              
              fetch('/api/send-wa', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nomor: nomorWA, pesan: waText })
              }).then(res => {
                if (res.ok) alert('Berhasil! Status laporan menjadi Revisi. Notifikasi WA telah dikirim ke pembuat laporan.');
                else alert('Status berhasil diubah, tapi gagal mengirim notif WA. (Pastikan Bot WA di backend sudah jalan)');
              });
              
            } else {
              alert('Berhasil! Status laporan menjadi Revisi.\n\n(Info: Pesan WA gagal diproses karena nomor WA tidak ditemukan di sistem)');
            }
          }
        } catch (err) {
          alert('Berhasil! Status laporan menjadi Revisi.');
        }

      } else { 
        alert('Terjadi kesalahan! Database menolak pembaruan status.'); 
      }
    } catch (e) { 
      alert('Tidak bisa terhubung ke server backend.'); 
    }
  };

  const openForm = (shift: 'PAGI' | 'MALAM') => { 
    if (userRole === 'GUEST' || userRole === 'ASMEN') return alert('Hak akses dibatasi.');
    setSelectedReport(null); setSelectedShift(shift); setCurrentView('form'); setIsSidebarOpen(false); 
  };

  const isUserRelatedToReport = (report: any) => {
    const uName = (userFullName || '').toLowerCase().trim();
    const uLogin = (loginUsername || '').toLowerCase().trim();
    const creator = (report.createdBy || '').toLowerCase().trim();
    
    if (creator === uName || creator === uLogin) return true;
    if (report.personil?.apindo?.some((p: any) => (p.nama || '').toLowerCase().trim() === uName)) return true;
    if (report.personil?.omIassNti?.some((p: any) => (p.nama || '').toLowerCase().trim() === uName)) return true;
    return false;
  };

  const editReport = (report: any) => {
    if (userRole === 'GUEST' || userRole === 'ASMEN') return alert('Hak akses dibatasi.');

    if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
      if (!isUserRelatedToReport(report)) {
        return alert('🛑 AKSES DITOLAK!\n\nHanya Pembuat Laporan, Tim Bertugas, SPV, dan ADMIN yang diizinkan untuk mengedit laporan ini.');
      }
    }

    if (report.status === 'Approved' && userRole !== 'ADMIN') {
      return alert('🛑 AKSES DITOLAK!\n\nLaporan sudah berstatus Approved (Final). Hanya ADMIN yang bisa membongkar laporan yang sudah selesai.');
    }

    setSelectedReport(report);
    if (report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0)) setCurrentView('fasilitasForm');
    else { setSelectedShift(report.dinas); setCurrentView('form'); }
  };

  const deleteReport = async (id: string) => {
    const reportTarget = reports.find(r => r._id === id);
    if (!reportTarget) return;

    if (userRole !== 'ADMIN' && userRole !== 'SUPERVISOR') {
      if (!isUserRelatedToReport(reportTarget)) {
        return alert('🛑 AKSES DITOLAK!\n\nHanya Pembuat Laporan, Tim Bertugas, SPV, dan ADMIN yang diizinkan untuk menghapus laporan ini.');
      }
    }

    if (reportTarget.status === 'Approved' && userRole !== 'ADMIN') {
      return alert('🛑 AKSES DITOLAK!\n\nLaporan ini sudah disetujui (Approved). HANYA ADMIN yang memiliki wewenang untuk menghapus dokumen Final.');
    }

    if (window.confirm('Yakin ingin menghapus laporan ini? Tindakan ini permanen.')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`/api/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          setReports(reports.filter(r => r._id !== id));
          setNotifReports(notifReports.filter(r => r._id !== id));
          if (selectedReport && selectedReport._id === id) setCurrentView('dashboard');
        }
      } catch (e) { alert('Tidak bisa terhubung ke server.'); }
    }
  };

  const viewReportDetail = async (reportShort: any) => { 
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/reports/${reportShort._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const fullReport = await res.json();
        setSelectedReport(fullReport); 
        setCurrentView('detail'); 
        
        const notifKey = `${fullReport._id}_${fullReport.status}`;
        if (!readNotifIds.includes(notifKey)) {
          const newReadIds = [...readNotifIds, notifKey];
          setReadNotifIds(newReadIds);
          if (loginUsername) localStorage.setItem(`readNotifs_${loginUsername}`, JSON.stringify(newReadIds));
        }
      } else { alert('Gagal mengambil detail laporan'); }
    } catch (e) { alert('Koneksi terputus ke server.'); } 
    finally { setIsLoading(false); }
  };

  const canInput = userRole === 'ADMIN' || userRole === 'OFFICE' || userRole === 'SUPERVISOR';
  
  const pendingApprovals = notifReports.filter(r => {
    if (userRole === 'ADMIN') return ['Menunggu SPV', 'Menunggu Asmen', 'Revisi'].includes(r.status);
    if (userRole === 'SUPERVISOR') return r.status === 'Menunggu SPV';
    if (userRole === 'ASMEN') return r.status === 'Menunggu Asmen';
    
    if (userRole === 'OFFICE') {
      return isUserRelatedToReport(r) && ['Revisi', 'Approved'].includes(r.status);
    }
    return false;
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  
  const unreadCount = pendingApprovals.filter(r => !readNotifIds.includes(`${r._id}_${r.status}`)).length;

  let canSpvApprove = false;
  let canAsmenApprove = false;
  if (selectedReport) {
    const status = selectedReport.status || 'Draft';
    canSpvApprove = (userRole === 'SUPERVISOR' || userRole === 'ADMIN') && (status === 'Draft' || status === 'Menunggu SPV' || status === 'Revisi');
    canAsmenApprove = (userRole === 'ASMEN' || userRole === 'ADMIN') && status === 'Menunggu Asmen';
  }

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-sm overflow-hidden relative text-slate-800">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <Sidebar currentView={currentView} userRole={userRole} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} handleMenuClick={(view: string) => setCurrentView(view)} openForm={openForm} onFasilitasClick={() => { if(!canInput) return; setSelectedReport(null); setCurrentView('fasilitasForm'); setIsSidebarOpen(false); }} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative z-10">
        <Header 
          userRole={userRole} 
          unreadCount={unreadCount} 
          pendingApprovals={pendingApprovals} 
          setIsSidebarOpen={setIsSidebarOpen} 
          handleLogout={handleLogout} 
          viewReportDetail={viewReportDetail} 
          setIsProfileOpen={setIsProfileOpen} 
          readNotifIds={readNotifIds}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 w-full scrollbar-hide">
          {(currentView === 'dashboard' || currentView === 'riwayat') && (
            <TableRiwayat 
              reports={reports} 
              isLoading={isLoading} 
              canInput={canInput} 
              viewReportDetail={viewReportDetail} 
              editReport={editReport} 
              deleteReport={deleteReport} 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={(page) => fetchReports(page)} 
              userRole={userRole} 
              userName={userFullName || loginUsername} 
            />
          )}

          {currentView === 'rekap' && (
            <RekapBulanan reports={reports} />
          )}

          {currentView === 'detail' && selectedReport && (
            <ReportDetail 
              selectedReport={selectedReport} 
              userRole={userRole} 
              canSpvApprove={canSpvApprove} 
              canAsmenApprove={canAsmenApprove} 
              handleApprove={handleApprove} 
              handleReject={handleReject} 
              handleDelete={deleteReport} 
              setCurrentView={setCurrentView} 
              printLogbookRef={printLogbookRef} 
              printFasilitasRef={printFasilitasRef} 
            />
          )}

          {currentView === 'personel' && <DataPersonel userRole={userRole} />}
          
          {currentView === 'form' && <ReportForm shift={selectedShift} initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'fasilitasForm' && <FasilitasForm shift={selectedShift} initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />}
        </main>
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} userRole={userRole} />

      <RejectModal 
        isOpen={isRejectModalOpen} 
        onClose={() => setIsRejectModalOpen(false)} 
        onSubmit={processReject} 
        rejectNote={rejectNote} 
        setRejectNote={setRejectNote} 
        reportToReject={reportToReject} 
      />

      {selectedReport && (
        <div id="hidden-print-container" className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none z-[-100]">
          <PrintTemplate ref={printLogbookRef} data={selectedReport} />
          <PrintFasilitasTemplate ref={printFasilitasRef} data={selectedReport} />
        </div>
      )}
    </div>
  );
}