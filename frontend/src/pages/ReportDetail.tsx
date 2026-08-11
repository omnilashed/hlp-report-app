import { copyToWhatsApp, exportToWord, exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ReportDetailProps {
  selectedReport: any;
  userRole: string;
  canSpvApprove: boolean;
  canAsmenApprove: boolean;
  handleApprove: (report: any) => void;
  handleReject: (report: any) => void;
  setCurrentView: (view: string) => void;
  printLogbookRef: React.RefObject<HTMLDivElement | null>;
  printFasilitasRef: React.RefObject<HTMLDivElement | null>;
}

export default function ReportDetail({ selectedReport, canSpvApprove, canAsmenApprove, handleApprove, handleReject, setCurrentView, printLogbookRef, printFasilitasRef }: ReportDetailProps) {
  if (!selectedReport) return null;

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full flex flex-col overflow-hidden">
      <div className="bg-white/30 p-6 border-b border-white/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-800">{selectedReport.kegiatan?.length > 0 ? 'Detail Logbook' : 'Detail Fasilitas'}</h2>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedReport.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : selectedReport.status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>{selectedReport.status || 'Draft'}</span>
          </div>
          <p className="text-slate-500 font-medium mt-1">{selectedReport.tanggal} • <span className="text-blue-600">Shift {selectedReport.dinas}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(canSpvApprove || canAsmenApprove) && (
            <>
              <button onClick={() => handleApprove(selectedReport)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all text-xs">
                ✅ Setujui (Approve)
              </button>
              <button onClick={() => handleReject(selectedReport)} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all text-xs">
                ❌ Tolak (Reject)
              </button>
            </>
          )}

          <button onClick={() => copyToWhatsApp(selectedReport)} className="flex-1 sm:flex-none px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-md shadow-green-500/20 transition-all text-xs">Copy WA</button>
          
          {selectedReport.status === 'Approved' ? (
            <>
              <button onClick={() => exportToWord(selectedReport)} className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all text-xs">Unduh Word</button>
              {selectedReport.kegiatan?.length > 0 && <button onClick={() => exportToExcel(selectedReport)} className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-md transition-all text-xs">Unduh Excel</button>}
              <button onClick={() => exportToPDF(selectedReport.kegiatan?.length > 0 ? printLogbookRef : printFasilitasRef, selectedReport.kegiatan?.length > 0 ? 'LogBook' : 'Fasilitas', selectedReport)} className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-md transition-all text-xs">Unduh PDF</button>
            </>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold border border-slate-200 flex items-center text-center">
              🔒 Menunggu Approval (Izin Cetak)
            </div>
          )}

          <button onClick={() => setCurrentView('dashboard')} className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-white/60 text-slate-600 font-bold rounded-xl hover:bg-white/50 shadow-sm transition-all text-xs">Kembali</button>
        </div>
      </div>
      
      <div className="p-6 sm:p-8 bg-white/20">
        {selectedReport.status === 'Revisi' && (selectedReport.catatanAsmen || selectedReport.catatanSpv) && (
          <div className="mb-8 bg-rose-50 border border-rose-200 p-5 rounded-2xl flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center font-bold flex-shrink-0">⚠️</div>
            <div>
              <h4 className="font-extrabold text-rose-800 text-sm">Catatan Revisi / Perbaikan</h4>
              {selectedReport.catatanSpv && <p className="text-rose-600 mt-1 text-sm whitespace-pre-wrap"><span className="font-bold">SPV:</span> {selectedReport.catatanSpv}</p>}
              {selectedReport.catatanAsmen && <p className="text-rose-600 mt-1 text-sm whitespace-pre-wrap"><span className="font-bold">Asmen:</span> {selectedReport.catatanAsmen}</p>}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 border-b border-white/50 pb-3 mb-5">Tim Personil</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-sm">
              <h4 className="font-extrabold text-slate-800 mb-3 flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>APINDO</h4>
              <ul className="space-y-1.5 text-slate-600 font-medium ml-4">{selectedReport.personil?.apindo?.length > 0 ? selectedReport.personil.apindo.map((p: any, i: number) => <li key={i} className="list-disc">{p.nama || p}</li>) : <li>-</li>}</ul>
            </div>
            <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-sm">
              <h4 className="font-extrabold text-slate-800 mb-3 flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>OM IASS / NTI</h4>
              <ul className="space-y-1.5 text-slate-600 font-medium ml-4">{selectedReport.personil?.omIassNti?.length > 0 ? selectedReport.personil.omIassNti.map((p: any, i: number) => <li key={i} className="list-disc">{p.nama || p}</li>) : <li>-</li>}</ul>
            </div>
          </div>
        </div>

        {selectedReport.kegiatan?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 border-b border-white/50 pb-3 mb-5">Daftar Kegiatan</h3>
            <div className="space-y-5">
              {selectedReport.kegiatan.map((item: any, i: number) => (
                <div key={i} className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="inline-flex px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm mb-3">
                      {item.jamMulai.replace(' WIB', '')} - {item.jamSelesai}
                    </div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap font-medium leading-relaxed">{item.uraian}</div>
                  </div>
                  {item.dokumentasi && item.dokumentasi.length > 0 && (
                    <div className="w-full lg:w-72 shrink-0 grid grid-cols-2 gap-3">
                      {item.dokumentasi.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt="Bukti" className="w-full h-28 object-cover rounded-xl border border-white shadow-sm" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}