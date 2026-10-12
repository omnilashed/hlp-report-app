import { useState, useEffect } from 'react';
import CropperModal from '../components/CropperModal';
import CollageModal from '../components/CollageModal';
import FormLogbook from '../components/FormLogbook';
import FormFasilitas from '../components/FormFasilitas';

export interface ReportFormProps { shift: 'PAGI' | 'MALAM'; initialData?: any; onBack: () => void; }

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036', '2037', '2038', '2039', '2040'];

const today = new Date();
const defaultHari = today.getDate().toString().padStart(2, '0');
const defaultBulan = months[today.getMonth()];
const defaultTahun = today.getFullYear().toString();

const DRAFT_STORAGE_KEY = 'hlp_report_draft_24h';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface PersonilEntry {
  nama: string;
  absensi?: string;
  kode?: string;
}

const ABSENSI_OPTIONS = [
  { code: 'H', label: 'H (Hadir)', desc: 'Hadir', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { code: 'DL', label: 'DL (Dinas Luar)', desc: 'Dinas Luar', badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
  { code: 'C', label: 'C (Cuti)', desc: 'Cuti', badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' },
  { code: 'S', label: 'S (Sakit)', desc: 'Sakit', badgeClass: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
  { code: 'T', label: 'T (Tidak Masuk)', desc: 'Tidak Masuk', badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  { code: 'TK', label: 'TK (Tidak Masuk Urusan Keluarga)', desc: 'Tidak Masuk Urusan Keluarga', badgeClass: 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100' }
];

const normalizePersonilList = (arr: any[]): PersonilEntry[] => {
  if (!Array.isArray(arr) || arr.length === 0) return [{ nama: '', absensi: 'H' }];
  return arr.map((p: any) => ({
    nama: p?.nama || '',
    absensi: p?.absensi || 'H',
    ...(p?.kode ? { kode: p.kode } : {})
  }));
};

export default function ReportForm({ shift, initialData, onBack }: ReportFormProps) {
  const [apindoList, setApindoList] = useState<string[]>([
    'AEP MASHUM NURZAMAN', 'RAHMAT D. CAHYO', 'EKA YULIANI S.', 
    'RIZKO E. NUGRAHA', 'ISTIANAH RAHMAH DEWI', 'MAULANA HADY C. S.'
  ]);
  const [iassList, setIassList] = useState<string[]>([
    'ADELIA PUSPITA', 'MAHDI ALHABSYI', 'M. ROIM', 'RISKI RACHMAD SANTOSO', 'AHMAD FANGKY S.', 
    'DENNIS SAYYIDINAA R', 'ABDUL KODIR', 'YUDHA ISMUNANDAR', 'KARUNIAWAN GEOVANI'
  ]);
  const [ntiList, setNtiList] = useState<string[]>([
    'LUTHFIANDA MUZAKI S', 'YOAN HERNANTRA', 'FARIZ SOLAHUDIN', 
    'MUHAMMAD FACHREZA', 'ZAKY ALHADY', 'Desi Dwi Nur Hartati'
  ]);

  const defaultAutoShift: 'PAGI' | 'MALAM' = (today.getHours() >= 7 && today.getHours() < 19) ? 'PAGI' : 'MALAM';
  const [currentShift, setCurrentShift] = useState<'PAGI' | 'MALAM'>(initialData?.dinas || shift || defaultAutoShift);
  const [activeTab, setActiveTab] = useState('umum');
  
  const [hari, setHari] = useState(defaultHari); 
  const [bulan, setBulan] = useState(defaultBulan); 
  const [tahun, setTahun] = useState(defaultTahun);
  const [reportCode, setReportCode] = useState(initialData?.reportCode || initialData?.kodeLaporan || '');

  const [jamMulaiShift, setJamMulaiShift] = useState(currentShift === 'PAGI' ? '07:00' : '19:00');
  const [jamSelesaiShift, setJamSelesaiShift] = useState(currentShift === 'PAGI' ? '19:00' : '07:00');

  const [apindo, setApindo] = useState<PersonilEntry[]>([{ nama: '', absensi: 'H' }]); 
  const [osIass, setOsIass] = useState<PersonilEntry[]>([{ nama: '', absensi: 'H' }]); 
  const [omNti, setOmNti] = useState<PersonilEntry[]>([{ nama: '', absensi: 'H' }]);
  
  const [kegiatan, setKegiatan] = useState([{ laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-', dokumentasi: [] as string[] }]);
  const [fasilitas, setFasilitas] = useState<any[]>([]);
  const [catatanFasilitas, setCatatanFasilitas] = useState('');

  const [status, setStatus] = useState('Draft');
  const [draftId, setDraftId] = useState<string | null>(initialData?.status === 'Draft' ? initialData?._id : null);
  const [draftExpiresAt, setDraftExpiresAt] = useState<string | null>(initialData?.draftExpiresAt || null);
  const [draftCountdown, setDraftCountdown] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '', type: 'warning' as 'success' | 'error' | 'warning' });

  // User Authentication & Level Dinas Check (Draft Protection)
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
  const [dutyCheck, setDutyCheck] = useState<{
    checked: boolean;
    loading: boolean;
    isOnDuty: boolean;
    shiftCode: string;
    shiftLabel: string;
    jamDinas: string;
    matchedPerson: string;
    message: string;
  }>({
    checked: false,
    loading: false,
    isOnDuty: true,
    shiftCode: '',
    shiftLabel: '',
    jamDinas: '',
    matchedPerson: '',
    message: ''
  });
  const [isNotOnDutyModalOpen, setIsNotOnDutyModalOpen] = useState(false);

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

  // Gembok dimatikan paksa agar selalu bisa diedit
  const isLocked = false; 

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
    setAlertConfig({ isOpen: true, message, type });
    if (type === 'success') {
      setTimeout(() => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }, 2500);
    }
  };

  const generateReportCode = () => {
    const shiftCode = currentShift === 'PAGI' ? 'PG' : 'ML';
    const monthIndex = String(months.indexOf(bulan) + 1).padStart(2, '0');
    const dateCode = `${tahun.slice(-2)}${monthIndex}${hari}`;
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    setReportCode(`ELIT-${dateCode}-${shiftCode}-${randomStr}`);
  };

  // Hitung mundur waktu kadaluarsa Draft (24 Jam)
  useEffect(() => {
    if (!draftExpiresAt) {
      setDraftCountdown('');
      return;
    }
    const updateTimer = () => {
      const diff = new Date(draftExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setDraftCountdown('Kedaluwarsa (Lebih dari 24 jam)');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setDraftCountdown(`${hours} jam ${minutes} menit tersisa`);
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 30000);
    return () => clearInterval(timer);
  }, [draftExpiresAt]);

  useEffect(() => {
    const fetchPersonnelData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/personnel', { 
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          const apindoData = data.filter((p: any) => p.instansi === 'APINDO').map((p: any) => p.namaLengkap);
          const iassData = data.filter((p: any) => p.instansi === 'OS - IASS' || p.instansi === 'IASS').map((p: any) => p.namaLengkap);
          const ntiData = data.filter((p: any) => p.instansi === 'OM - NTI' || p.instansi === 'NTI').map((p: any) => p.namaLengkap);
          
          if (apindoData.length > 0) setApindoList(apindoData);
          if (iassData.length > 0) setIassList(iassData);
          if (ntiData.length > 0) setNtiList(ntiData);
        }
      } catch (error) {
        console.error("Gagal menarik data pegawai dari server.", error);
      }
    };
    fetchPersonnelData();
  }, []);

  // Cek Status Jadwal Dinas User dari Roster Management Absensi
  const checkUserDutyStatus = async (
    targetHari = hari,
    targetBulan = bulan,
    targetTahun = tahun,
    targetFullName = userFullName,
    targetUName = userName,
    currentRole = userRole
  ) => {
    const searchTarget = targetFullName || targetUName;
    if (!searchTarget) return;

    setDutyCheck(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        tanggal: targetHari,
        bulan: targetBulan,
        tahun: targetTahun,
        username: targetUName,
        nama: searchTarget
      });
      const res = await fetch(`/api/attendance/check-duty?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const isOnDuty = Boolean(data.isOnDuty);
        setDutyCheck({
          checked: true,
          loading: false,
          isOnDuty,
          shiftCode: data.shiftCode || '-',
          shiftLabel: data.shiftLabel || '-',
          jamDinas: data.jamDinas || '-',
          matchedPerson: data.matchedPerson || searchTarget,
          message: data.message || ''
        });

        // Jika user bukan admin dan TIDAK dinas hari ini saat membuka form dengan status Draft:
        if (currentRole !== 'admin' && !isOnDuty && (status === 'Draft' || initialData?.status === 'Draft')) {
          setIsNotOnDutyModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Gagal mengecek jadwal dinas user:', err);
      setDutyCheck(prev => ({ ...prev, loading: false }));
    }
  };

  // Decode profile user dari JWT token dan trigger check status dinas
  useEffect(() => {
    const token = localStorage.getItem('token');
    let role = userRole;
    let uName = userName;
    let fName = userFullName;

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role || '';
        uName = payload.username || '';
        fName = payload.namaLengkap || payload.username || '';
        setUserRole(role);
        setUserName(uName);
        setUserFullName(fName);
      } catch (e) {}
    }

    if (fName || uName) {
      checkUserDutyStatus(hari, bulan, tahun, fName, uName, role);
    }
  }, [hari, bulan, tahun, status]);

  // Fungsi merestorasi objek laporan/draft ke state form secara utuh
  const restoreReportDataToState = (data: any, isFromEdit: boolean = false) => {
    if (!data) return;
    if (data._id && data.status === 'Draft') {
      setDraftId(String(data._id));
    }
    if (data.draftExpiresAt) {
      setDraftExpiresAt(data.draftExpiresAt);
    } else if (data.status === 'Draft' && (data.draftSavedAt || data.updatedAt || data.createdAt)) {
      const baseTime = new Date(data.draftSavedAt || data.updatedAt || data.createdAt).getTime();
      setDraftExpiresAt(new Date(baseTime + TWENTY_FOUR_HOURS_MS).toISOString());
    }

    setStatus(data.status || 'Draft');
    if (data.reportCode || data.kodeLaporan) {
      setReportCode(data.reportCode || data.kodeLaporan);
    }
    if (data.dinas) {
      setCurrentShift(data.dinas);
    }

    if (data.tanggal) {
      const parts = data.tanggal.split(' ');
      if (parts.length === 3) {
        setHari(parts[0]);
        setBulan(parts[1]);
        setTahun(parts[2]);
      }
    }

    if (data.jamMulaiShift) setJamMulaiShift(data.jamMulaiShift);
    if (data.jamSelesaiShift) setJamSelesaiShift(data.jamSelesaiShift);

    if (data.personil) {
      if (Array.isArray(data.personil.apindo) && data.personil.apindo.length > 0) {
        setApindo(normalizePersonilList(data.personil.apindo));
      }
      if (Array.isArray(data.personil.osIass) && data.personil.osIass.length > 0) {
        setOsIass(normalizePersonilList(data.personil.osIass));
      } else if (Array.isArray(data.personil.omIassNti) && data.personil.omIassNti.length > 0) {
        const allOm = data.personil.omIassNti;
        setOsIass(normalizePersonilList(allOm.slice(0, 4)));
      }

      if (Array.isArray(data.personil.omNti) && data.personil.omNti.length > 0) {
        setOmNti(normalizePersonilList(data.personil.omNti));
      } else if (Array.isArray(data.personil.omIassNti) && data.personil.omIassNti.length > 4) {
        const allOm = data.personil.omIassNti;
        setOmNti(normalizePersonilList(allOm.slice(4)));
      }
    }

    // Restorasi Kegiatan (prioritaskan rawKegiatan jika tersedia di Draft agar 100% identik)
    if (Array.isArray(data.rawKegiatan) && data.rawKegiatan.length > 0) {
      setKegiatan(data.rawKegiatan.map((k: any) => ({
        laporanDari: k.laporanDari || 'ELIT',
        jamMulaiH: k.jamMulaiH || '07',
        jamMulaiM: k.jamMulaiM || '00',
        uraian: k.uraian || '',
        tindakLanjut: k.tindakLanjut ?? '-',
        jamSelesaiH: k.jamSelesaiH || '07',
        jamSelesaiM: k.jamSelesaiM || '30',
        hasilKondisi: k.hasilKondisi || '-',
        keterangan: k.keterangan ?? '-',
        dokumentasi: Array.isArray(k.dokumentasi) ? k.dokumentasi : []
      })));
    } else if (Array.isArray(data.kegiatan) && data.kegiatan.length > 0) {
      const parsed = data.kegiatan.map((k: any) => {
        const raw = k.uraian || '';
        const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
        const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] ?? raw;
        const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
        const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';
        const jm = k.jamMulai?.replace(' WIB', '').split('.') || ['07', '00'];
        const js = k.jamSelesai?.replace(' WIB', '').split('.') || ['07', '30'];
        return { 
          laporanDari: lDari, 
          jamMulaiH: jm[0] || '07', 
          jamMulaiM: jm[1] || '00', 
          uraian: urText, 
          tindakLanjut: tLanjut, 
          jamSelesaiH: js[0] || '07', 
          jamSelesaiM: js[1] || '30', 
          hasilKondisi: k.hasilKondisi || '-', 
          keterangan: ket, 
          dokumentasi: k.dokumentasi || [] 
        };
      });
      setKegiatan(parsed);
    }

    // Restorasi Foto Kolase & Slot Images
    if (Array.isArray(data.slotImages) && data.slotImages.length === 4 && data.slotImages.some((s: any) => Array.isArray(s) && s.length > 0)) {
      setSlotImages(data.slotImages);
    }
    if (Array.isArray(data.finalCollages) && data.finalCollages.length === 4 && data.finalCollages.some((c: any) => typeof c === 'string' && c !== '')) {
      setFinalCollages(data.finalCollages);
    } else if (Array.isArray(data.kegiatan) && data.kegiatan.length > 0) {
      let allDocs: string[] = [];
      data.kegiatan.forEach((k: any) => {
        if (Array.isArray(k.dokumentasi)) {
          allDocs.push(...k.dokumentasi);
        } else if (typeof k.dokumentasi === 'string' && k.dokumentasi.trim() !== '') {
          allDocs.push(k.dokumentasi);
        }
      });
      if (allDocs.length === 0 && Array.isArray(data.dokumentasi)) {
        allDocs.push(...data.dokumentasi);
      }
      const validDocs = allDocs.filter(d => typeof d === 'string' && d.trim() !== '');
      if (validDocs.length > 0) {
        const loadedSlots: string[][] = [[], [], [], []];
        const loadedCollages: string[] = ['', '', '', ''];
        validDocs.forEach((doc: string, i: number) => {
          if (i < 4) {
            loadedSlots[i] = [doc];
            loadedCollages[i] = doc;
          }
        });
        setSlotImages(loadedSlots);
        setFinalCollages(loadedCollages);
      }
    }

    // Restorasi Kondisi Fasilitas & Catatan (tidak lagi saling menimpa dengan kegiatan!)
    if (Array.isArray(data.kondisiFasilitas) && data.kondisiFasilitas.length > 0) {
      setFasilitas(data.kondisiFasilitas);
    }
    if (typeof data.catatan === 'string') {
      setCatatanFasilitas(data.catatan);
    }

    if (data.activeTab && ['umum', 'kegiatan', 'fasilitas'].includes(data.activeTab)) {
      setActiveTab(data.activeTab);
    } else if (isFromEdit && data.kondisiFasilitas?.length > 0 && (!data.kegiatan || data.kegiatan.length === 0) && (!data.rawKegiatan || data.rawKegiatan.length === 0)) {
      setActiveTab('fasilitas');
    }
  };

  useEffect(() => {
    if (!initialData && !draftId) {
      if (currentShift === 'PAGI') { setJamMulaiShift('07:00'); setJamSelesaiShift('19:00'); } 
      else { setJamMulaiShift('19:00'); setJamSelesaiShift('07:00'); }
    }
  }, [currentShift, initialData, draftId]);

  // Load Master Equipments dan Cek Draft Sementara (< 24 Jam) saat Buat Laporan dibuka
  useEffect(() => {
    const initForm = async () => {
      const token = localStorage.getItem('token');

      // 1. Muat Master Peralatan terlebih dahulu sebagai fallback fasilitas
      let defaultMasterFasilitas: any[] = [];
      try {
        const resEq = await fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } });
        if (resEq.ok) {
          const masterData = await resEq.json();
          defaultMasterFasilitas = masterData.map((item: any) => ({
            _id: item._id && typeof item._id === 'object' && item._id.$oid ? String(item._id.$oid) : String(item._id),
            namaPeralatan: item.namaPeralatan,
            lokasi: item.lokasi,
            merek: item.merek || '-',
            mainCategory: item.mainCategory,
            subCategory: item.subCategory || '',
            kondisi: item.kondisi || 'Normal',
            statusPeralatan: item.statusPeralatan || 'Ready',
            lokasiStatus: item.lokasiStatus || '',
            keteranganRusak: item.keteranganRusak || ''
          }));
        }
      } catch (e) {}

      // 2. Jika sedang mode Edit laporan tertentu
      if (initialData) {
        if (!initialData.kondisiFasilitas || initialData.kondisiFasilitas.length === 0) {
          setFasilitas(defaultMasterFasilitas);
        }
        restoreReportDataToState(initialData, true);
        return;
      }

      // 3. Jika membuka menu Buat Laporan baru, cek apakah ada Draft aktif (< 24 Jam) di Server atau LocalStorage
      let restoredFromServer = false;
      try {
        const resDraft = await fetch('/api/reports/drafts/my', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (resDraft.ok) {
          const result = await resDraft.json();
          const serverDraft = Array.isArray(result) ? result[0] : (result?.data || (Array.isArray(result?.drafts) ? result.drafts[0] : null));
          if (serverDraft) {
            const expTime = serverDraft.draftExpiresAt
              ? new Date(serverDraft.draftExpiresAt).getTime()
              : new Date(serverDraft.draftSavedAt || serverDraft.updatedAt || serverDraft.createdAt).getTime() + TWENTY_FOUR_HOURS_MS;

            if (expTime > Date.now()) {
              if (!serverDraft.kondisiFasilitas || serverDraft.kondisiFasilitas.length === 0) {
                setFasilitas(defaultMasterFasilitas);
              }
              restoreReportDataToState(serverDraft, false);
              restoredFromServer = true;
            }
          }
        }
      } catch (e) {}

      if (!restoredFromServer) {
        // Cek backup LocalStorage (24 jam)
        try {
          const rawLocal = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (rawLocal) {
            const parsedLocal = JSON.parse(rawLocal);
            const expTime = parsedLocal.draftExpiresAt ? new Date(parsedLocal.draftExpiresAt).getTime() : 0;
            if (expTime > Date.now()) {
              if (!parsedLocal.kondisiFasilitas || parsedLocal.kondisiFasilitas.length === 0) {
                setFasilitas(defaultMasterFasilitas);
              }
              restoreReportDataToState(parsedLocal, false);
              restoredFromServer = true;
            } else {
              localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
          }
        } catch (e) {}
      }

      if (!restoredFromServer) {
        setFasilitas(defaultMasterFasilitas);
        handlePullPersonnelFromRoster(defaultHari, defaultBulan, defaultTahun, initialData?.dinas || shift || defaultAutoShift, true);
      }
    };

    initForm();
  }, [initialData]);

  // Auto-sync perubahan ke localStorage jika sudah berstatus Draft aktif agar tidak hilang jika tidak sengaja refresh
  useEffect(() => {
    if (!draftExpiresAt) return;
    if (new Date(draftExpiresAt).getTime() <= Date.now()) return;
    try {
      const draftSnapshot = {
        _id: draftId,
        status: 'Draft',
        reportCode,
        dinas: currentShift,
        tanggal: `${hari} ${bulan} ${tahun}`,
        jamMulaiShift,
        jamSelesaiShift,
        personil: {
          apindo: apindo.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
          osIass: osIass.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
          omNti: omNti.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
          omIassNti: [
            ...osIass.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
            ...omNti.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' }))
          ]
        },
        rawKegiatan: kegiatan,
        slotImages,
        finalCollages,
        kondisiFasilitas: fasilitas,
        catatan: catatanFasilitas,
        activeTab,
        draftExpiresAt
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftSnapshot));
    } catch (e) {}
  }, [draftId, draftExpiresAt, reportCode, currentShift, hari, bulan, tahun, jamMulaiShift, jamSelesaiShift, apindo, osIass, omNti, kegiatan, slotImages, finalCollages, fasilitas, catatanFasilitas, activeTab]);

  // Tarik personil dari Jadwal Management Absensi menyesuaikan Tanggal dan Shift (PAGI / MALAM) yang dipilih
  const handlePullPersonnelFromRoster = async (
    overrideHari?: string,
    overrideBulan?: string,
    overrideTahun?: string,
    overrideShift?: 'PAGI' | 'MALAM',
    silent: boolean = false
  ) => {
    try {
      const token = localStorage.getItem('token');
      const targetHari = overrideHari ?? hari;
      const targetBulan = overrideBulan ?? bulan;
      const targetTahun = overrideTahun ?? tahun;
      const targetShift: 'PAGI' | 'MALAM' = overrideShift ?? currentShift;

      // Sinkronkan jam mulai & selesai shift sesuai shift yang dipilih
      setJamMulaiShift(targetShift === 'PAGI' ? '07:00' : '19:00');
      setJamSelesaiShift(targetShift === 'PAGI' ? '19:00' : '07:00');

      const monthNum = months.indexOf(targetBulan) + 1;
      const dayNum = parseInt(targetHari, 10);
      const yearNum = parseInt(targetTahun, 10);
      const tanggalFormatted = `${targetHari} ${targetBulan} ${targetTahun}`;

      const res = await fetch(`/api/attendance/roster/by-date?tanggal=${encodeURIComponent(tanggalFormatted)}&dinas=${targetShift}&day=${dayNum}&month=${monthNum}&year=${yearNum}&shift=${targetShift}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal membaca jadwal absensi');
      const data = await res.json();

      const pulledApindo: PersonilEntry[] = Array.isArray(data.apindo) && data.apindo.length > 0
        ? data.apindo.map((p: any) => ({ nama: p.nama, absensi: p.absensi || 'H', ...(p.kode ? { kode: p.kode } : {}) }))
        : [{ nama: '', absensi: 'H' }];
      const pulledOsIass: PersonilEntry[] = Array.isArray(data.osIass) && data.osIass.length > 0
        ? data.osIass.map((p: any) => ({ nama: p.nama, absensi: p.absensi || 'H', ...(p.kode ? { kode: p.kode } : {}) }))
        : [{ nama: '', absensi: 'H' }];
      const pulledOmNti: PersonilEntry[] = Array.isArray(data.omNti) && data.omNti.length > 0
        ? data.omNti.map((p: any) => ({ nama: p.nama, absensi: p.absensi || 'H', ...(p.kode ? { kode: p.kode } : {}) }))
        : [{ nama: '', absensi: 'H' }];

      setApindo(pulledApindo);
      setOsIass(pulledOsIass);
      setOmNti(pulledOmNti);

      const totalLoaded =
        (Array.isArray(data.apindo) ? data.apindo.length : 0) +
        (Array.isArray(data.osIass) ? data.osIass.length : 0) +
        (Array.isArray(data.omNti) ? data.omNti.length : 0);

      const shiftDesc = targetShift === 'PAGI' ? 'Shift Pagi (Kode P & PS)' : 'Shift Malam (Kode M)';

      if (!silent) {
        if (totalLoaded > 0) {
          showAlert(`Berhasil menarik ${totalLoaded} personil dinas ${shiftDesc} pada tanggal ${targetHari} ${targetBulan} ${targetTahun}!`, 'success');
        } else {
          showAlert(`Tidak ditemukan personil dengan kode ${shiftDesc} pada tanggal ${targetHari} ${targetBulan} ${targetTahun} di Management Absensi.`, 'warning');
        }
      }
    } catch (err: any) {
      if (!silent) {
        showAlert(`Gagal menarik personil dari jadwal absensi: ${err.message}`, 'error');
      }
    }
  };

  // Sinkronisasi otomatis ketika user mengubah Tanggal (Hari/Bulan/Tahun) atau Shift (PAGI/MALAM)
  const handleSyncDateAndShift = (
    nextHari: string,
    nextBulan: string,
    nextTahun: string,
    nextShift: 'PAGI' | 'MALAM'
  ) => {
    setHari(nextHari);
    setBulan(nextBulan);
    setTahun(nextTahun);
    setCurrentShift(nextShift);
    setJamMulaiShift(nextShift === 'PAGI' ? '07:00' : '19:00');
    setJamSelesaiShift(nextShift === 'PAGI' ? '19:00' : '07:00');

    // Update kode laporan otomatis jika sudah di-generate sebelumnya
    if (reportCode && !initialData) {
      const shiftCode = nextShift === 'PAGI' ? 'PG' : 'ML';
      const monthIndex = String(months.indexOf(nextBulan) + 1).padStart(2, '0');
      const dateCode = `${nextTahun.slice(-2)}${monthIndex}${nextHari}`;
      const parts = reportCode.split('-');
      const randSuffix = parts.length >= 4 ? parts[3] : Math.random().toString(36).substring(2, 6).toUpperCase();
      setReportCode(`ELIT-${dateCode}-${shiftCode}-${randSuffix}`);
    }

    handlePullPersonnelFromRoster(nextHari, nextBulan, nextTahun, nextShift, true);
  };

  // Simpan sebagai Draft Sementara (24 Jam)
  const handleSaveAsDraft = async () => {
    // Validasi Level User: Jika bukan dinas pada hari/tanggal laporan tersebut
    if (userRole !== 'admin' && dutyCheck.checked && !dutyCheck.isOnDuty) {
      setIsNotOnDutyModalOpen(true);
      return;
    }

    setIsSavingDraft(true);
    const token = localStorage.getItem('token');

    try {
      // Pastikan ada reportCode meskipun user belum klik Generate
      let codeToSave = reportCode;
      if (!codeToSave) {
        const shiftCode = currentShift === 'PAGI' ? 'PG' : 'ML';
        const monthIndex = String(months.indexOf(bulan) + 1).padStart(2, '0');
        const dateCode = `${tahun.slice(-2)}${monthIndex}${hari}`;
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        codeToSave = `ELIT-${dateCode}-${shiftCode}-${randomStr}`;
        setReportCode(codeToSave);
      }

      // Render kolase otomatis jika ada gambar di slotImages
      let collagesToSave = [...finalCollages];
      if (slotImages.some(s => s.length > 0)) {
        try {
          collagesToSave = await Promise.all(slotImages.map(imgs => generateCollage(imgs)));
          setFinalCollages(collagesToSave);
        } catch (e) {}
      }

      const uploadedPhotos = collagesToSave.filter(img => img !== '');
      const dataKegiatan = kegiatan.map((k, index) => ({
        uraian: `Laporan Dari: ${k.laporanDari}\n\nUraian: ${k.uraian}\nTindak Lanjut: ${k.tindakLanjut}\nKeterangan: ${k.keterangan}`,
        jamMulai: `${k.jamMulaiH}.${k.jamMulaiM} WIB`,
        jamSelesai: `${k.jamSelesaiH}.${k.jamSelesaiM} WIB`,
        hasilKondisi: k.hasilKondisi,
        dokumentasi: index === 0 ? uploadedPhotos : (k.dokumentasi || [])
      }));

      const now = new Date();
      const expiresAt = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS).toISOString();

      const draftPayload = {
        reportCode: codeToSave,
        fungsi: 'ELECTRONIC & IT FACILITY',
        dinas: currentShift,
        tanggal: `${hari} ${bulan} ${tahun}`,
        jamMulaiShift,
        jamSelesaiShift,
        status: 'Draft',
        personil: {
          apindo: apindo.length > 0 ? apindo.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })) : [{ nama: '', absensi: 'H' }],
          osIass: osIass.length > 0 ? osIass.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })) : [{ nama: '', absensi: 'H' }],
          omNti: omNti.length > 0 ? omNti.map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })) : [{ nama: '', absensi: 'H' }],
          omIassNti: [
            ...osIass.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
            ...omNti.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' }))
          ]
        },
        kegiatan: dataKegiatan,
        rawKegiatan: kegiatan,
        slotImages,
        finalCollages: collagesToSave,
        kondisiFasilitas: fasilitas,
        catatan: catatanFasilitas,
        activeTab,
        draftSavedAt: now.toISOString(),
        draftExpiresAt: expiresAt
      };

      const targetId = draftId || (initialData?.status === 'Draft' ? initialData?._id : null);
      let savedDoc: any = null;

      if (targetId) {
        const res = await fetch(`/api/reports/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(draftPayload)
        });
        if (!res.ok) throw new Error('Gagal memperbarui Draft di server.');
        const resJson = await res.json();
        savedDoc = resJson.data || { ...draftPayload, _id: targetId };
      } else {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(draftPayload)
        });
        if (!res.ok) throw new Error('Gagal menyimpan Draft ke server.');
        const resJson = await res.json();
        savedDoc = resJson.data || resJson;
      }

      const finalId = savedDoc?._id ? String(savedDoc._id) : targetId;
      setDraftId(finalId);
      setStatus('Draft');
      setDraftExpiresAt(expiresAt);

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draftPayload, _id: finalId }));
      } catch (e) {}

      showAlert('💾 Laporan berhasil disimpan sebagai DRAFT!\n\nSemua data (Personil, Logbook, Foto, & Fasilitas) telah diamankan dan tidak akan hilang saat dibuka kembali. Draft ini bersifat sementara dan akan otomatis terhapus dalam 24 jam.', 'success');
    } catch (err: any) {
      showAlert(`Gagal menyimpan Draft: ${err.message}`, 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Hapus / Reset Draft Sementara
  const handleDiscardDraft = async () => {
    if (!window.confirm('Yakin ingin menghapus Draft sementara ini dan mengosongkan form?')) return;
    const token = localStorage.getItem('token');
    if (draftId) {
      try {
        await fetch(`/api/reports/${draftId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftId(null);
    setDraftExpiresAt(null);
    setDraftCountdown('');
    setReportCode('');
    setApindo([{ nama: '', absensi: 'H' }]);
    setOsIass([{ nama: '', absensi: 'H' }]);
    setOmNti([{ nama: '', absensi: 'H' }]);
    setKegiatan([{ laporanDari: 'ELIT', jamMulaiH: '07', jamMulaiM: '00', uraian: '', tindakLanjut: '-', jamSelesaiH: '07', jamSelesaiM: '30', hasilKondisi: '-', keterangan: '-', dokumentasi: [] }]);
    setSlotImages([[], [], [], []]);
    setFinalCollages(['', '', '', '']);
    setCatatanFasilitas('');
    setActiveTab('umum');
    showAlert('Draft sementara telah dihapus. Form telah direset.', 'success');
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'kegiatan' || tab === 'fasilitas') {
      if (!initialData && !reportCode) { 
        showAlert('Harap Generate Report Code terlebih dahulu!', 'warning'); 
        return; 
      }
      if (!apindo.some(p => p.nama) && !osIass.some(p => p.nama) && !omNti.some(p => p.nama)) { 
        showAlert('Harap isi minimal 1 nama personil!', 'warning'); 
        return; 
      }
    }
    setActiveTab(tab);
  };

  const renderBottomAction = () => {
    const draftButton = (
      <button
        type="button"
        onClick={handleSaveAsDraft}
        disabled={isSavingDraft || isSubmitting}
        className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <span>💾</span>
        <span>{isSavingDraft ? 'Menyimpan Draft...' : 'Simpan Draft (Sementara 24 Jam)'}</span>
      </button>
    );

    if (activeTab === 'umum') {
      return (
        <div className="pt-6 mt-6 border-t border-slate-200 w-full pb-8 flex flex-wrap items-center gap-3">
          {draftButton}
          <button onClick={() => handleTabChange('kegiatan')} className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm">Lanjut Isi Logbook ➡️</button>
        </div>
      );
    }
    if (activeTab === 'kegiatan' && (!initialData || initialData?.status === 'Draft')) {
      return (
        <div className="pt-6 mt-6 border-t border-slate-200 w-full pb-8 flex flex-wrap items-center gap-3">
          {draftButton}
          <button onClick={() => handleTabChange('fasilitas')} className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-sm">Lanjut Pengecekan Fasilitas ➡️</button>
        </div>
      );
    }
    if (activeTab === 'fasilitas' || initialData) {
      return (
        <div className="pt-6 mt-6 border-t border-slate-200 w-full pb-8 flex flex-wrap items-center gap-3">
          {draftButton}
          <button onClick={handleInitiateSubmit} disabled={isSubmitting || isSavingDraft} className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50">
            {isSubmitting ? 'MENGIRIM...' : initialData && initialData.status !== 'Draft' && initialData.kondisiFasilitas?.length > 0 && (!initialData.kegiatan || initialData.kegiatan.length === 0) ? 'Simpan Laporan Fasilitas' : 'Serahkan Semua ke SPV (Logbook & Fasilitas)'}
          </button>
        </div>
      );
    }
    return null;
  };

  const handleInitiateSubmit = () => {
    // Validasi Level User: Jika bukan dinas pada hari/tanggal laporan tersebut
    if (userRole !== 'admin' && dutyCheck.checked && !dutyCheck.isOnDuty) {
      setIsNotOnDutyModalOpen(true);
      return;
    }

    const validKegiatans = kegiatan.filter(k => (k.uraian || '').trim().length > 0);
    const isEditingFasilitasOnly = initialData && initialData.status !== 'Draft' && initialData.kondisiFasilitas?.length > 0 && (!initialData.kegiatan || initialData.kegiatan.length === 0);

    if (!isEditingFasilitasOnly) {
      if (validKegiatans.length === 0) { 
        showAlert('TIDAK BISA DISERAHKAN KE SPV: Anda belum mengisi progress aduan (Logbook)!\n\nJika ingin menyimpan sementara tanpa kehilangan data, klik tombol "Simpan Draft (Sementara 24 Jam)".', 'error'); 
        setActiveTab('kegiatan'); 
        return; 
      }
      setShowModal(true); 
      setModalStep('collage');
    } else {
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
      const personilPayload = {
        apindo: apindo.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
        osIass: osIass.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
        omNti: omNti.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
        omIassNti: [
          ...osIass.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' })),
          ...omNti.filter(p => p.nama).map(p => ({ nama: p.nama, absensi: p.absensi || 'H' }))
        ]
      };

      // Laporan Terpadu: Simpan Logbook & Pengecekan Fasilitas dalam SATU dokumen laporan
      const unifiedPayload = {
        reportCode,
        fungsi: 'ELECTRONIC & IT FACILITY',
        dinas: currentShift,
        tanggal: `${hari} ${bulan} ${tahun}`,
        jamMulaiShift,
        jamSelesaiShift,
        status: newStatus,
        personil: personilPayload,
        kegiatan: dataKegiatan,
        rawKegiatan: kegiatan,
        slotImages,
        finalCollages,
        kondisiFasilitas: fasilitas,
        catatan: catatanFasilitas,
        draftExpiresAt: null
      };

      const targetReportId = initialData?._id || draftId;
      if (targetReportId) {
        // Update laporan existing / konversi dari draft ke final
        const res = await fetch(`/api/reports/${targetReportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(unifiedPayload)
        });
        if (!res.ok) throw new Error('Gagal memperbarui laporan.');
      } else {
        // Buat dokumen laporan terpadu baru
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(unifiedPayload)
        });
        if (!res.ok) throw new Error('Gagal menyimpan laporan.');
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setShowModal(false);
      showAlert('Laporan berhasil diserahkan ke Supervisor!', 'success');
      setTimeout(onBack, 1500);
    } catch (e: any) { showAlert(`GAGAL MENYIMPAN!\nAlasan: ${e.message}`, 'error'); }
    setIsSubmitting(false);
  };

  const renderPersonilGroup = (
    label: string,
    list: PersonilEntry[],
    setList: React.Dispatch<React.SetStateAction<PersonilEntry[]>>,
    optionsList: string[]
  ) => (
    <div className="space-y-3 w-full">
      <label className="text-xs font-semibold text-slate-600 block">{label}</label>
      {list.map((p, i) => {
        const currentAbsensi = p.absensi || 'H';
        const absensiMeta = ABSENSI_OPTIONS.find(opt => opt.code === currentAbsensi) || ABSENSI_OPTIONS[0];
        return (
          <div key={i} className="flex items-stretch gap-1.5">
            <select
              disabled={isLocked}
              value={p.nama}
              onChange={(e) => {
                const n = [...list];
                n[i] = { ...n[i], nama: e.target.value, absensi: n[i].absensi || 'H' };
                setList(n);
              }}
              className="flex-1 min-w-0 p-3 bg-white border border-slate-200 rounded-lg outline-none text-xs sm:text-sm font-medium disabled:opacity-60"
            >
              <option value="">- Pilih Personil -</option>
              {optionsList.map(name => (
                <option key={name} value={name} disabled={list.some((person, idx) => person.nama === name && idx !== i)}>
                  {name}
                </option>
              ))}
            </select>

            {!isLocked && (list.length > 1 || Boolean(p.nama)) && (
              <button
                type="button"
                title="Hapus Personil"
                onClick={() => {
                  if (list.length > 1) {
                    setList(list.filter((_, idx) => idx !== i));
                  } else {
                    setList([{ nama: '', absensi: 'H' }]);
                  }
                }}
                className="px-2.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-slate-200 text-xs font-bold shrink-0 transition-colors"
              >
                ✕
              </button>
            )}

            {Boolean(p.nama) && (
              <div className="relative shrink-0" title={`Absensi Personil: ${absensiMeta.label}`}>
                <div className={`h-full px-2.5 py-2 rounded-lg border text-xs font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer select-none ${absensiMeta.badgeClass}`}>
                  <span>{currentAbsensi}</span>
                  <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <select
                  disabled={isLocked}
                  value={currentAbsensi}
                  onChange={(e) => {
                    const n = [...list];
                    n[i] = { ...n[i], absensi: e.target.value };
                    setList(n);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  {ABSENSI_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
      {!isLocked && (
        <button
          type="button"
          onClick={() => setList([...list, { nama: '', absensi: 'H' }])}
          className="w-full py-3 text-xs font-bold text-blue-600 bg-white border border-slate-200 border-dashed rounded-lg hover:bg-slate-50"
        >
          + Tambah
        </button>
      )}
    </div>
  );

  const isEditingExistingNonDraft = initialData && initialData.status !== 'Draft';
  const showKegiatanTab = !isEditingExistingNonDraft || (initialData?.kegiatan?.length > 0);
  const showFasilitasTab = !isEditingExistingNonDraft || (initialData?.kondisiFasilitas?.length > 0);

  return (
    <div className="w-full min-h-screen bg-white text-slate-800 font-sans flex flex-col">
      
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative flex flex-col text-center border border-slate-200">
            <div className="p-6 pb-2 pt-8 flex justify-center">
              {alertConfig.type === 'error' ? <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></div> :
               alertConfig.type === 'warning' ? <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div> :
               <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>}
            </div>
            <div className="p-6 pt-4 space-y-6">
              <p className="text-sm font-medium text-slate-700 whitespace-pre-line leading-relaxed">{alertConfig.message}</p>
              <button onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-lg transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <CropperModal cropQueue={cropQueue} setCropQueue={setCropQueue} crop={crop} setCrop={setCrop} zoom={zoom} setZoom={setZoom} cropAspect={cropAspect} setCropAspect={setCropAspect} setCroppedAreaPixels={setCroppedAreaPixels} handleSaveCrop={handleSaveCrop} />
      <CollageModal showModal={showModal} setShowModal={setShowModal} modalStep={modalStep} setModalStep={setModalStep} slotImages={slotImages} handleUploadToSlot={handleUploadToSlot} removeImageFromSlot={removeImageFromSlot} handleInitiatePreview={handleInitiatePreview} isGenerating={isGenerating} hari={hari} bulan={bulan} tahun={tahun} shift={currentShift} kegiatan={kegiatan} finalCollages={finalCollages} handleFinalSubmit={handleFinalSubmit} isSubmitting={isSubmitting} />

      {/* Pop Up Modal: Anda Tidak Masuk Hari Ini */}
      {isNotOnDutyModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 text-center relative animate-scaleUp">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
              🚫
            </div>
            
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              Anda Tidak Masuk Hari Ini!
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Berdasarkan jadwal Management Absensi ELIT, Anda tidak memiliki jadwal dinas aktif pada tanggal laporan ini.
            </p>

            <div className="my-5 bg-rose-50/70 border border-rose-150 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-500 font-medium">Nama Personil:</span>
                <span className="font-bold text-slate-800">{dutyCheck.matchedPerson || userFullName || userName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-500 font-medium">Tanggal Laporan:</span>
                <span className="font-bold text-slate-800">{hari} {bulan} {tahun}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-rose-100">
                <span className="text-slate-500 font-medium">Status Jadwal:</span>
                <span className="font-black px-2 py-0.5 rounded text-[11px] bg-rose-200 text-rose-800">
                  {dutyCheck.shiftCode} — {dutyCheck.shiftLabel}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Jam Dinas:</span>
                <span className="font-semibold text-slate-700">{dutyCheck.jamDinas}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-[11px] text-amber-800 text-left flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span className="leading-snug">
                <strong>Ketentuan Akses:</strong> Anda tidak diizinkan untuk <strong>Menyimpan Draft</strong> maupun <strong>Mengirim Laporan ke SPV</strong> pada hari di mana Anda tidak berdinas aktif.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setIsNotOnDutyModalOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Tutup & Hanya Lihat
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-500/20"
              >
                Kembali ke Daftar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-6 md:px-10 pt-8 pb-4 border-b border-slate-200 bg-white flex flex-col gap-5 shrink-0 z-10">
        {/* Banner Status Draft Sementara 24 Jam */}
        {(draftId || draftExpiresAt) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-xl">📝</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    STATUS: DRAFT SEMENTARA
                  </span>
                  {draftCountdown && (
                    <span className="text-xs font-bold text-amber-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-200">
                      ⏳ {draftCountdown}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800 mt-1 font-medium">
                  Data yang telah Anda isi tersimpan otomatis dan tidak akan hilang saat dibuka kembali. Draft bersifat sementara dan akan hilang otomatis dalam 24 jam jika belum diserahkan ke SPV.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveAsDraft}
                disabled={isSavingDraft}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                {isSavingDraft ? 'Menyimpan...' : '💾 Perbarui Draft'}
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
              >
                🗑️ Reset Draft
              </button>
            </div>
          </div>
        )}

        {/* Banner Peringatan: Tidak Masuk Dinas Hari Ini */}
        {dutyCheck.checked && !dutyCheck.isOnDuty && userRole !== 'admin' && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    AKSES TERBATAS: ANDA TIDAK MASUK HARI INI
                  </span>
                  <span className="text-xs font-bold text-rose-800 bg-white px-2.5 py-0.5 rounded-full border border-rose-200">
                    Jadwal: {dutyCheck.shiftCode} ({dutyCheck.shiftLabel})
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                  Berdasarkan jadwal absensi tanggal <strong>{hari} {bulan} {tahun}</strong>, Anda tidak berdinas aktif. Anda tidak dapat melakukan <strong>Save Draft</strong> maupun <strong>Kirim ke SPV</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotOnDutyModalOpen(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>ℹ️</span>
              <span>Rincian Jadwal</span>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-blue-600 transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{initialData ? 'Edit Laporan' : 'Form Laporan Terpadu'}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                  status === 'Draft'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  Status: {status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Logbook & Pengecekan Fasilitas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSaveAsDraft}
              disabled={isSavingDraft || isSubmitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isSavingDraft ? 'Menyimpan...' : 'Simpan Draft (24 Jam)'}</span>
            </button>

            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
              <button type="button" disabled={isLocked} onClick={() => handleSyncDateAndShift(hari, bulan, tahun, 'PAGI')} className={`px-5 py-2 rounded-md text-xs font-bold tracking-widest transition-colors disabled:opacity-60 ${currentShift === 'PAGI' ? 'bg-[#facc15] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>PAGI</button>
              <button type="button" disabled={isLocked} onClick={() => handleSyncDateAndShift(hari, bulan, tahun, 'MALAM')} className={`px-5 py-2 rounded-md text-xs font-bold tracking-widest transition-colors disabled:opacity-60 ${currentShift === 'MALAM' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MALAM</button>
            </div>
          </div>

        </div>

        <div className="flex gap-8 overflow-x-auto scrollbar-hide pt-2">
          <button onClick={() => handleTabChange('umum')} className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'umum' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tanggal & Personil</button>
          {showKegiatanTab && <button onClick={() => handleTabChange('kegiatan')} className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'kegiatan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Detail Progress Aduan</button>}
          {showFasilitasTab && <button onClick={() => handleTabChange('fasilitas')} className={`pb-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'fasilitas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pengecekan Fasilitas</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 md:px-10 py-8 w-full flex flex-col">
        <div className="flex-1 w-full">
          
          {activeTab === 'umum' && (
            <div className="space-y-10 animate-fadeIn w-full max-w-5xl">
              
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Report Code</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <input disabled={isLocked} type="text" readOnly value={reportCode} placeholder="Klik tombol generate..." className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono font-bold text-slate-700 text-sm cursor-not-allowed disabled:opacity-60" />
                  {!isLocked && <button type="button" onClick={generateReportCode} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold rounded-lg transition-colors whitespace-nowrap text-sm flex items-center justify-center gap-2">Generate Code</button>}
                </div>
              </div>

              <div className="space-y-3 w-full">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu Pelaksanaan</h2>
                <div className="flex gap-3 w-full">
                  <select disabled={isLocked} value={hari} onChange={(e) => handleSyncDateAndShift(e.target.value, bulan, tahun, currentShift)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-sm disabled:opacity-60">{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  <select disabled={isLocked} value={bulan} onChange={(e) => handleSyncDateAndShift(hari, e.target.value, tahun, currentShift)} className="flex-[2] p-3.5 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-sm disabled:opacity-60">{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  <select disabled={isLocked} value={tahun} onChange={(e) => handleSyncDateAndShift(hari, bulan, e.target.value, currentShift)} className="flex-1 p-3.5 bg-white border border-slate-200 rounded-lg outline-none font-medium text-slate-700 text-sm disabled:opacity-60">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <div className="flex gap-4 w-full mt-2">
                  <div className="flex-1"><label className="text-[11px] font-medium text-slate-500 mb-1.5 block">Jam Mulai Shift</label><input type="time" readOnly disabled value={jamMulaiShift} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-400 text-sm cursor-not-allowed" /></div>
                  <div className="flex-1"><label className="text-[11px] font-medium text-slate-500 mb-1.5 block">Jam Selesai Shift</label><input type="time" readOnly disabled value={jamSelesaiShift} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-400 text-sm cursor-not-allowed" /></div>
                </div>
              </div>

              <div className="space-y-3 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tim Bertugas</h2>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handlePullPersonnelFromRoster(hari, bulan, tahun, currentShift, false)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 w-fit"
                    >
                      <span>📅</span>
                      <span>Tarik Personil dari Jadwal Absensi ({hari} {bulan} {tahun} - {currentShift === 'PAGI' ? 'Shift Pagi (P/PS)' : 'Shift Malam (M)'})</span>
                    </button>
                  )}
                </div>

                {/* Keterangan Simbol Absensi Personil */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-500 uppercase tracking-wider mr-1">Kode Absensi:</span>
                  {ABSENSI_OPTIONS.map(opt => (
                    <span key={opt.code} className={`px-2 py-0.5 rounded-md border font-bold ${opt.badgeClass}`}>
                      {opt.code} = {opt.desc}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  {renderPersonilGroup('APINDO', apindo, setApindo, apindoList)}
                  {renderPersonilGroup('OS - IASS', osIass, setOsIass, iassList)}
                  {renderPersonilGroup('OM - NTI', omNti, setOmNti, ntiList)}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'kegiatan' && <FormLogbook kegiatan={kegiatan} setKegiatan={setKegiatan} isLocked={isLocked} onOpenPhotoModal={() => { setShowModal(true); setModalStep('collage'); }} />}
          
          {activeTab === 'fasilitas' && <FormFasilitas fasilitas={fasilitas} setFasilitas={setFasilitas} catatanFasilitas={catatanFasilitas} setCatatanFasilitas={setCatatanFasilitas} isLocked={isLocked} initialData={initialData} showAlert={showAlert} />}
        </div>
        
        {renderBottomAction()}
      </div>
    </div>
  );
}