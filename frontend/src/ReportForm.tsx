import { useState, useEffect } from 'react';

interface ReportFormProps { shift: 'PAGI' | 'MALAM'; initialData?: any; onBack: () => void; }

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028'];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export default function ReportForm({ shift, initialData, onBack }: ReportFormProps) {
  const [activeTab, setActiveTab] = useState('umum');
  const [hari, setHari] = useState('30'); const [bulan, setBulan] = useState('Juli'); const [tahun, setTahun] = useState('2026');
  const [apindo, setApindo] = useState([{ nama: '' }]); const [osIass, setOsIass] = useState([{ nama: '' }]); const [omNti, setOmNti] = useState([{ nama: '' }]);

  const [kegiatan, setKegiatan] = useState([{ laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '- ', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-' }]);

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'collage' | 'preview'>('collage');
  const [isGenerating, setIsGenerating] = useState(false);
  const [collageFormat, setCollageFormat] = useState<1 | 2 | 4 | 8>(4); 
  const [slotImages, setSlotImages] = useState<string[][]>([[], [], [], []]); 
  const [finalCollages, setFinalCollages] = useState<string[]>(['', '', '', '']);

  useEffect(() => {
    if (initialData) {
      const parts = initialData.tanggal.split(' ');
      if (parts.length === 3) { setHari(parts[0]); setBulan(parts[1]); setTahun(parts[2]); }
      if (initialData.personil) {
        if (initialData.personil.apindo?.length) setApindo(initialData.personil.apindo);
        const allOm = initialData.personil.omIassNti || [];
        setOsIass(allOm.slice(0, 4).length ? allOm.slice(0, 4) : [{ nama: '' }]);
        setOmNti(allOm.slice(4).length ? allOm.slice(4) : [{ nama: '' }]);
      }
      if (initialData.kegiatan?.length) {
        const parsed = initialData.kegiatan.map((k: any) => {
          const raw = k.uraian || '';
          const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
          const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || '- ';
          const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
          const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';
          const jm = k.jamMulai?.replace(' WIB', '').split('.') || ['07', '00'];
          const js = k.jamSelesai?.replace(' WIB', '').split('.') || ['07', '30'];
          return { laporanDari: lDari, jamMulaiH: jm[0] || '07', jamMulaiM: jm[1] || '00', uraian: urText, tindakLanjut: tLanjut, jamSelesaiH: js[0] || '07', jamSelesaiM: js[1] || '30', hasilKondisi: k.hasilKondisi || '-', keterangan: ket };
        });
        setKegiatan(parsed);

        const allDocs = initialData.kegiatan.reduce((acc: string[], k: any) => acc.concat(k.dokumentasi || []), []);
        const loadedSlots: string[][] = [[], [], [], []];
        allDocs.forEach((doc: string, i: number) => { if (i < 4) loadedSlots[i] = [doc]; });
        setSlotImages(loadedSlots);
      }
    }
  }, [initialData]);

  const handleTabChange = (tab: string) => {
    if (tab === 'kegiatan') {
      const isPersonilDiisi = apindo.some(p => p.nama.trim() !== '') || osIass.some(p => p.nama.trim() !== '') || omNti.some(p => p.nama.trim() !== '');
      if (!isPersonilDiisi) { alert('❌ Harap isi minimal 1 nama personil terlebih dahulu!'); return; }
    }
    setActiveTab(tab);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault(); const target = e.target as HTMLTextAreaElement;
      const newVal = target.value.substring(0, target.selectionStart) + '\n- ' + target.value.substring(target.selectionEnd);
      const newK = [...kegiatan]; (newK[index] as any)[field] = newVal; setKegiatan(newK);
      setTimeout(() => { target.selectionStart = target.selectionEnd = target.selectionStart + 3; }, 0);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX_WIDTH = 800;
          let width = img.width, height = img.height;
          if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height; canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        };
      };
    });
  };

  const handleUploadToSlot = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const base64Promises = files.map(file => compressImage(file));
      const base64Images = await Promise.all(base64Promises);
      const newSlots = [...slotImages];
      newSlots[slotIndex] = [...newSlots[slotIndex], ...base64Images];
      setSlotImages(newSlots);
    }
  };

  const removeImageFromSlot = (slotIndex: number, imgIndex: number) => {
    const newSlots = [...slotImages];
    newSlots[slotIndex].splice(imgIndex, 1);
    setSlotImages(newSlots);
  };

  const generateCollage = async (imagesBase64: string[]): Promise<string> => {
    if (imagesBase64.length === 0) return '';
    if (imagesBase64.length === 1) return imagesBase64[0]; 

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600; 
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const len = imagesBase64.length;
      let cols = 1, rows = 1;
      
      if (len === 2) { cols = 1; rows = 2; }
      else if (len <= 4) { cols = 2; rows = 2; }
      else if (len <= 6) { cols = 2; rows = 3; }
      else if (len <= 8) { cols = 2; rows = 4; }
      else if (len <= 12) { cols = 3; rows = 4; }
      else { cols = 4; rows = Math.ceil(len / 4); }

      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;
      const gap = 4; 

      let loaded = 0;
      const imgs = imagesBase64.map(src => {
        const img = new Image();
        img.src = src;
        return img;
      });

      const drawAll = () => {
        imgs.forEach((img, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * cellW;
          const y = row * cellH;

          const imgRatio = img.width / img.height;
          const cellRatio = cellW / cellH;
          let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

          if (imgRatio > cellRatio) {
              srcW = img.height * cellRatio;
              srcX = (img.width - srcW) / 2;
          } else {
              srcH = img.width / cellRatio;
              srcY = (img.height - srcH) / 2;
          }
          
          ctx.drawImage(img, srcX, srcY, srcW, srcH, x + gap/2, y + gap/2, cellW - gap, cellH - gap);
        });
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      imgs.forEach(img => {
        img.onload = () => { loaded++; if (loaded === len) drawAll(); };
        img.onerror = () => { loaded++; if (loaded === len) drawAll(); };
      });
    });
  };

  const handleInitiateSubmit = () => {
    const isPersonilDiisi = apindo.some(p => p.nama.trim() !== '') || osIass.some(p => p.nama.trim() !== '') || omNti.some(p => p.nama.trim() !== '');
    if (!isPersonilDiisi) { alert('❌ TIDAK BISA DISIMPAN: Harap isi minimal 1 nama personil!'); setActiveTab('umum'); return; }

    const validKegiatans = kegiatan.filter(k => (k.uraian || '').replace(/[-\s\n]/g, '').length > 0);
    if (validKegiatans.length === 0) { alert('❌ TIDAK BISA DISIMPAN: Anda belum mengisi progress aduan!'); setActiveTab('kegiatan'); return; }

    setShowModal(true);
    setModalStep('collage');
  };

  const handleInitiatePreview = async () => {
    setIsGenerating(true);
    try {
      const generated = await Promise.all(slotImages.map(imgs => generateCollage(imgs)));
      setFinalCollages(generated);
      setModalStep('preview');
    } catch (err) {
      alert('Gagal menyusun kolase foto.');
    } finally {
      setIsGenerating(false);
    }
  };

  // === PERBAIKAN ALARM ERROR DI SINI ===
  const handleFinalSubmit = async () => {
    const validKegiatans = kegiatan.filter(k => (k.uraian || '').replace(/[-\s\n]/g, '').length > 0);
    const uploadedPhotos = finalCollages.filter(img => img !== ''); 

    const dataKegiatan = validKegiatans.map((k, index) => ({
      uraian: `Laporan Dari: ${k.laporanDari}\n\nUraian: ${k.uraian}\nTindak Lanjut: ${k.tindakLanjut}\nKeterangan: ${k.keterangan}`,
      jamMulai: `${k.jamMulaiH}.${k.jamMulaiM} WIB`, jamSelesai: `${k.jamSelesaiH}.${k.jamSelesaiM} WIB`, hasilKondisi: k.hasilKondisi, 
      dokumentasi: index === 0 ? uploadedPhotos : [] 
    }));

    const dataLaporan = {
      fungsi: 'ELECTRONIC & IT FACILITY', dinas: shift, tanggal: `${hari} ${bulan} ${tahun}`,
      status: initialData?.status || 'Draft',
      catatanAsmen: initialData?.catatanAsmen || '',
      personil: { apindo: apindo.filter(p => p.nama), omIassNti: [...osIass.filter(p => p.nama), ...omNti.filter(p => p.nama)] },
      kegiatan: dataKegiatan, kondisiFasilitas: []
    };

    try {
      const url = initialData?._id ? `/api/reports/${initialData._id}` : '/api/reports';
      const response = await fetch(url, { 
        method: initialData?._id ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(dataLaporan) 
      });
      
      if (response.ok) { 
        alert('✅ Laporan berhasil disimpan ke Database!'); 
        onBack(); 
      } else { 
        // Jika Ditolak MongoDB (Misal memori penuh atau struktur salah)
        const errData = await response.json();
        alert(`❌ GAGAL MENYIMPAN!\nAlasan Server: ${errData.message || 'Error Database'}`); 
        console.error("Server Error:", errData);
      }
    } catch (e) { 
      // Jika Backend Mati / Terputus
      alert('❌ KONEKSI TERPUTUS!\nTidak bisa terhubung ke server (localhost:5000). Pastikan terminal backend Anda sedang menyala (npm run dev).'); 
      console.error("Network Error:", e);
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
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-800">{initialData ? 'Edit Logbook' : 'Form Laporan Masuk'}</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Layanan Pengaduan Fasilitas Umum</p>
              </div>
            </div>
            <div className={`self-start sm:self-auto px-5 py-2 rounded-xl text-xs font-bold tracking-widest uppercase shadow-sm border border-white ${shift === 'PAGI' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
              Shift {shift}
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200/50">
            <button onClick={() => handleTabChange('umum')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'umum' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tanggal & Personil</button>
            <button onClick={() => handleTabChange('kegiatan')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'kegiatan' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Detail Progress Aduan</button>
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
                    <div className="space-y-3 w-full"><label className="text-xs font-bold text-slate-600 block ml-1">APINDO</label>{apindo.map((p, i) => <input key={i} type="text" value={p.nama} onChange={(e) => { const n = [...apindo]; n[i].nama = e.target.value; setApindo(n); }} placeholder="Nama lengkap..." className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner" />)}<button onClick={() => setApindo([...apindo, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button></div>
                    <div className="space-y-3 w-full"><label className="text-xs font-bold text-slate-600 block ml-1">OS - IASS</label>{osIass.map((p, i) => <input key={i} type="text" value={p.nama} onChange={(e) => { const n = [...osIass]; n[i].nama = e.target.value; setOsIass(n); }} placeholder="Nama lengkap..." className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner" />)}<button onClick={() => setOsIass([...osIass, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button></div>
                    <div className="space-y-3 w-full"><label className="text-xs font-bold text-slate-600 block ml-1">OM - NTI</label>{omNti.map((p, i) => <input key={i} type="text" value={p.nama} onChange={(e) => { const n = [...omNti]; n[i].nama = e.target.value; setOmNti(n); }} placeholder="Nama lengkap..." className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner" />)}<button onClick={() => setOmNti([...omNti, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kegiatan' && (
              <div className="space-y-6 sm:space-y-8 animate-fadeIn w-full">
                {kegiatan.map((item, index) => (
                  <div key={index} className="p-4 sm:p-8 rounded-2xl bg-white/40 border border-white/60 shadow-sm relative w-full">
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex gap-2">
                       <button onClick={() => { if(window.confirm('Hapus baris ini?')) { const n = [...kegiatan]; n.splice(index, 1); setKegiatan(n); } }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-all"><svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6 mt-8 sm:mt-4 w-full">
                      <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Laporan Dari</label><input type="text" value={item.laporanDari} onChange={(e) => { const n = [...kegiatan]; n[index].laporanDari = e.target.value; setKegiatan(n); }} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm focus:ring-4 focus:ring-blue-500/20 shadow-inner" /></div>
                      <div className="md:col-span-4 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Mulai</label><div className="flex items-center bg-white/60 border border-white/60 shadow-inner rounded-xl p-1"><select value={item.jamMulaiH} onChange={(e) => { const n = [...kegiatan]; n[index].jamMulaiH = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700">{hours.map(h => <option key={h}>{h}</option>)}</select><span className="font-bold text-slate-400">:</span><select value={item.jamMulaiM} onChange={(e) => { const n = [...kegiatan]; n[index].jamMulaiM = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700">{minutes.map(m => <option key={m}>{m}</option>)}</select></div></div>
                      <div className="md:col-span-5 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Progress Aduan</label><textarea value={item.uraian} onChange={(e) => { const n = [...kegiatan]; n[index].uraian = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'uraian')} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20" /></div>
                      <div className="md:col-span-4 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Selesai</label><div className="flex items-center bg-white/60 border border-white/60 shadow-inner rounded-xl p-1"><select value={item.jamSelesaiH} onChange={(e) => { const n = [...kegiatan]; n[index].jamSelesaiH = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700">{hours.map(h => <option key={h}>{h}</option>)}</select><span className="font-bold text-slate-400">:</span><select value={item.jamSelesaiM} onChange={(e) => { const n = [...kegiatan]; n[index].jamSelesaiM = e.target.value; setKegiatan(n); }} className="flex-1 p-1.5 sm:p-2 bg-transparent outline-none font-bold text-center text-xs sm:text-sm text-slate-700">{minutes.map(m => <option key={m}>{m}</option>)}</select></div></div>
                      <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tindak Lanjut</label><textarea value={item.tindakLanjut} onChange={(e) => { const n = [...kegiatan]; n[index].tindakLanjut = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'tindakLanjut')} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20" /></div>
                      <div className="md:col-span-2 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Status</label><input type="text" value={item.hasilKondisi} onChange={(e) => { const n = [...kegiatan]; n[index].hasilKondisi = e.target.value; setKegiatan(n); }} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm focus:ring-4 focus:ring-blue-500/20" /></div>
                      <div className="md:col-span-3 w-full"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Keterangan</label><textarea value={item.keterangan} onChange={(e) => { const n = [...kegiatan]; n[index].keterangan = e.target.value; setKegiatan(n); }} onKeyDown={(e) => handleKeyDown(e, index, 'keterangan')} className="w-full p-2.5 sm:p-3.5 bg-white/60 border border-white/60 shadow-inner rounded-xl outline-none font-medium text-slate-700 text-xs sm:text-sm min-h-[60px] sm:min-h-[80px] focus:ring-4 focus:ring-blue-500/20" /></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setKegiatan([...kegiatan, { laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '- ', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-' }])} className="w-full py-3.5 sm:py-4 bg-white/60 border border-white text-blue-700 rounded-2xl font-bold text-xs sm:text-sm hover:bg-white shadow-sm transition-all">
                  + Tambah Progress Laporan
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-200/50 w-full pb-4">
            <button onClick={handleInitiateSubmit} className="w-full py-3.5 sm:py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5">
              {initialData ? 'Lanjut Edit Kolase Foto' : 'Kirim Laporan & Susun Kolase'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                        {slotImages[slotIndex].length > 0 ? '+ Tambah Foto Lagi' : 'Pilih Foto (Bisa Banyak)'}
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
                  <button onClick={handleFinalSubmit} className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-all text-sm transform hover:-translate-y-0.5">🚀 Submit Final Data</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}