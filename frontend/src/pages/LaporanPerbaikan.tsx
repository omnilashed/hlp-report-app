import { useState, useEffect, useRef, useMemo } from 'react';
import {
  DamageReportPrintTemplate,
  KODE_HAMBATAN_LIST,
  exportElementToPDF
} from '../components/DamageReportPrintTemplate';
import { formatDateIndo, formatTimeWIB } from './LaporanKerusakan';

interface LaporanPerbaikanProps {
  userRole: string;
  userName?: string;
  initialDamageReport?: any | null;
  initialViewReportId?: string | null;
  onClearInitial?: () => void;
}

const MONTHS_MAP: Record<string, string> = {
  januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
  juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
};

const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getNowTime = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const generateRepairCode = (dateISO: string) => {
  const clean = (dateISO || getTodayISO()).replace(/-/g, '').slice(2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LP-${clean}-${rand}`;
};

// Parse waktu kerusakan baik dari waktuKerusakanISO maupun dari string "05 Oktober 2026" & "09.24 WIB"
const parseStartDateTime = (report: any): Date | null => {
  if (!report) return null;
  if (report.waktuKerusakanISO && report.waktuKerusakanISO.includes('T')) {
    const dt = new Date(report.waktuKerusakanISO);
    if (!isNaN(dt.getTime())) return dt;
  }

  try {
    const tglParts = String(report.tglKerusakan || '').trim().split(/\s+/);
    if (tglParts.length === 3) {
      const day = tglParts[0].padStart(2, '0');
      const month = MONTHS_MAP[tglParts[1].toLowerCase()] || '01';
      const year = tglParts[2];

      const cleanJam = String(report.jamKerusakan || '00:00')
        .replace(/WIB/i, '')
        .trim()
        .replace('.', ':');
      const [hh = '00', mm = '00'] = cleanJam.split(':');
      const iso = `${year}-${month}-${day}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00`;
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  } catch (e) {}

  return null;
};

// Hitung selisih jam operasional terputus
export const calculateDowntimeHours = (startDate: Date | null, endDateISO: string, endTimeHHMM: string): string => {
  if (!startDate || !endDateISO || !endTimeHHMM) return '-';
  const endDate = new Date(`${endDateISO}T${endTimeHHMM}:00`);
  if (isNaN(endDate.getTime())) return '-';

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '0 Jam (Waktu selesai lebih awal dari waktu rusak)';

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const decimalHours = (totalMinutes / 60).toFixed(2).replace('.', ',');

  if (hours === 0) {
    return `${minutes} Menit (${decimalHours} Jam)`;
  }
  if (minutes === 0) {
    return `${hours} Jam`;
  }
  return `${hours} Jam ${minutes} Menit (${decimalHours} Jam)`;
};

export default function LaporanPerbaikan({
  userRole: _userRole,
  initialDamageReport,
  initialViewReportId,
  onClearInitial
}: LaporanPerbaikanProps) {
  const [allDamageReports, setAllDamageReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [mode, setMode] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  const todayISO = getTodayISO();
  const nowTime = getNowTime();

  const [formData, setFormData] = useState({
    damageReportId: '',
    repairReportCode: generateRepairCode(todayISO),
    dateSelesaiISO: todayISO,
    timeSelesaiHHMM: nowTime,
    tglSelesaiPerbaikan: formatDateIndo(todayISO),
    jamSelesaiPerbaikan: formatTimeWIB(nowTime),
    jumlahJamTerputus: '-',
    tindakanPerbaikan: '',
    kodeHambatanPerbaikan: 'TH',
    dibuatOlehPerbaikan: 'RAHMAT D. CAHYO',
    jabatanDibuatPerbaikan: 'Electronic Facility & IT Supervisor',
    updateEquipmentToReady: true,
    dokumentasiPerbaikan: [] as { foto: string; keterangan: string }[]
  });

  const fetchDamageReports = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/damage-reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllDamageReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Gagal mengambil data laporan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDamageReports();
  }, []);

  // Jika diarahkan dari Riwayat Peralatan untuk melihat Detail Laporan Perbaikan berdasarkan ID
  useEffect(() => {
    if (initialViewReportId && allDamageReports.length > 0) {
      const target = allDamageReports.find(
        r =>
          String(r._id) === String(initialViewReportId) ||
          r.repairReportCode === initialViewReportId ||
          r.reportCode === initialViewReportId
      );
      if (target) {
        setSelectedReport(target);
        setMode('detail');
        if (onClearInitial) onClearInitial();
      }
    }
  }, [initialViewReportId, allDamageReports]);

  // Laporan kerusakan yang dipilih sebagai acuan pada form
  const referencedDamageReport = useMemo(() => {
    return allDamageReports.find(r => String(r._id) === String(formData.damageReportId)) || null;
  }, [allDamageReports, formData.damageReportId]);

  // Hitung otomatis Jumlah Jam Operasi Terputus setiap kali acuan laporan kerusakan atau waktu selesai berubah
  useEffect(() => {
    if (!referencedDamageReport) return;
    const startDt = parseStartDateTime(referencedDamageReport);
    const computed = calculateDowntimeHours(startDt, formData.dateSelesaiISO, formData.timeSelesaiHHMM);
    setFormData(prev => ({
      ...prev,
      jumlahJamTerputus: computed
    }));
  }, [referencedDamageReport, formData.dateSelesaiISO, formData.timeSelesaiHHMM]);

  // Jika diarahkan dari halaman Laporan Kerusakan ("Buat Tindak Lanjut")
  useEffect(() => {
    if (initialDamageReport) {
      const dISO = getTodayISO();
      const tNow = getNowTime();
      const startDt = parseStartDateTime(initialDamageReport);
      const computed = calculateDowntimeHours(startDt, dISO, tNow);

      setFormData({
        damageReportId: String(initialDamageReport._id),
        repairReportCode: initialDamageReport.repairReportCode || generateRepairCode(dISO),
        dateSelesaiISO: dISO,
        timeSelesaiHHMM: tNow,
        tglSelesaiPerbaikan: formatDateIndo(dISO),
        jamSelesaiPerbaikan: formatTimeWIB(tNow),
        jumlahJamTerputus: computed,
        tindakanPerbaikan:
          initialDamageReport.tindakanPerbaikan ||
          `Telah dilakukan perbaikan dan pengujian oleh personil Electronic Facility & IT pada ${initialDamageReport.peralatan} (${initialDamageReport.lokasi}) dengan hasil peralatan kembali beroperasi Normal / Serviceable.`,
        kodeHambatanPerbaikan: initialDamageReport.kodeHambatanPerbaikan || 'TH',
        dibuatOlehPerbaikan: initialDamageReport.dibuatOlehPerbaikan || initialDamageReport.dibuatOleh || 'RAHMAT D. CAHYO',
        jabatanDibuatPerbaikan:
          initialDamageReport.jabatanDibuatPerbaikan ||
          initialDamageReport.jabatanDibuat ||
          'Electronic Facility & IT Supervisor',
        updateEquipmentToReady: true,
        dokumentasiPerbaikan: Array.isArray(initialDamageReport.dokumentasiPerbaikan)
          ? initialDamageReport.dokumentasiPerbaikan
          : []
      });
      setMode('form');
      if (onClearInitial) onClearInitial();
    }
  }, [initialDamageReport]);

  // Daftar laporan yang sudah memiliki tindak lanjut perbaikan (Resolved)
  const repairedReports = useMemo(() => {
    return allDamageReports.filter(r => {
      if (r.statusLaporan !== 'Resolved') return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const m1 = (r.repairReportCode || '').toLowerCase().includes(q);
        const m2 = (r.reportCode || '').toLowerCase().includes(q);
        const m3 = (r.peralatan || '').toLowerCase().includes(q);
        const m4 = (r.lokasi || '').toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      return true;
    });
  }, [allDamageReports, searchQuery]);

  // Daftar laporan kerusakan yang belum diperbaiki (untuk banner pengingat cepat)
  const pendingDamageReports = useMemo(() => {
    return allDamageReports.filter(r => r.statusLaporan !== 'Resolved');
  }, [allDamageReports]);

  const openCreateRepairForm = (presetDamageReport?: any) => {
    const dISO = getTodayISO();
    const tNow = getNowTime();
    const target = presetDamageReport || pendingDamageReports[0] || allDamageReports[0] || null;
    const startDt = parseStartDateTime(target);
    const computed = target ? calculateDowntimeHours(startDt, dISO, tNow) : '-';

    setFormData({
      damageReportId: target ? String(target._id) : '',
      repairReportCode: target?.repairReportCode || generateRepairCode(dISO),
      dateSelesaiISO: dISO,
      timeSelesaiHHMM: tNow,
      tglSelesaiPerbaikan: formatDateIndo(dISO),
      jamSelesaiPerbaikan: formatTimeWIB(tNow),
      jumlahJamTerputus: computed,
      tindakanPerbaikan: target
        ? target.tindakanPerbaikan ||
          `Telah dilakukan perbaikan oleh personil Electronic Facility & IT pada ${target.peralatan} (${target.lokasi}) dengan hasil peralatan kembali beroperasi Normal.`
        : '',
      kodeHambatanPerbaikan: target?.kodeHambatanPerbaikan || 'TH',
      dibuatOlehPerbaikan: target?.dibuatOleh || 'RAHMAT D. CAHYO',
      jabatanDibuatPerbaikan: target?.jabatanDibuat || 'Electronic Facility & IT Supervisor',
      updateEquipmentToReady: true,
      dokumentasiPerbaikan: Array.isArray(target?.dokumentasiPerbaikan) ? target.dokumentasiPerbaikan : []
    });
    setMode('form');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({
            ...prev,
            dokumentasiPerbaikan: [
              ...prev.dokumentasiPerbaikan,
              {
                foto: reader.result as string,
                keterangan: referencedDamageReport
                  ? `${referencedDamageReport.peralatan} - ${referencedDamageReport.bagian} (Normal / Selesai Diperbaiki)`
                  : 'Dokumentasi Perbaikan (Normal)'
              }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmitRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.damageReportId) {
      alert('Pilih Acuan Referensi Laporan Kerusakan terlebih dahulu!');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    const payload = {
      repairReportCode: formData.repairReportCode,
      tglSelesaiPerbaikan: formData.tglSelesaiPerbaikan || formatDateIndo(formData.dateSelesaiISO),
      jamSelesaiPerbaikan: formData.jamSelesaiPerbaikan || formatTimeWIB(formData.timeSelesaiHHMM),
      waktuSelesaiISO: `${formData.dateSelesaiISO}T${formData.timeSelesaiHHMM}`,
      jumlahJamTerputus: formData.jumlahJamTerputus,
      tindakanPerbaikan: formData.tindakanPerbaikan,
      kodeHambatanPerbaikan: formData.kodeHambatanPerbaikan,
      tanggalPerbaikan: formatDateIndo(formData.dateSelesaiISO),
      dibuatOlehPerbaikan: formData.dibuatOlehPerbaikan,
      jabatanDibuatPerbaikan: formData.jabatanDibuatPerbaikan,
      dokumentasiPerbaikan: formData.dokumentasiPerbaikan,
      statusLaporan: 'Resolved',
      updateEquipmentToReady: formData.updateEquipmentToReady
    };

    try {
      const res = await fetch(`/api/damage-reports/${formData.damageReportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setAllDamageReports(prev => prev.map(r => (String(r._id) === String(updated._id) ? updated : r)));
        setSelectedReport(updated);
        setMode('detail');
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal menyimpan laporan perbaikan.');
      }
    } catch (error) {
      alert('Gagal menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'detail' && selectedReport) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('list')}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">
                  Detail Laporan Perbaikan Peralatan
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedReport.repairReportCode}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Ref Kerusakan: {selectedReport.reportCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {selectedReport.peralatan} ({selectedReport.lokasi}) • Jam Operasi Terputus:{' '}
                <strong className="text-slate-800">{selectedReport.jumlahJamTerputus}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openCreateRepairForm(selectedReport)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold"
            >
              ✏️ Edit Perbaikan
            </button>
            <button
              onClick={() =>
                exportElementToPDF(
                  printRef.current,
                  `Laporan_Perbaikan_${selectedReport.repairReportCode || selectedReport.reportCode}_${selectedReport.peralatan}`
                )
              }
              className="px-5 py-2.5 bg-[#175390] hover:bg-[#124273] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
            >
              📥 Download PDF Perbaikan
            </button>
          </div>
        </div>

        <div className="bg-slate-200/70 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto flex justify-center">
          <DamageReportPrintTemplate ref={printRef} report={selectedReport} mode="perbaikan" />
        </div>
      </div>
    );
  }

  if (mode === 'form') {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('list')}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                Form Laporan Perbaikan Peralatan
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Mengacu pada Referensi Laporan Kerusakan & menghitung otomatis Jumlah Jam Operasi Terputus
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitRepair} className="space-y-6">
          {/* Pilihan Acuan Referensi Laporan Kerusakan & Kode Laporan Perbaikan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200">
            <div>
              <label className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1.5 block">
                Acuan Referensi Laporan Kerusakan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.damageReportId}
                onChange={e => {
                  const id = e.target.value;
                  const target = allDamageReports.find(r => String(r._id) === String(id));
                  setFormData(prev => ({
                    ...prev,
                    damageReportId: id,
                    tindakanPerbaikan: target
                      ? target.tindakanPerbaikan ||
                        `Telah dilakukan perbaikan oleh personil Electronic Facility & IT pada ${target.peralatan} (${target.lokasi}) dengan hasil peralatan kembali beroperasi Normal.`
                      : prev.tindakanPerbaikan
                  }));
                }}
                className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="">-- Pilih Referensi Laporan Kerusakan (Report Code) --</option>
                {allDamageReports.map(r => (
                  <option key={r._id} value={r._id}>
                    [{r.reportCode}] {r.peralatan} ({r.lokasi}) — Rusak: {r.tglKerusakan} {r.jamKerusakan}{' '}
                    {r.statusLaporan === 'Resolved' ? '✅ (Sudah Diperbaiki)' : '🔴 (Belum Diperbaiki)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1.5 block">
                Report Code Laporan Perbaikan
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.repairReportCode}
                  onChange={e => setFormData({ ...formData, repairReportCode: e.target.value })}
                  className="flex-1 p-3 bg-white border border-emerald-300 rounded-xl font-mono font-extrabold text-sm text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, repairReportCode: generateRepairCode(prev.dateSelesaiISO) }))}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  Generate Code
                </button>
              </div>
            </div>
          </div>

          {/* Ringkasan Data Acuan Laporan Kerusakan */}
          {referencedDamageReport && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  📌 Ringkasan Referensi Laporan Kerusakan ({referencedDamageReport.reportCode})
                </span>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  Waktu Kerusakan: {referencedDamageReport.tglKerusakan} Pukul {referencedDamageReport.jamKerusakan}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Peralatan & Bagian</span>
                  <span className="font-extrabold text-slate-800">
                    {referencedDamageReport.peralatan} ({referencedDamageReport.bagian})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Lokasi & Fasilitas</span>
                  <span className="font-bold text-slate-700">
                    {referencedDamageReport.lokasi} • {referencedDamageReport.fasilitas}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Kategori Kerusakan</span>
                  <span className="font-bold text-slate-700">{referencedDamageReport.kategoriKerusakan}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Penyebab Awal</span>
                  <span className="font-bold text-slate-700">{referencedDamageReport.penyebab || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Waktu Selesai Perbaikan & Perhitungan Otomatis Jam Operasional Terputus */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 block">
                11a. Tanggal Selesai Perbaikan
              </label>
              <input
                type="date"
                required
                value={formData.dateSelesaiISO}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    dateSelesaiISO: val,
                    tglSelesaiPerbaikan: formatDateIndo(val)
                  }));
                }}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                Format Cetak: {formData.tglSelesaiPerbaikan}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 block">
                11b. Jam Selesai Perbaikan (WIB)
              </label>
              <input
                type="time"
                required
                value={formData.timeSelesaiHHMM}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    timeSelesaiHHMM: val,
                    jamSelesaiPerbaikan: formatTimeWIB(val)
                  }));
                }}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                Format Cetak: {formData.jamSelesaiPerbaikan}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#175390] uppercase tracking-widest mb-1.5 block">
                12. Jumlah Jam Operasi Terputus (Otomatis)
              </label>
              <input
                type="text"
                required
                value={formData.jumlahJamTerputus}
                onChange={e => setFormData({ ...formData, jumlahJamTerputus: e.target.value })}
                className="w-full p-3 bg-white border-2 border-[#175390] rounded-xl text-sm font-extrabold text-[#175390] outline-none"
              />
              <span className="text-[11px] text-blue-600 font-bold mt-1 block">
                ⏱️ Dihitung otomatis dari waktu kerusakan s/d waktu selesai
              </span>
            </div>
          </div>

          {/* Uraian Tindakan Perbaikan & Kode Hambatan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                8. Detail Tindakan Perbaikan yang Dilakukan
              </label>
              <textarea
                rows={4}
                required
                placeholder="Tuliskan tindakan perbaikan yang telah dilakukan hingga peralatan kembali normal..."
                value={formData.tindakanPerbaikan}
                onChange={e => setFormData({ ...formData, tindakanPerbaikan: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  13. Kode Hambatan Akhir
                </label>
                <select
                  value={formData.kodeHambatanPerbaikan}
                  onChange={e => setFormData({ ...formData, kodeHambatanPerbaikan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                >
                  {KODE_HAMBATAN_LIST.map(kh => (
                    <option key={kh.code} value={kh.code}>
                      {kh.code} - {kh.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Dibuat Oleh (Supervisor)
                </label>
                <input
                  type="text"
                  value={formData.dibuatOlehPerbaikan}
                  onChange={e => setFormData({ ...formData, dibuatOlehPerbaikan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Opsi Otomatis Kembalikan Status Peralatan di Data Master ke Ready */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                🔄 Sinkronisasi Otomatis ke Data Master Fasilitas
              </h4>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                Kembalikan status peralatan menjadi <strong>🟢 Ready</strong> dan kondisi <strong>✅ Normal</strong> di Data Master setelah perbaikan disimpan.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.updateEquipmentToReady}
              onChange={e => setFormData({ ...formData, updateEquipmentToReady: e.target.checked })}
              className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
            />
          </div>

          {/* Upload Foto Dokumentasi Perbaikan */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Dokumentasi Foto Perbaikan
              </label>
              <label className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold cursor-pointer border border-emerald-200 transition-colors">
                📷 + Tambah Foto Perbaikan
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {formData.dokumentasiPerbaikan.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.dokumentasiPerbaikan.map((doc, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          dokumentasiPerbaikan: prev.dokumentasiPerbaikan.filter((_, idx) => idx !== i)
                        }))
                      }
                      className="absolute top-5 right-5 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-md"
                    >
                      ✕
                    </button>
                    <img src={doc.foto} alt="Preview" className="w-full h-44 object-contain bg-white rounded-xl border border-slate-100" />
                    <input
                      type="text"
                      placeholder="Keterangan foto perbaikan"
                      value={doc.keterangan}
                      onChange={e => {
                        const next = [...formData.dokumentasiPerbaikan];
                        next[i].keterangan = e.target.value;
                        setFormData({ ...formData, dokumentasiPerbaikan: next });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 text-center"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMode('list')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-bold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan Perbaikan'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] w-full min-h-full rounded-[2rem] border border-slate-200 shadow-sm flex flex-col font-sans">
      <div className="p-6 sm:p-8 border-b border-slate-200 bg-white rounded-t-[2rem] space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Laporan Perbaikan Peralatan
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">
                Tindak Lanjut & Jam Terputus
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Tindak lanjut perbaikan peralatan mengacu pada Report Code Laporan Kerusakan beserta perhitungan otomatis Jam Operasi Terputus.
            </p>
          </div>

          <button
            onClick={() => openCreateRepairForm()}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
          >
            🛠️ + Buat Laporan Perbaikan
          </button>
        </div>

        {/* Banner Laporan Kerusakan yang Menunggu Perbaikan */}
        {pendingDamageReports.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block">
                ⚠️ Terdapat {pendingDamageReports.length} Laporan Kerusakan yang Menunggu Tindak Lanjut Perbaikan
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                Klik tombol di samping pada kode laporan kerusakan untuk langsung membuat laporan perbaikannya.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingDamageReports.slice(0, 4).map(pr => (
                <button
                  key={pr._id}
                  onClick={() => openCreateRepairForm(pr)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  🛠️ Perbaiki [{pr.reportCode}] {pr.peralatan}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Cari berdasarkan Kode Perbaikan, Referensi Kode Kerusakan, peralatan, atau lokasi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
          />
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-xs">Memuat data laporan perbaikan...</div>
        ) : repairedReports.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <p className="text-slate-500 font-bold text-sm">Belum ada data Laporan Perbaikan Peralatan.</p>
            <button
              onClick={() => openCreateRepairForm()}
              className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
            >
              🛠️ + Buat Laporan Perbaikan Sekarang
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Kode Perbaikan</th>
                    <th className="py-3.5 px-4">Acuan Ref. Kerusakan</th>
                    <th className="py-3.5 px-4">Peralatan & Lokasi</th>
                    <th className="py-3.5 px-4">Waktu Kerusakan</th>
                    <th className="py-3.5 px-4">Waktu Selesai Perbaikan</th>
                    <th className="py-3.5 px-4">Jam Operasi Terputus</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {repairedReports.map(r => (
                    <tr key={r._id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.repairReportCode || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-[#175390] border border-blue-200">
                          {r.reportCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">{r.peralatan}</div>
                        <div className="text-xs text-slate-500">
                          {r.lokasi} • Bagian: {r.bagian}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-700">{r.tglKerusakan}</div>
                        <div className="text-xs text-slate-500">{r.jamKerusakan}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-700">{r.tglSelesaiPerbaikan}</div>
                        <div className="text-xs text-slate-500">{r.jamSelesaiPerbaikan}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-[#175390] border border-blue-200 inline-block">
                          ⏱️ {r.jumlahJamTerputus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReport(r);
                              setMode('detail');
                            }}
                            className="px-3 py-1.5 bg-[#175390] hover:bg-[#124273] text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            📄 Detail & PDF
                          </button>
                          <button
                            onClick={() => openCreateRepairForm(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Perbaikan"
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
