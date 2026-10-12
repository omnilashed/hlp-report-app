import { useState } from 'react';
import ExportMenu from '../components/ExportMenu';
import ReportDataView from '../components/ReportDataView';

interface ReportDetailProps {
  selectedReport: any;
  userRole: string;
  canSpvApprove: boolean;
  canAsmenApprove: boolean;
  handleApprove: (report: any) => void;
  handleReject: (report: any) => void;
  handleDelete?: (id: string) => void;
  setCurrentView: (view: string) => void;
  printLogbookRef?: any;
  printFasilitasRef?: any;
}

export default function ReportDetail({
  selectedReport,
  userRole,
  canSpvApprove,
  canAsmenApprove,
  handleApprove,
  handleReject,
  handleDelete,
  setCurrentView
}: ReportDetailProps) {
  
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  if (!selectedReport) return null;

  const isFasilitasOnly = selectedReport.kondisiFasilitas?.length > 0 && (!selectedReport.kegiatan || selectedReport.kegiatan.length === 0);
  const status = selectedReport.status || 'Draft';
  const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200';
  
  const isApproved = status === 'Approved';
  const isMenungguAsmen = status === 'Menunggu Asmen';
  
  const canSpvRollback = userRole === 'SUPERVISOR' && isMenungguAsmen;
  const canAsmenRollback = userRole === 'ASMEN' && isApproved;
  const canRollback = canSpvRollback || canAsmenRollback;

  const targetStatusAfterRollback = userRole === 'ASMEN' ? 'Menunggu Asmen' : 'Menunggu SPV';

  const executeRollback = async () => {
    setIsRollingBack(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/reports/${selectedReport._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: targetStatusAfterRollback })
      });
      if (response.ok) {
        const resData = await response.json();
        const updatedReport = resData.data || { ...selectedReport, status: targetStatusAfterRollback };
        selectedReport.status = updatedReport.status;
        setShowRollbackModal(false);
        alert(`Berhasil! Status laporan dikembalikan ke ${targetStatusAfterRollback}.`);
        window.location.reload();
      } else { 
        alert('Gagal membatalkan persetujuan.'); 
        setShowRollbackModal(false);
      }
    } catch (e) { 
      alert('Tidak bisa terhubung ke server backend.'); 
      setShowRollbackModal(false);
    } 
    finally { setIsRollingBack(false); }
  };

  return (
    <div className="w-full space-y-6 pb-16 font-sans relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 transition-all shadow-sm flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                {(selectedReport.kegiatan?.length > 0 && selectedReport.kondisiFasilitas?.length > 0)
                  ? 'Laporan Harian ELIT'
                  : isFasilitasOnly
                  ? 'Pengecekan Fasilitas'
                  : 'Log Book Harian'}
              </h1>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${statusClass}`}>{status}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{selectedReport.tanggal} • Shift {selectedReport.dinas}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {userRole === 'ADMIN' && (
            <button onClick={() => handleDelete && handleDelete(selectedReport._id)} className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs border border-rose-200 shadow-sm transition-all">
              Hapus Laporan
            </button>
          )}

          {canRollback && (
            <button onClick={() => setShowRollbackModal(true)} className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-bold rounded-xl text-xs shadow-sm transition-all">
              ↩️ Batalkan Persetujuan
            </button>
          )}

          {isApproved && (
             <ExportMenu selectedReport={selectedReport} isFasilitasOnly={isFasilitasOnly} />
          )}

          {(canSpvApprove || canAsmenApprove) && (
            <>
              <button onClick={() => handleReject(selectedReport)} className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs border border-rose-200 shadow-sm transition-all">
                Minta Revisi
              </button>
              <button onClick={() => handleApprove(selectedReport)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all">
                {status === 'Menunggu Asmen' ? 'Setujui Laporan Final (Approve)' : 'Setujui & Teruskan ke Asmen'}
              </button>
            </>
          )}
        </div>
      </div>

      <ReportDataView selectedReport={selectedReport} isFasilitasOnly={isFasilitasOnly} />

      {showRollbackModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col text-center border border-slate-100">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Batalkan Persetujuan?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Dokumen ini akan ditarik dan statusnya dikembalikan menjadi <strong className="text-blue-600">{targetStatusAfterRollback}</strong>. Apakah Bapak/Ibu yakin?
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowRollbackModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Tutup
              </button>
              <button 
                onClick={executeRollback}
                disabled={isRollingBack}
                className="flex-1 py-3 text-white text-sm font-bold bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/30 transition-colors disabled:opacity-50"
              >
                {isRollingBack ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}