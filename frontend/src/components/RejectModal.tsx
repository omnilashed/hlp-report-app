import React from 'react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  rejectNote: string;
  setRejectNote: (note: string) => void;
  reportToReject: any;
}

export default function RejectModal({ isOpen, onClose, onSubmit, rejectNote, setRejectNote, reportToReject }: RejectModalProps) {
  if (!isOpen || !reportToReject) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 bg-rose-50/50 border-b border-rose-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">Minta Revisi Laporan</h3>
            <p className="text-xs font-bold text-rose-600 mt-1 uppercase tracking-wider">Shift {reportToReject.dinas} • {reportToReject.tanggal}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-8">
          <label className="block text-[11px] font-extrabold text-slate-400 mb-3 tracking-widest uppercase">
            Catatan / Alasan Revisi
          </label>
          <textarea
            autoFocus
            required
            rows={4}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Contoh: Tolong perbaiki jam kegiatannya, ada kesalahan pengetikan..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none shadow-inner"
          />
          
          <div className="mt-8 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Kirim Revisi & WA
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}