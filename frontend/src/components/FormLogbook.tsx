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
      e.preventDefault(); 
      const target = e.target as HTMLTextAreaElement;
      const newVal = target.value.substring(0, target.selectionStart) + '\n- ' + target.value.substring(target.selectionEnd);
      const newK = [...kegiatan]; 
      newK[index][field] = newVal; 
      setKegiatan(newK);
      setTimeout(() => { target.selectionStart = target.selectionEnd = target.selectionStart + 3; }, 0);
    }
  };

  const handleAdd = () => {
    setKegiatan([...kegiatan, { laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-', dokumentasi: [] }]);
  };

  const handleRemove = (index: number) => {
    if (window.confirm('Hapus baris ini?')) {
      const newKegiatan = [...kegiatan];
      newKegiatan.splice(index, 1);
      setKegiatan(newKegiatan);
    }
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newKegiatan = [...kegiatan];
    newKegiatan[index][field] = value;
    setKegiatan(newKegiatan);
  };

  return (
    <div className="w-full animate-fadeIn">
      
      {/* Header & Tombol Tambah */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Logbook Aktivitas
        </h3>
        {!isLocked && (
          <button type="button" onClick={handleAdd} className="text-blue-600 font-bold text-sm hover:text-blue-800 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Tambah Baris
          </button>
        )}
      </div>

      {/* Area Tabel (Tanpa Background Luar agar melebur dengan layar) */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-8">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-100/60 border-y border-slate-200">
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-12">NO</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-28">JAM MULAI</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-28">JAM SELESAI</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-36">LAPORAN DARI</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 min-w-[280px]">PROGRESS ADUAN</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 min-w-[220px]">TINDAK LANJUT</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-32">KONDISI AKHIR</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 min-w-[200px]">KETERANGAN</th>
              <th className="py-3.5 px-2 text-center text-xs font-extrabold text-slate-500 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60">
            {kegiatan.map((item: any, index: number) => (
              <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                
                {/* NO */}
                <td className="p-2 text-center text-sm font-bold text-slate-400 align-top pt-4">
                  {index + 1}
                </td>
                
                {/* JAM MULAI */}
                <td className="p-2 align-top pt-4">
                  <div className="flex items-center justify-center border border-slate-200/80 rounded-md p-1.5 bg-white shadow-sm">
                    <select disabled={isLocked} value={item.jamMulaiH} onChange={(e) => handleChange(index, 'jamMulaiH', e.target.value)} className="appearance-none bg-transparent outline-none text-blue-600 font-bold text-sm cursor-pointer disabled:opacity-60 text-center w-full">
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-slate-400 font-bold text-sm mx-0.5">:</span>
                    <select disabled={isLocked} value={item.jamMulaiM} onChange={(e) => handleChange(index, 'jamMulaiM', e.target.value)} className="appearance-none bg-transparent outline-none text-blue-600 font-bold text-sm cursor-pointer disabled:opacity-60 text-center w-full">
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </td>
                
                {/* JAM SELESAI */}
                <td className="p-2 align-top pt-4">
                  <div className="flex items-center justify-center border border-slate-200/80 rounded-md p-1.5 bg-white shadow-sm">
                    <select disabled={isLocked} value={item.jamSelesaiH} onChange={(e) => handleChange(index, 'jamSelesaiH', e.target.value)} className="appearance-none bg-transparent outline-none text-blue-600 font-bold text-sm cursor-pointer disabled:opacity-60 text-center w-full">
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-slate-400 font-bold text-sm mx-0.5">:</span>
                    <select disabled={isLocked} value={item.jamSelesaiM} onChange={(e) => handleChange(index, 'jamSelesaiM', e.target.value)} className="appearance-none bg-transparent outline-none text-blue-600 font-bold text-sm cursor-pointer disabled:opacity-60 text-center w-full">
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </td>
                
                {/* LAPORAN DARI */}
                <td className="p-2 align-top pt-4">
                  <input type="text" disabled={isLocked} value={item.laporanDari} onChange={(e) => handleChange(index, 'laporanDari', e.target.value)} placeholder="Contoh: ELIT" className="w-full p-2.5 border border-slate-200/80 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:opacity-60 text-slate-700 text-left" />
                </td>
                
                {/* PROGRESS ADUAN */}
                <td className="p-2 align-top pt-3">
                  {!isLocked && (
                    <select onChange={(e) => { 
                      if (e.target.value) { 
                        const n = [...kegiatan]; 
                        const prefix = n[index].uraian.trim() !== '' ? '\n- ' : '- '; 
                        n[index].uraian += prefix + e.target.value; 
                        setKegiatan(n); 
                        e.target.value = ''; 
                      } 
                    }} 
                    className="w-full mb-1 text-[11px] text-blue-600 font-bold bg-transparent outline-none cursor-pointer truncate text-left">
                      <option value="">+ Pilih tugas rutin cepat...</option>
                      {tugasRutin.map((tugas, i) => <option key={i} value={tugas}>{tugas}</option>)}
                    </select>
                  )}
                  <textarea disabled={isLocked} value={item.uraian} onChange={(e) => handleChange(index, 'uraian', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'uraian')} placeholder="Ketik deskripsi kegiatan di sini..." className={`w-full p-2.5 border border-slate-200/80 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:opacity-60 text-slate-700 text-left resize-y min-h-[80px] ${isLocked ? 'mt-4' : ''}`} />
                </td>
                
                {/* TINDAK LANJUT */}
                <td className="p-2 align-top pt-4">
                  <textarea disabled={isLocked} value={item.tindakLanjut} onChange={(e) => handleChange(index, 'tindakLanjut', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'tindakLanjut')} placeholder="Tindak lanjut..." className="w-full p-2.5 border border-slate-200/80 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:opacity-60 text-slate-700 text-left resize-y min-h-[80px]" />
                </td>
                
                {/* KONDISI AKHIR */}
                <td className="p-2 align-top pt-4">
                  <select disabled={isLocked} value={item.hasilKondisi} onChange={(e) => handleChange(index, 'hasilKondisi', e.target.value)} className="w-full p-2.5 border border-slate-200/80 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:opacity-60 text-slate-700 cursor-pointer text-center">
                    <option value="-">-</option>
                    <option value="Normal">Normal</option>
                    <option value="Rusak">Rusak</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Proses">Proses</option>
                  </select>
                </td>
                
                {/* KETERANGAN */}
                <td className="p-2 align-top pt-4">
                  <textarea disabled={isLocked} value={item.keterangan} onChange={(e) => handleChange(index, 'keterangan', e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan')} placeholder="Keterangan..." className="w-full p-2.5 border border-slate-200/80 rounded-md text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:opacity-60 text-slate-700 text-left resize-y min-h-[80px]" />
                </td>
                
                {/* BUTTON HAPUS */}
                <td className="p-2 text-center align-top pt-6">
                  {kegiatan.length > 1 && !isLocked && (
                    <button type="button" onClick={() => handleRemove(index)} className="p-1.5 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors mx-auto" title="Hapus Baris">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}