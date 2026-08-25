import { useState, useEffect } from 'react';

interface FasilitasFormProps { initialData?: any; onBack: () => void; }

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039', '2040'];

const defaultFasilitas = [
  { namaFasilitas: 'X-RAY', totalUnit: 10, normal: 10, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'WTMD', totalUnit: 7, normal: 7, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'HHMD', totalUnit: 9, normal: 9, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'FIDS', totalUnit: 29, normal: 29, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER FIDS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CLIENT FIDS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SWITCH MANAGE', totalUnit: 68, normal: 68, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'RADIOLINK', totalUnit: 35, normal: 35, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'ACCESS POINT', totalUnit: 64, normal: 64, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'IP PABX PHONE', totalUnit: 32, normal: 32, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER IP PABX', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'IGCS', totalUnit: 45, normal: 45, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'REPEATER IGCS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'ACCESS CONTROL', totalUnit: 13, normal: 13, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CCTV CAMERA', totalUnit: 168, normal: 168, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER CCTV', totalUnit: 10, normal: 10, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CLIENT CCTV', totalUnit: 10, normal: 9, rusak: 1, keteranganRusak: 'monitor client posko AVSEC rusak' },
  { namaFasilitas: 'SPEAKER PAS', totalUnit: 145, normal: 145, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'AMPLIFIER PAS', totalUnit: 13, normal: 13, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MIXER M9000 PAS', totalUnit: 4, normal: 4, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MINI AAS PAS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SELECTOR PAS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MICROPHONE PAS', totalUnit: 7, normal: 7, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MASTER CLOCK', totalUnit: 10, normal: 10, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER MASTER CLOCK', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'PANEL BAS', totalUnit: 9, normal: 9, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER BAS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CLIENT BAS', totalUnit: 2, normal: 2, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'DETECTOR FAS', totalUnit: 27, normal: 27, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MCP & BELL FAS', totalUnit: 4, normal: 4, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'REMOTE KEYPAD FAS', totalUnit: 2, normal: 2, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CLIENT FAS', totalUnit: 2, normal: 2, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SERVER FAS', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MCFA FAS', totalUnit: 4, normal: 4, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'HT VHF', totalUnit: 46, normal: 43, rusak: 3, keteranganRusak: 'terdapat kerusakan pada VHF HT RIG Mobile Motorola di Mobil Operasional sebanyak 3 Unit' },
  { namaFasilitas: 'REPEATER VHF', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'MONITOR CHECK-IN', totalUnit: 20, normal: 20, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'DIGITAL BANNER', totalUnit: 2, normal: 2, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'VIDEO WALL', totalUnit: 3, normal: 3, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CTF', totalUnit: 2, normal: 2, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'RUNNING TEXT', totalUnit: 4, normal: 4, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'SIGN RUANG TUNGGU', totalUnit: 5, normal: 5, rusak: 0, keteranganRusak: 'sign ruang tunggu dan sign jalan khusus difabel' },
  { namaFasilitas: 'ETD', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
  { namaFasilitas: 'CRASHBELL', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' },
];

const getCategory = (namaFasilitas: string) => {
  const n = namaFasilitas.toUpperCase();
  if (n.includes('X-RAY') || n.includes('WTMD') || n.includes('HHMD') || n.includes('ETD') || n.includes('CRASHBELL') || n.includes('ACCESS CONTROL')) return 'SECURITY & ACCESS';
  if (n.includes('SWITCH') || n.includes('RADIOLINK') || n.includes('ACCESS POINT')) return 'NETWORK';
  if (n.includes('PABX') || n.includes('IGCS')) return 'TELECOM';
  if (n.includes('CCTV')) return 'CCTV SYSTEM';
  if (n.includes('PAS')) return 'AUDIO (PAS)';
  if (n.includes('FAS')) return 'FIRE ALARM (FAS)';
  if (n.includes('BAS')) return 'BAS';
  if (n.includes('FIDS') || n.includes('VIDEO WALL') || n.includes('RUNNING TEXT') || n.includes('DIGITAL BANNER') || n.includes('MONITOR CHECK-IN') || n.includes('SIGN')) return 'FIDS & DISPLAY';
  if (n.includes('VHF')) return 'RADIO VHF';
  return 'LAINNYA'; 
};

const categories = [
  'SECURITY & ACCESS', 'NETWORK', 'TELECOM', 'CCTV SYSTEM', 
  'AUDIO (PAS)', 'FIRE ALARM (FAS)', 'BAS', 'FIDS & DISPLAY', 
  'RADIO VHF', 'LAINNYA'
];

export default function FasilitasForm({ initialData, onBack }: FasilitasFormProps) {
  const [activeTab, setActiveTab] = useState('umum');
  const [activeCategory, setActiveCategory] = useState('SECURITY & ACCESS');
  
  const [shift, setShift] = useState<'PAGI' | 'MALAM'>('PAGI');
  const [hari, setHari] = useState('30'); 
  const [bulan, setBulan] = useState('Juli'); 
  const [tahun, setTahun] = useState('2026');
  
  const [apindo, setApindo] = useState([{ nama: '' }]); 
  const [osIass, setOsIass] = useState([{ nama: '' }]); 
  const [omNti, setOmNti] = useState([{ nama: '' }]);

  const [personnelList, setPersonnelList] = useState<any[]>([]);

  const [fasilitas, setFasilitas] = useState(defaultFasilitas);
  const [catatan, setCatatan] = useState('');

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
    if (initialData) {
      if(initialData.dinas) setShift(initialData.dinas);
      const parts = initialData.tanggal.split(' ');
      if (parts.length === 3) { setHari(parts[0]); setBulan(parts[1]); setTahun(parts[2]); }
      
      if (initialData.personil) {
        if (initialData.personil.apindo?.length) setApindo(initialData.personil.apindo);
        const allOm = initialData.personil.omIassNti || [];
        setOsIass(allOm.slice(0, 4).length ? allOm.slice(0, 4) : [{ nama: '' }]);
        setOmNti(allOm.slice(4).length ? allOm.slice(4) : [{ nama: '' }]);
      }
      
      if (initialData.kondisiFasilitas?.length) {
        setFasilitas(initialData.kondisiFasilitas);
      }

      if (initialData.catatan) {
        setCatatan(initialData.catatan);
      }
    }
  }, [initialData]);

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

  const handleFasilitasChange = (index: number, field: string, value: any) => {
    const newFasilitas = [...fasilitas];
    (newFasilitas[index] as any)[field] = value;
    setFasilitas(newFasilitas);
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
      status: initialData?.status || 'Draft',
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
      const url = initialData?._id ? `/api/reports/${initialData._id}` : '/api/reports';
      const response = await fetch(url, { 
        method: initialData?._id ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
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
                        <select 
                          key={i} 
                          value={p.nama} 
                          onChange={(e) => { const n = [...apindo]; n[i].nama = e.target.value; setApindo(n); }} 
                          className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer"
                        >
                          <option value="">- Pilih Personil -</option>
                          {personnelList.filter(u => u.perusahaan === 'APINDO').map(u => <option key={u._id} value={u.namaLengkap || u.username}>{u.namaLengkap || u.username}</option>)}
                        </select>
                      ))}
                      <button onClick={() => setApindo([...apindo, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>
                    </div>

                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OS - IASS</label>
                      {osIass.map((p, i) => (
                        <select 
                          key={i} 
                          value={p.nama} 
                          onChange={(e) => { const n = [...osIass]; n[i].nama = e.target.value; setOsIass(n); }} 
                          className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer"
                        >
                          <option value="">- Pilih Personil -</option>
                          {personnelList.filter(u => u.perusahaan === 'IASS').map(u => <option key={u._id} value={u.namaLengkap || u.username}>{u.namaLengkap || u.username}</option>)}
                        </select>
                      ))}
                      <button onClick={() => setOsIass([...osIass, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>
                    </div>

                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OM - NTI</label>
                      {omNti.map((p, i) => (
                        <select 
                          key={i} 
                          value={p.nama} 
                          onChange={(e) => { const n = [...omNti]; n[i].nama = e.target.value; setOmNti(n); }} 
                          className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner cursor-pointer"
                        >
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
                
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.map((cat) => {
                    const countRusak = fasilitas.filter(f => getCategory(f.namaFasilitas) === cat && f.rusak > 0).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition-all shadow-sm flex items-center gap-2 border ${activeCategory === cat ? 'bg-[#175390] text-white border-[#175390] shadow-md' : 'bg-white/80 text-slate-500 hover:bg-white border-white'}`}
                      >
                        {cat}
                        {countRusak > 0 && (
                          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                            {countRusak}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
                  {fasilitas
                    .map((item, originalIndex) => ({ item, originalIndex }))
                    .filter(({ item }) => getCategory(item.namaFasilitas) === activeCategory)
                    .map(({ item, originalIndex }) => (
                      <div key={originalIndex} className="p-5 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4 border-b border-white/60 pb-3">
                          <span className="font-extrabold text-slate-800 text-sm tracking-wide">{item.namaFasilitas}</span>
                          <button onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Hapus Fasilitas',
                              message: `Yakin ingin menghapus ${item.namaFasilitas} dari daftar ini?`,
                              dangerMode: true,
                              isNotificationOnly: false,
                              onConfirm: () => {
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                const n = [...fasilitas];
                                n.splice(originalIndex, 1);
                                setFasilitas(n);
                              }
                            });
                          }} className="text-rose-400 hover:text-rose-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total</label>
                            <input type="number" value={item.totalUnit} onChange={(e) => handleFasilitasChange(originalIndex, 'totalUnit', parseInt(e.target.value) || 0)} className="w-full p-2 bg-white/60 border border-white/60 rounded-lg outline-none font-bold text-slate-700 text-center text-xs focus:ring-2 focus:ring-blue-500/20" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Normal</label>
                            <input type="number" value={item.normal} onChange={(e) => handleFasilitasChange(originalIndex, 'normal', parseInt(e.target.value) || 0)} className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg outline-none font-bold text-emerald-700 text-center text-xs focus:ring-2 focus:ring-emerald-500/20" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-rose-600 uppercase block mb-1">Rusak</label>
                            <input type="number" value={item.rusak} onChange={(e) => handleFasilitasChange(originalIndex, 'rusak', parseInt(e.target.value) || 0)} className="w-full p-2 bg-rose-50 border border-rose-200 rounded-lg outline-none font-bold text-rose-700 text-center text-xs focus:ring-2 focus:ring-rose-500/20" />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Keterangan Rusak</label>
                          <input type="text" value={item.keteranganRusak} onChange={(e) => handleFasilitasChange(originalIndex, 'keteranganRusak', e.target.value)} placeholder="Aman / Detail kerusakan..." className={`w-full p-2.5 bg-white/60 border border-white/60 rounded-lg outline-none font-medium text-xs focus:ring-2 focus:ring-blue-500/20 ${item.rusak > 0 ? 'text-rose-600 placeholder-rose-300 bg-rose-50/50' : 'text-slate-700'}`} />
                        </div>
                      </div>
                    ))}
                  
                  <button onClick={() => setFasilitas([...fasilitas, { namaFasilitas: 'FASILITAS BARU', totalUnit: 1, normal: 1, rusak: 0, keteranganRusak: '' }])} className="p-5 rounded-2xl bg-white/30 border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-500 font-bold text-xs flex flex-col items-center justify-center transition-all h-full min-h-[200px]">
                    <span className="text-2xl mb-2">+</span> Tambah (Di {activeCategory})
                  </button>
                </div>

                <div className="mt-8 bg-white/50 backdrop-blur-sm border border-white/60 p-5 rounded-2xl shadow-sm">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 block flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Radio Communication System : terdapat kerusakan pada VHF HT RIG Mobile Motorola di Mobil Operasional sebanyak 3 Unit"
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