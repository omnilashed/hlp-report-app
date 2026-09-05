import { useState, useEffect } from 'react';
import CropperModal from '../components/CropperModal';
import CollageModal from '../components/CollageModal';
import FormLogbook from '../components/FormLogbook';
import FormFasilitas from '../components/FormFasilitas';

export interface ReportFormProps { shift: 'PAGI' | 'MALAM'; initialData?: any; onBack: () => void; }

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039', '2040'];

const apindoList = ['AEP MASHUM NURZAMAN', 'RAHMAT D. CAHYO', 'EKA YULIANI S.', 'RIZKO E. NUGRAHA', 'ISTIANAH RAHMAH DEWI', 'MAULANA HADY C. S.'];
const iassList = ['ADELIA PUSPITA', 'ABDUL KODIR', 'ROIM', 'DENNIS SAYYIDINAA R', 'YUDHA ISMUNANDAR', 'AHMAD FANGKY S.', 'KARUNIAWAN GEOVANI', 'MAHDI ALHABSYI'];
const ntiList = ['LUTHFIANDA MUZAKI S', 'FARIZ SOLAHUDIN', 'ZAKY ALHADY', 'MUHAMMAD FACHREZA', 'YOAN HERNANTRA'];

const today = new Date();
const defaultHari = today.getDate().toString().padStart(2, '0');
const defaultBulan = months[today.getMonth()];
const defaultTahun = today.getFullYear().toString();

