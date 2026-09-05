import React from 'react';

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const tugasRutin = [
  "Serah Terima Dinas Malam ke Dinas Pagi.",
  "Serah Terima Dinas Pagi ke Dinas Malam.",
  "Pembuatan Laporan Harian Shift MALAM.",
  "Pembuatan Laporan Harian Shift PAGI.",
  "Melakukan pengecekan & konfigurasi resolusi CCTV.",
  "Melakukan preventif maintenance harian X-Ray, WTMD, HHMD.",
  "Melakukan pengecekan harian peralatan Elektronika dan IT di Bandara Halim PK.",
  "Melakukan pengecekan dan pembersihan X-Ray."
];

export default function FormLogbook({ kegiatan, setKegiatan, isLocked }: any) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault(); const target = e.target as HTMLTextAreaElement;
      const newVal = target.value.substring(0, target.selectionStart) + '\n- ' + target.value.substring(target.selectionEnd);
      const newK = [...kegiatan]; newK[index][field] = newVal; setKegiatan(newK);
      setTimeout(() => { target.selectionStart = target.selectionEnd = target.selectionStart + 3; }, 0);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn w-full">
      {kegiatan.map((item: any, index: number) => (
        <div key={index} className="p-4 sm:p-8 rounded-2xl bg-white/40 border border-white/60 shadow-sm relative w-full">
          {!isLocked && (
            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex gap-2">
              <button onClick={() => { if(window.confirm('Hapus baris ini?')) { const n = [...kegiatan]; n.splice(index, 1); setKegiatan(n); } }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-all"><svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6 mt-8 sm:mt-4 w-full">
            <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Laporan Dari</label><input disabled={isLocked} type="text" value={item.laporanDari} onChange={(e) => { const n = [...kegiatan]; n[index].laporanDari = e.target.value; setKegiatan(n); }} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm focus:ring-4 focus:ring-blue-500/20 shadow-inner disabled:opacity-60" /></div>
            <div className="md:col-span-4 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Mulai</label><div className="flex items-center bg-white/60 border border-white/60 shadow-inner rounded-xl p-1"><select disabled={isLocked} value={item.jamMulaiH} onChange={(e) => { const n = [...kegiatan]; n[index].jamMulaiH = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700 disabled:opacity-60">{hours.map(h => <option key={h}>{h}</option>)}</select><span className="font-bold text-slate-400">:</span><select disabled={isLocked} value={item.jamMulaiM} onChange={(e) => { const n = [...kegiatan]; n[index].jamMulaiM = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700 disabled:opacity-60">{minutes.map(m => <option key={m}>{m}</option>)}</select></div></div>
            <div className="md:col-span-5 w-full">
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Progress Aduan</label>
              {!isLocked && (
                <select onChange={(e) => { if (e.target.value) { const n = [...kegiatan]; const prefix = n[index].uraian.trim() !== '' ? '\n- ' : '- '; n[index].uraian += prefix + e.target.value; setKegiatan(n); e.target.value = ''; } }} className="w-full p-2 mb-2 bg-blue-50/50 border border-blue-200/60 rounded-lg outline-none font-bold text-blue-600 text-[10px] sm:text-xs shadow-sm focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                  <option value="">+ Pilih tugas rutin cepat...</option>
                  {tugasRutin.map((tugas, i) => <option key={i} value={tugas}>{tugas}</option>)}
                </select>
              )}
              <textarea disabled={isLocked} value={item.uraian} onChange={(e) => { const n = [...kegiatan]; n[index].uraian = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'uraian')} placeholder="Ketik manual atau pilih dari menu di atas..." className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60" />
            </div>
            <div className="md:col-span-4 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Selesai</label><div className="flex items-center bg-white/60 border border-white/60 shadow-inner rounded-xl p-1"><select disabled={isLocked} value={item.jamSelesaiH} onChange={(e) => { const n = [...kegiatan]; n[index].jamSelesaiH = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700 disabled:opacity-60">{hours.map(h => <option key={h}>{h}</option>)}</select><span className="font-bold text-slate-400">:</span><select disabled={isLocked} value={item.jamSelesaiM} onChange={(e) => { const n = [...kegiatan]; n[index].jamSelesaiM = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700 disabled:opacity-60">{minutes.map(m => <option key={m}>{m}</option>)}</select></div></div>
            <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tindak Lanjut</label><textarea disabled={isLocked} value={item.tindakLanjut} onChange={(e) => { const n = [...kegiatan]; n[index].tindakLanjut = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'tindakLanjut')} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60" /></div>
            <div className="md:col-span-2 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Kondisi Akhir</label><input disabled={isLocked} type="text" value={item.hasilKondisi} onChange={(e) => { const n = [...kegiatan]; n[index].hasilKondisi = e.target.value; setKegiatan(n); }} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60" /></div>
            <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Keterangan Tambahan</label><textarea disabled={isLocked} value={item.keterangan} onChange={(e) => { const n = [...kegiatan]; n[index].keterangan = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan')} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60" /></div>
          </div>
        </div>
      ))}
      {!isLocked && <button onClick={() => setKegiatan([...kegiatan, { laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-', dokumentasi: [] }])} className="w-full py-3.5 sm:py-4 bg-white/60 border border-white text-blue-700 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white shadow-sm transition-all">+ Tambah Progress Laporan</button>}
    </div>
  );
}