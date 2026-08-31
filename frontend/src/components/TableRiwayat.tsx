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
}

export default function TableRiwayat({ reports, isLoading, canInput, viewReportDetail, editReport, deleteReport, currentPage, totalPages, onPageChange }: TableRiwayatProps) {
  const [activeTab, setActiveTab] = useState<'Logbook' | 'Fasilitas'>('Logbook');
  
  // State untuk Filter Tanggal
  const [dateFilter, setDateFilter] = useState('Semua'); 
  const [customDate, setCustomDate] = useState('');

  // Fungsi pengubah teks "30 Juli 2026" menjadi Data Waktu (Date Object)
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

  // Logika Filter Ganda (Berdasarkan Tab & Berdasarkan Tanggal)
  const filteredReports = reports.filter((report: any) => {
    // 1. Filter Tab (Fasilitas / Logbook)
    const isFasilitasTab = activeTab === 'Fasilitas';
    const isFasilitasReport = report.kondisiFasilitas && report.kondisiFasilitas.length > 0;
    if (isFasilitasTab !== !!isFasilitasReport) return false;

    // 2. Filter Tanggal
    if (dateFilter === 'Semua') return true;

    const reportDate = parseIndonesianDate(report.tanggal);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'Hari Ini') {
      return reportDate.getTime() === today.getTime();
    } 
    else if (dateFilter === '7 Hari') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return reportDate >= sevenDaysAgo && reportDate <= today;
    } 
    else if (dateFilter === '30 Hari') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return reportDate >= thirtyDaysAgo && reportDate <= today;
    } 
    else if (dateFilter === 'Custom' && customDate) {
      // customDate format HTML adalah YYYY-MM-DD
      const custom = new Date(customDate);
      custom.setHours(0, 0, 0, 0);
      return reportDate.getTime() === custom.getTime();
    }

    return true;
  });

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full overflow-hidden">
      <div className="p-6 border-b border-white/50 bg-white/30 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 text-lg">Riwayat Laporan Masuk</h2>
      </div>

      {/* Bagian Header Controls (Tabs & Filter) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:px-6 border-b border-white/50 bg-white/20">
        
        {/* Tab Pilihan */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide w-full md:w-auto">
          <button
            onClick={() => setActiveTab('Logbook')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'Logbook' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/70 text-slate-500 hover:bg-white'
            }`}
          >
            Logbook Harian
          </button>
          <button
            onClick={() => setActiveTab('Fasilitas')}
            className={`px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'Fasilitas' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/70 text-slate-500 hover:bg-white'
            }`}
          >
            Pengecekan Fasilitas
          </button>
        </div>

        {/* Dropdown Filter Tanggal */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white/80 text-slate-600 text-xs sm:text-sm font-bold rounded-full border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
          >
            <option value="Semua">Semua Waktu</option>
            <option value="Hari Ini">Hari Ini</option>
            <option value="7 Hari">7 Hari Terakhir</option>
            <option value="30 Hari">30 Hari Terakhir</option>
            <option value="Custom">Pilih Tanggal...</option>
          </select>

          {/* Muncul otomatis jika pilih Custom */}
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
                const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';
                return (
                  <tr key={report._id || index} className="border-b border-white/30 hover:bg-white/40 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{activeTab === 'Fasilitas' ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</td>
                    <td className="p-4 text-center"><span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusClass}`}>{status}</span></td>
                    <td className="p-4 font-medium text-slate-600">{report.tanggal} <span className="ml-2 bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200/50">Shift {report.dinas}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => viewReportDetail(report)} className="px-4 py-2 bg-white/60 text-blue-600 font-bold rounded-xl hover:bg-white border border-white shadow-sm text-xs transition-all">Detail</button>
                        {canInput && status !== 'Approved' && (
                          <>
                           <button onClick={() => editReport(report)} className="px-4 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl hover:bg-yellow-100 border border-yellow-100 shadow-sm text-xs transition-all">Edit</button>
                           <button onClick={() => deleteReport(report._id)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 border border-red-100 shadow-sm text-xs transition-all">Hapus</button>
                          </>
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
            return (
              <div key={report._id || index} className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2.5 py-1 rounded-lg border border-white">#{(currentPage - 1) * 10 + index + 1} • {report.tanggal}</span>
                    <h3 className="font-bold text-slate-800 mt-3 text-base">{activeTab === 'Fasilitas' ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</h3>
                    <p className="text-sm text-blue-600 font-bold mt-1">Shift {report.dinas}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusClass}`}>{status}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 border-t border-white/50 pt-4">
                  <button onClick={() => viewReportDetail(report)} className="flex-1 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 shadow-sm text-xs transition-all">Detail</button>
                  {canInput && status !== 'Approved' && (
                    <>
                     <button onClick={() => editReport(report)} className="flex-1 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl hover:bg-yellow-100 shadow-sm text-xs transition-all">Edit</button>
                     <button onClick={() => deleteReport(report._id)} className="flex-1 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 shadow-sm text-xs transition-all">Hapus</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-400 py-10 font-medium">Laporan tidak ditemukan.</div>
        )}
      </div>

      {/* Paginasi */}
      {!isLoading && totalPages > 1 && (
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