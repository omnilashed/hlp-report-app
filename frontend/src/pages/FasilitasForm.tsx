import { useState, useEffect } from 'react';

interface FasilitasFormProps { initialData?: any; onBack: () => void; }

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039', '2040'];

export default function FasilitasForm({ initialData, onBack }: FasilitasFormProps) {
  const [activeTab, setActiveTab] = useState('umum');
  const [activeMainCategory, setActiveMainCategory] = useState('Faskampen');
  const [activeSubCategory, setActiveSubCategory] = useState('Fasilitas IT');
  
  const [shift, setShift] = useState<'PAGI' | 'MALAM'>('PAGI');
  const [hari, setHari] = useState('30'); 
  const [bulan, setBulan] = useState('Juli'); 
  const [tahun, setTahun] = useState('2026');
  
  const [apindo, setApindo] = useState([{ nama: '' }]); 
  const [osIass, setOsIass] = useState([{ nama: '' }]); 
  const [omNti, setOmNti] = useState([{ nama: '' }]);

  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [fasilitas, setFasilitas] = useState<any[]>([]);
  const [catatan, setCatatan] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    dangerMode: false,
    isNotificationOnly: false,
    onConfirm: () => {}
  });

  const showNotification = (title: string, message: string, dangerMode = false) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      dangerMode,
      isNotificationOnly: true,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const userArray = Array.isArray(data) ? data : (data.data || []);
          setPersonnelList(userArray.filter((u: any) => u.isActive && u.role !== 'GUEST'));
        }
      } catch (e) {}
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchEquipments = async () => {
      const token = localStorage.getItem('token');
      
      if (initialData && initialData.kondisiFasilitas?.length) {
        if(initialData.dinas) setShift(initialData.dinas);
        const parts = initialData.tanggal.split(' ');
        if (parts.length === 3) { setHari(parts[0]); setBulan(parts[1]); setTahun(parts[2]); }
        
        if (initialData.personil) {
          if (initialData.personil.apindo?.length) setApindo(initialData.personil.apindo);
          const allOm = initialData.personil.omIassNti || [];
          setOsIass(allOm.slice(0, 4).length ? allOm.slice(0, 4) : [{ nama: '' }]);
          setOmNti(allOm.slice(4).length ? allOm.slice(4) : [{ nama: '' }]);
        }
        setFasilitas(initialData.kondisiFasilitas);
        if (initialData.catatan) setCatatan(initialData.catatan);
      
      } else {
        try {
          const resEq = await fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } });
          if (resEq.ok) {
            const masterData = await resEq.json();
            const formatted = masterData.map((item: any) => ({
              _id: item._id,
              namaPeralatan: item.namaPeralatan,
              lokasi: item.lokasi,
              merek: item.merek || '-',
              mainCategory: item.mainCategory,
              subCategory: item.subCategory || '',
              kondisi: 'Normal', // Secara default, saat memuat baru, semuanya diset Normal
              keteranganRusak: ''
            }));
            setFasilitas(formatted);
          }
        } catch (e) {
          console.error("Gagal menarik data master fasilitas");
        }
      }
    };
    fetchEquipments();
  }, [initialData]);

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
          const newFasilitas = fasilitas.map((item) => {
            const riwayatAlat = latestReportData.kondisiFasilitas.find((f: any) => 
              f.namaPeralatan === item.namaPeralatan && f.lokasi === item.lokasi
            );
            
            if (riwayatAlat && riwayatAlat.kondisi === 'Rusak') {
              hasCarryOver = true;
              return { ...item, kondisi: 'Rusak', keteranganRusak: riwayatAlat.keteranganRusak };
            }
            return item;
          });

          setFasilitas(newFasilitas);

          if (hasCarryOver) {
            showNotification('Sinkronisasi Berhasil', 'Data alat yang rusak dari shift sebelumnya berhasil diwariskan ke form Anda saat ini.', false);
          } else {
            showNotification('Info', 'Tidak ditemukan alat yang rusak pada laporan shift sebelumnya (semua normal).', false);
          }
        } else {
          showNotification('Info', 'Belum ada riwayat laporan fasilitas sebelumnya.', false);
        }
      }
    } catch (error) {
      showNotification('Gagal', 'Terjadi kesalahan saat menarik data shift sebelumnya.', true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'fasilitas') {
      const isPersonilDiisi = apindo.some(p => p.nama.trim() !== '') || osIass.some(p => p.nama.trim() !== '') || omNti.some(p => p.nama.trim() !== '');
      if (!isPersonilDiisi) { 
        showNotification('Perhatian', 'Harap isi minimal 1 nama personil terlebih dahulu sebelum mengecek fasilitas!', true); 
        return; 
      }
    }
    setActiveTab(tab);
  };

  const toggleKondisi = (id: string) => {
    setFasilitas(prev => prev.map(f => 
      f._id === id ? { ...f, kondisi: f.kondisi === 'Normal' ? 'Rusak' : 'Normal', keteranganRusak: '' } : f
    ));
  };

  const updateKeterangan = (id: string, ket: string) => {
    setFasilitas(prev => prev.map(f => f._id === id ? { ...f, keteranganRusak: ket } : f));
  };

  const toggleAccordion = (namaPeralatan: string) => {
    setExpandedGroups(prev => ({ ...prev, [namaPeralatan]: !prev[namaPeralatan] }));
  };

  const handleFinalSubmit = async () => {
    const isPersonilDiisi = apindo.some(p => p.nama.trim() !== '') || osIass.some(p => p.nama.trim() !== '') || omNti.some(p => p.nama.trim() !== '');
    if (!isPersonilDiisi) { 
      showNotification('Tindakan Ditolak', 'Harap isi minimal 1 nama personil!', true); 
      setActiveTab('umum'); 
      return; 
    }

    const dataLaporan = {
      fungsi: 'ELECTRONIC & IT FACILITY', 
      dinas: shift, 
      tanggal: `${hari} ${bulan} ${tahun}`,
      status: (!initialData?.status || initialData?.status === 'Draft' || initialData?.status === 'Revisi') ? 'Menunggu SPV' : initialData.status,
      catatanAsmen: initialData?.catatanAsmen || '',
      catatan: catatan,
      personil: { 
        apindo: apindo.filter(p => p.nama), 
        omIassNti: [...osIass.filter(p => p.nama), ...omNti.filter(p => p.nama)] 
      },
      kegiatan: [], 
      kondisiFasilitas: fasilitas
    };

    try {
      const token = localStorage.getItem('token');
      const url = initialData?._id ? `/api/reports/${initialData._id}` : '/api/reports';
      const response = await fetch(url, { 
        method: initialData?._id ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify(dataLaporan) 
      });
      
      if (response.ok) { 
        showNotification('Berhasil', 'Data Pengecekan Fasilitas berhasil disimpan!'); 
        setTimeout(() => { onBack(); }, 1200);
      } else { 
        const errData = await response.json();
        showNotification('Gagal Menyimpan', errData.message || 'Error Database', true); 
      }
    } catch (e) { 
      showNotification('Koneksi Terputus', 'Tidak bisa terhubung ke server backend.', true); 
    }
  };

  const filteredFasilitas = fasilitas.filter(item => {
    if (activeMainCategory === 'Faskampen') return item.mainCategory === 'Faskampen';
    return item.mainCategory === 'Elban' && item.subCategory === activeSubCategory;
  });

  const groupedFasilitas = filteredFasilitas.reduce((acc, item) => {
    if (!acc[item.namaPeralatan]) acc[item.namaPeralatan] = [];
    acc[item.namaPeralatan].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 sm:p-6 md:p-10 font-sans flex justify-center text-slate-800 w-full overflow-x-hidden relative">
      <div className="w-full max-w-5xl bg-white/50 backdrop-blur-xl rounded-xl sm:rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col h-full sm:h-auto overflow-hidden z-10">
        
        <div className="p-4 sm:p-8 md:px-12 pt-6 sm:pt-10 border-b border-white/60 flex flex-col gap-6 bg-white/30">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={onBack} className="p-2 sm:p-3 bg-white/60 border border-white hover:bg-white rounded-xl text-blue-600 transition-all shadow-sm flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-800">{initialData ? 'Edit Kondisi Fasilitas' : 'Form Pengecekan Fasilitas'}</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Laporan Kesiapan Fasilitas Harian</p>
              </div>
            </div>
            <div className="self-start sm:self-auto flex items-center bg-white/60 border border-white rounded-xl p-1 shadow-sm">
              <button onClick={() => setShift('PAGI')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${shift === 'PAGI' ? 'bg-yellow-400 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>PAGI</button>
              <button onClick={() => setShift('MALAM')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${shift === 'MALAM' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>MALAM</button>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200/50">
            <button onClick={() => handleTabChange('umum')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'umum' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tanggal & Personil</button>
            <button onClick={() => handleTabChange('fasilitas')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'fasilitas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Daftar Fasilitas</button>
          </div>
        </div>

        <div className="p-4 sm:p-8 md:px-12 md:py-10 flex-1 overflow-y-auto bg-white/20 flex flex-col w-full">
          <div className="flex-1 w-full">
            
            {activeTab === 'umum' && (
              <div className="space-y-8 sm:space-y-12 animate-fadeIn max-w-3xl w-full">
                <div className="space-y-4 w-full">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Waktu Pelaksanaan</h2>
                  <div className="flex gap-2 sm:gap-3 w-full">
                    <select value={hari} onChange={(e) => setHari(e.target.value)} className="flex-1 p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20">{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="flex-[2] p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20">{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select value={tahun} onChange={(e) => setTahun(e.target.value)} className="flex-1 p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  </div>
                </div>

                <div className="space-y-4 w-full">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Tim Bertugas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">APINDO</label>
                      {apindo.map((p, i) => (
                        <select key={i} value={p.nama} onChange={(e) => { const n = [...apindo]; n[i].nama = e.target.value; setApindo(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer">
                          <option value="">- Pilih Personil -</option>
                          {personnelList.filter(u => u.perusahaan === 'APINDO').map(u => <option key={u._id} value={u.namaLengkap || u.username}>{u.namaLengkap || u.username}</option>)}
                        </select>
                      ))}
                      <button onClick={() => setApindo([...apindo, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>
                    </div>

                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OS - IASS</label>
                      {osIass.map((p, i) => (
                        <select key={i} value={p.nama} onChange={(e) => { const n = [...osIass]; n[i].nama = e.target.value; setOsIass(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer">
                          <option value="">- Pilih Personil -</option>
                          {personnelList.filter(u => u.perusahaan === 'IASS').map(u => <option key={u._id} value={u.namaLengkap || u.username}>{u.namaLengkap || u.username}</option>)}
                        </select>
                      ))}
                      <button onClick={() => setOsIass([...osIass, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>
                    </div>

                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OM - NTI</label>
                      {omNti.map((p, i) => (
                        <select key={i} value={p.nama} onChange={(e) => { const n = [...omNti]; n[i].nama = e.target.value; setOmNti(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer">
                          <option value="">- Pilih Personil -</option>
                          {personnelList.filter(u => u.perusahaan === 'NTI').map(u => <option key={u._id} value={u.namaLengkap || u.username}>{u.namaLengkap || u.username}</option>)}
                        </select>
                      ))}
                      <button onClick={() => setOmNti([...omNti, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleTabChange('fasilitas')} className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-blue-700 shadow-md transition-all">
                  Lanjut ke Pengecekan Fasilitas ➡️
                </button>
              </div>
            )}

            {activeTab === 'fasilitas' && (
              <div className="space-y-6 animate-fadeIn w-full">
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-white/60 pb-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setActiveMainCategory('Faskampen')}
                      className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${activeMainCategory === 'Faskampen' ? 'bg-[#175390] text-white border-[#175390] shadow-md' : 'bg-white/80 text-slate-500 hover:bg-white border-white'}`}
                    >
                      FASKAMPEN
                    </button>
                    <button 
                      onClick={() => setActiveMainCategory('Elban')}
                      className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${activeMainCategory === 'Elban' ? 'bg-[#175390] text-white border-[#175390] shadow-md' : 'bg-white/80 text-slate-500 hover:bg-white border-white'}`}
                    >
                      ELBAN
                    </button>
                  </div>
                  
                  {/* TOMBOL TARIK DATA SHIFT SEBELUMNYA */}
                  {!initialData && (
                    <button 
                      onClick={handleSyncPreviousData} 
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs shadow-sm transition-all border border-amber-200"
                    >
                      {isSyncing ? '⏳ Menyinkronkan...' : '🔄 GET DATA'}
                    </button>
                  )}
                </div>

                {activeMainCategory === 'Elban' && (
                  <div className="flex gap-6 justify-center pb-2">
                    <button 
                      onClick={() => setActiveSubCategory('Fasilitas IT')}
                      className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeSubCategory === 'Fasilitas IT' ? 'border-[#175390] text-[#175390]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      FASILITAS IT
                    </button>
                    <button 
                      onClick={() => setActiveSubCategory('Fasilitas Penunjang Bandar Udara')}
                      className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeSubCategory === 'Fasilitas Penunjang Bandar Udara' ? 'border-[#175390] text-[#175390]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                      PENUNJANG BANDARA
                    </button>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {(Object.entries(groupedFasilitas) as [string, any[]][]).map(([namaPeralatan, items]) => {
                    const isExpanded = expandedGroups[namaPeralatan];
                    const countRusak = items.filter((i: any) => i.kondisi === 'Rusak').length;

                    return (
                      <div key={namaPeralatan} className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                        <button 
                          onClick={() => toggleAccordion(namaPeralatan)} 
                          className="w-full flex justify-between items-center p-4 sm:p-5 text-left focus:outline-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-slate-800 text-sm">{namaPeralatan}</span>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{items.length} Unit</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {countRusak > 0 && (
                              <span className="bg-rose-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold animate-pulse">
                                {countRusak} Rusak
                              </span>
                            )}
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 sm:p-5 border-t border-white/60 bg-white/30 space-y-3">
                            {items.map((item: any) => (
                              <div key={item._id} className={`p-4 rounded-xl border transition-all ${item.kondisi === 'Normal' ? 'bg-white/80 border-slate-200 hover:border-blue-300' : 'bg-rose-50 border-rose-300 shadow-inner'}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800">{item.lokasi}</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Merek: {item.merek}</p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => toggleKondisi(item._id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors flex-shrink-0 w-full sm:w-auto ${item.kondisi === 'Normal' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'}`}
                                  >
                                    {item.kondisi === 'Normal' ? '✅ Normal' : '❌ Rusak'}
                                  </button>
                                </div>

                                {item.kondisi === 'Rusak' && (
                                  <div className="mt-4 animate-fadeIn">
                                    <input 
                                      type="text" 
                                      value={item.keteranganRusak} 
                                      onChange={(e) => updateKeterangan(item._id, e.target.value)} 
                                      placeholder="Tuliskan detail kerusakan..." 
                                      className="w-full p-3 bg-white border border-rose-200 rounded-lg outline-none font-medium text-xs focus:ring-2 focus:ring-rose-500/20 text-slate-700" 
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {Object.keys(groupedFasilitas).length === 0 && (
                    <div className="p-8 text-center bg-white/30 border border-dashed border-slate-300 rounded-2xl">
                      <p className="text-slate-500 font-bold text-sm">Tidak ada alat di kategori ini.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 bg-white/50 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-sm">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 block flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Terdapat kerusakan pada VHF HT RIG Mobile Motorola di Mobil Operasional..."
                    className="w-full p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-medium text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/20 shadow-inner min-h-[100px]"
                  />
                </div>

                <div className="pt-8 border-t border-slate-200/50">
                  <button onClick={handleFinalSubmit} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5">
                    🚀 Simpan Laporan Fasilitas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-inner ${confirmDialog.dangerMode ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#2563eb]'}`}>
              {confirmDialog.isNotificationOnly && !confirmDialog.dangerMode ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 w-full">
              {!confirmDialog.isNotificationOnly && (
                <button 
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
              )}
              <button 
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3 text-white text-sm font-bold rounded-xl shadow-md transition-colors ${confirmDialog.dangerMode ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/30'}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}