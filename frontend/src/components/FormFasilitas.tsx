import { useState, useEffect } from 'react';

export default function FormFasilitas({ fasilitas, setFasilitas, catatanFasilitas, setCatatanFasilitas, isLocked, initialData, showAlert }: any) {
  const [activeMainCategory, setActiveMainCategory] = useState('Faskampen');
  const [activeSubCategory, setActiveSubCategory] = useState('Fasilitas IT');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (initialData) return; 
    const fetchEquipments = async () => {
      const token = localStorage.getItem('token');
      try {
        const resEq = await fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } });
        if (resEq.ok) {
          const masterData = await resEq.json();
          const formatted = masterData.map((item: any) => ({
            _id: item._id, namaPeralatan: item.namaPeralatan, lokasi: item.lokasi, merek: item.merek || '-',
            mainCategory: item.mainCategory, subCategory: item.subCategory || '', kondisi: 'Normal', keteranganRusak: ''
          }));
          setFasilitas(formatted);
        }
      } catch (e) {}
    };
    fetchEquipments();
  }, [initialData, setFasilitas]);

  const handleSyncPreviousData = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const resRep = await fetch('/api/reports?limit=10', { headers: { 'Authorization': `Bearer ${token}` } });
      if (resRep.ok) {
        const parsedRep = await resRep.json();
        const latestReportData = parsedRep.data.find((r: any) => r.kondisiFasilitas && r.kondisiFasilitas.length > 0);
        if (latestReportData) {
          let hasCarryOver = false;
          const newFasilitas = fasilitas.map((item: any) => {
            const riwayatAlat = latestReportData.kondisiFasilitas.find((f: any) => f.namaPeralatan === item.namaPeralatan && f.lokasi === item.lokasi);
            if (riwayatAlat && riwayatAlat.kondisi === 'Rusak') { hasCarryOver = true; return { ...item, kondisi: 'Rusak', keteranganRusak: riwayatAlat.keteranganRusak }; }
            return item;
          });
          setFasilitas(newFasilitas);
          if (hasCarryOver) showAlert('Sinkronisasi Berhasil. Data alat rusak dari shift sebelumnya diwariskan.', 'success');
          else showAlert('Tidak ditemukan alat rusak pada laporan shift sebelumnya.', 'success');
        } else { showAlert('Belum ada riwayat laporan fasilitas sebelumnya.', 'warning'); }
      }
    } catch (error) { showAlert('Terjadi kesalahan saat menarik data.', 'error'); } 
    finally { setIsSyncing(false); }
  };

  const toggleKondisi = (id: string) => setFasilitas((prev: any) => prev.map((f: any) => f._id === id ? { ...f, kondisi: f.kondisi === 'Normal' ? 'Rusak' : 'Normal', keteranganRusak: '' } : f));
  const updateKeterangan = (id: string, ket: string) => setFasilitas((prev: any) => prev.map((f: any) => f._id === id ? { ...f, keteranganRusak: ket } : f));
  const toggleAccordion = (namaPeralatan: string) => setExpandedGroups(prev => ({ ...prev, [namaPeralatan]: !prev[namaPeralatan] }));

  const filteredFasilitas = fasilitas.filter((item: any) => activeMainCategory === 'Faskampen' ? item.mainCategory === 'Faskampen' : item.mainCategory === 'Elban' && item.subCategory === activeSubCategory);
  const groupedFasilitas = filteredFasilitas.reduce((acc: any, item: any) => { if (!acc[item.namaPeralatan]) acc[item.namaPeralatan] = []; acc[item.namaPeralatan].push(item); return acc; }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-white/60 pb-4">
        <div className="flex gap-4">
          <button onClick={() => setActiveMainCategory('Faskampen')} className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${activeMainCategory === 'Faskampen' ? 'bg-[#175390] text-white border-[#175390] shadow-md' : 'bg-white/80 text-slate-500 hover:bg-white border-white'}`}>FASKAMPEN</button>
          <button onClick={() => setActiveMainCategory('Elban')} className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${activeMainCategory === 'Elban' ? 'bg-[#175390] text-white border-[#175390] shadow-md' : 'bg-white/80 text-slate-500 hover:bg-white border-white'}`}>ELBAN</button>
        </div>
        {!initialData && <button onClick={handleSyncPreviousData} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs shadow-sm transition-all border border-amber-200">{isSyncing ? '⏳ Menyinkronkan...' : '🔄 GET DATA SEBELUMNYA'}</button>}
      </div>

      {activeMainCategory === 'Elban' && (
        <div className="flex gap-6 justify-center pb-2">
          <button onClick={() => setActiveSubCategory('Fasilitas IT')} className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeSubCategory === 'Fasilitas IT' ? 'border-[#175390] text-[#175390]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>FASILITAS IT</button>
          <button onClick={() => setActiveSubCategory('Fasilitas Penunjang Bandar Udara')} className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeSubCategory === 'Fasilitas Penunjang Bandar Udara' ? 'border-[#175390] text-[#175390]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>PENUNJANG BANDARA</button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {(Object.entries(groupedFasilitas) as [string, any[]][]).map(([namaPeralatan, items]) => {
          const isExpanded = expandedGroups[namaPeralatan];
          const countRusak = items.filter((i: any) => i.kondisi === 'Rusak').length;
          return (
            <div key={namaPeralatan} className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              <button onClick={() => toggleAccordion(namaPeralatan)} className="w-full flex justify-between items-center p-4 sm:p-5 text-left focus:outline-none">
                <div className="flex items-center gap-3"><span className="font-extrabold text-slate-800 text-sm">{namaPeralatan}</span><span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{items.length} Unit</span></div>
                <div className="flex items-center gap-3">{countRusak > 0 && <span className="bg-rose-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold animate-pulse">{countRusak} Rusak</span>}<svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </button>
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-white/60 bg-white/30 space-y-3">
                  {items.map((item: any) => (
                    <div key={item._id} className={`p-4 rounded-xl border transition-all ${item.kondisi === 'Normal' ? 'bg-white/80 border-slate-200 hover:border-blue-300' : 'bg-rose-50 border-rose-300 shadow-inner'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div><h4 className="font-bold text-sm text-slate-800">{item.lokasi}</h4><p className="text-xs text-slate-500 font-medium mt-0.5">Merek: {item.merek}</p></div>
                        <button disabled={isLocked} onClick={() => toggleKondisi(item._id)} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors flex-shrink-0 w-full sm:w-auto disabled:opacity-60 ${item.kondisi === 'Normal' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'}`}>{item.kondisi === 'Normal' ? '✅ Normal' : '❌ Rusak'}</button>
                      </div>
                      {item.kondisi === 'Rusak' && <div className="mt-4 animate-fadeIn"><input disabled={isLocked} type="text" value={item.keteranganRusak} onChange={(e) => updateKeterangan(item._id, e.target.value)} placeholder="Tuliskan detail kerusakan..." className="w-full p-3 bg-white border border-rose-200 rounded-lg outline-none font-medium text-xs focus:ring-2 focus:ring-rose-500/20 text-slate-700 disabled:opacity-60" /></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(groupedFasilitas).length === 0 && <div className="p-8 text-center bg-white/30 border border-dashed border-slate-300 rounded-2xl"><p className="text-slate-500 font-bold text-sm">Tidak ada alat di kategori ini.</p></div>}
      </div>

      <div className="mt-8 bg-white/50 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-sm">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 block flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Catatan Tambahan (Opsional)</label>
        <textarea disabled={isLocked} value={catatanFasilitas} onChange={(e) => setCatatanFasilitas(e.target.value)} placeholder="Contoh: Terdapat kerusakan pada VHF HT RIG Mobile Motorola di Mobil Operasional..." className="w-full p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-medium text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/20 shadow-inner min-h-[100px] disabled:opacity-60" />
      </div>
    </div>
  );
}