export default function ReportForm({ shift, initialData, onBack }: ReportFormProps) {
  const [currentShift, setCurrentShift] = useState<'PAGI' | 'MALAM'>(initialData?.dinas || shift);
  const [activeTab, setActiveTab] = useState('umum');
  
  const [hari, setHari] = useState(defaultHari); 
  const [bulan, setBulan] = useState(defaultBulan); 
  const [tahun, setTahun] = useState(defaultTahun);
  const [reportCode, setReportCode] = useState(initialData?.reportCode || '');

  const [jamMulaiShift, setJamMulaiShift] = useState(currentShift === 'PAGI' ? '07:00' : '19:00');
  const [jamSelesaiShift, setJamSelesaiShift] = useState(currentShift === 'PAGI' ? '19:00' : '07:00');

  const [apindo, setApindo] = useState([{ nama: '' }]); 
  const [osIass, setOsIass] = useState([{ nama: '' }]); 
  const [omNti, setOmNti] = useState([{ nama: '' }]);
  
  const [kegiatan, setKegiatan] = useState([{ laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-', dokumentasi: [] as string[] }]);
  const [fasilitas, setFasilitas] = useState<any[]>([]);
  const [catatanFasilitas, setCatatanFasilitas] = useState('');

  const [status, setStatus] = useState('Draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'warning' as 'success' | 'error' | 'warning' });

  // Collage
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'collage' | 'preview'>('collage');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slotImages, setSlotImages] = useState<string[][]>([[], [], [], []]); 
  const [finalCollages, setFinalCollages] = useState<string[]>(['', '', '', '']);
  const [cropQueue, setCropQueue] = useState<{url: string, slotIndex: number}[]>([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState<number>(3 / 4);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const isLocked = status === 'Menunggu Asmen' || status === 'Approved';
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => setAlertConfig({ isOpen: true, message, type });

  const generateReportCode = () => {
    const shiftCode = currentShift === 'PAGI' ? 'PG' : 'ML';
    const monthIndex = String(months.indexOf(bulan) + 1).padStart(2, '0');
    const dateCode = `${tahun.slice(-2)}${monthIndex}${hari}`;
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    setReportCode(`ELIT-${dateCode}-${shiftCode}-${randomStr}`);
  };

  useEffect(() => {
    if (currentShift === 'PAGI') { setJamMulaiShift('07:00'); setJamSelesaiShift('19:00'); } 
    else { setJamMulaiShift('19:00'); setJamSelesaiShift('07:00'); }
  }, [currentShift]);

  useEffect(() => {
    if (initialData) {
      setStatus(initialData.status || 'Draft');
      if (initialData.reportCode) setReportCode(initialData.reportCode);
      if (initialData.dinas) setCurrentShift(initialData.dinas);
      const parts = initialData.tanggal.split(' ');
      if (parts.length === 3) { setHari(parts[0]); setBulan(parts[1]); setTahun(parts[2]); }
      if (initialData.jamMulaiShift) setJamMulaiShift(initialData.jamMulaiShift);
      if (initialData.jamSelesaiShift) setJamSelesaiShift(initialData.jamSelesaiShift);

      if (initialData.personil) {
        if (initialData.personil.apindo?.length) setApindo(initialData.personil.apindo);
        const allOm = initialData.personil.omIassNti || [];
        setOsIass(allOm.slice(0, 4).length ? allOm.slice(0, 4) : [{ nama: '' }]);
        setOmNti(allOm.slice(4).length ? allOm.slice(4) : [{ nama: '' }]);
      }
      
      if (initialData.kondisiFasilitas?.length > 0) {
        setFasilitas(initialData.kondisiFasilitas);
        if (initialData.catatan) setCatatanFasilitas(initialData.catatan);
        setActiveTab('fasilitas');
      } else if (initialData.kegiatan?.length > 0) {
        const parsed = initialData.kegiatan.map((k: any) => {
          const raw = k.uraian || '';
          const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
          const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || '';
          const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
          const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';
          const jm = k.jamMulai?.replace(' WIB', '').split('.') || ['07', '00'];
          const js = k.jamSelesai?.replace(' WIB', '').split('.') || ['07', '30'];
          return { laporanDari: lDari, jamMulaiH: jm[0] || '07', jamMulaiM: jm[1] || '00', uraian: urText, tindakLanjut: tLanjut, jamSelesaiH: js[0] || '07', jamSelesaiM: js[1] || '30', hasilKondisi: k.hasilKondisi || '-', keterangan: ket, dokumentasi: k.dokumentasi || [] };
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
    if (tab === 'kegiatan' || tab === 'fasilitas') {
      if (!reportCode) { showAlert('Harap Generate Report Code terlebih dahulu!', 'warning'); return; }
      if (!apindo.some(p => p.nama) && !osIass.some(p => p.nama) && !omNti.some(p => p.nama)) { showAlert('Harap isi minimal 1 nama personil!', 'warning'); return; }
    }
    setActiveTab(tab);
  };

  const renderBottomAction = () => {
    if (isLocked) return null;

    if (activeTab === 'umum') {
      return (
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-200/50 w-full pb-4">
          <button onClick={() => handleTabChange('kegiatan')} className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Lanjut Isi Logbook ➡️</button>
        </div>
      );
    }
    
    if (activeTab === 'kegiatan' && !initialData) {
      return (
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-200/50 w-full pb-4">
          <button onClick={() => handleTabChange('fasilitas')} className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Lanjut Pengecekan Fasilitas ➡️</button>
        </div>
      );
    }

    if (activeTab === 'fasilitas' || initialData) {
      return (
        <div className="pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-200/50 w-full pb-4">
          <button onClick={handleInitiateSubmit} disabled={isSubmitting} className="w-full py-3.5 sm:py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50">
            {isSubmitting ? 'MENGIRIM...' : initialData && initialData.kondisiFasilitas?.length > 0 ? 'Simpan Laporan Fasilitas' : 'Simpan Semua (Logbook & Fasilitas)'}
          </button>
        </div>
      );
    }
    return null;
  };

  const handleInitiateSubmit = () => {
    const validKegiatans = kegiatan.filter(k => (k.uraian || '').trim().length > 0);
    
    // Pastikan jika ada kegiatan (pembuatan baru atau edit logbook), KOLASE FOTO AKAN MUNCUL
    if (!initialData || (initialData && initialData.kegiatan?.length > 0)) {
      if (validKegiatans.length === 0) { 
        showAlert('TIDAK BISA DISIMPAN: Anda belum mengisi progress aduan (Logbook)!', 'error'); 
        setActiveTab('kegiatan'); 
        return; 
      }
      // BUKA JENDELA CROP / KOLASE FOTO
      setShowModal(true); 
      setModalStep('collage');
    } else {
      // Jika hanya edit laporan Fasilitas (yang tidak punya foto)
      handleFinalSubmit(); 
    }
  };

  const handleUploadToSlot = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setCropQueue(prev => [...prev, ...files.map(f => ({ url: URL.createObjectURL(f), slotIndex }))]);
    e.target.value = '';
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = new Image(); image.src = imageSrc; await new Promise(r => image.onload = r);
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    const MAX_WIDTH = 800; let finalWidth = canvas.width; let finalHeight = canvas.height;
    if (finalWidth > MAX_WIDTH) { finalHeight = Math.round((finalHeight * MAX_WIDTH) / finalWidth); finalWidth = MAX_WIDTH; }
    const finalCanvas = document.createElement('canvas'); finalCanvas.width = finalWidth; finalCanvas.height = finalHeight;
    finalCanvas.getContext('2d')?.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, finalWidth, finalHeight);
    return finalCanvas.toDataURL('image/jpeg', 0.7);
  };

  const handleSaveCrop = async () => {
    if (cropQueue.length === 0 || !croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(cropQueue[0].url, croppedAreaPixels);
      const newSlots = [...slotImages]; newSlots[cropQueue[0].slotIndex].push(croppedBase64);
      setSlotImages(newSlots); setCropQueue(prev => prev.slice(1)); setCrop({ x: 0, y: 0 }); setZoom(1);
    } catch (e) { showAlert("Gagal memotong foto.", 'error'); }
  };

  const removeImageFromSlot = (slotIndex: number, imgIndex: number) => {
    const newSlots = [...slotImages]; newSlots[slotIndex].splice(imgIndex, 1); setSlotImages(newSlots);
  };

  const generateCollage = async (imagesBase64: string[]): Promise<string> => {
    if (imagesBase64.length === 0) return ''; if (imagesBase64.length === 1) return imagesBase64[0]; 
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 800;
      const ctx = canvas.getContext('2d'); if (!ctx) return resolve('');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const len = imagesBase64.length;
      let cols = 1, rows = 1;
      if (len === 2) { cols = 1; rows = 2; } else if (len <= 4) { cols = 2; rows = 2; } else if (len <= 6) { cols = 2; rows = 3; } else if (len <= 8) { cols = 2; rows = 4; } else if (len <= 12) { cols = 3; rows = 4; } else { cols = 4; rows = Math.ceil(len / 4); }
      const cellW = canvas.width / cols, cellH = canvas.height / rows, gap = 4;
      const imgs = imagesBase64.map(src => { const img = new Image(); img.src = src; return img; });
      let loaded = 0;
      const drawAll = () => {
        imgs.forEach((img, i) => {
          const col = i % cols, row = Math.floor(i / cols), x = col * cellW, y = row * cellH;
          const imgRatio = img.width / img.height, cellRatio = cellW / cellH;
          let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
          if (imgRatio > cellRatio) { srcW = img.height * cellRatio; srcX = (img.width - srcW) / 2; } else { srcH = img.width / cellRatio; srcY = (img.height - srcH) / 2; }
          ctx.drawImage(img, srcX, srcY, srcW, srcH, x + gap/2, y + gap/2, cellW - gap, cellH - gap);
        });
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      imgs.forEach(img => { img.onload = () => { loaded++; if (loaded === len) drawAll(); }; img.onerror = () => { loaded++; if (loaded === len) drawAll(); }; });
    });
  };

  const handleInitiatePreview = async () => {
    setIsGenerating(true);
    try { setFinalCollages(await Promise.all(slotImages.map(imgs => generateCollage(imgs)))); setModalStep('preview'); } 
    catch (err) { showAlert('Gagal menyusun kolase.', 'error'); } finally { setIsGenerating(false); }
  };

  const handleFinalSubmit = async () => {
    const validKegiatans = kegiatan.filter(k => (k.uraian || '').replace(/[-\s\n]/g, '').length > 0);
    const uploadedPhotos = finalCollages.filter(img => img !== ''); 
    const dataKegiatan = validKegiatans.map((k, index) => ({
      uraian: `Laporan Dari: ${k.laporanDari}\n\nUraian: ${k.uraian}\nTindak Lanjut: ${k.tindakLanjut}\nKeterangan: ${k.keterangan}`,
      jamMulai: `${k.jamMulaiH}.${k.jamMulaiM} WIB`, jamSelesai: `${k.jamSelesaiH}.${k.jamSelesaiM} WIB`, hasilKondisi: k.hasilKondisi, 
      dokumentasi: index === 0 ? uploadedPhotos : [] 
    }));
    
    let newStatus = status === 'Approved' ? status : 'Menunggu SPV';
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    
    try {
      if (initialData?._id) {
  
        const dataLaporan = {
          reportCode, fungsi: 'ELECTRONIC & IT FACILITY', dinas: currentShift, tanggal: `${hari} ${bulan} ${tahun}`, jamMulaiShift, jamSelesaiShift,
          status: newStatus, personil: { apindo: apindo.filter(p => p.nama), omIassNti: [...osIass.filter(p => p.nama), ...omNti.filter(p => p.nama)] },
          kegiatan: initialData.kondisiFasilitas?.length > 0 ? [] : dataKegiatan, 
          kondisiFasilitas: initialData.kondisiFasilitas?.length > 0 ? fasilitas : [],
          catatan: initialData.kondisiFasilitas?.length > 0 ? catatanFasilitas : ''
        };
        const res = await fetch(`/api/reports/${initialData._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(dataLaporan) });
        if (!res.ok) throw new Error('Gagal update laporan.');
      } else {
        // MODE BUAT BARU (KIRIM 2 DOKUMEN TERPISAH)
        const basePayload = { reportCode, fungsi: 'ELECTRONIC & IT FACILITY', dinas: currentShift, tanggal: `${hari} ${bulan} ${tahun}`, jamMulaiShift, jamSelesaiShift, status: newStatus, personil: { apindo: apindo.filter(p => p.nama), omIassNti: [...osIass.filter(p => p.nama), ...omNti.filter(p => p.nama)] } };
        const dataLogbook = { ...basePayload, kegiatan: dataKegiatan, kondisiFasilitas: [] };
        const dataFasilitas = { ...basePayload, kegiatan: [], kondisiFasilitas: fasilitas, catatan: catatanFasilitas };

        const resLogbook = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(dataLogbook) });
        if (!resLogbook.ok) throw new Error('Gagal simpan logbook.');
        const resFasilitas = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(dataFasilitas) });
        if (!resFasilitas.ok) throw new Error('Gagal simpan fasilitas.');
      }

      setShowModal(false); showAlert('Semua laporan berhasil diserahkan!', 'success'); setTimeout(onBack, 1500);
    } catch (e: any) { showAlert(`GAGAL MENYIMPAN!\nAlasan: ${e.message}`, 'error'); }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 sm:p-6 md:p-10 font-sans flex justify-center text-slate-800 w-full overflow-x-hidden relative">
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col overflow-hidden text-center border border-slate-100">
            <div className="p-6 pb-2 pt-8 flex justify-center">
              {alertConfig.type === 'error' ? <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></div> :
               alertConfig.type === 'warning' ? <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div> :
               <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>}
            </div>
            <div className="p-6 pt-4 space-y-6">
              <p className="text-sm font-bold text-slate-700 whitespace-pre-line leading-relaxed">{alertConfig.message}</p>
              {alertConfig.type !== 'success' && <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="w-full py-3.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all shadow-sm">Mengerti</button>}
            </div>
          </div>
        </div>
      )}

      <CropperModal cropQueue={cropQueue} setCropQueue={setCropQueue} crop={crop} setCrop={setCrop} zoom={zoom} setZoom={setZoom} cropAspect={cropAspect} setCropAspect={setCropAspect} setCroppedAreaPixels={setCroppedAreaPixels} handleSaveCrop={handleSaveCrop} />
      <CollageModal showModal={showModal} setShowModal={setShowModal} modalStep={modalStep} setModalStep={setModalStep} slotImages={slotImages} handleUploadToSlot={handleUploadToSlot} removeImageFromSlot={removeImageFromSlot} handleInitiatePreview={handleInitiatePreview} isGenerating={isGenerating} hari={hari} bulan={bulan} tahun={tahun} shift={currentShift} kegiatan={kegiatan} finalCollages={finalCollages} handleFinalSubmit={handleFinalSubmit} isSubmitting={isSubmitting} />

      <div className="w-full max-w-5xl bg-white/50 backdrop-blur-xl rounded-xl sm:rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col h-full sm:h-auto overflow-hidden z-10">
        <div className="p-4 sm:p-8 md:px-12 pt-6 sm:pt-10 border-b border-white/60 flex flex-col gap-6 bg-white/30">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={onBack} className="p-2 sm:p-3 bg-white/60 border border-white hover:bg-white rounded-xl text-blue-600 transition-all shadow-sm flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
              <div>
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-800">{initialData ? 'Edit Laporan' : 'Form Laporan Terpadu'}</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Logbook & Pengecekan Fasilitas</p>
              </div>
            </div>
            <div className="self-start sm:self-auto flex bg-white shadow-sm border border-slate-100 p-1 rounded-2xl w-fit">
              <button type="button" disabled={isLocked} onClick={() => setCurrentShift('PAGI')} className={`px-6 py-2 rounded-xl text-xs font-extrabold tracking-widest transition-all disabled:opacity-60 ${currentShift === 'PAGI' ? 'bg-[#facc15] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>PAGI</button>
              <button type="button" disabled={isLocked} onClick={() => setCurrentShift('MALAM')} className={`px-6 py-2 rounded-xl text-xs font-extrabold tracking-widest transition-all disabled:opacity-60 ${currentShift === 'MALAM' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>MALAM</button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200/50 mt-4">
            <button onClick={() => handleTabChange('umum')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'umum' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tanggal & Personil</button>
            {(!initialData || (initialData && initialData.kegiatan?.length > 0)) && <button onClick={() => handleTabChange('kegiatan')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'kegiatan' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Detail Progress Aduan</button>}
            {(!initialData || (initialData && initialData.kondisiFasilitas?.length > 0)) && <button onClick={() => handleTabChange('fasilitas')} className={`pb-3 px-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'fasilitas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pengecekan Fasilitas</button>}
          </div>
        </div>

        <div className="p-4 sm:p-8 md:px-12 md:py-10 flex-1 overflow-y-auto bg-white/20 flex flex-col w-full">
          <div className="flex-1 w-full">
            {activeTab === 'umum' && (
              <div className="space-y-8 sm:space-y-12 animate-fadeIn max-w-3xl w-full">
                <div className="space-y-4 w-full bg-white/50 p-5 rounded-2xl border border-white shadow-sm">
                  <h2 className="text-[10px] sm:text-[11px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center"><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>REPORT CODE</h2>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <input disabled={isLocked} type="text" readOnly value={reportCode} placeholder="Click generate to create report code..." className="flex-1 p-3 sm:p-4 bg-white border border-slate-200 rounded-xl outline-none font-mono font-bold text-slate-700 text-xs sm:text-sm shadow-inner cursor-not-allowed disabled:opacity-60" />
                    {!isLocked && <button type="button" onClick={generateReportCode} className="px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap text-xs sm:text-sm flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Generate Code</button>}
                  </div>
                </div>
                <div className="space-y-4 w-full">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Waktu Pelaksanaan</h2>
                  <div className="flex gap-2 sm:gap-3 w-full">
                    <select disabled={isLocked} value={hari} onChange={(e) => setHari(e.target.value)} className="flex-1 p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60">{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select disabled={isLocked} value={bulan} onChange={(e) => setBulan(e.target.value)} className="flex-[2] p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60">{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    <select disabled={isLocked} value={tahun} onChange={(e) => setTahun(e.target.value)} className="flex-1 p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none font-bold text-slate-700 text-xs sm:text-sm shadow-inner focus:ring-4 focus:ring-blue-500/20 disabled:opacity-60">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  </div>
                  <div className="flex gap-3 sm:gap-4 w-full mt-2">
                    <div className="flex-1"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Mulai Shift</label><input type="time" readOnly disabled value={jamMulaiShift} className="w-full p-3 sm:p-4 bg-slate-100/60 border border-white/60 rounded-xl outline-none font-bold text-slate-400 text-xs sm:text-sm shadow-inner cursor-not-allowed" /></div>
                    <div className="flex-1"><label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Jam Selesai Shift</label><input type="time" readOnly disabled value={jamSelesaiShift} className="w-full p-3 sm:p-4 bg-slate-100/60 border border-white/60 rounded-xl outline-none font-bold text-slate-400 text-xs sm:text-sm shadow-inner cursor-not-allowed" /></div>
                  </div>
                </div>
                <div className="space-y-4 w-full">
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Tim Bertugas</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">APINDO</label>
                      {apindo.map((p, i) => <select disabled={isLocked} key={i} value={p.nama} onChange={(e) => { const n = [...apindo]; n[i].nama = e.target.value; setApindo(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner disabled:opacity-60"><option value="">- Pilih Personil -</option>{apindoList.map(name => <option key={name} value={name} disabled={apindo.some((person, idx) => person.nama === name && idx !== i)}>{name}</option>)}</select>)}
                      {!isLocked && <button onClick={() => setApindo([...apindo, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>}
                    </div>
                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OS - IASS</label>
                      {osIass.map((p, i) => <select disabled={isLocked} key={i} value={p.nama} onChange={(e) => { const n = [...osIass]; n[i].nama = e.target.value; setOsIass(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner disabled:opacity-60"><option value="">- Pilih Personil -</option>{iassList.map(name => <option key={name} value={name} disabled={osIass.some((person, idx) => person.nama === name && idx !== i)}>{name}</option>)}</select>)}
                      {!isLocked && <button onClick={() => setOsIass([...osIass, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>}
                    </div>
                    <div className="space-y-3 w-full">
                      <label className="text-xs font-bold text-slate-600 block ml-1">OM - NTI</label>
                      {omNti.map((p, i) => <select disabled={isLocked} key={i} value={p.nama} onChange={(e) => { const n = [...omNti]; n[i].nama = e.target.value; setOmNti(n); }} className="w-full p-3 sm:p-4 bg-white/60 border border-white/60 rounded-xl outline-none text-xs sm:text-sm font-medium focus:ring-4 focus:ring-blue-500/20 shadow-inner disabled:opacity-60"><option value="">- Pilih Personil -</option>{ntiList.map(name => <option key={name} value={name} disabled={omNti.some((person, idx) => person.nama === name && idx !== i)}>{name}</option>)}</select>)}
                      {!isLocked && <button onClick={() => setOmNti([...omNti, { nama: '' }])} className="w-full py-2.5 sm:py-3 text-xs font-bold text-blue-600 bg-white border border-white/60 shadow-sm rounded-xl hover:bg-blue-50">+ Tambah</button>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kegiatan' && <FormLogbook kegiatan={kegiatan} setKegiatan={setKegiatan} isLocked={isLocked} />}
            {activeTab === 'fasilitas' && <FormFasilitas fasilitas={fasilitas} setFasilitas={setFasilitas} catatanFasilitas={catatanFasilitas} setCatatanFasilitas={setCatatanFasilitas} isLocked={isLocked} initialData={initialData} showAlert={showAlert} />}

          </div>
          
          {renderBottomAction()}

        </div>
      </div>
    </div>
  );
}