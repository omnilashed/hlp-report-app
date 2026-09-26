interface CollageModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  modalStep: 'collage' | 'preview';
  setModalStep: React.Dispatch<React.SetStateAction<'collage' | 'preview'>>;
  slotImages: string[][];
  handleUploadToSlot: (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => void;
  removeImageFromSlot: (slotIndex: number, imgIndex: number) => void;
  handleInitiatePreview: () => void;
  isGenerating: boolean;
  hari: string;
  bulan: string;
  tahun: string;
  shift: string;
  kegiatan: any[];
  finalCollages: string[];
  handleFinalSubmit: () => void;
  isSubmitting: boolean;
}

export default function CollageModal({
  showModal, setShowModal, modalStep, setModalStep, slotImages,
  handleUploadToSlot, removeImageFromSlot, handleInitiatePreview, isGenerating,
  hari, bulan, tahun, shift, kegiatan, finalCollages, handleFinalSubmit, isSubmitting
}: CollageModalProps) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:pl-[260px]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
      <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-2xl w-full max-w-5xl z-10 flex flex-col overflow-hidden animate-fadeIn max-h-[95vh]">
        
        <div className="p-6 border-b border-white/50 bg-white/40 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {modalStep === 'collage' ? '🖼️ Susun Kolase Foto (4 Slot Final)' : '📄 Preview Laporan Akhir'}
            </h2>
          </div>
          <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-rose-100 text-slate-500 hover:text-rose-500 font-bold transition-all">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-br from-slate-50/50 to-blue-50/50">
          
          {modalStep === 'collage' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((slotIndex) => (
                <div key={slotIndex} className="bg-white/60 border border-white/60 rounded-2xl p-4 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Slot {slotIndex + 1}</span>
                  </div>
                  
                  <div className="flex-1 min-h-[120px] max-h-[200px] bg-white/40 rounded-xl border border-dashed border-slate-300 p-2 overflow-y-auto mb-3 custom-scrollbar">
                    {slotImages[slotIndex].length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {slotImages[slotIndex].map((img, imgIdx) => (
                          <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => removeImageFromSlot(slotIndex, imgIdx)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm hover:bg-rose-600 transition-colors">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-medium text-center">Tarik file atau klik tombol di bawah</div>
                    )}
                  </div>

                  <label className="cursor-pointer w-full py-2.5 bg-white hover:bg-blue-50 text-blue-600 font-bold text-xs text-center rounded-xl transition-all border border-blue-200 shadow-sm block relative">
                    {slotImages[slotIndex].length > 0 ? '+ Tambah Foto Lagi' : 'Pilih & Potong Foto'}
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUploadToSlot(e, slotIndex)} />
                  </label>
                </div>
              ))}
            </div>
          )}

          {modalStep === 'preview' && (
            <div className="space-y-6 text-slate-700">
              <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-wrap gap-6 items-center">
                <div><span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Tanggal</span> <span className="font-extrabold text-sm">{hari} {bulan} {tahun}</span></div>
                <div><span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Shift</span> <span className="font-extrabold text-sm text-blue-600">{shift}</span></div>
              </div>
              <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
                <h3 className="font-extrabold text-slate-800 mb-3 text-sm uppercase tracking-wider flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Ringkasan Uraian</h3>
                <ul className="space-y-3">
                  {kegiatan.filter(k => k.uraian.replace(/[-\s\n]/g, '').length > 0).map((k, i) => (
                    <li key={i} className="text-sm bg-white/40 p-3 rounded-xl border border-white/60">
                      <div className="font-bold text-blue-700 text-xs mb-1 bg-blue-100/50 inline-block px-2 py-0.5 rounded">{k.jamMulaiH}:{k.jamMulaiM} - {k.jamSelesaiH}:{k.jamSelesaiM}</div>
                      <div className="whitespace-pre-wrap font-medium">{k.uraian.replace(/^- /, '')}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
                <h3 className="font-extrabold text-slate-800 mb-3 text-sm uppercase tracking-wider flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Hasil Generation 4 Kolase</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {finalCollages.map((img, i) => (
                    <div key={i} className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border border-slate-200/50 shadow-inner relative">
                      {img ? (
                        <img src={img} className="w-full h-full object-contain bg-white" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold bg-white/50"><span className="text-lg opacity-50 mb-1">🖼️</span>Slot Kosong</div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[9px] font-bold">Slot {i+1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/50 bg-white/40 flex justify-end gap-3 rounded-b-[2rem]">
          {modalStep === 'collage' ? (
            <>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-white/60 text-slate-600 font-bold rounded-xl shadow-sm border border-white hover:bg-white transition-all text-sm">Batal</button>
              <button onClick={handleInitiatePreview} disabled={isGenerating} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all text-sm flex items-center">
                {isGenerating ? 'Membangun Kolase...' : 'Generate & Lanjut Preview'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setModalStep('collage')} className="px-5 py-2.5 bg-white/60 text-slate-600 font-bold rounded-xl shadow-sm border border-white hover:bg-white transition-all text-sm">Kembali Edit</button>
              <button onClick={handleFinalSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-all text-sm transform hover:-translate-y-0.5 disabled:opacity-50">
                {isSubmitting ? 'MENGIRIM...' : '🚀 Serahkan ke SPV'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}