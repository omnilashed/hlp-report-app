import { useState } from 'react';

interface ReportDataViewProps {
  selectedReport: any;
  isFasilitasOnly: boolean;
}

export default function ReportDataView({ selectedReport, isFasilitasOnly }: ReportDataViewProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <>
      {selectedReport.catatanSpv && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Catatan Supervisor:</h3>
          <p className="text-sm text-amber-900 font-medium">{selectedReport.catatanSpv}</p>
        </div>
      )}

      {selectedReport.catatanAsmen && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">Catatan Asmen:</h3>
          <p className="text-sm text-rose-900 font-medium">{selectedReport.catatanAsmen}</p>
        </div>
      )}

      <div className="bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Tim Bertugas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">APINDO</span>
            <div className="space-y-1">
              {selectedReport.personil?.apindo?.map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">OS - IASS</span>
            <div className="space-y-1">
              {selectedReport.personil?.omIassNti?.slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">OM - NTI</span>
            <div className="space-y-1">
              {selectedReport.personil?.omIassNti?.slice(4).map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
        </div>
      </div>

      {isFasilitasOnly ? (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Daftar Kondisi Fasilitas</h2>
          <div className="bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm">
            {(() => {
               const grouped = selectedReport.kondisiFasilitas.reduce((acc: any, curr: any) => {
                 if (!acc[curr.namaPeralatan]) acc[curr.namaPeralatan] = { total: 0, normal: 0, rusak: 0, listRusak: [] };
                 acc[curr.namaPeralatan].total += 1;
                 if (curr.kondisi === 'Normal') acc[curr.namaPeralatan].normal += 1;
                 if (curr.kondisi === 'Rusak') {
                   acc[curr.namaPeralatan].rusak += 1;
                   if(curr.keteranganRusak) acc[curr.namaPeralatan].listRusak.push(`${curr.lokasi}: ${curr.keteranganRusak}`);
                 }
                 return acc;
               }, {});

               return Object.entries(grouped).map(([nama, data]: [string, any], index: number) => (
                 <div key={index} className="mb-4 pb-4 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                    <h3 className="font-extrabold text-slate-800 text-sm mb-2">{nama.toUpperCase()} ({data.total} Unit)</h3>
                    <div className="space-y-1 ml-2">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✅ Normal :</span>
                            <span className="text-slate-700 text-sm font-medium">{data.normal} Unit</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">❌ Rusak :</span>
                            <span className="text-slate-700 text-sm font-medium">
                                {data.rusak > 0 ? `${data.rusak} Unit ${data.listRusak.length > 0 ? `(${data.listRusak.join(', ')})` : ''}` : '-'}
                            </span>
                        </div>
                    </div>
                 </div>
               ));
            })()}
            {selectedReport.catatan && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Catatan Tambahan</h3>
                    <p className="text-sm text-slate-800 font-medium whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {selectedReport.catatan}
                    </p>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Daftar Kegiatan & Aduan</h2>
          {selectedReport.kegiatan?.map((keg: any, index: number) => {
            const raw = keg.uraian || '';
            const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || '-';
            const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || raw;
            const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
            const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';
            const jamMulaiClean = keg.jamMulai?.replace(/ WIB/gi, '').trim();
            const jamSelesaiClean = keg.jamSelesai?.replace(/ WIB/gi, '').trim();

            return (
              <div key={index} className="bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-600 font-extrabold text-xs rounded-xl border border-blue-100">
                    {jamMulaiClean} - {jamSelesaiClean} WIB
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Laporan Dari: <strong className="text-slate-800">{lDari}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Progress / Uraian</label>
                      <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{urText}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tindak Lanjut</label>
                      <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{tLanjut}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Keterangan Tambahan</label>
                      <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{ket}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kondisi Akhir</label>
                      <p className="text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{keg.hasilKondisi || '-'}</p>
                    </div>
                  </div>
                </div>

                {keg.dokumentasi && keg.dokumentasi.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Dokumentasi Foto (Klik untuk memperbesar)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {keg.dokumentasi.map((foto: string, fIdx: number) => (
                        <div 
                          key={fIdx} 
                          onClick={() => setPreviewImage(foto)}
                          className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all"
                        >
                          <img src={foto} alt="Dokumentasi" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedReport.editHistory && selectedReport.editHistory.length > 0 && (
        <div className="bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-5 mt-6">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Riwayat & Jejak Dokumen</h2>
          <div className="bg-white/50 border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {selectedReport.editHistory.map((hist: any, i: number) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {hist.user ? hist.user.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{hist.user}</p>
                    <p className="text-xs text-slate-500 font-medium">{hist.action}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 whitespace-nowrap">
                  {new Date(hist.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white hover:text-rose-400 bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-all font-bold text-lg">✕</button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20" />
          </div>
        </div>
      )}
    </>
  );
}