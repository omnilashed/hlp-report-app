import { useState } from 'react';

interface TableRiwayatProps {
  reports: any[];
  isLoading: boolean;
  canInput: boolean;
  viewReportDetail: (report: any) => void;
  editReport: (report: any) => void;
  deleteReport: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  userRole: string; 
  userName: string; 
  rollbackReport?: (report: any) => void; // Tambahan prop untuk fitur rollback dari tabel
}

export default function TableRiwayat({ 
  reports, 
  isLoading, 
  canInput: _canInput, 
  viewReportDetail, 
  editReport, 
  deleteReport, 
  currentPage, 
  totalPages, 
  onPageChange,
  userRole,
  userName,
  rollbackReport // Tambahan
}: TableRiwayatProps) {
  const [activeTab, setActiveTab] = useState<'Semua' | 'Logbook' | 'Fasilitas'>('Semua');
  
  const [dateFilter, setDateFilter] = useState('Semua'); 
  const [customDate, setCustomDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const parseIndonesianDate = (dateString: string) => {
    if (!dateString) return new Date(0);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const parts = dateString.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIndex = months.indexOf(parts[1]);
      const year = parseInt(parts[2], 10);
      return new Date(year, monthIndex, day);
    }
    return new Date(dateString);
  };

  const getDraftRemainingText = (report: any) => {
    if (report.status !== 'Draft') return null;
    const expTime = report.draftExpiresAt
      ? new Date(report.draftExpiresAt).getTime()
      : new Date(report.draftSavedAt || report.updatedAt || report.createdAt || Date.now()).getTime() + 24 * 60 * 60 * 1000;
    const diff = expTime - Date.now();
    if (diff <= 0) return 'Expired';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}j ${mins}m`;
  };

  const getReportTypeLabel = (report: any) => {
    if (report.status === 'Draft') return 'Draft Laporan Terpadu (Logbook & Fasilitas)';
    const hasKegiatan = Array.isArray(report.kegiatan) && report.kegiatan.length > 0;
    const hasFasilitas = Array.isArray(report.kondisiFasilitas) && report.kondisiFasilitas.length > 0;
    if (hasKegiatan && hasFasilitas) return 'Laporan Harian (Logbook & Fasilitas)';
    if (hasFasilitas) return 'Pengecekan Fasilitas';
    return 'Log Book Harian';
  };

  const filteredReports = reports.filter((report: any) => {
    if (report.status === 'Draft') {
      const rem = getDraftRemainingText(report);
      if (rem === 'Expired') return false;
    }

    if (activeTab === 'Fasilitas') {
      const isFasilitasReport = report.kondisiFasilitas && report.kondisiFasilitas.length > 0;
      if (!isFasilitasReport) return false;
    } else if (activeTab === 'Logbook') {
      const isLogbookReport = report.kegiatan && report.kegiatan.length > 0;
      if (!isLogbookReport) return false;
    }

    let passDate = true;
    if (dateFilter !== 'Semua') {
      const reportDate = parseIndonesianDate(report.tanggal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'Hari Ini') {
        passDate = reportDate.getTime() === today.getTime();
      } 
      else if (dateFilter === '7 Hari') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        passDate = reportDate >= sevenDaysAgo && reportDate <= today;
      } 
      else if (dateFilter === '30 Hari') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        passDate = reportDate >= thirtyDaysAgo && reportDate <= today;
      } 
      else if (dateFilter === 'Custom' && customDate) {
        const custom = new Date(customDate);
        custom.setHours(0, 0, 0, 0);
        passDate = reportDate.getTime() === custom.getTime();
      }
    }
    if (!passDate) return false;

    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      const matchFasilitas = report.kondisiFasilitas?.some((f: any) => 
        f.namaPeralatan?.toLowerCase().includes(lowerSearch) ||
        f.keteranganRusak?.toLowerCase().includes(lowerSearch) ||
        f.lokasi?.toLowerCase().includes(lowerSearch)
      );
      const matchCatatan = report.catatan?.toLowerCase().includes(lowerSearch);
      const matchKegiatan = report.kegiatan?.some((k: any) => 
        k.uraian?.toLowerCase().includes(lowerSearch) ||
        k.tindakLanjut?.toLowerCase().includes(lowerSearch) ||
        k.keterangan?.toLowerCase().includes(lowerSearch) ||
        k.hasilKondisi?.toLowerCase().includes(lowerSearch) ||
        k.laporanDari?.toLowerCase().includes(lowerSearch)
      );
      const matchCode = report.reportCode?.toLowerCase().includes(lowerSearch);
      const matchTanggal = report.tanggal?.toLowerCase().includes(lowerSearch);
      const matchDinas = report.dinas?.toLowerCase().includes(lowerSearch);

      if (!matchFasilitas && !matchCatatan && !matchKegiatan && !matchCode && !matchTanggal && !matchDinas) {
        return false;
      }
    }

    return true;
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.updatedAt || a.createdAt || parseIndonesianDate(a.tanggal)).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || parseIndonesianDate(b.tanggal)).getTime();
    return dateB - dateA;
  });

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full overflow-hidden">
      <div className="p-6 border-b border-white/50 bg-white/30 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 text-lg">Riwayat Laporan Masuk</h2>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:px-6 border-b border-white/50 bg-white/20">
        
        <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('Semua'); setSearchTerm(''); }}
            className={`px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'Semua' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/70 text-slate-500 hover:bg-white'
            }`}
          >
            📋 Semua Laporan (Logbook & Fasilitas)
          </button>
          <button
            onClick={() => { setActiveTab('Logbook'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'Logbook' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/70 text-slate-500 hover:bg-white'
            }`}
          >
            Logbook
          </button>
          <button
            onClick={() => { setActiveTab('Fasilitas'); setSearchTerm(''); }}
            className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'Fasilitas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/70 text-slate-500 hover:bg-white'
            }`}
          >
            Fasilitas
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari alat, kerusakan..."
              className="w-full md:w-56 pl-9 pr-4 py-2 bg-white/80 text-slate-600 text-xs sm:text-sm font-bold rounded-full border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            />
          </div>

          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 bg-white/80 text-slate-600 text-xs sm:text-sm font-bold rounded-full border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
          >
            <option value="Semua">Semua Waktu</option>
            <option value="Hari Ini">Hari Ini</option>
            <option value="7 Hari">7 Hari Terakhir</option>
            <option value="30 Hari">30 Hari Terakhir</option>
            <option value="Custom">Pilih Tanggal...</option>
          </select>

          {dateFilter === 'Custom' && (
            <input 
              type="date" 
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-4 py-2 bg-white/80 text-slate-600 text-xs sm:text-sm font-bold rounded-full border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            />
          )}
        </div>
      </div>
      
      {/* Tampilan Tabel Desktop */}
      <div className="hidden md:block overflow-x-auto w-full p-2">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/60 text-slate-400 font-bold whitespace-nowrap text-xs uppercase tracking-wider">
              <th className="p-5 text-center">No</th>
              <th className="p-5">Jenis Laporan</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5">Tanggal & Shift</th>
              <th className="p-5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-blue-600 font-bold text-sm animate-pulse">Mengambil data laporan...</span>
                  </div>
                </td>
              </tr>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((report, index) => {
                const status = report.status || 'Draft';
                const draftRem = getDraftRemainingText(report);
                const statusClass = status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : status === 'Revisi'
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : status === 'Draft'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-200 text-slate-700 border-slate-300';
                
                // LOGIKA HAK AKSES
                const isPrivileged = userRole === 'SUPERVISOR' || userRole === 'ADMIN';
                const isCreator = report.user === userName || report.createdBy === userName;
                const isAssigned = report.personil?.apindo?.some((p: any) => p.nama === userName) || report.personil?.omIassNti?.some((p: any) => p.nama === userName);
                
                const canEditThisReport = status !== 'Approved' && (isPrivileged || isCreator || isAssigned);
                
                // LOGIKA ROLLBACK SPV & ASMEN DI TABEL
                const canSpvRollback = userRole === 'SUPERVISOR' && status === 'Menunggu Asmen';
                const canAsmenRollback = userRole === 'ASMEN' && status === 'Approved';
                const canShowRollback = rollbackReport && (canSpvRollback || canAsmenRollback);

                return (
                  <tr key={report._id || index} className="border-b border-white/30 hover:bg-white/40 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="p-4 font-bold text-slate-800">
                      {getReportTypeLabel(report)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusClass}`}>
                          {status === 'Draft' ? '📝 Draft Sementara' : status}
                        </span>
                        {status === 'Draft' && draftRem && (
                          <span className="text-[10px] font-bold text-amber-700">⏳ Hilang dlm {draftRem}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-600">{report.tanggal} <span className="ml-2 bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200/50">Shift {report.dinas}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => viewReportDetail(report)} className="px-4 py-2 bg-white/60 text-blue-600 font-bold rounded-xl hover:bg-white border border-white shadow-sm text-xs transition-all">Detail</button>
                        
                        {canShowRollback && (
                           <button onClick={() => rollbackReport(report)} className="px-4 py-2 bg-amber-50 text-amber-600 font-bold rounded-xl hover:bg-amber-100 border border-amber-200 shadow-sm text-xs transition-all">Rollback</button>
                        )}
                        
                        {canEditThisReport && (
                           <button onClick={() => editReport(report)} className="px-4 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl hover:bg-yellow-100 border border-yellow-100 shadow-sm text-xs transition-all">Edit</button>
                        )}
                        
                        {userRole === 'ADMIN' && (
                           <button onClick={() => deleteReport(report._id)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 border border-red-100 shadow-sm text-xs transition-all">Hapus</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Laporan tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tampilan Card Mobile */}
      <div className="md:hidden flex flex-col p-4 space-y-4">
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-blue-600 font-bold text-sm animate-pulse">Mengambil data laporan...</span>
          </div>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report, index) => {
            const status = report.status || 'Draft';
            const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';
            
            // LOGIKA HAK AKSES (MOBILE)
            const isPrivileged = userRole === 'SUPERVISOR' || userRole === 'ADMIN';
            const isCreator = report.user === userName || report.createdBy === userName;
            const isAssigned = report.personil?.apindo?.some((p: any) => p.nama === userName) || report.personil?.omIassNti?.some((p: any) => p.nama === userName);
            
            const canEditThisReport = status !== 'Approved' && (isPrivileged || isCreator || isAssigned);

            // LOGIKA ROLLBACK SPV & ASMEN DI TABEL (MOBILE)
            const canSpvRollback = userRole === 'SUPERVISOR' && status === 'Menunggu Asmen';
            const canAsmenRollback = userRole === 'ASMEN' && status === 'Approved';
            const canShowRollback = rollbackReport && (canSpvRollback || canAsmenRollback);

            return (
              <div key={report._id || index} className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2.5 py-1 rounded-lg border border-white">#{(currentPage - 1) * 10 + index + 1} • {report.tanggal}</span>
                    <h3 className="font-bold text-slate-800 mt-3 text-base">{getReportTypeLabel(report)}</h3>
                    <p className="text-sm text-blue-600 font-bold mt-1">Shift {report.dinas}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusClass}`}>{status}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 border-t border-white/50 pt-4">
                  <button onClick={() => viewReportDetail(report)} className="flex-1 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 shadow-sm text-xs transition-all">Detail</button>
                  
                  {canShowRollback && (
                     <button onClick={() => rollbackReport(report)} className="flex-1 py-2 bg-amber-50 text-amber-600 font-bold rounded-xl hover:bg-amber-100 shadow-sm text-xs transition-all">Rollback</button>
                  )}
                  
                  {canEditThisReport && (
                     <button onClick={() => editReport(report)} className="flex-1 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl hover:bg-yellow-100 shadow-sm text-xs transition-all">Edit</button>
                  )}
                  
                  {userRole === 'ADMIN' && (
                     <button onClick={() => deleteReport(report._id)} className="flex-1 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 shadow-sm text-xs transition-all">Hapus</button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-400 py-10 font-medium">Laporan tidak ditemukan.</div>
        )}
      </div>

      {!isLoading && totalPages > 1 && !searchTerm && (
        <div className="bg-white/30 p-4 border-t border-slate-200/60 flex justify-between items-center">
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 disabled:opacity-50 border border-slate-200"
          >
            ← Sebelumnya
          </button>
          <span className="text-xs font-bold text-slate-500">Halaman {currentPage} dari {totalPages}</span>
          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 disabled:opacity-50 border border-slate-200"
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  );
}