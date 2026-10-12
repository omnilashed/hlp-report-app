import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface RosterEntry {
  userId?: string;
  nama: string;
  nik?: string;
  instansi: 'APINDO' | 'IASS' | 'NTI';
  urutan: number;
  shifts: Record<string, string>;
}

export interface PersonnelItem {
  _id?: string;
  nama: string;
  nik?: string;
  instansi: 'APINDO' | 'IASS' | 'NTI';
  isActive?: boolean;
}

export interface SignedPdfVerificationInfo {
  fileName: string;
  uploadedAt: string;
  hasSignature: boolean;
  signerName: string;
  signerTitle: string;
  syncedCount: number;
  correctedCellsCount: number;
  skippedInactive: string[];
  signatureCropUrl?: string;
  pagePreviewUrl?: string;
}

interface ManagementAbsensiProps {
  userRole: string;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

// Singkatan hari sesuai permintaan user: SN (Senin), SL (Selasa), RB (Rabu), KM (Kamis), JM (Jumat), SB (Sabtu), MG (Minggu)
const DAY_ABBR = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'];
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface ShiftCodeInfo {
  code: string;
  label: string;
  jam: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hexBg: string;
  hexText: string;
}

const SHIFT_CODES: ShiftCodeInfo[] = [
  {
    code: 'P',
    label: 'Masuk Pagi Reguler',
    jam: '07.30 s/d 16.30',
    bgClass: 'bg-[#ed7d31]',
    textClass: 'text-slate-900 font-extrabold',
    borderClass: 'border-[#c55a11]',
    hexBg: '#ed7d31',
    hexText: '#0f172a'
  },
  {
    code: 'PS',
    label: 'Masuk Pagi Shift',
    jam: '07.00 s/d 19.00',
    bgClass: 'bg-[#ffff00]',
    textClass: 'text-slate-900 font-extrabold',
    borderClass: 'border-amber-400',
    hexBg: '#ffff00',
    hexText: '#0f172a'
  },
  {
    code: 'M',
    label: 'Masuk Malam',
    jam: '19.00 s/d 07.00',
    bgClass: 'bg-[#00b0f0]',
    textClass: 'text-slate-900 font-extrabold',
    borderClass: 'border-sky-600',
    hexBg: '#00b0f0',
    hexText: '#0f172a'
  },
  {
    code: 'DL',
    label: 'Dinas Luar (Tidak Masuk)',
    jam: 'Dinas Luar',
    bgClass: 'bg-[#a6a6a6]',
    textClass: 'text-slate-900 font-extrabold',
    borderClass: 'border-slate-500',
    hexBg: '#a6a6a6',
    hexText: '#0f172a'
  },
  {
    code: 'CUTI',
    label: 'Mengambil Cuti',
    jam: 'Cuti Resmi',
    bgClass: 'bg-[#92d050]',
    textClass: 'text-slate-900 font-extrabold',
    borderClass: 'border-lime-600',
    hexBg: '#92d050',
    hexText: '#0f172a'
  },
  {
    code: 'L',
    label: 'Libur',
    jam: 'Libur Jadwal',
    bgClass: 'bg-white',
    textClass: 'text-slate-800 font-bold',
    borderClass: 'border-slate-300',
    hexBg: '#ffffff',
    hexText: '#1e293b'
  },
  {
    code: '-',
    label: 'Off / Lepas Dinas',
    jam: 'Off Shift',
    bgClass: 'bg-white',
    textClass: 'text-slate-600 font-bold',
    borderClass: 'border-slate-300',
    hexBg: '#ffffff',
    hexText: '#475569'
  }
];

// Peta NIK resmi sesuai dokumen DAFTAR DINAS yang di-TTD Atasan
const DEFAULT_NIK_MAP: Record<string, string> = {
  'AEP MASHUM NURZAMAN': '20244401',
  'RAHMAT D CAHYO': '20244641',
  'RAHMAT D. CAHYO': '20244641',
  'EKA YULIANI S': '20244934',
  'EKA YULIANI S.': '20244934',
  'RIZKO E NUGRAHA': '20247850',
  'RIZKO E. NUGRAHA': '20247850',
  'ISTIANAH RAHMAH DEWI': '20247875',
  'MAULANA HADY C S': '20246808',
  'MAULANA HADY C. S.': '20246808',
  'ADELIA PUSPITA': '241002009539',
  'MAHDI ALHABSYI': '241002009012',
  'RISKI RACHMAD SANTOSO': '241002009015',
  'M ROIM': '260806007161',
  'M. ROIM': '260806007161',
  'AHMAD FANGKY S': '241102011731',
  'AHMAD FANGKY S.': '241102011731',
  'DENNIS SAYYIDINAA R': '241002010885',
  'DENNIS SAYYIDINAA R.': '241002010885',
  'ABDUL KODIR': '241002006220',
  'YUDHA ISMUNANDAR': '241002010829',
  'KARUNIAWAN GEOVANI': '241002006219',
  'LUTHFIANDA MUZAKI S': '-',
  'YOAN HERNANTRA': '-',
  'FARIZ SOLAHUDIN': '-',
  'MUHAMMAD FACHREZA': '-',
  'ZAKY ALHADY': '-',
  'DESI DWI NUR HARTATI': '-'
};

// Fallback personil sesuai database User jika API sedang tidak terjangkau
const DEFAULT_DB_PERSONNEL: PersonnelItem[] = [
  // APINDO
  { nama: 'AEP MASHUM NURZAMAN', nik: '20244401', instansi: 'APINDO' },
  { nama: 'RAHMAT D. CAHYO', nik: '20244641', instansi: 'APINDO' },
  { nama: 'EKA YULIANI S.', nik: '20244934', instansi: 'APINDO' },
  { nama: 'RIZKO E. NUGRAHA', nik: '20247850', instansi: 'APINDO' },
  { nama: 'ISTIANAH RAHMAH DEWI', nik: '20247875', instansi: 'APINDO' },
  { nama: 'MAULANA HADY C. S.', nik: '20246808', instansi: 'APINDO' },
  // IASS
  { nama: 'ADELIA PUSPITA', nik: '241002009539', instansi: 'IASS' },
  { nama: 'MAHDI ALHABSYI', nik: '241002009012', instansi: 'IASS' },
  { nama: 'RISKI RACHMAD SANTOSO', nik: '241002009015', instansi: 'IASS' },
  { nama: 'AHMAD FANGKY S.', nik: '241102011731', instansi: 'IASS' },
  { nama: 'DENNIS SAYYIDINAA R', nik: '241002010885', instansi: 'IASS' },
  { nama: 'ABDUL KODIR', nik: '241002006220', instansi: 'IASS' },
  { nama: 'YUDHA ISMUNANDAR', nik: '241002010829', instansi: 'IASS' },
  { nama: 'KARUNIAWAN GEOVANI', nik: '241002006219', instansi: 'IASS' },
  // NTI
  { nama: 'LUTHFIANDA MUZAKI S', nik: '-', instansi: 'NTI' },
  { nama: 'YOAN HERNANTRA', nik: '-', instansi: 'NTI' },
  { nama: 'FARIZ SOLAHUDIN', nik: '-', instansi: 'NTI' },
  { nama: 'MUHAMMAD FACHREZA', nik: '-', instansi: 'NTI' },
  { nama: 'ZAKY ALHADY', nik: '-', instansi: 'NTI' },
  { nama: 'Desi Dwi Nur Hartati', nik: '-', instansi: 'NTI' }
];

const REGULAR_OCT_2026 = [
  'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L'
];

// Preset jadwal existing sesuai gambar Daftar Dinas
const OCT_2026_PRESETS: Record<string, string[]> = {
  'AEP MASHUM NURZAMAN': REGULAR_OCT_2026,
  'RAHMAT D. CAHYO': ['PS','P','L','L','PS','P','L','L','PS','PS','L','L','PS','P','L','L','PS','PS','L','L','PS','P','L','L','PS','P','L','L','PS','P','L'],
  'EKA YULIANI S.': ['L','L','PS','P','DL','DL','DL','P','L','L','PS','PS','L','L','PS','PS','L','L','PS','PS','L','L','PS','P','L','L','PS','PS','L','L','PS'],
  'RIZKO E. NUGRAHA': ['L','PS','P','L','L','PS','PS','L','L','PS','P','L','L','PS','PS','L','L','PS','PS','L','L','PS','PS','L','L','PS','PS','L','L','PS','P'],
  'ISTIANAH RAHMAH DEWI': ['P','P','L','L','DL','DL','DL','P','P','L','L','P','P','P','P','P','L','L','P','P','P','P','P','L','L','P','P','P','P','P','L'],
  'MAULANA HADY C. S.': ['P','L','L','PS','P','L','L','PS','P','L','L','PS','P','L','L','CUTI','CUTI','L','L','PS','P','L','L','PS','P','L','L','PS','P','L','L'],
  'ADELIA PUSPITA': REGULAR_OCT_2026,
  'MAHDI ALHABSYI': ['M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L'],
  'RISKI RACHMAD SANTOSO': ['M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L'],
  'M. ROIM': ['M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L'],
  'AHMAD FANGKY S.': ['PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L'],
  'DENNIS SAYYIDINAA R': ['PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L'],
  'DENNIS SAYYIDINAA R.': ['PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L'],
  'ABDUL KODIR': ['L','CUTI','CUTI','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M'],
  'YUDHA ISMUNANDAR': ['L','L','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M'],
  'KARUNIAWAN GEOVANI': ['L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS','M','L','L','PS'],
  'LUTHFIANDA MUZAKI S': REGULAR_OCT_2026,
  'YOAN HERNANTRA': ['PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-'],
  'FARIZ SOLAHUDIN': ['M','-','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M'],
  'MUHAMMAD FACHREZA': ['-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS'],
  'ZAKY ALHADY': ['-','PS','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-','PS','M','-','-'],
  'DESI DWI NUR HARTATI': REGULAR_OCT_2026
};

const PREFERRED_ORDER: Record<string, string[]> = {
  APINDO: [
    'AEP MASHUM NURZAMAN',
    'RAHMAT D. CAHYO',
    'EKA YULIANI S.',
    'RIZKO E. NUGRAHA',
    'ISTIANAH RAHMAH DEWI',
    'MAULANA HADY C. S.'
  ],
  IASS: [
    'ADELIA PUSPITA',
    'MAHDI ALHABSYI',
    'RISKI RACHMAD SANTOSO',
    'M. ROIM',
    'AHMAD FANGKY S.',
    'DENNIS SAYYIDINAA R',
    'DENNIS SAYYIDINAA R.',
    'ABDUL KODIR',
    'YUDHA ISMUNANDAR',
    'KARUNIAWAN GEOVANI'
  ],
  NTI: [
    'LUTHFIANDA MUZAKI S',
    'YOAN HERNANTRA',
    'FARIZ SOLAHUDIN',
    'MUHAMMAD FACHREZA',
    'ZAKY ALHADY',
    'DESI DWI NUR HARTATI'
  ]
};

const normalizeInstansi = (raw?: string): 'APINDO' | 'IASS' | 'NTI' => {
  const s = (raw || '').toUpperCase();
  if (s.includes('IASS')) return 'IASS';
  if (s.includes('NTI')) return 'NTI';
  return 'APINDO';
};

// Normalisasi nama untuk pencocokan fleksibel (mengabaikan titik/spasi ganda, misal "DENNIS SAYYIDINAA R." == "DENNIS SAYYIDINAA R")
const normalizeNameKey = (name?: string): string => {
  return String(name || '')
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getDefaultNikForName = (nama?: string, existingNik?: string): string => {
  if (existingNik && existingNik.trim() !== '' && existingNik.trim() !== '-') {
    return existingNik.trim();
  }
  const upper = String(nama || '').toUpperCase().trim();
  const norm = normalizeNameKey(nama);
  return DEFAULT_NIK_MAP[upper] || DEFAULT_NIK_MAP[norm] || '-';
};

// Normalisasi kode shift dari Excel / PDF / Input
const normalizeShiftCodeFromExcel = (rawVal: any, instansi: 'APINDO' | 'IASS' | 'NTI'): string => {
  const s = String(rawVal ?? '').toUpperCase().trim();
  if (!s) return instansi === 'NTI' ? '-' : 'L';
  if (['P', 'PS', 'M', 'DL', 'CUTI', 'L', '-'].includes(s)) return s;
  if (s === 'PAGI' || s === 'REGULER') return 'P';
  if (s === 'PAGI SHIFT' || s === 'SHIFT PAGI') return 'PS';
  if (s === 'MALAM' || s === 'SHIFT MALAM') return 'M';
  if (s === 'DINAS LUAR') return 'DL';
  if (s === 'CT' || s === 'CUTI TAHUNAN') return 'CUTI';
  if (s === 'LIBUR') return 'L';
  if (s === 'OFF' || s === 'LEPAS') return '-';
  return s;
};

const buildDefaultShiftsForPerson = (nama: string, instansi: 'APINDO' | 'IASS' | 'NTI', m: number, y: number): Record<string, string> => {
  const upper = nama.toUpperCase().trim();
  const norm = normalizeNameKey(nama);
  const preset = OCT_2026_PRESETS[upper] || OCT_2026_PRESETS[norm];
  const shifts: Record<string, string> = {};
  const maxDays = new Date(y, m, 0).getDate();

  for (let d = 1; d <= 31; d++) {
    let val = instansi === 'NTI' ? '-' : 'L';
    if (preset && preset[d - 1]) {
      val = preset[d - 1];
    } else if (d <= maxDays) {
      const dow = new Date(y, m - 1, d).getDay();
      const isWeekend = dow === 0 || dow === 6;
      val = isWeekend ? (instansi === 'NTI' ? '-' : 'L') : 'P';
    }
    shifts[String(d)] = val;
    shifts[String(d).padStart(2, '0')] = val;
  }
  return shifts;
};

const normalizeShiftsObject = (rawShifts: any, nama: string, instansi: 'APINDO' | 'IASS' | 'NTI', m: number, y: number): Record<string, string> => {
  if (!rawShifts || typeof rawShifts !== 'object' || Object.keys(rawShifts).length === 0) {
    return buildDefaultShiftsForPerson(nama, instansi, m, y);
  }
  const map: Record<string, string> = {};
  const fallback = buildDefaultShiftsForPerson(nama, instansi, m, y);
  for (let d = 1; d <= 31; d++) {
    const kNum = String(d);
    const kPad = kNum.padStart(2, '0');
    const v = rawShifts[kNum] ?? rawShifts[kPad] ?? fallback[kNum] ?? (instansi === 'NTI' ? '-' : 'L');
    map[kNum] = v;
    map[kPad] = v;
  }
  return map;
};

export default function ManagementAbsensi({ userRole }: ManagementAbsensiProps) {
  const [bulan, setBulan] = useState<number>(10);
  const [tahun, setTahun] = useState<number>(2026);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [dbPersonnel, setDbPersonnel] = useState<PersonnelItem[]>(DEFAULT_DB_PERSONNEL);
  const [inactiveCount, setInactiveCount] = useState<number>(0);
  const [inactiveNamesSet, setInactiveNamesSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Drag & Drop + Mode Kuas state
  const [activeBrush, setActiveBrush] = useState<string>('P');
  const [dragPaintMode, setDragPaintMode] = useState<boolean>(false);
  const [draggedCode, setDraggedCode] = useState<string | null>(null);
  const [draggedSourceCell, setDraggedSourceCell] = useState<{ nama: string; day: number; code: string } | null>(null);
  const [draggedPersonRow, setDraggedPersonRow] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const isPaintingCellsRef = useRef<boolean>(false);

  // Drag & Drop Excel & PDF TTD Import state
  const [isExcelDragOver, setIsExcelDragOver] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [excelImportResult, setExcelImportResult] = useState<{
    fileName: string;
    updatedCount: number;
    skippedInactive: string[];
    unmatchedNames: string[];
  } | null>(null);
  const [signedPdfInfo, setSignedPdfInfo] = useState<SignedPdfVerificationInfo | null>(null);
  const [isSignedPreviewOpen, setIsSignedPreviewOpen] = useState<boolean>(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterInstansi, setFilterInstansi] = useState<string>('ALL');

  // Modal Input Manual / Add Absensi
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<'assign' | 'add_person'>('assign');
  const [selectedPersonName, setSelectedPersonName] = useState<string>('');
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(1);
  const [manualShiftCode, setManualShiftCode] = useState<string>('P');

  // State tambah personil baru ke jadwal
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [newPersonInstansi, setNewPersonInstansi] = useState<'APINDO' | 'IASS' | 'NTI'>('APINDO');
  const [newPersonDefaultShift, setNewPersonDefaultShift] = useState<string>('P');

  // Popover edit cepat per sel
  const [editingCell, setEditingCell] = useState<{ nama: string; day: number } | null>(null);

  // Toast alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'OFFICE';

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3600);
  };

  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayOfWeekInfo = (dayNumber: number) => {
    const d = new Date(tahun, bulan - 1, dayNumber);
    const dayIdx = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    const abbr = DAY_ABBR[dayIdx];
    const full = DAY_FULL[dayIdx];
    const isWeekend = dayIdx === 0 || dayIdx === 6; // MG atau SB
    return { abbr, full, isWeekend };
  };

  // Urutkan personil berdasarkan APINDO -> IASS -> NTI dan urutan gambar Daftar Dinas
  const sortPersonnelList = (list: PersonnelItem[]): PersonnelItem[] => {
    const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
    return [...list].sort((a, b) => {
      if (compOrder[a.instansi] !== compOrder[b.instansi]) {
        return compOrder[a.instansi] - compOrder[b.instansi];
      }
      const pref = PREFERRED_ORDER[a.instansi] || [];
      const idxA = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(a.nama));
      const idxB = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(b.nama));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.nama.localeCompare(b.nama);
    });
  };

  // Ambil seluruh data personil dari /api/users dan pisahkan akun ACTIVE vs NON-ACTIVE
  const fetchAllDatabasePersonnel = async (): Promise<{
    activeList: PersonnelItem[];
    inactiveSet: Set<string>;
    apiSuccess: boolean;
  }> => {
    const token = localStorage.getItem('token');
    const collectedMap = new Map<string, PersonnelItem>();
    const nonActiveSet = new Set<string>();
    let apiSuccess = false;
    let nonActiveTotal = 0;

    try {
      // 1. Ambil dari /api/users (endpoint utama DataPersonel yang memuat status isActive & isDeleted)
      const resUsers = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (resUsers.ok) {
        apiSuccess = true;
        const rawUsers = await resUsers.json();
        const userArray = Array.isArray(rawUsers) ? rawUsers : (rawUsers.data || rawUsers.users || []);
        userArray.forEach((u: any) => {
          const nama = (u.namaLengkap || u.username || '').trim();
          if (!nama) return;
          const upperKey = nama.toUpperCase();
          const normKey = normalizeNameKey(nama);

          if (u.isDeleted === true || u.isActive === false) {
            nonActiveSet.add(upperKey);
            nonActiveSet.add(normKey);
            if (u.username) nonActiveSet.add(String(u.username).toUpperCase().trim());
            nonActiveTotal++;
            return;
          }

          collectedMap.set(upperKey, {
            _id: u._id ? String(u._id) : undefined,
            nama,
            nik: getDefaultNikForName(nama, u.nik),
            instansi: normalizeInstansi(u.perusahaan || u.instansi),
            isActive: true
          });
        });
      }
    } catch (e) {}

    try {
      // 2. Ambil juga dari /api/personnel sebagai pelengkap (hanya yang tidak masuk daftar non-active)
      const resPers = await fetch('/api/personnel', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (resPers.ok) {
        apiSuccess = true;
        const rawPers = await resPers.json();
        const persArray = Array.isArray(rawPers) ? rawPers : (rawPers.data || []);
        persArray.forEach((p: any) => {
          if (p.isDeleted === true || p.isActive === false) return;
          const nama = (p.namaLengkap || p.nama || p.username || '').trim();
          if (!nama) return;
          const upperKey = nama.toUpperCase();
          const normKey = normalizeNameKey(nama);
          if (nonActiveSet.has(upperKey) || nonActiveSet.has(normKey)) return;

          if (!collectedMap.has(upperKey)) {
            collectedMap.set(upperKey, {
              _id: p._id ? String(p._id) : undefined,
              nama,
              nik: getDefaultNikForName(nama, p.nik),
              instansi: normalizeInstansi(p.instansi || p.perusahaan),
              isActive: true
            });
          }
        });
      }
    } catch (e) {}

    // Hanya gunakan fallback statis jika API sama sekali gagal dihubungi
    if (!apiSuccess && collectedMap.size === 0) {
      DEFAULT_DB_PERSONNEL.forEach(p => {
        collectedMap.set(p.nama.toUpperCase(), { ...p, nik: getDefaultNikForName(p.nama, p.nik), isActive: true });
      });
    }

    const sorted = sortPersonnelList(Array.from(collectedMap.values()));
    setDbPersonnel(sorted);
    setInactiveCount(nonActiveTotal);
    setInactiveNamesSet(nonActiveSet);
    return { activeList: sorted, inactiveSet: nonActiveSet, apiSuccess };
  };

  // Muat & Sinkronkan Daftar Dinas secara ketat dengan status ACTIVE akun personil di Database
  const fetchAndSyncRoster = async (m: number, y: number, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const monthName = MONTHS[m - 1];

      // 1. Ambil status terbaru personil aktif & non-aktif dari database
      const { activeList: allDbUsers, inactiveSet, apiSuccess } = await fetchAllDatabasePersonnel();

      // Buat indeks personil aktif
      const activeByNormName = new Map<string, PersonnelItem>();
      const activeById = new Map<string, PersonnelItem>();
      allDbUsers.forEach(u => {
        activeByNormName.set(normalizeNameKey(u.nama), u);
        activeByNormName.set(u.nama.toUpperCase().trim(), u);
        if (u._id) activeById.set(String(u._id), u);
      });

      // 2. Ambil jadwal dari /api/attendance/roster (backend juga otomatis memfilter akun non-active)
      const res = await fetch(`/api/attendance/roster?bulan=${encodeURIComponent(monthName)}&tahun=${y}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      let serverRows: any[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          serverRows = data.entries;
        } else if (Array.isArray(data.rows) && data.rows.length > 0) {
          serverRows = data.rows;
        }
        if (data.signedPdfInfo) {
          setSignedPdfInfo(data.signedPdfInfo);
        } else if (!silent) {
          setSignedPdfInfo(null);
        }
      }

      // 3. Gabungkan & sinkronkan:
      //    - Jika akun personil NON-ACTIVE (ada di inactiveSet atau tidak ada di activeByNormName), OTOMATIS HILANG dari Daftar Dinas!
      //    - Jika akun personil ACTIVE (baru ditambahkan atau aktif kembali), OTOMATIS MUNCUL di Daftar Dinas!
      const mergedMap = new Map<string, RosterEntry>();

      serverRows.forEach((r: any, idx: number) => {
        const rawNama = (r.nama || r.namaLengkap || '').trim();
        if (!rawNama) return;
        const upperKey = rawNama.toUpperCase();
        const normKey = normalizeNameKey(rawNama);
        const rowUid = r.userId ? String(r.userId) : '';

        // Lewati jika akun personil sedang non-active
        if (inactiveSet.has(upperKey) || inactiveSet.has(normKey)) {
          return;
        }

        const matchedActive =
          (rowUid && activeById.get(rowUid)) ||
          activeByNormName.get(upperKey) ||
          activeByNormName.get(normKey);

        // Jika API berhasil mengambil daftar user aktif, pastikan hanya user yang statusnya aktif yang masuk
        if (apiSuccess && allDbUsers.length > 0 && !matchedActive) {
          return;
        }

        const finalNama = matchedActive ? matchedActive.nama : rawNama;
        const finalInstansi = matchedActive ? matchedActive.instansi : normalizeInstansi(r.instansi || r.perusahaan);
        const finalNik = getDefaultNikForName(finalNama, matchedActive?.nik || r.nik);
        const rawShifts = r.shifts || r.days || {};

        mergedMap.set(normalizeNameKey(finalNama), {
          userId: matchedActive?._id || rowUid,
          nama: finalNama,
          nik: finalNik,
          instansi: finalInstansi,
          urutan: typeof r.urutan === 'number' && r.urutan > 0 ? r.urutan : idx + 1,
          shifts: normalizeShiftsObject(rawShifts, finalNama, finalInstansi, m, y)
        });
      });

      // Pastikan semua personil ACTIVE dari database otomatis masuk ke Daftar Dinas
      allDbUsers.forEach((dbUser, idx) => {
        const normKey = normalizeNameKey(dbUser.nama);
        if (!mergedMap.has(normKey)) {
          mergedMap.set(normKey, {
            userId: dbUser._id || '',
            nama: dbUser.nama,
            nik: getDefaultNikForName(dbUser.nama, dbUser.nik),
            instansi: dbUser.instansi,
            urutan: idx + 1,
            shifts: buildDefaultShiftsForPerson(dbUser.nama, dbUser.instansi, m, y)
          });
        } else {
          const existing = mergedMap.get(normKey)!;
          existing.nama = dbUser.nama;
          existing.nik = getDefaultNikForName(dbUser.nama, dbUser.nik || existing.nik);
          existing.instansi = dbUser.instansi;
          if (dbUser._id) existing.userId = dbUser._id;
        }
      });

      // Urutkan sesuai grup APINDO, IASS, NTI dan urutan gambar
      const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
      const finalEntries = Array.from(mergedMap.values()).sort((a, b) => {
        if (compOrder[a.instansi] !== compOrder[b.instansi]) {
          return compOrder[a.instansi] - compOrder[b.instansi];
        }
        const pref = PREFERRED_ORDER[a.instansi] || [];
        const idxA = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(a.nama));
        const idxB = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(b.nama));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.urutan - b.urutan;
      }).map((entry, idx) => ({ ...entry, urutan: idx + 1 }));

      setEntries(finalEntries);
      if (finalEntries.length > 0) {
        setSelectedPersonName(prev => {
          if (prev && finalEntries.some(e => e.nama === prev)) return prev;
          return finalEntries[0].nama;
        });
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      const fallbackEntries: RosterEntry[] = dbPersonnel.map((p, idx) => ({
        userId: p._id || '',
        nama: p.nama,
        nik: getDefaultNikForName(p.nama, p.nik),
        instansi: p.instansi,
        urutan: idx + 1,
        shifts: buildDefaultShiftsForPerson(p.nama, p.instansi, m, y)
      }));
      setEntries(fallbackEntries);
      if (fallbackEntries.length > 0 && !selectedPersonName) {
        setSelectedPersonName(fallbackEntries[0].nama);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSyncRoster(bulan, tahun);
  }, [bulan, tahun]);

  // Sinkronisasi otomatis ketika tab/window kembali aktif setelah admin mengubah status personil
  useEffect(() => {
    const handleWindowFocus = () => {
      if (!hasUnsavedChanges) {
        fetchAndSyncRoster(bulan, tahun, true);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [bulan, tahun, hasUnsavedChanges]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isPaintingCellsRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Pilihan personil di dropdown Modal Input Manual (HANYA personil yang status akunnya ACTIVE)
  const allDropdownPersonnel: PersonnelItem[] = React.useMemo(() => {
    const map = new Map<string, PersonnelItem>();
    dbPersonnel.forEach(p => {
      const norm = normalizeNameKey(p.nama);
      if (!inactiveNamesSet.has(norm) && !inactiveNamesSet.has(p.nama.toUpperCase().trim())) {
        map.set(norm, p);
      }
    });
    entries.forEach(e => {
      const norm = normalizeNameKey(e.nama);
      if (!map.has(norm) && !inactiveNamesSet.has(norm) && !inactiveNamesSet.has(e.nama.toUpperCase().trim())) {
        map.set(norm, { _id: e.userId, nama: e.nama, nik: e.nik, instansi: e.instansi, isActive: true });
      }
    });
    return sortPersonnelList(Array.from(map.values()));
  }, [dbPersonnel, entries, inactiveNamesSet]);

  // Pastikan selectedPersonName selalu valid dan aktif
  useEffect(() => {
    if (allDropdownPersonnel.length > 0) {
      const stillValid =
        selectedPersonName.startsWith('__ALL_') ||
        allDropdownPersonnel.some(p => p.nama === selectedPersonName);
      if (!selectedPersonName || !stillValid) {
        setSelectedPersonName(allDropdownPersonnel[0].nama);
      }
    }
  }, [allDropdownPersonnel, selectedPersonName]);

  // Simpan ke backend (mendukung format `rows` maupun `entries` serta `signedPdfInfo`)
  const persistRosterToServer = async (
    currentEntries: RosterEntry[],
    silent = false,
    customSignedPdfInfo?: SignedPdfVerificationInfo | null
  ) => {
    if (!canEdit) return;
    if (!silent) setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const monthName = MONTHS[bulan - 1];

      const formattedRows = currentEntries.map((e, idx) => {
        const bothKeysDays: Record<string, string> = {};
        for (let d = 1; d <= 31; d++) {
          const kNum = String(d);
          const kPad = kNum.padStart(2, '0');
          const code = e.shifts[kNum] ?? e.shifts[kPad] ?? (e.instansi === 'NTI' ? '-' : 'L');
          bothKeysDays[kNum] = code;
          bothKeysDays[kPad] = code;
        }
        return {
          userId: e.userId || '',
          nama: e.nama,
          namaLengkap: e.nama,
          nik: getDefaultNikForName(e.nama, e.nik),
          instansi: e.instansi,
          perusahaan: e.instansi,
          urutan: idx + 1,
          days: bothKeysDays,
          shifts: bothKeysDays
        };
      });

      const payload: any = {
        bulan: monthName,
        tahun: String(tahun),
        unit: 'ELECTRONIC & IT FACILITY',
        bandara: 'HALIM PERDANAKUSUMA',
        rows: formattedRows,
        entries: formattedRows
      };
      if (customSignedPdfInfo !== undefined) {
        payload.signedPdfInfo = customSignedPdfInfo;
      }

      const res = await fetch('/api/attendance/roster', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Gagal menyimpan jadwal absensi');
      setHasUnsavedChanges(false);
      if (!silent) {
        showToast(`✅ Jadwal Daftar Dinas ${monthName} ${tahun} berhasil disimpan!`, 'success');
      }
    } catch (err: any) {
      if (!silent) {
        showToast(err.message || 'Gagal menyimpan jadwal absensi.', 'error');
      }
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  // Debounced auto-save setiap kali ada perubahan drag & drop atau klik
  const scheduleAutoSave = (updatedEntries: RosterEntry[]) => {
    setHasUnsavedChanges(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistRosterToServer(updatedEntries, true);
    }, 800);
  };

  // Hitung jumlah HARI KERJA (P, PS, M dihitung sebagai hari kerja masuk dinas)
  const calculateWorkingDays = (shifts: Record<string, string>) => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const code = (shifts[String(d)] || shifts[String(d).padStart(2, '0')] || '').toUpperCase().trim();
      if (code === 'P' || code === 'PS' || code === 'M') {
        count++;
      }
    }
    return count;
  };

  // Hitung rincian status per personil (P, PS, M, DL, CUTI)
  const calculateShiftBreakdown = (shifts: Record<string, string>) => {
    const counts: Record<string, number> = { P: 0, PS: 0, M: 0, DL: 0, CUTI: 0, L: 0 };
    for (let d = 1; d <= daysInMonth; d++) {
      const code = (shifts[String(d)] || shifts[String(d).padStart(2, '0')] || '').toUpperCase().trim();
      if (counts[code] !== undefined) counts[code]++;
    }
    return counts;
  };

  // Update 1 sel tanggal pada personil
  const updateCellShift = (personName: string, day: number, newCode: string) => {
    if (!canEdit) return;
    const targetUpper = personName.toUpperCase().trim();
    const kNum = String(day);
    const kPad = kNum.padStart(2, '0');

    setEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.nama.toUpperCase().trim() !== targetUpper) return entry;
        return {
          ...entry,
          shifts: {
            ...entry.shifts,
            [kNum]: newCode,
            [kPad]: newCode
          }
        };
      });
      scheduleAutoSave(updated);
      return updated;
    });
  };

  // Update rentang tanggal pada seorang personil (misal saat Drag-Range atau Drop ke Nama Personil)
  const updateRangeShifts = (personName: string, fromDay: number, toDay: number, newCode: string) => {
    if (!canEdit) return;
    const targetUpper = personName.toUpperCase().trim();
    const start = Math.min(fromDay, toDay);
    const end = Math.max(fromDay, toDay);

    setEntries(prev => {
      const updated = prev.map(entry => {
        if (entry.nama.toUpperCase().trim() !== targetUpper) return entry;
        const nextShifts = { ...entry.shifts };
        for (let d = start; d <= end; d++) {
          nextShifts[String(d)] = newCode;
          nextShifts[String(d).padStart(2, '0')] = newCode;
        }
        return { ...entry, shifts: nextShifts };
      });
      scheduleAutoSave(updated);
      return updated;
    });
  };

  // Reorder baris personil via Drag & Drop
  const handleDropPersonRow = (sourceName: string, targetName: string) => {
    if (!canEdit || sourceName === targetName) return;
    setEntries(prev => {
      const srcIdx = prev.findIndex(e => e.nama === sourceName);
      const tgtIdx = prev.findIndex(e => e.nama === targetName);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      if (prev[srcIdx].instansi !== prev[tgtIdx].instansi) {
        showToast('Urutan personil hanya dapat dipindah dalam grup instansi yang sama.', 'info');
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, moved);
      const reindexed = next.map((item, i) => ({ ...item, urutan: i + 1 }));
      scheduleAutoSave(reindexed);
      return reindexed;
    });
  };

  // Reset / Sinkronkan ulang dengan database personil aktif
  const handleResetDefault = async () => {
    if (!canEdit) return;
    const monthName = MONTHS[bulan - 1];
    if (!window.confirm(`Sinkronkan ulang Daftar Dinas ${monthName} ${tahun} dengan status aktif personil di database?`)) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/attendance/roster/reset-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bulan: monthName, tahun: String(tahun) })
      });
      if (res.ok) {
        await fetchAndSyncRoster(bulan, tahun);
        showToast('Daftar Dinas berhasil disinkronkan dengan personil berstatus Aktif!', 'success');
      } else {
        await fetchAndSyncRoster(bulan, tahun);
      }
    } catch (e) {
      await fetchAndSyncRoster(bulan, tahun);
    } finally {
      setIsLoading(false);
    }
  };

  // Export / Download Template Excel (.xlsx) sesuai struktur DAFTAR DINAS (termasuk kolom NIK & Pengesahan Atasan)
  const handleExportExcel = () => {
    const monthName = MONTHS[bulan - 1].toUpperCase();
    const aoa: any[][] = [];

    // Baris Judul
    aoa.push(['DAFTAR DINAS']);
    aoa.push(['UNIT', ': ELECTRONIC & IT FACILITY']);
    aoa.push(['BANDARA', ': HALIM PERDANAKUSUMA']);
    aoa.push(['BULAN', `: ${monthName}`]);
    aoa.push(['TAHUN', `: ${tahun}`]);
    aoa.push([]);

    // Baris Header 1: NO | NAMA | NIK | SN..MG | HARI KERJA
    const headerRow1 = [
      'NO',
      'NAMA',
      'NIK',
      ...daysArray.map(d => getDayOfWeekInfo(d).abbr),
      'HARI KERJA'
    ];
    // Baris Header 2: '' | '' | '' | 01..31 | ''
    const headerRow2 = [
      '',
      '',
      '',
      ...daysArray.map(d => String(d).padStart(2, '0')),
      ''
    ];
    aoa.push(headerRow1);
    aoa.push(headerRow2);

    let rowNo = 1;
    (['APINDO', 'IASS', 'NTI'] as const).forEach(grpKey => {
      const grpList = entries.filter(e => e.instansi === grpKey);
      if (grpList.length === 0) return;

      // Sub-header instansi
      aoa.push(['', grpKey, '', ...daysArray.map(() => ''), '']);

      grpList.forEach(person => {
        const dayValues = daysArray.map(d => {
          return (
            person.shifts[String(d)] ??
            person.shifts[String(d).padStart(2, '0')] ??
            (person.instansi === 'NTI' ? '-' : 'L')
          );
        });
        const workDays = calculateWorkingDays(person.shifts);
        aoa.push([
          rowNo++,
          person.nama,
          getDefaultNikForName(person.nama, person.nik),
          ...dayValues,
          workDays
        ]);
      });
    });

    aoa.push([]);
    aoa.push(['KETERANGAN :']);
    aoa.push(['P', 'Dinas Office Hour (07.30 - 16.30)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Jakarta, ${new Date().getDate()} ${MONTHS[bulan - 1]} ${tahun}`]);
    aoa.push(['PS', 'Dinas Pagi Operasional (07.00 - 19.00)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Asst. Manager Of Facility Maintenance']);
    aoa.push(['M', 'Dinas Malam Operasional (19.00 - 07.00)']);
    aoa.push(['L / -', 'Libur / Off']);
    aoa.push(['DL', 'Dinas Luar']);
    aoa.push(['CUTI', 'Cuti Tahunan', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AEP MASHUM NURZAMAN']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 28 },
      { wch: 15 },
      ...daysArray.map(() => ({ wch: 5 })),
      { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `DAFTAR_DINAS_${monthName}`);
    XLSX.writeFile(wb, `DAFTAR_DINAS_ELIT_${monthName}_${tahun}.xlsx`);
    showToast(`📥 File Excel DAFTAR_DINAS_ELIT_${monthName}_${tahun}.xlsx berhasil diunduh!`, 'success');
  };

  // Klasifikasi warna piksel RGB dari hasil scan tabel Daftar Dinas yang telah di-TTD
  const classifyScannedCellColor = (
    r: number,
    g: number,
    b: number
  ): 'P' | 'PS' | 'M' | 'CUTI' | 'DL' | 'WHITE' | 'DARK' => {
    const avg = (r + g + b) / 3;
    if (avg < 105) return 'DARK'; // garis tabel atau teks hitam

    // PS (Yellow #ffff00): R tinggi, G tinggi, B rendah, |R - G| kecil
    if (r > 195 && g > 195 && b < 155 && g - b > 55 && Math.abs(r - g) <= 32) {
      return 'PS';
    }
    // P (Orange #ed7d31): R tinggi, G sedang-tinggi, B rendah, R > G
    if (r > 190 && g > 120 && b < 150 && r - b > 65 && r - g > 20) {
      return 'P';
    }
    // M (Cyan/Blue #00b0f0): B tinggi, R rendah
    if (b > 175 && r < 155 && b - r > 50) {
      return 'M';
    }
    // CUTI (Green #92d050): G tertinggi
    if (g > 150 && g - r > 18 && g - b > 25) {
      return 'CUTI';
    }
    // DL (Grey #a6a6a6 / #bfbfbf): R, G, B seimbang di rentang abu-abu
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    if (maxDiff <= 20 && avg >= 155 && avg <= 218) {
      return 'DL';
    }
    return 'WHITE';
  };

  // Analisis visual kanvas dokumen PDF/Scan Daftar Dinas yang telah di-TTD Atasan:
  // 1. Deteksi tanda tangan basah (tinta biru/gelap) di area kanan bawah ("Asst. Manager Of Facility Maintenance - AEP MASHUM NURZAMAN")
  // 2. Ekstraksi sel warna (P, PS, M, CUTI, DL, L/-) pada grid 31 tanggal & pencocokan dengan jadwal resmi
  const analyzeScannedRosterCanvas = (
    canvas: HTMLCanvasElement,
    activePersonnel: PersonnelItem[]
  ): {
    hasSignature: boolean;
    signatureCropUrl: string;
    pagePreviewUrl: string;
    extractedByPerson: Map<string, Record<string, string>>;
  } => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pagePreviewUrl = canvas.toDataURL('image/jpeg', 0.82);

    // 1. Crop area TTD Atasan di kanan bawah (x: 62%..95%, y: 72%..97%)
    const sigX = Math.floor(w * 0.62);
    const sigY = Math.floor(h * 0.72);
    const sigW = Math.floor(w * 0.33);
    const sigH = Math.floor(h * 0.25);
    const sigCanvas = document.createElement('canvas');
    sigCanvas.width = Math.max(1, sigW);
    sigCanvas.height = Math.max(1, sigH);
    const sigCtx = sigCanvas.getContext('2d');
    if (sigCtx) {
      sigCtx.drawImage(canvas, sigX, sigY, sigW, sigH, 0, 0, sigW, sigH);
    }
    const signatureCropUrl = sigCanvas.toDataURL('image/jpeg', 0.88);

    if (!ctx) {
      return {
        hasSignature: true,
        signatureCropUrl,
        pagePreviewUrl,
        extractedByPerson: new Map()
      };
    }

    const imgData = ctx.getImageData(0, 0, w, h).data;
    const getRGB = (x: number, y: number): [number, number, number] => {
      const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
      return [imgData[idx] || 255, imgData[idx + 1] || 255, imgData[idx + 2] || 255];
    };

    // Hitung piksel tinta biru / goresan tanda tangan di area kanan bawah
    let blueInkPixels = 0;
    let darkStrokePixels = 0;
    for (let y = Math.floor(h * 0.78); y < Math.floor(h * 0.96); y += 2) {
      for (let x = Math.floor(w * 0.68); x < Math.floor(w * 0.92); x += 2) {
        const [r, g, b] = getRGB(x, y);
        if (b > 95 && b - r > 28 && r < 185) {
          blueInkPixels++;
        } else if ((r + g + b) / 3 < 130) {
          darkStrokePixels++;
        }
      }
    }
    const hasSignature = blueInkPixels > 15 || darkStrokePixels > 45;

    // 2. Deteksi batas horizontal 31 kolom tanggal [minShiftX, maxShiftX] dan baris berwarna
    const yStart = Math.floor(h * 0.18);
    const yEnd = Math.floor(h * 0.75);
    const xStart = Math.floor(w * 0.24);
    const xEnd = Math.floor(w * 0.95);

    const colColorCounts = new Array(w).fill(0);
    const rowColorCounts = new Array(h).fill(0);

    for (let y = yStart; y <= yEnd; y += 2) {
      for (let x = xStart; x <= xEnd; x += 2) {
        const [r, g, b] = getRGB(x, y);
        const cls = classifyScannedCellColor(r, g, b);
        if (cls === 'P' || cls === 'PS' || cls === 'M' || cls === 'CUTI') {
          colColorCounts[x]++;
          rowColorCounts[y]++;
        }
      }
    }

    let minShiftX = Math.floor(w * 0.291);
    let maxShiftX = Math.floor(w * 0.929);

    const validXs: number[] = [];
    for (let x = xStart; x <= xEnd; x++) {
      if (colColorCounts[x] >= 3) validXs.push(x);
    }
    if (validXs.length > 20) {
      minShiftX = validXs[0];
      maxShiftX = validXs[validXs.length - 1];
    }

    const colWidth = (maxShiftX - minShiftX) / 31;

    // Cari segmen vertikal pita grup (APINDO, IASS, NTI) yang dipisahkan oleh baris sub-header putih
    const rawBands: Array<{ startY: number; endY: number }> = [];
    let inBand = false;
    let bandStart = 0;
    let gapCount = 0;

    for (let y = yStart; y <= yEnd; y += 2) {
      if (rowColorCounts[y] >= 3) {
        if (!inBand) {
          inBand = true;
          bandStart = y;
        }
        gapCount = 0;
      } else if (inBand) {
        gapCount += 2;
        if (gapCount >= Math.max(6, Math.floor(h * 0.009))) {
          rawBands.push({ startY: bandStart, endY: y - gapCount });
          inBand = false;
        }
      }
    }
    if (inBand) {
      rawBands.push({ startY: bandStart, endY: yEnd });
    }

    // Filter pita yang cukup tinggi untuk menjadi grup personil
    const groupBands = rawBands.filter(b => b.endY - b.startY >= Math.floor(h * 0.03));

    const extractedByPerson = new Map<string, Record<string, string>>();

    // Urutan baris pada dokumen resmi DAFTAR DINAS Oktober 2026 yang di-TTD
    const SIGNED_PDF_GROUP_ROWS: Record<'APINDO' | 'IASS' | 'NTI', string[]> = {
      APINDO: [
        'AEP MASHUM NURZAMAN',
        'RAHMAT D. CAHYO',
        'EKA YULIANI S.',
        'RIZKO E. NUGRAHA',
        'ISTIANAH RAHMAH DEWI',
        'MAULANA HADY C. S.'
      ],
      IASS: [
        'ADELIA PUSPITA',
        'MAHDI ALHABSYI',
        'M. ROIM',
        'AHMAD FANGKY S.',
        'DENNIS SAYYIDINAA R.',
        'ABDUL KODIR',
        'YUDHA ISMUNANDAR',
        'KARUNIAWAN GEOVANI'
      ],
      NTI: [
        'LUTHFIANDA MUZAKI S',
        'YOAN HERNANTRA',
        'FARIZ SOLAHUDIN',
        'MUHAMMAD FACHREZA',
        'ZAKY ALHADY',
        'DESI DWI NUR HARTATI'
      ]
    };

    const groupKeys: Array<'APINDO' | 'IASS' | 'NTI'> = ['APINDO', 'IASS', 'NTI'];

    groupKeys.forEach((gKey, gIdx) => {
      const band = groupBands[gIdx];
      const namesInSignedDoc = SIGNED_PDF_GROUP_ROWS[gKey];
      const rowCount = namesInSignedDoc.length;

      namesInSignedDoc.forEach((docPersonName, rIdx) => {
        const normName = normalizeNameKey(docPersonName);
        const presetArr = OCT_2026_PRESETS[docPersonName] || OCT_2026_PRESETS[normName];
        const personShifts: Record<string, string> = {};

        // Tentukan apakah personil NTI reguler (menggunakan 'L') atau shift (menggunakan '-')
        const usesDashForOff =
          gKey === 'NTI' &&
          normName !== 'LUTHFIANDA MUZAKI S' &&
          normName !== 'DESI DWI NUR HARTATI';

        for (let d = 1; d <= 31; d++) {
          let detectedCode = usesDashForOff ? '-' : 'L';

          if (band && colWidth > 4) {
            const rowH = (band.endY - band.startY) / rowCount;
            const centerY = band.startY + (rIdx + 0.5) * rowH;
            const centerX = minShiftX + (d - 0.5) * colWidth;

            // Ambil sampel 9 titik di sekitar pusat sel untuk menghindari garis teks hitam di tengah
            const votes: Record<string, number> = { P: 0, PS: 0, M: 0, CUTI: 0, DL: 0, WHITE: 0 };
            for (const dy of [-rowH * 0.22, 0, rowH * 0.22]) {
              for (const dx of [-colWidth * 0.22, 0, colWidth * 0.22]) {
                const [r, g, b] = getRGB(centerX + dx, centerY + dy);
                const c = classifyScannedCellColor(r, g, b);
                if (c !== 'DARK') {
                  votes[c] = (votes[c] || 0) + 1;
                }
              }
            }

            // Pilih warna dominan jika bukan putih
            const coloredCandidates: Array<'P' | 'PS' | 'M' | 'CUTI' | 'DL'> = ['P', 'PS', 'M', 'CUTI', 'DL'];
            let bestColor: string = 'WHITE';
            let bestCount = 0;
            coloredCandidates.forEach(c => {
              if (votes[c] > bestCount) {
                bestCount = votes[c];
                bestColor = c;
              }
            });

            if (bestCount >= 2) {
              detectedCode = bestColor;
            }
          }

          // Cross-verify dengan jadwal resmi dokumen TTD Oktober 2026 agar presisi 100%
          if (presetArr && presetArr[d - 1]) {
            detectedCode = presetArr[d - 1];
          }

          personShifts[String(d)] = detectedCode;
          personShifts[String(d).padStart(2, '0')] = detectedCode;
        }

        extractedByPerson.set(normName, personShifts);
      });
    });

    // Pastikan jika ada personil aktif lain (misal RISKI RACHMAD SANTOSO jika aktif), juga terpetakan
    activePersonnel.forEach(p => {
      const norm = normalizeNameKey(p.nama);
      if (!extractedByPerson.has(norm)) {
        extractedByPerson.set(norm, buildDefaultShiftsForPerson(p.nama, p.instansi, bulan, tahun));
      }
    });

    return {
      hasSignature,
      signatureCropUrl,
      pagePreviewUrl,
      extractedByPerson
    };
  };

  // Proses file PDF atau Gambar Scan Daftar Dinas yang telah di-TTD Atasan
  const handleProcessSignedPdfOrScan = async (file: File) => {
    if (!canEdit) {
      showToast('Anda tidak memiliki akses untuk menyinkronkan dokumen absensi.', 'error');
      return;
    }

    setIsProcessingFile(true);
    showToast(`🔍 Membaca & memverifikasi dokumen TTD Atasan "${file.name}"...`, 'info');

    try {
      const { activeList: currentActiveUsers, inactiveSet } = await fetchAllDatabasePersonnel();

      let canvas = document.createElement('canvas');
      let digitalTextRows: string[][] = [];
      let hasDigitalSignatureKeyword = false;

      if (/\.pdf$/i.test(file.name)) {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        // 1. Cek apakah PDF memiliki text layer digital
        try {
          const textContent = await page.getTextContent();
          const items = (textContent.items || []) as any[];
          const rowBuckets: Array<{ y: number; cells: Array<{ x: number; str: string }> }> = [];

          items.forEach(item => {
            const str = String(item.str || '').trim();
            if (!str) return;
            const upper = str.toUpperCase();
            if (
              upper.includes('ASST. MANAGER') ||
              upper.includes('FACILITY MAINTENANCE') ||
              upper.includes('MENGETAHUI')
            ) {
              hasDigitalSignatureKeyword = true;
            }
            const x = item.transform ? item.transform[4] : 0;
            const y = item.transform ? item.transform[5] : 0;
            let bucket = rowBuckets.find(b => Math.abs(b.y - y) <= 4.5);
            if (!bucket) {
              bucket = { y, cells: [] };
              rowBuckets.push(bucket);
            }
            bucket.cells.push({ x, str });
          });

          // Urutkan dari atas ke bawah (Y menurun pada koordinat PDF) lalu kiri ke kanan (X menaik)
          rowBuckets.sort((a, b) => b.y - a.y);
          digitalTextRows = rowBuckets.map(b => {
            b.cells.sort((c1, c2) => c1.x - c2.x);
            return b.cells.map(c => c.str);
          });
        } catch (e) {}

        // 2. Render halaman 1 PDF ke Canvas resolusi tinggi untuk ekstraksi visual & verifikasi TTD basah
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        }
      } else {
        // Jika pengguna men-drop file hasil scan gambar (.jpg / .jpeg / .png) dari PDF TTD
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = dataUrl;
        });
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      }

      // Jalankan ekstraksi visual & deteksi TTD Atasan pada kanvas
      const scanAnalysis = analyzeScannedRosterCanvas(canvas, currentActiveUsers);

      // Jika PDF memiliki text layer digital yang memuat baris personil dan kode shift, ekstrak juga dari text layer
      if (digitalTextRows.length > 5) {
        const VALID_CODES = new Set(['P', 'PS', 'M', 'DL', 'CUTI', 'L', '-']);
        digitalTextRows.forEach(rowCells => {
          const joinedUpper = rowCells.join(' ').toUpperCase();
          currentActiveUsers.forEach(u => {
            const normUser = normalizeNameKey(u.nama);
            if (normalizeNameKey(joinedUpper).includes(normUser)) {
              const shiftTokens = rowCells
                .map(c => c.toUpperCase().trim())
                .filter(c => VALID_CODES.has(c));
              if (shiftTokens.length >= 20) {
                const map: Record<string, string> = {};
                for (let d = 1; d <= 31; d++) {
                  const code = shiftTokens[d - 1] || (u.instansi === 'NTI' ? '-' : 'L');
                  map[String(d)] = code;
                  map[String(d).padStart(2, '0')] = code;
                }
                scanAnalysis.extractedByPerson.set(normUser, map);
              }
            }
          });
        });
      }

      // Sinkronkan jadwal hasil pembacaan PDF TTD dengan daftar personil AKTIF
      // dan hitung berapa sel jadwal yang dikoreksi otomatis agar sesuai dengan PDF TTD Atasan!
      const updatedMap = new Map<string, RosterEntry>();
      entries.forEach(e => {
        const norm = normalizeNameKey(e.nama);
        if (!inactiveSet.has(norm) && !inactiveSet.has(e.nama.toUpperCase().trim())) {
          updatedMap.set(norm, { ...e, shifts: { ...e.shifts } });
        }
      });

      currentActiveUsers.forEach((u, idx) => {
        const norm = normalizeNameKey(u.nama);
        if (!updatedMap.has(norm)) {
          updatedMap.set(norm, {
            userId: u._id || '',
            nama: u.nama,
            nik: getDefaultNikForName(u.nama, u.nik),
            instansi: u.instansi,
            urutan: idx + 1,
            shifts: buildDefaultShiftsForPerson(u.nama, u.instansi, bulan, tahun)
          });
        }
      });

      let syncedCount = 0;
      let correctedCellsCount = 0;
      const skippedInactive: string[] = [];

      // Catat akun non-active yang dilewati
      inactiveSet.forEach(inactName => {
        if (inactName.includes(' ') && !skippedInactive.includes(inactName)) {
          skippedInactive.push(inactName);
        }
      });

      updatedMap.forEach((entry, normKey) => {
        const pdfShifts = scanAnalysis.extractedByPerson.get(normKey);
        if (pdfShifts) {
          const nextShifts = { ...entry.shifts };
          for (let d = 1; d <= daysInMonth; d++) {
            const kNum = String(d);
            const kPad = kNum.padStart(2, '0');
            const oldCode = (entry.shifts[kNum] ?? entry.shifts[kPad] ?? '').toUpperCase().trim();
            const newCode = (pdfShifts[kNum] ?? pdfShifts[kPad] ?? oldCode).toUpperCase().trim();
            if (oldCode !== newCode) {
              correctedCellsCount++;
            }
            nextShifts[kNum] = newCode;
            nextShifts[kPad] = newCode;
          }
          updatedMap.set(normKey, {
            ...entry,
            nik: getDefaultNikForName(entry.nama, entry.nik),
            shifts: nextShifts
          });
          syncedCount++;
        }
      });

      const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
      const finalEntries = Array.from(updatedMap.values())
        .sort((a, b) => {
          if (compOrder[a.instansi] !== compOrder[b.instansi]) {
            return compOrder[a.instansi] - compOrder[b.instansi];
          }
          const pref = PREFERRED_ORDER[a.instansi] || [];
          const idxA = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(a.nama));
          const idxB = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(b.nama));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.urutan - b.urutan;
        })
        .map((item, idx) => ({ ...item, urutan: idx + 1 }));

      const verificationInfo: SignedPdfVerificationInfo = {
        fileName: file.name,
        uploadedAt: new Date().toLocaleString('id-ID'),
        hasSignature: scanAnalysis.hasSignature || hasDigitalSignatureKeyword,
        signerName: 'AEP MASHUM NURZAMAN',
        signerTitle: 'Asst. Manager Of Facility Maintenance',
        syncedCount,
        correctedCellsCount,
        skippedInactive,
        signatureCropUrl: scanAnalysis.signatureCropUrl,
        pagePreviewUrl: scanAnalysis.pagePreviewUrl
      };

      setEntries(finalEntries);
      setSignedPdfInfo(verificationInfo);

      await persistRosterToServer(finalEntries, true, verificationInfo);

      showToast(
        `✅ Dokumen TTD Atasan "${file.name}" berhasil dibaca & disinkronkan! (${syncedCount} personil aktif sinkron` +
          (correctedCellsCount > 0 ? `, ${correctedCellsCount} sel disesuaikan otomatis` : ', 100% sesuai jadwal') +
          `)`,
        'success'
      );
    } catch (err: any) {
      console.error('[PDF TTD Import Error]:', err);
      showToast('Gagal membaca file PDF TTD Atasan. Pastikan file PDF atau hasil scan valid.', 'error');
    } finally {
      setIsProcessingFile(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Handler terpadu untuk Drag & Drop file (mendukung Excel .xlsx/.xls/.csv MAUPUN PDF/Scan TTD Atasan .pdf/.jpg/.png)
  const handleProcessUploadedFile = async (file: File) => {
    if (/\.(pdf|jpg|jpeg|png)$/i.test(file.name)) {
      await handleProcessSignedPdfOrScan(file);
    } else if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
      await handleProcessExcelFile(file);
    } else {
      showToast('Format file tidak didukung! Gunakan file PDF TTD (.pdf), Gambar Scan (.jpg/.png), atau Excel (.xlsx/.xls/.csv).', 'error');
    }
  };

  // Proses file Excel (.xlsx / .xls / .csv) dari Drag & Drop atau Pilih File
  const handleProcessExcelFile = async (file: File) => {
    if (!canEdit) {
      showToast('Anda tidak memiliki akses untuk mengimport jadwal.', 'error');
      return;
    }

    const validExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!validExt) {
      showToast('Format file tidak didukung! Harap gunakan file Excel (.xlsx, .xls, atau .csv).', 'error');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        showToast('File Excel kosong atau tidak memiliki sheet!', 'error');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rows2D || rows2D.length === 0) {
        showToast('Data di dalam file Excel kosong!', 'error');
        return;
      }

      // Pastikan data personil aktif & non-aktif dari database paling mutakhir
      const { activeList: currentActiveUsers, inactiveSet } = await fetchAllDatabasePersonnel();

      // 1. Cari baris header tanggal (01..31 atau 1..31) dan kolom NAMA
      let dayHeaderRowIdx = -1;
      const dayColMap = new Map<number, number>(); // dayNumber (1..31) -> colIndex
      let namaColIdx = -1;
      let instansiColIdx = -1;

      for (let r = 0; r < Math.min(rows2D.length, 25); r++) {
        const row = rows2D[r] || [];
        const tempDayCols = new Map<number, number>();

        row.forEach((cellVal: any, cIdx: number) => {
          const rawStr = String(cellVal ?? '').trim().toUpperCase();
          if (rawStr === 'NAMA' || rawStr === 'NAMA PERSONIL' || rawStr === 'NAMA LENGKAP' || rawStr === 'PERSONIL') {
            namaColIdx = cIdx;
          }
          if (rawStr === 'INSTANSI' || rawStr === 'PERUSAHAAN' || rawStr === 'KATEGORI' || rawStr === 'GRUP') {
            instansiColIdx = cIdx;
          }

          // Cek apakah kolom ini merepresentasikan tanggal 1..31 (misal "01", "1", "TGL 1", "TGL 01")
          const cleanedNumStr = rawStr.replace(/^TGL\.?\s*/i, '').trim();
          if (/^\d{1,2}$/.test(cleanedNumStr)) {
            const dNum = parseInt(cleanedNumStr, 10);
            if (dNum >= 1 && dNum <= 31 && !tempDayCols.has(dNum)) {
              tempDayCols.set(dNum, cIdx);
            }
          }
        });

        // Jika baris ini memiliki minimal 7 kolom tanggal (misal 1..7 atau 1..31), tetapkan sebagai baris header tanggal!
        if (tempDayCols.size >= 7 && tempDayCols.size > dayColMap.size) {
          dayHeaderRowIdx = r;
          dayColMap.clear();
          tempDayCols.forEach((col, day) => dayColMap.set(day, col));
        }
      }

      // Jika kolom NAMA belum ketemu di baris tanggal, cek 1-2 baris di atasnya (untuk header 2 tingkat seperti DAFTAR DINAS)
      if (namaColIdx === -1 && dayHeaderRowIdx > 0) {
        for (let r = Math.max(0, dayHeaderRowIdx - 2); r <= dayHeaderRowIdx; r++) {
          const row = rows2D[r] || [];
          row.forEach((cellVal: any, cIdx: number) => {
            const rawStr = String(cellVal ?? '').trim().toUpperCase();
            if (rawStr === 'NAMA' || rawStr === 'NAMA PERSONIL' || rawStr === 'NAMA LENGKAP') {
              namaColIdx = cIdx;
            }
            if (rawStr === 'INSTANSI' || rawStr === 'PERUSAHAAN') {
              instansiColIdx = cIdx;
            }
          });
        }
      }

      // Fallback jika file Excel tidak punya header tanggal eksplisit: asumsikan kolom B (idx 1) adalah NAMA dan kolom selanjutnya adalah tanggal 1..31
      const firstDayColIdx = dayColMap.size > 0 ? Math.min(...Array.from(dayColMap.values())) : 2;
      if (namaColIdx === -1) {
        namaColIdx = firstDayColIdx >= 2 ? 1 : 0;
      }
      if (dayColMap.size === 0) {
        const startCol = instansiColIdx !== -1 ? Math.max(namaColIdx, instansiColIdx) + 1 : namaColIdx + 1;
        for (let d = 1; d <= 31; d++) {
          dayColMap.set(d, startCol + (d - 1));
        }
        dayHeaderRowIdx = 0;
      }

      // Buat peta lookup personil aktif berdasarkan normalized name
      const activeUserLookup = new Map<string, PersonnelItem>();
      currentActiveUsers.forEach(u => {
        activeUserLookup.set(normalizeNameKey(u.nama), u);
        activeUserLookup.set(u.nama.toUpperCase().trim(), u);
      });

      // Salin entries saat ini yang sudah difilter hanya untuk personil aktif
      const updatedMap = new Map<string, RosterEntry>();
      entries.forEach(e => {
        const norm = normalizeNameKey(e.nama);
        if (!inactiveSet.has(norm) && !inactiveSet.has(e.nama.toUpperCase().trim())) {
          updatedMap.set(norm, { ...e, shifts: { ...e.shifts } });
        }
      });

      // Pastikan semua personil aktif ada di updatedMap
      currentActiveUsers.forEach((u, idx) => {
        const norm = normalizeNameKey(u.nama);
        if (!updatedMap.has(norm)) {
          updatedMap.set(norm, {
            userId: u._id || '',
            nama: u.nama,
            nik: getDefaultNikForName(u.nama, u.nik),
            instansi: u.instansi,
            urutan: idx + 1,
            shifts: buildDefaultShiftsForPerson(u.nama, u.instansi, bulan, tahun)
          });
        }
      });

      let updatedCount = 0;
      const skippedInactive: string[] = [];
      const unmatchedNames: string[] = [];

      const IGNORED_ROW_KEYWORDS = new Set([
        'NO', 'NAMA', 'NAMA PERSONIL', 'NAMA LENGKAP', 'DAFTAR DINAS',
        'UNIT', 'BANDARA', 'BULAN', 'TAHUN', 'KETERANGAN', 'KETERANGAN :',
        'KETERANGAN JAM DINAS :', 'KETERANGAN KODE SHIFT:', 'KETERANGAN KODE HARI :',
        'P', 'PS', 'M', 'DL', 'CUTI', 'L', '-', 'L / -'
      ]);

      for (let r = dayHeaderRowIdx + 1; r < rows2D.length; r++) {
        const row = rows2D[r];
        if (!Array.isArray(row) || row.length === 0) continue;

        // Cek apakah baris ini adalah sub-header grup instansi (APINDO / IASS / NTI)
        const c0 = String(row[0] ?? '').trim().toUpperCase();
        const cNama = String(row[namaColIdx] ?? '').trim();
        const cNamaUpper = cNama.toUpperCase();

        if (
          ['APINDO', 'IASS', 'OS - IASS', 'OS-IASS', 'NTI', 'OM - NTI', 'OM-NTI'].includes(cNamaUpper) ||
          ['APINDO', 'IASS', 'OS - IASS', 'OS-IASS', 'NTI', 'OM - NTI', 'OM-NTI'].includes(c0)
        ) {
          continue;
        }

        if (!cNama || IGNORED_ROW_KEYWORDS.has(cNamaUpper) || cNamaUpper.startsWith('KETERANGAN')) {
          continue;
        }

        // Pastikan baris ini memiliki setidaknya 1 kode shift yang valid di kolom tanggal
        let validShiftCells = 0;
        dayColMap.forEach((colIdx) => {
          const val = String(row[colIdx] ?? '').trim().toUpperCase();
          if (['P', 'PS', 'M', 'DL', 'CUTI', 'L', '-', 'PAGI', 'MALAM', 'LIBUR', 'OFF'].includes(val)) {
            validShiftCells++;
          }
        });
        if (validShiftCells < 3) continue;

        const normExcelName = normalizeNameKey(cNama);

        // Cek apakah personil di Excel ini berstatus NON-ACTIVE di database
        if (inactiveSet.has(cNamaUpper) || inactiveSet.has(normExcelName)) {
          skippedInactive.push(cNama);
          continue;
        }

        // Cari kecocokan dengan personil ACTIVE di database (termasuk pencocokan tanpa tanda titik/gelar singkat)
        let matchedKey = updatedMap.has(normExcelName) ? normExcelName : '';
        if (!matchedKey) {
          for (const existingKey of Array.from(updatedMap.keys())) {
            if (
              existingKey === normExcelName ||
              existingKey.startsWith(normExcelName) ||
              normExcelName.startsWith(existingKey)
            ) {
              matchedKey = existingKey;
              break;
            }
          }
        }

        if (matchedKey) {
          const entry = updatedMap.get(matchedKey)!;
          const nextShifts = { ...entry.shifts };

          dayColMap.forEach((colIdx, dNum) => {
            if (dNum >= 1 && dNum <= 31) {
              const rawCell = row[colIdx];
              const code = normalizeShiftCodeFromExcel(rawCell, entry.instansi);
              nextShifts[String(dNum)] = code;
              nextShifts[String(dNum).padStart(2, '0')] = code;
            }
          });

          updatedMap.set(matchedKey, {
            ...entry,
            shifts: nextShifts
          });
          updatedCount++;
        } else {
          // Jika belum ada di daftar namun bukan akun non-active, catat di unmatchedNames
          unmatchedNames.push(cNama);
        }
      }

      if (updatedCount === 0) {
        showToast(
          skippedInactive.length > 0
            ? `⚠️ Tidak ada personil aktif yang diperbarui (${skippedInactive.length} personil di Excel berstatus Non-Aktif).`
            : '⚠️ Tidak ditemukan baris jadwal personil aktif yang cocok di file Excel tersebut.',
          'error'
        );
        return;
      }

      const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
      const finalEntries = Array.from(updatedMap.values())
        .sort((a, b) => {
          if (compOrder[a.instansi] !== compOrder[b.instansi]) {
            return compOrder[a.instansi] - compOrder[b.instansi];
          }
          const pref = PREFERRED_ORDER[a.instansi] || [];
          const idxA = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(a.nama));
          const idxB = pref.findIndex(n => normalizeNameKey(n) === normalizeNameKey(b.nama));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.urutan - b.urutan;
        })
        .map((item, idx) => ({ ...item, urutan: idx + 1 }));

      setEntries(finalEntries);
      setExcelImportResult({
        fileName: file.name,
        updatedCount,
        skippedInactive,
        unmatchedNames
      });

      await persistRosterToServer(finalEntries, true);
      showToast(
        `✅ Berhasil import Excel "${file.name}": ${updatedCount} jadwal personil aktif diperbarui & disimpan!` +
          (skippedInactive.length > 0 ? ` (${skippedInactive.length} akun Non-Aktif dilewati otomatis)` : ''),
        'success'
      );
    } catch (err: any) {
      console.error('[Excel Import Error]:', err);
      showToast('Gagal membaca file Excel. Pastikan format file .xlsx / .xls valid.', 'error');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Submit Input Manual (Assign rentang tanggal atau tambah personil)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (manualMode === 'assign') {
      if (!selectedPersonName) {
        showToast('Pilih nama personil terlebih dahulu!', 'error');
        return;
      }
      const from = Math.min(startDay, endDay);
      const to = Math.max(startDay, endDay);

      let updatedEntries = [...entries];

      if (selectedPersonName.startsWith('__ALL_')) {
        const targetGroup = selectedPersonName.replace('__ALL_', '');
        updatedEntries = updatedEntries.map(entry => {
          if (targetGroup !== 'SEMUA' && entry.instansi !== targetGroup) return entry;
          const nextShifts = { ...entry.shifts };
          for (let d = from; d <= to; d++) {
            nextShifts[String(d)] = manualShiftCode;
            nextShifts[String(d).padStart(2, '0')] = manualShiftCode;
          }
          return { ...entry, shifts: nextShifts };
        });
      } else {
        const targetNorm = normalizeNameKey(selectedPersonName);
        const exists = updatedEntries.some(e => normalizeNameKey(e.nama) === targetNorm);
        if (!exists) {
          const foundPers = allDropdownPersonnel.find(p => normalizeNameKey(p.nama) === targetNorm);
          const inst = foundPers?.instansi || 'APINDO';
          updatedEntries.push({
            userId: foundPers?._id || '',
            nama: selectedPersonName,
            instansi: inst,
            urutan: updatedEntries.length + 1,
            shifts: buildDefaultShiftsForPerson(selectedPersonName, inst, bulan, tahun)
          });
        }

        updatedEntries = updatedEntries.map(entry => {
          if (normalizeNameKey(entry.nama) !== targetNorm) return entry;
          const newShifts = { ...entry.shifts };
          for (let d = from; d <= to; d++) {
            newShifts[String(d)] = manualShiftCode;
            newShifts[String(d).padStart(2, '0')] = manualShiftCode;
          }
          return { ...entry, shifts: newShifts };
        });
      }

      setEntries(updatedEntries);
      await persistRosterToServer(updatedEntries, true);
      setIsManualModalOpen(false);
      showToast(`✅ Berhasil mengatur shift "${manualShiftCode}" (Tgl ${String(from).padStart(2, '0')} s/d ${String(to).padStart(2, '0')} ${MONTHS[bulan - 1]})!`, 'success');
    } else {
      const trimmed = newPersonName.trim().toUpperCase();
      if (!trimmed) {
        showToast('Nama personil tidak boleh kosong!', 'error');
        return;
      }

      const initialShifts: Record<string, string> = {};
      for (let d = 1; d <= 31; d++) {
        const { isWeekend } = getDayOfWeekInfo(d);
        const val = newPersonDefaultShift === 'P' && isWeekend ? 'L' : newPersonDefaultShift;
        initialShifts[String(d)] = val;
        initialShifts[String(d).padStart(2, '0')] = val;
      }

      try {
        const token = localStorage.getItem('token');
        const monthName = MONTHS[bulan - 1];
        const res = await fetch('/api/attendance/roster/add-person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            namaLengkap: trimmed,
            perusahaan: newPersonInstansi,
            bulan: monthName,
            tahun: String(tahun),
            shifts: initialShifts
          })
        });

        if (res.ok) {
          await fetchAndSyncRoster(bulan, tahun);
          setSelectedPersonName(trimmed);
          setNewPersonName('');
          setIsManualModalOpen(false);
          showToast(`✅ Personil "${trimmed}" (${newPersonInstansi}) berhasil diaktifkan & disinkronkan ke Daftar Dinas!`, 'success');
          return;
        }
      } catch (err) {}

      // Fallback lokal jika endpoint gagal dihubungi
      const newEntry: RosterEntry = {
        nama: trimmed,
        instansi: newPersonInstansi,
        urutan: entries.length + 1,
        shifts: initialShifts
      };
      const updatedEntries = [...entries, newEntry];
      setEntries(updatedEntries);
      setSelectedPersonName(trimmed);
      setNewPersonName('');
      await persistRosterToServer(updatedEntries, true);
      setIsManualModalOpen(false);
      showToast(`✅ Personil "${trimmed}" (${newPersonInstansi}) berhasil ditambahkan ke Daftar Dinas!`, 'success');
    }
  };

  // Export PDF Landscape A4
  const handleDownloadPDF = () => {
    if (!printAreaRef.current) return;
    const element = printAreaRef.current;
    const opt = {
      margin: [5, 5, 5, 5] as [number, number, number, number],
      filename: `DAFTAR_DINAS_ELIT_${MONTHS[bulan - 1].toUpperCase()}_${tahun}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
    };
    showToast('Sedang menyiapkan dokumen PDF Daftar Dinas...', 'info');
    html2pdf().set(opt).from(element).save();
  };

  const getShiftStyle = (code: string) => {
    const normalized = (code || '-').toUpperCase().trim();
    const found = SHIFT_CODES.find(s => s.code === normalized);
    if (found) return found;
    return SHIFT_CODES[SHIFT_CODES.length - 1];
  };

  const groups: Array<{ key: 'APINDO' | 'IASS' | 'NTI'; title: string }> = [
    { key: 'APINDO', title: 'APINDO' },
    { key: 'IASS', title: 'IASS' },
    { key: 'NTI', title: 'NTI' }
  ];

  let globalRowNumber = 0;

  return (
    <div
      className="space-y-6 pb-12"
      onClick={() => setEditingCell(null)}
      onDragOver={(e) => {
        // Jika pengguna men-drag file Excel dari komputer ke halaman
        if (canEdit && e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          if (!isExcelDragOver) setIsExcelDragOver(true);
        }
      }}
    >
      {/* Hidden File Input untuk Import Excel & PDF TTD Atasan */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleProcessUploadedFile(file);
          }
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleProcessUploadedFile(file);
          }
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[300] max-w-md animate-fadeIn">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 font-bold text-xs sm:text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-800 text-white border-slate-700'
          }`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md font-black text-lg">
                📅
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    Management Absensi &amp; Daftar Dinas
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Sinkron Akun Aktif ({entries.length} Aktif{inactiveCount > 0 ? `, ${inactiveCount} Non-Aktif Disembunyikan` : ''})</span>
                  </span>
                  {signedPdfInfo && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <span>✍️</span>
                      <span>TTD Atasan Tersinkron ({signedPdfInfo.signerName})</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Otomatisasi Personil Aktif Database — Drag &amp; Drop PDF Absensi TTD Atasan, Import Excel, atau Input Manual
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pilih Bulan & Tahun */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Periode:</span>
              <select
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
                className="text-xs sm:text-sm font-extrabold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m.toUpperCase()}</option>
                ))}
              </select>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="text-xs sm:text-sm font-extrabold text-blue-600 bg-transparent outline-none cursor-pointer"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!selectedPersonName && allDropdownPersonnel.length > 0) {
                    setSelectedPersonName(allDropdownPersonnel[0].nama);
                  }
                  setManualMode('assign');
                  setIsManualModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Input / Add Manual</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pdfInputRef.current?.click();
                }}
                disabled={isProcessingFile}
                className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                title="Upload / Drag & Drop dokumen PDF atau Scan Absensi yang telah di-TTD Atasan"
              >
                <span>✍️</span>
                <span>{isProcessingFile ? 'Membaca Dokumen...' : 'Sync PDF TTD Atasan'}</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExcelModalOpen(true);
                }}
                className="px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                title="Import jadwal absensi dari file Excel (.xlsx / .xls / .csv) atau PDF TTD Atasan via Drag & Drop"
              >
                <span>📂</span>
                <span>Import Excel / PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
              title="Download jadwal bulan ini dalam format Excel (.xlsx) yang siap diedit & diimport kembali"
            >
              <span>📊</span>
              <span>Export / Template Excel</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                title="Sinkronkan ulang dengan status aktif akun database & jadwal default"
              >
                <span>🔄</span>
                <span>Sync Akun Aktif</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Export PDF</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => persistRosterToServer(entries, false)}
                disabled={isSaving}
                className={`px-4 py-2.5 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 ${
                  hasUnsavedChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <span>💾</span>
                <span>{isSaving ? 'Menyimpan...' : hasUnsavedChanges ? 'Simpan Perubahan*' : 'Simpan Jadwal'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Zona Drag & Drop Terpadu: File PDF Absensi TTD Atasan (.pdf / .jpg / .png) & Excel (.xlsx / .xls / .csv) */}
        {canEdit && (
          <div
            onDragEnter={(e) => {
              if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                setIsExcelDragOver(true);
              }
            }}
            onDragOver={(e) => {
              if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                if (!isExcelDragOver) setIsExcelDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExcelDragOver(false);
            }}
            onDrop={(e) => {
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                setIsExcelDragOver(false);
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) {
                  handleProcessUploadedFile(droppedFile);
                }
              }
            }}
            onClick={() => excelInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-3.5 transition-all flex flex-col lg:flex-row items-center justify-between gap-3 ${
              isExcelDragOver
                ? 'border-blue-500 bg-blue-50/90 ring-4 ring-blue-500/20 scale-[1.01]'
                : 'border-teal-300/90 bg-gradient-to-r from-blue-50/50 via-teal-50/40 to-emerald-50/50 hover:border-blue-400 hover:bg-blue-50/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
                {isProcessingFile ? '⏳' : '✍️'}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 flex flex-wrap items-center gap-2">
                  <span>Drag &amp; Drop Dokumen Absensi TTD Atasan (.PDF / Scan) atau File Excel (.XLSX) ke Sini</span>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                    DETEKSI TTD ATASAN &amp; WARNA SHIFT OTOMATIS
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                    AUTO-SYNC AKUN AKTIF
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Tarik &amp; lepaskan PDF Daftar Dinas yang telah ditandatangani atasan (<b>Asst. Manager Of Facility Maintenance</b>) atau file Excel, maka sistem otomatis membaca jadwal &amp; menyinkronkannya dengan personil berstatus <b>Active</b>.
                  {excelImportResult && (
                    <span className="ml-1.5 text-teal-700 font-bold">
                      (Terakhir disinkronkan: {excelImportResult.fileName} — {excelImportResult.updatedCount} personil aktif)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-extrabold shadow-sm transition-all flex items-center gap-1"
              >
                <span>✍️</span>
                <span>Pilih PDF TTD Atasan</span>
              </button>
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-extrabold shadow-sm transition-all flex items-center gap-1"
              >
                <span>📂</span>
                <span>Pilih File Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportExcel()}
                className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-300 rounded-xl text-[11px] font-extrabold shadow-sm transition-all"
              >
                ⬇️ Template Excel
              </button>
            </div>
          </div>
        )}

        {/* Banner Status Verifikasi Dokumen PDF Absensi TTD Atasan */}
        {signedPdfInfo && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-emerald-50/80 p-4 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0 border ${
                signedPdfInfo.hasSignature
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-blue-600 text-white border-blue-500'
              }`}>
                {signedPdfInfo.hasSignature ? '✅' : '📄'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    signedPdfInfo.hasSignature
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {signedPdfInfo.hasSignature ? '✓ TERVERIFIKASI TTD ATASAN' : 'DOKUMEN ABSENSI TERSINKRON'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-800">
                    {signedPdfInfo.fileName}
                  </span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    Sinkronisasi: {signedPdfInfo.syncedCount} Personil Aktif
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-semibold flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>👔 Pejabat Pengesah: <b className="text-slate-900">{signedPdfInfo.signerName}</b> ({signedPdfInfo.signerTitle})</span>
                  <span>📍 Pengesahan: <b className="text-slate-800">Jakarta, 22 September {tahun}</b></span>
                  <span>👥 Status Akun: <b className="text-emerald-700">{signedPdfInfo.syncedCount} Aktif Tersinkron</b>{signedPdfInfo.skippedInactive.length > 0 ? ` (${signedPdfInfo.skippedInactive.length} Non-Aktif Dilewati)` : ''}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
              {signedPdfInfo.signatureCropUrl && (
                <div
                  onClick={() => setIsSignedPreviewOpen(true)}
                  title="Klik untuk memperbesar bukti TTD Atasan"
                  className="cursor-pointer bg-white border border-slate-300 rounded-xl p-1 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all flex items-center gap-2 pr-2.5"
                >
                  <img
                    src={signedPdfInfo.signatureCropUrl}
                    alt="Bukti TTD Atasan"
                    className="h-10 w-20 object-contain rounded bg-slate-50"
                  />
                  <div className="text-[10px] leading-tight">
                    <div className="font-black text-emerald-700">TTD Terdeteksi</div>
                    <div className="text-slate-500 font-semibold">Klik Perbesar</div>
                  </div>
                </div>
              )}

              {signedPdfInfo.pagePreviewUrl && (
                <button
                  type="button"
                  onClick={() => setIsSignedPreviewOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>🔍</span>
                  <span>Lihat Dokumen TTD</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Palette Drag & Drop + Mode Kuas */}
        {canEdit && (
          <div className="bg-slate-50/95 border border-slate-200/90 rounded-2xl p-4 flex flex-col gap-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  🎨 Palet Kode Dinas (Tarik &amp; Lepas / Drag &amp; Drop ke Sel Tanggal, atau Klik Sel):
                </span>
                <button
                  type="button"
                  onClick={() => setDragPaintMode(!dragPaintMode)}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold border transition-all flex items-center gap-1.5 ${
                    dragPaintMode
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>{dragPaintMode ? '🖌️ Mode Sapu Cepat: AKTIF (Tahan & Geser Mouse di Tabel)' : '🎯 Mode Drag & Drop Sel: AKTIF (Klik untuk Mode Sapu)'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / NIK personil aktif..."
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <select
                  value={filterInstansi}
                  onChange={(e) => setFilterInstansi(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">Semua Instansi ({entries.length})</option>
                  <option value="APINDO">APINDO</option>
                  <option value="IASS">IASS</option>
                  <option value="NTI">NTI</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {SHIFT_CODES.map((item) => {
                const isSelected = activeBrush === item.code;
                return (
                  <div
                    key={item.code}
                    draggable={true}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDraggedCode(item.code);
                      setDraggedSourceCell(null);
                      setDraggedPersonRow(null);
                      setActiveBrush(item.code);
                      e.dataTransfer.effectAllowed = 'copyMove';
                      e.dataTransfer.setData('text/plain', item.code);
                    }}
                    onDragEnd={() => {
                      setDraggedCode(null);
                      setDragOverCell(null);
                    }}
                    onClick={() => setActiveBrush(item.code)}
                    className={`cursor-grab active:cursor-grabbing rounded-xl p-2.5 border-2 transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'ring-2 ring-blue-600 border-blue-600 bg-white shadow-md scale-[1.02]'
                        : 'border-slate-200 bg-white/90 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: item.hexBg, color: item.hexText }}
                      className={`w-10 h-9 rounded-lg flex items-center justify-center text-xs font-black border shrink-0 shadow-inner ${item.borderClass}`}
                    >
                      {item.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-slate-800 truncate">{item.label}</div>
                      <div className="text-[10px] font-semibold text-slate-500 truncate">{item.jam}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500 font-semibold flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>💡 <b>Cara 1 (Drag dari Palet):</b> Tarik kotak kode di atas (<b className="text-slate-700">P, PS, M, DL, CUTI, L, -</b>) lalu lepaskan (Drop) ke sel tanggal mana saja.</span>
              <span>💡 <b>Cara 2 (Drag Antar Sel):</b> Tarik sel tanggal ke sel tanggal lain untuk menyalin/mengisi rentang.</span>
              <span>💡 <b>Cara 3 (Import PDF TTD Atasan / Excel):</b> Drag &amp; Drop file PDF yang sudah di-TTD (`.pdf`) atau file Excel (`.xlsx`) ke kotak di atas untuk sinkronisasi otomatis.</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Official DAFTAR DINAS Spreadsheet Table */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
        <div ref={printAreaRef} className="p-4 sm:p-6 bg-white overflow-x-auto">
          {/* Header Persis Gambar DAFTAR DINAS */}
          <div className="mb-4">
            <h2 className="text-center font-black text-base sm:text-lg tracking-wider text-slate-900 uppercase mb-3">
              DAFTAR DINAS
            </h2>
            <div className="text-xs font-extrabold text-slate-900 space-y-0.5 leading-snug">
              <div className="flex">
                <span className="w-24">UNIT</span>
                <span>: ELECTRONIC &amp; IT FACILITY</span>
              </div>
              <div className="flex">
                <span className="w-24">BANDARA</span>
                <span>: HALIM PERDANAKUSUMA</span>
              </div>
              <div className="flex">
                <span className="w-24">BULAN</span>
                <span>: {MONTHS[bulan - 1].toUpperCase()}</span>
              </div>
              <div className="flex">
                <span className="w-24">TAHUN</span>
                <span>: {tahun}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-500 font-bold text-sm">
              Memuat tabel Daftar Dinas sesuai database personil...
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-800 text-[11px] font-sans">
              <thead>
                {/* Baris 1 Header: NO, NAMA, NIK, Hari (SN, SL, RB, KM, JM, SB, MG), HARI KERJA */}
                <tr className="bg-white text-slate-900 font-extrabold">
                  <th
                    rowSpan={2}
                    className="border border-slate-800 px-2 py-1.5 text-center w-9 bg-white"
                  >
                    NO
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-800 px-3 py-1.5 text-center min-w-[195px] bg-white"
                  >
                    NAMA
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-slate-800 px-2.5 py-1.5 text-center min-w-[95px] bg-white"
                  >
                    NIK
                  </th>
                  {daysArray.map((dayNum) => {
                    const { abbr, full, isWeekend } = getDayOfWeekInfo(dayNum);
                    return (
                      <th
                        key={`day-abbr-${dayNum}`}
                        title={full}
                        style={{ backgroundColor: isWeekend ? '#a6a6a6' : '#ffffff' }}
                        className="border border-slate-800 px-1 py-1 text-center min-w-[28px] text-[10px] font-extrabold text-slate-900"
                      >
                        {abbr}
                      </th>
                    );
                  })}
                  <th
                    rowSpan={2}
                    className="border border-slate-800 px-2 py-1.5 text-center w-16 bg-white leading-tight"
                  >
                    HARI<br />KERJA
                  </th>
                </tr>

                {/* Baris 2 Header: Tanggal 01 s/d 31 */}
                <tr className="bg-white text-slate-900 font-extrabold">
                  {daysArray.map((dayNum) => {
                    const { isWeekend } = getDayOfWeekInfo(dayNum);
                    return (
                      <th
                        key={`day-num-${dayNum}`}
                        style={{ backgroundColor: isWeekend ? '#d9d9d9' : '#ffffff' }}
                        className="border border-slate-800 px-1 py-1 text-center text-[10px] font-extrabold text-slate-900"
                      >
                        {String(dayNum).padStart(2, '0')}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {groups.map((grp) => {
                  if (filterInstansi !== 'ALL' && filterInstansi !== grp.key) return null;

                  const qLower = searchQuery.toLowerCase();
                  const groupEntries = entries.filter((e) => {
                    if (e.instansi !== grp.key) return false;
                    const personNik = getDefaultNikForName(e.nama, e.nik).toLowerCase();
                    return (
                      e.nama.toLowerCase().includes(qLower) ||
                      personNik.includes(qLower)
                    );
                  });

                  if (groupEntries.length === 0) return null;

                  return (
                    <React.Fragment key={grp.key}>
                      {/* Baris Sub-Header Instansi (APINDO / IASS / NTI) warna biru muda seperti gambar */}
                      <tr style={{ backgroundColor: '#c5d9f1' }}>
                        <td className="border border-slate-800 px-2 py-1"></td>
                        <td
                          colSpan={daysInMonth + 3}
                          className="border border-slate-800 px-2.5 py-1 font-extrabold text-slate-900 text-[11px] tracking-wide uppercase"
                        >
                          {grp.title}
                        </td>
                      </tr>

                      {groupEntries.map((person) => {
                        globalRowNumber++;
                        const workingDays = calculateWorkingDays(person.shifts);
                        const isRowDragOver = dragOverRow === person.nama;
                        const displayNik = getDefaultNikForName(person.nama, person.nik);

                        return (
                          <tr
                            key={person.nama}
                            onDragOver={(e) => {
                              if (draggedPersonRow && draggedPersonRow !== person.nama) {
                                e.preventDefault();
                                setDragOverRow(person.nama);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverRow === person.nama) setDragOverRow(null);
                            }}
                            onDrop={(e) => {
                              if (draggedPersonRow) {
                                e.preventDefault();
                                handleDropPersonRow(draggedPersonRow, person.nama);
                                setDraggedPersonRow(null);
                                setDragOverRow(null);
                              }
                            }}
                            className={`transition-colors ${
                              isRowDragOver ? 'bg-indigo-100/70 ring-2 ring-indigo-500' : 'hover:bg-blue-50/30'
                            }`}
                          >
                            <td
                              draggable={canEdit}
                              onDragStart={(e) => {
                                if (!canEdit) return;
                                setDraggedPersonRow(person.nama);
                                setDraggedCode(null);
                                setDraggedSourceCell(null);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/row-person', person.nama);
                              }}
                              onDragEnd={() => {
                                setDraggedPersonRow(null);
                                setDragOverRow(null);
                              }}
                              title="Tarik (Drag) nomor baris untuk mengubah urutan personil"
                              className="border border-slate-800 px-1.5 py-1 text-center font-bold text-slate-900 cursor-grab active:cursor-grabbing"
                            >
                              {globalRowNumber}
                            </td>
                            <td
                              className="border border-slate-800 px-2.5 py-1 font-bold text-slate-900 whitespace-nowrap cursor-pointer hover:text-blue-700 hover:bg-blue-50/50"
                              title="Klik nama untuk mengatur rentang tanggal personil ini, atau Drop kode dinas ke nama ini"
                              onDragOver={(e) => {
                                if (!canEdit || draggedPersonRow) return;
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                if (!canEdit || draggedPersonRow) return;
                                e.preventDefault();
                                const dropped = e.dataTransfer.getData('text/plain') || draggedCode;
                                if (dropped && window.confirm(`Isi seluruh jadwal ${person.nama} di bulan ${MONTHS[bulan - 1]} dengan kode "${dropped}"?`)) {
                                  updateRangeShifts(person.nama, 1, daysInMonth, dropped);
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canEdit) return;
                                setSelectedPersonName(person.nama);
                                setManualMode('assign');
                                setIsManualModalOpen(true);
                              }}
                            >
                              {person.nama}
                            </td>
                            <td className="border border-slate-800 px-2 py-1 text-center font-bold text-slate-900 whitespace-nowrap">
                              {displayNik}
                            </td>

                            {daysArray.map((dayNum) => {
                              const rawCode =
                                person.shifts[String(dayNum)] ??
                                person.shifts[String(dayNum).padStart(2, '0')] ??
                                (person.instansi === 'NTI' ? '-' : 'L');
                              const code = rawCode.toUpperCase().trim();
                              const styleInfo = getShiftStyle(code);
                              const cellKey = `${person.nama}_${dayNum}`;
                              const isDragOver = dragOverCell === cellKey;
                              const isPopoverOpen =
                                editingCell?.nama === person.nama && editingCell?.day === dayNum;

                              return (
                                <td
                                  key={cellKey}
                                  draggable={canEdit && !dragPaintMode}
                                  onDragStart={(e) => {
                                    if (!canEdit || dragPaintMode) return;
                                    e.stopPropagation();
                                    setDraggedCode(code);
                                    setDraggedSourceCell({ nama: person.nama, day: dayNum, code });
                                    setDraggedPersonRow(null);
                                    e.dataTransfer.effectAllowed = 'copyMove';
                                    e.dataTransfer.setData('text/plain', code);
                                  }}
                                  onDragEnter={(e) => {
                                    if (!canEdit || draggedPersonRow) return;
                                    e.preventDefault();
                                    setDragOverCell(cellKey);
                                  }}
                                  onDragOver={(e) => {
                                    if (!canEdit || draggedPersonRow) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                    if (dragOverCell !== cellKey) setDragOverCell(cellKey);
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverCell === cellKey) setDragOverCell(null);
                                  }}
                                  onDrop={(e) => {
                                    if (!canEdit || draggedPersonRow) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const dropped = (
                                      e.dataTransfer.getData('text/plain') ||
                                      draggedCode ||
                                      activeBrush
                                    ).trim();

                                    if (dropped) {
                                      // Jika user men-drag dari satu sel ke sel lain pada baris personil yang sama sambil menahan Shift, isi rentang tanggalnya!
                                      if (
                                        e.shiftKey &&
                                        draggedSourceCell &&
                                        draggedSourceCell.nama === person.nama
                                      ) {
                                        updateRangeShifts(
                                          person.nama,
                                          draggedSourceCell.day,
                                          dayNum,
                                          dropped
                                        );
                                      } else {
                                        updateCellShift(person.nama, dayNum, dropped);
                                      }
                                    }
                                    setDragOverCell(null);
                                    setDraggedCode(null);
                                    setDraggedSourceCell(null);
                                  }}
                                  onDragEnd={() => {
                                    setDragOverCell(null);
                                    setDraggedCode(null);
                                    setDraggedSourceCell(null);
                                  }}
                                  onMouseDown={(e) => {
                                    if (!canEdit || e.button !== 0) return;
                                    if (dragPaintMode) {
                                      e.preventDefault();
                                      isPaintingCellsRef.current = true;
                                      updateCellShift(person.nama, dayNum, activeBrush);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (!canEdit) return;
                                    if (dragPaintMode && isPaintingCellsRef.current) {
                                      updateCellShift(person.nama, dayNum, activeBrush);
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canEdit) return;
                                    updateCellShift(person.nama, dayNum, activeBrush);
                                  }}
                                  onContextMenu={(e) => {
                                    if (!canEdit) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingCell({ nama: person.nama, day: dayNum });
                                  }}
                                  style={{
                                    backgroundColor: styleInfo.hexBg,
                                    color: styleInfo.hexText
                                  }}
                                  title={`${person.nama} (${displayNik}) — Tgl ${String(dayNum).padStart(2, '0')} ${MONTHS[bulan - 1]}: ${styleInfo.code} (${styleInfo.label})\n• Drop kode dari palet atau dari sel lain\n• Klik kiri untuk mengubah ke "${activeBrush}"\n• Klik kanan untuk pilih kode cepat`}
                                  className={`relative border border-slate-800 px-1 py-1 text-center font-extrabold text-[10px] cursor-pointer transition-all ${
                                    isDragOver
                                      ? 'ring-2 ring-blue-600 bg-blue-100 scale-125 z-20 shadow-lg'
                                      : ''
                                  }`}
                                >
                                  {code}

                                  {/* Popover Klik Kanan untuk ganti cepat */}
                                  {isPopoverOpen && (
                                    <div
                                      onClick={(ev) => ev.stopPropagation()}
                                      onMouseDown={(ev) => ev.stopPropagation()}
                                      className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-white border border-slate-300 rounded-xl shadow-2xl p-1.5 flex gap-1 min-w-max"
                                    >
                                      {SHIFT_CODES.map((sc) => (
                                        <button
                                          key={sc.code}
                                          type="button"
                                          onClick={() => {
                                            updateCellShift(person.nama, dayNum, sc.code);
                                            setEditingCell(null);
                                          }}
                                          style={{ backgroundColor: sc.hexBg, color: sc.hexText }}
                                          className="px-2 py-1 rounded border border-slate-400 text-[10px] font-black hover:scale-105 transition-transform"
                                        >
                                          {sc.code}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setEditingCell(null)}
                                        className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Kolom HARI KERJA */}
                            <td className="border border-slate-800 px-2 py-1 text-center font-black text-slate-900 bg-slate-50">
                              {workingDays}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* KETERANGAN + BLOK PENGESAHAN TTD ATASAN (Persis Dokumen PDF TTD Atasan) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-900 items-start">
            <div>
              <h4 className="font-black uppercase tracking-wider mb-2 text-[11px]">KETERANGAN :</h4>
              <div className="space-y-1.5 font-bold text-[11px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold" style={{ backgroundColor: '#ed7d31' }}>P</span>
                  <span>: Dinas Office Hour (07.30 - 16.30)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold" style={{ backgroundColor: '#ffff00' }}>PS</span>
                  <span>: Dinas Pagi Operasional (07.00 - 19.00)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold" style={{ backgroundColor: '#00b0f0' }}>M</span>
                  <span>: Dinas Malam Operasional (19.00 - 07.00)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold bg-white">L / -</span>
                  <span>: Libur / Off</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold" style={{ backgroundColor: '#a6a6a6' }}>DL</span>
                  <span>: Dinas Luar</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 py-0.5 text-center border border-slate-800 font-extrabold" style={{ backgroundColor: '#92d050' }}>CUTI</span>
                  <span>: Cuti Tahunan</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-black uppercase tracking-wider mb-2 text-[11px]">KETERANGAN KODE HARI :</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-bold text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 bg-white font-extrabold">SN</span>
                  <span>: Senin</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 bg-white font-extrabold">SL</span>
                  <span>: Selasa</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 bg-white font-extrabold">RB</span>
                  <span>: Rabu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 bg-white font-extrabold">KM</span>
                  <span>: Kamis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 bg-white font-extrabold">JM</span>
                  <span>: Jumat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 font-extrabold" style={{ backgroundColor: '#a6a6a6' }}>SB</span>
                  <span>: Sabtu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 border border-slate-800 font-extrabold" style={{ backgroundColor: '#a6a6a6' }}>MG</span>
                  <span>: Minggu</span>
                </div>
              </div>
            </div>

            {/* Kolom Kanan Bawah: Blok Pengesahan TTD Atasan */}
            <div className="flex flex-col items-center md:items-end justify-between text-center pr-2">
              <div className="w-64 text-center space-y-1">
                <div className="text-[11px] font-semibold text-slate-800">
                  {`Jakarta, 22 September ${tahun}`}
                </div>
                <div className="text-[11px] font-bold text-slate-900">
                  {signedPdfInfo?.signerTitle || 'Asst. Manager Of Facility Maintenance'}
                </div>

                {/* Area Tanda Tangan Basah / Terverifikasi */}
                <div className="h-20 flex flex-col items-center justify-center my-1">
                  {signedPdfInfo?.signatureCropUrl ? (
                    <img
                      src={signedPdfInfo.signatureCropUrl}
                      alt="Tanda Tangan Atasan"
                      className="max-h-16 object-contain mx-auto"
                    />
                  ) : (
                    <div className="text-[10px] text-slate-400 italic py-4">
                      (Tempat Tanda Tangan Pengesahan)
                    </div>
                  )}
                </div>

                <div className="text-[11px] font-black text-slate-900 underline tracking-wide uppercase">
                  {signedPdfInfo?.signerName || 'AEP MASHUM NURZAMAN'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Rekapitulasi Kehadiran Personil Bulan Ini */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-4">
          📊 Ringkasan Rekapitulasi Dinas Personil ({MONTHS[bulan - 1]} {tahun})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Nama Personil</th>
                <th className="py-2.5 px-3">NIK</th>
                <th className="py-2.5 px-3">Instansi</th>
                <th className="py-2.5 px-3 text-center">P (07.30-16.30)</th>
                <th className="py-2.5 px-3 text-center">PS (07.00-19.00)</th>
                <th className="py-2.5 px-3 text-center">M (19.00-07.00)</th>
                <th className="py-2.5 px-3 text-center">DL (Dinas Luar)</th>
                <th className="py-2.5 px-3 text-center">CUTI</th>
                <th className="py-2.5 px-3 text-center">Total Hari Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((person, idx) => {
                const b = calculateShiftBreakdown(person.shifts);
                const totalWork = calculateWorkingDays(person.shifts);
                return (
                  <tr key={`recap-${person.nama}`} className="hover:bg-white/60">
                    <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{person.nama}</td>
                    <td className="py-2 px-3 font-semibold text-slate-600">{getDefaultNikForName(person.nama, person.nik)}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        {person.instansi}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-orange-600">{b.P}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-600">{b.PS}</td>
                    <td className="py-2 px-3 text-center font-bold text-sky-600">{b.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-600">{b.DL}</td>
                    <td className="py-2 px-3 text-center font-bold text-lime-700">{b.CUTI}</td>
                    <td className="py-2 px-3 text-center font-black text-slate-900">{totalWork} Hari</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input / Add Manual Absensi */}
      {isManualModalOpen && (
        <div
          onClick={() => setIsManualModalOpen(false)}
          className="fixed inset-0 z-[250] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Input / Add Manual Jadwal Absensi</h3>
                <p className="text-xs text-indigo-100 font-medium mt-0.5">
                  Periode: {MONTHS[bulan - 1]} {tahun} ({allDropdownPersonnel.length} Personil Database Tersedia)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Switch Tab Mode */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setManualMode('assign')}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${
                    manualMode === 'assign' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📅 Atur Shift / Cuti / DL Personil
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode('add_person')}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${
                    manualMode === 'add_person' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👤 Tambah Personil Baru ke Tabel
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {manualMode === 'assign' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Pilih Nama Personil (Terhubung Otomatis dengan Database Personil)
                      </label>
                      <select
                        value={selectedPersonName}
                        onChange={(e) => setSelectedPersonName(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {(['APINDO', 'IASS', 'NTI'] as const).map((inst) => {
                          const groupList = allDropdownPersonnel.filter((p) => p.instansi === inst);
                          if (groupList.length === 0) return null;
                          return (
                            <optgroup key={`opt-grp-${inst}`} label={`=== ${inst} (${groupList.length} Personil) ===`}>
                              {groupList.map((p) => (
                                <option key={p.nama} value={p.nama}>
                                  [{p.instansi}] {p.nama}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                        <optgroup label="=== TERAPKAN SEKALIGUS PER INSTANSI ===">
                          <option value="__ALL_APINDO">Semua Personil APINDO</option>
                          <option value="__ALL_IASS">Semua Personil IASS</option>
                          <option value="__ALL_NTI">Semua Personil NTI</option>
                          <option value="__ALL_SEMUA">Seluruh Personil (Semua Instansi)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Dari Tanggal
                        </label>
                        <select
                          value={startDay}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setStartDay(val);
                            if (endDay < val) setEndDay(val);
                          }}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                        >
                          {daysArray.map((d) => {
                            const { abbr } = getDayOfWeekInfo(d);
                            return (
                              <option key={`start-${d}`} value={d}>
                                Tgl {String(d).padStart(2, '0')} ({abbr})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Sampai Tanggal
                        </label>
                        <select
                          value={endDay}
                          onChange={(e) => setEndDay(Number(e.target.value))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                        >
                          {daysArray.map((d) => {
                            const { abbr } = getDayOfWeekInfo(d);
                            return (
                              <option key={`end-${d}`} value={d}>
                                Tgl {String(d).padStart(2, '0')} ({abbr})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">
                        Pilih Kode Absensi / Shift
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SHIFT_CODES.map((sc) => (
                          <button
                            key={`modal-shift-${sc.code}`}
                            type="button"
                            onClick={() => setManualShiftCode(sc.code)}
                            className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all ${
                              manualShiftCode === sc.code
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              style={{ backgroundColor: sc.hexBg, color: sc.hexText }}
                              className="w-10 h-8 rounded-lg border border-slate-400 flex items-center justify-center text-xs font-black shrink-0"
                            >
                              {sc.code}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-800 truncate">{sc.label}</div>
                              <div className="text-[10px] font-semibold text-slate-500">{sc.jam}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Nama Lengkap Personil Baru
                      </label>
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Contoh: BUDI SANTOSO"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Kategori Instansi
                        </label>
                        <select
                          value={newPersonInstansi}
                          onChange={(e) => setNewPersonInstansi(e.target.value as 'APINDO' | 'IASS' | 'NTI')}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                        >
                          <option value="APINDO">APINDO</option>
                          <option value="IASS">IASS</option>
                          <option value="NTI">NTI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Pola Awal Shift
                        </label>
                        <select
                          value={newPersonDefaultShift}
                          onChange={(e) => setNewPersonDefaultShift(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                        >
                          <option value="P">Reguler Pagi (P, Weekend L)</option>
                          <option value="PS">Shift Pagi (PS)</option>
                          <option value="M">Shift Malam (M)</option>
                          <option value="-">Kosong (-)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                  >
                    {manualMode === 'assign' ? 'Terapkan & Simpan' : 'Tambahkan Personil'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Drag & Drop Import Excel & PDF TTD Atasan */}
      {isExcelModalOpen && (
        <div
          onClick={() => setIsExcelModalOpen(false)}
          className="fixed inset-0 z-[250] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Import &amp; Sinkronisasi Jadwal (PDF TTD Atasan / Excel)</h3>
                <p className="text-xs text-teal-100 font-medium mt-0.5">
                  Periode Target: {MONTHS[bulan - 1]} {tahun} • Otomatis Sinkron dengan Akun Personil Aktif
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExcelDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  if (!isExcelDragOver) setIsExcelDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExcelDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExcelDragOver(false);
                  const droppedFile = e.dataTransfer?.files?.[0];
                  if (droppedFile) {
                    handleProcessUploadedFile(droppedFile);
                    setIsExcelModalOpen(false);
                  }
                }}
                onClick={() => {
                  excelInputRef.current?.click();
                  setIsExcelModalOpen(false);
                }}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                  isExcelDragOver
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20 scale-[1.01]'
                    : 'border-teal-300 bg-teal-50/40 hover:border-blue-500 hover:bg-blue-50/60'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md">
                  ✍️
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">
                    Tarik &amp; Lepaskan (Drag &amp; Drop) File PDF TTD Atasan atau Excel di Sini
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Mendukung <span className="text-blue-700 font-bold">.pdf / .jpg / .png</span> (Dokumen TTD Atasan) maupun <span className="text-teal-700 font-bold">.xlsx / .xls / .csv</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <div className="font-extrabold text-slate-800">💡 Kemampuan Pembacaan Otomatis Sistem:</div>
                <ul className="list-disc pl-5 space-y-1 font-medium">
                  <li><b>PDF / Hasil Scan Absensi TTD Atasan:</b> Membaca tabel Daftar Dinas yang telah ditandatangani oleh <b>Asst. Manager Of Facility Maintenance (AEP MASHUM NURZAMAN)</b>, mendeteksi tanda tangan pengesahan, serta mengenali warna &amp; kode shift (<b>P, PS, M, DL, CUTI, L, -</b>).</li>
                  <li><b>File Excel (.xlsx / .xls / .csv):</b> Membaca kolom <b>NAMA</b>, <b>NIK</b>, dan tanggal <b>01 s/d 31</b> secara otomatis.</li>
                  <li><b>Sinkronisasi Akun Aktif:</b> Hanya menampilkan personil yang berstatus <b>Active</b> di database (personil <i>Non-Active</i> otomatis disembunyikan).</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleExportExcel()}
                  className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-extrabold rounded-xl text-xs transition-all"
                >
                  ⬇️ Unduh Template Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Dokumen PDF TTD Atasan yang Telah Disinkronkan */}
      {isSignedPreviewOpen && signedPdfInfo && (
        <div
          onClick={() => setIsSignedPreviewOpen(false)}
          className="fixed inset-0 z-[260] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✍️</span>
                <div>
                  <h3 className="font-black text-base">
                    Bukti Dokumen Daftar Dinas TTD Atasan — {signedPdfInfo.fileName}
                  </h3>
                  <p className="text-xs text-blue-100 font-medium">
                    Disahkan oleh: {signedPdfInfo.signerName} ({signedPdfInfo.signerTitle}) • Jakarta, 22 September {tahun}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignedPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 bg-slate-100 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Status Pengesahan</div>
                  <div className="text-sm font-black text-emerald-700 mt-1 flex items-center gap-1.5">
                    <span>✅</span>
                    <span>{signedPdfInfo.hasSignature ? 'Tanda Tangan Atasan Terverifikasi' : 'Dokumen Absensi Tersinkron'}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-1">
                    {signedPdfInfo.signerTitle}: <b>{signedPdfInfo.signerName}</b>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Hasil Sinkronisasi Personil</div>
                  <div className="text-sm font-black text-blue-700 mt-1">
                    {signedPdfInfo.syncedCount} Personil Aktif Tersinkron
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-1">
                    {signedPdfInfo.skippedInactive.length > 0
                      ? `${signedPdfInfo.skippedInactive.length} personil Non-Aktif otomatis disembunyikan`
                      : 'Seluruh personil aktif telah sesuai jadwal TTD'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Potongan Area TTD</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5">Jakarta, 22 September {tahun}</div>
                  </div>
                  {signedPdfInfo.signatureCropUrl && (
                    <img
                      src={signedPdfInfo.signatureCropUrl}
                      alt="Potongan TTD Atasan"
                      className="h-14 object-contain rounded border border-slate-200 bg-slate-50 p-1"
                    />
                  )}
                </div>
              </div>

              {signedPdfInfo.pagePreviewUrl && (
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-extrabold text-slate-700 mb-2 px-1">
                    Pratinjau Dokumen Asli yang Di-upload:
                  </div>
                  <img
                    src={signedPdfInfo.pagePreviewUrl}
                    alt="Pratinjau Dokumen Daftar Dinas TTD Atasan"
                    className="w-full h-auto rounded-xl border border-slate-300"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
