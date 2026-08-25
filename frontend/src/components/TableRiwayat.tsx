import { useEffect } from 'react';

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
  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full overflow-hidden">
      <div className="p-6 border-b border-white/50 bg-white/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-slate-800 text-lg">Riwayat Laporan Masuk</h2>
        </div>
      </div>
      
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
            ) : reports.length > 0 ? (
              reports.map((report, index) => {
                const isFasilitasOnly = report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0);
                const status = report.status || 'Draft';
                const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';
                return (
                  <tr key={report._id || index} className="border-b border-white/30 hover:bg-white/40 transition-colors">
                    <td className="p-4 text-center font-medium text-slate-500">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{isFasilitasOnly ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</td>
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
              <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Belum ada laporan masuk.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col p-4 space-y-4">
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-blue-600 font-bold text-sm animate-pulse">Mengambil data laporan...</span>
          </div>
        ) : reports.length > 0 ? (
          reports.map((report, index) => {
            const isFasilitasOnly = report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0);
            const status = report.status || 'Draft';
            const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';
            return (
              <div key={report._id || index} className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2.5 py-1 rounded-lg border border-white">#{(currentPage - 1) * 10 + index + 1} • {report.tanggal}</span>
                    <h3 className="font-bold text-slate-800 mt-3 text-base">{isFasilitasOnly ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</h3>
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
          <div className="text-center text-slate-400 py-10 font-medium">Belum ada laporan masuk.</div>
        )}
      </div>

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