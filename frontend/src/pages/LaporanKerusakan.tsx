import { useState, useEffect, useRef, useMemo } from 'react';
import {
  DamageReportPrintTemplate,
  KODE_HAMBATAN_LIST,
  KATEGORI_KERUSAKAN_LIST,
  exportElementToPDF
} from '../components/DamageReportPrintTemplate';

interface LaporanKerusakanProps {
  userRole: string;
  userName?: string;
  initialEquipment?: any | null;
  initialViewReportId?: string | null;
  onClearInitial?: () => void;
  onNavigateToPerbaikan?: (damageReport: any) => void;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatDateIndo = (isoDateStr: string) => {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2].padStart(2, '0');
  return `${day} ${MONTHS_ID[monthIdx] || ''} ${year}`;
};

export const formatTimeWIB = (timeStr: string) => {
  if (!timeStr) return '-';
  const clean = timeStr.replace(/\s*WIB/i, '').replace(':', '.');
  return `${clean} WIB`;
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

export const generateDamageCode = (dateISO: string) => {
  const clean = (dateISO || getTodayISO()).replace(/-/g, '').slice(2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LK-${clean}-${rand}`;
};

export default function LaporanKerusakan({
  userRole: _userRole,
  initialEquipment,
  initialViewReportId,
  onClearInitial,
  onNavigateToPerbaikan
}: LaporanKerusakanProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [mode, setMode] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Open' | 'Resolved'>('Semua');

  const printRef = useRef<HTMLDivElement>(null);

  const todayISO = getTodayISO();
  const nowTime = getNowTime();

  const [formData, setFormData] = useState({
    reportCode: generateDamageCode(todayISO),
    equipmentId: '',
    dateISO: todayISO,
    timeHHMM: nowTime,
    tanggal: formatDateIndo(todayISO),
    lokasi: '',
    fasilitas: 'Fasilitas Penunjang Bandar Udara',
    peralatan: '',
    bagian: '',
    kategoriKerusakan: KATEGORI_KERUSAKAN_LIST[1],
    uraian: '',
    dampak: '',
    tindakan: '',
    penyebab: '',
    tglKerusakan: formatDateIndo(todayISO),
    jamKerusakan: formatTimeWIB(nowTime),
    kodeHambatan: 'SC',
    diketahuiOleh: 'AEP MASHUM NURZAMAN',
    jabatanDiketahui: 'Asst. Manager Of Facility Maintenance',
    dibuatOleh: 'RAHMAT D. CAHYO',
    jabatanDibuat: 'Electronic Facility & IT Supervisor',
    dokumentasi: [] as { foto: string; keterangan: string }[]
  });

  const fetchAllData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [resRep, resEq] = await Promise.all([
        fetch('/api/damage-reports', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resRep.ok) {
        const repData = await resRep.json();
        setReports(Array.isArray(repData) ? repData : []);
      }
      if (resEq.ok) {
        const eqData = await resEq.json();
        setEquipments(Array.isArray(eqData) ? eqData : []);
      }
    } catch (err) {
      console.error('Gagal memuat data laporan kerusakan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Jika dipanggil dari Data Master untuk langsung membuat laporan kerusakan peralatan tertentu
  useEffect(() => {
    if (initialEquipment) {
      const dISO = getTodayISO();
      const tNow = getNowTime();
      const eqFasilitas =
        initialEquipment.mainCategory === 'Elban'
          ? initialEquipment.subCategory || 'Fasilitas Penunjang Bandar Udara'
          : 'Faskampen';

      setEditingReport(null);
      setFormData({
        reportCode: generateDamageCode(dISO),
        equipmentId: String(initialEquipment._id || ''),
        dateISO: dISO,
        timeHHMM: tNow,
        tanggal: formatDateIndo(dISO),
        lokasi: initialEquipment.lokasi || '',
        fasilitas: eqFasilitas,
        peralatan: initialEquipment.namaPeralatan || '',
        bagian: '',
        kategoriKerusakan: KATEGORI_KERUSAKAN_LIST[1],
        uraian: initialEquipment.keteranganRusak
          ? `Fasilitas pada peralatan ${initialEquipment.namaPeralatan} terdapat kondisi sebagai berikut :\n1. ${initialEquipment.keteranganRusak}`
          : `Fasilitas pada peralatan ${initialEquipment.namaPeralatan} terdapat kondisi sebagai berikut :\n1. `,
        dampak: '',
        tindakan: `Dilakukan pengecekan dan tindak lanjut oleh personil Electronic Facility & IT pada ${initialEquipment.namaPeralatan} sebagai berikut :\n1. `,
        penyebab: '',
        tglKerusakan: formatDateIndo(dISO),
        jamKerusakan: formatTimeWIB(tNow),
        kodeHambatan: 'SC',
        diketahuiOleh: 'AEP MASHUM NURZAMAN',
        jabatanDiketahui: 'Asst. Manager Of Facility Maintenance',
        dibuatOleh: 'RAHMAT D. CAHYO',
        jabatanDibuat: 'Electronic Facility & IT Supervisor',
        dokumentasi: []
      });
      setMode('form');
      if (onClearInitial) onClearInitial();
    }
  }, [initialEquipment]);

  // Jika dipanggil dari Data Master untuk langsung melihat detail laporan kerusakan tertentu
  useEffect(() => {
    if (initialViewReportId && reports.length > 0) {
      const found = reports.find(
        r => String(r._id) === String(initialViewReportId) || r.reportCode === initialViewReportId
      );
      if (found) {
        setSelectedReport(found);
        setMode('detail');
        if (onClearInitial) onClearInitial();
      }
    }
  }, [initialViewReportId, reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (statusFilter !== 'Semua' && r.statusLaporan !== statusFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (r.reportCode || '').toLowerCase().includes(q);
        const matchRepairCode = (r.repairReportCode || '').toLowerCase().includes(q);
        const matchAlat = (r.peralatan || '').toLowerCase().includes(q);
        const matchLokasi = (r.lokasi || '').toLowerCase().includes(q);
        const matchBagian = (r.bagian || '').toLowerCase().includes(q);
        if (!matchCode && !matchRepairCode && !matchAlat && !matchLokasi && !matchBagian) return false;
      }
      return true;
    });
  }, [reports, statusFilter, searchQuery]);

  const openCreateForm = () => {
    const dISO = getTodayISO();
    const tNow = getNowTime();
    setEditingReport(null);
    setFormData({
      reportCode: generateDamageCode(dISO),
      equipmentId: '',
      dateISO: dISO,
      timeHHMM: tNow,
      tanggal: formatDateIndo(dISO),
      lokasi: '',
      fasilitas: 'Fasilitas Penunjang Bandar Udara',
      peralatan: '',
      bagian: '',
      kategoriKerusakan: KATEGORI_KERUSAKAN_LIST[1],
      uraian: '',
      dampak: '',
      tindakan: '',
      penyebab: '',
      tglKerusakan: formatDateIndo(dISO),
      jamKerusakan: formatTimeWIB(tNow),
      kodeHambatan: 'SC',
      diketahuiOleh: 'AEP MASHUM NURZAMAN',
      jabatanDiketahui: 'Asst. Manager Of Facility Maintenance',
      dibuatOleh: 'RAHMAT D. CAHYO',
      jabatanDibuat: 'Electronic Facility & IT Supervisor',
      dokumentasi: []
    });
    setMode('form');
  };

  const openEditForm = (report: any) => {
    setEditingReport(report);
    const isoParts = (report.waktuKerusakanISO || '').split('T');
    const dISO = isoParts[0] || getTodayISO();
    const tNow = isoParts[1] || getNowTime();

    setFormData({
      reportCode: report.reportCode || generateDamageCode(dISO),
      equipmentId: report.equipmentId || '',
      dateISO: dISO,
      timeHHMM: tNow,
      tanggal: report.tanggal || formatDateIndo(dISO),
      lokasi: report.lokasi || '',
      fasilitas: report.fasilitas || 'Fasilitas Penunjang Bandar Udara',
      peralatan: report.peralatan || '',
      bagian: report.bagian || '',
      kategoriKerusakan: report.kategoriKerusakan || KATEGORI_KERUSAKAN_LIST[1],
      uraian: report.uraian || '',
      dampak: report.dampak || '',
      tindakan: report.tindakan || '',
      penyebab: report.penyebab || '',
      tglKerusakan: report.tglKerusakan || formatDateIndo(dISO),
      jamKerusakan: report.jamKerusakan || formatTimeWIB(tNow),
      kodeHambatan: report.kodeHambatan || 'SC',
      diketahuiOleh: report.diketahuiOleh || 'AEP MASHUM NURZAMAN',
      jabatanDiketahui: report.jabatanDiketahui || 'Asst. Manager Of Facility Maintenance',
      dibuatOleh: report.dibuatOleh || 'RAHMAT D. CAHYO',
      jabatanDibuat: report.jabatanDibuat || 'Electronic Facility & IT Supervisor',
      dokumentasi: Array.isArray(report.dokumentasi) ? report.dokumentasi : []
    });
    setMode('form');
  };

  const handleSelectEquipment = (eqId: string) => {
    const eq = equipments.find(e => String(e._id) === String(eqId));
    if (!eq) {
      setFormData(prev => ({ ...prev, equipmentId: '' }));
      return;
    }
    const eqFasilitas =
      eq.mainCategory === 'Elban'
        ? eq.subCategory || 'Fasilitas Penunjang Bandar Udara'
        : 'Faskampen';

    setFormData(prev => ({
      ...prev,
      equipmentId: String(eq._id),
      peralatan: eq.namaPeralatan || prev.peralatan,
      lokasi: eq.lokasi || prev.lokasi,
      fasilitas: eqFasilitas,
      uraian:
        prev.uraian ||
        `Fasilitas pada peralatan ${eq.namaPeralatan} terdapat kondisi sebagai berikut :\n1. ${eq.keteranganRusak || ''}`,
      tindakan:
        prev.tindakan ||
        `Dilakukan pengecekan dan tindak lanjut oleh personil Electronic Facility & IT pada ${eq.namaPeralatan} sebagai berikut :\n1. `
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData(prev => ({
            ...prev,
            dokumentasi: [
              ...prev.dokumentasi,
              {
                foto: reader.result as string,
                keterangan: prev.bagian ? `${prev.bagian} (Rusak)` : `${prev.peralatan || 'Peralatan'} (Rusak)`
              }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reportCode || !formData.peralatan || !formData.lokasi) {
      alert('Report Code, Peralatan, dan Lokasi wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    const waktuKerusakanISO = `${formData.dateISO}T${formData.timeHHMM}`;
    const payload = {
      reportCode: formData.reportCode,
      equipmentId: formData.equipmentId,
      tanggal: formData.tanggal || formatDateIndo(formData.dateISO),
      lokasi: formData.lokasi,
      fasilitas: formData.fasilitas,
      peralatan: formData.peralatan,
      bagian: formData.bagian || '-',
      kategoriKerusakan: formData.kategoriKerusakan,
      uraian: formData.uraian,
      dampak: formData.dampak,
      tindakan: formData.tindakan,
      penyebab: formData.penyebab,
      tglKerusakan: formData.tglKerusakan || formatDateIndo(formData.dateISO),
      jamKerusakan: formData.jamKerusakan || formatTimeWIB(formData.timeHHMM),
      waktuKerusakanISO,
      kodeHambatan: formData.kodeHambatan,
      diketahuiOleh: formData.diketahuiOleh,
      jabatanDiketahui: formData.jabatanDiketahui,
      dibuatOleh: formData.dibuatOleh,
      jabatanDibuat: formData.jabatanDibuat,
      dokumentasi: formData.dokumentasi
    };

    try {
      if (editingReport) {
        const res = await fetch(`/api/damage-reports/${editingReport._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setReports(prev => prev.map(r => (r._id === editingReport._id ? updated : r)));
          setSelectedReport(updated);
          setMode('detail');
        } else {
          const err = await res.json();
          alert(err.message || 'Gagal memperbarui laporan kerusakan.');
        }
      } else {
        const res = await fetch('/api/damage-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setReports(prev => [created, ...prev]);
          setSelectedReport(created);
          setMode('detail');
        } else {
          const err = await res.json();
          alert(err.message || 'Gagal menyimpan laporan kerusakan.');
        }
      }
    } catch (error) {
      alert('Gagal menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus Laporan Kerusakan ini?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/damage-reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r._id !== id));
        if (selectedReport?._id === id) {
          setSelectedReport(null);
          setMode('list');
        }
      }
    } catch (err) {
      alert('Gagal menghapus laporan.');
    }
  };

  // Urutkan peralatan yang Damaged / Maintenance di bagian paling atas dropdown
  const sortedEquipments = useMemo(() => {
    return [...equipments].sort((a, b) => {
      const aUrgent = ['Damaged', 'Maintenance'].includes(a.statusPeralatan) ? 0 : 1;
      const bUrgent = ['Damaged', 'Maintenance'].includes(b.statusPeralatan) ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return (a.namaPeralatan || '').localeCompare(b.namaPeralatan || '');
    });
  }, [equipments]);

  if (mode === 'detail' && selectedReport) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('list')}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ←
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">
                  Detail Laporan Kerusakan Peralatan
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-blue-50 text-[#175390] border border-blue-200">
                  {selectedReport.reportCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedReport.peralatan} • {selectedReport.lokasi} ({selectedReport.tanggal})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToPerbaikan && selectedReport.statusLaporan !== 'Resolved' && (
              <button
                onClick={() => onNavigateToPerbaikan(selectedReport)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                🛠️ Buat Tindak Lanjut (Laporan Perbaikan)
              </button>
            )}
            <button
              onClick={() => openEditForm(selectedReport)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all"
            >
              ✏️ Edit Laporan
            </button>
            <button
              onClick={() =>
                exportElementToPDF(
                  printRef.current,
                  `Laporan_Kerusakan_${selectedReport.reportCode}_${selectedReport.peralatan}`
                )
              }
              className="px-5 py-2.5 bg-[#175390] hover:bg-[#124273] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              📥 Download PDF
            </button>
          </div>
        </div>

        {/* Preview Dokumen Resmi */}
        <div className="bg-slate-200/70 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto flex justify-center">
          <DamageReportPrintTemplate ref={printRef} report={selectedReport} mode="kerusakan" />
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
                {editingReport ? 'Edit Laporan Kondisi / Kerusakan Peralatan' : 'Buat Laporan Kondisi / Kerusakan Peralatan'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Format Resmi Bandara Internasional Halim Perdanakusuma (Dilengkapi Report Code untuk Referensi Tindak Lanjut)
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Baris Report Code & Pilih Peralatan dari Data Master */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
            <div>
              <label className="text-[11px] font-extrabold text-[#175390] uppercase tracking-wider mb-1.5 block">
                Report Code Kerusakan (Acuan Tindak Lanjut)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.reportCode}
                  onChange={e => setFormData({ ...formData, reportCode: e.target.value })}
                  className="flex-1 p-3 bg-white border border-blue-200 rounded-xl font-mono font-extrabold text-sm text-slate-800 outline-none focus:border-[#175390]"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, reportCode: generateDamageCode(prev.dateISO) }))}
                  className="px-4 py-2.5 bg-[#175390] text-white text-xs font-bold rounded-xl hover:bg-[#124273] transition-colors whitespace-nowrap"
                >
                  Generate Code
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-[#175390] uppercase tracking-wider mb-1.5 block">
                Pilih Peralatan dari Data Master (Otomatis Isi Data)
              </label>
              <select
                value={formData.equipmentId}
                onChange={e => handleSelectEquipment(e.target.value)}
                className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 outline-none focus:border-[#175390] cursor-pointer"
              >
                <option value="">-- Pilih Peralatan dari Data Master (Atau Ketik Manual di Bawah) --</option>
                {sortedEquipments.map(eq => (
                  <option key={eq._id} value={eq._id}>
                    {['Damaged', 'Maintenance'].includes(eq.statusPeralatan) ? `⚠️ [${eq.statusPeralatan.toUpperCase()}] ` : ''}
                    {eq.namaPeralatan} — {eq.lokasi} ({eq.merek || '-'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1 - 6. Data Identitas Peralatan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                1. Tanggal Laporan / Kejadian
              </label>
              <input
                type="date"
                required
                value={formData.dateISO}
                onChange={e => {
                  const val = e.target.value;
                  const indo = formatDateIndo(val);
                  setFormData(prev => ({
                    ...prev,
                    dateISO: val,
                    tanggal: indo,
                    tglKerusakan: indo
                  }));
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                Format Cetak: {formData.tanggal}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                10. Jam Kerusakan (WIB)
              </label>
              <input
                type="time"
                required
                value={formData.timeHHMM}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    timeHHMM: val,
                    jamKerusakan: formatTimeWIB(val)
                  }));
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                Format Cetak: {formData.jamKerusakan}
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                2. Lokasi Peralatan
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SCP 2"
                value={formData.lokasi}
                onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                3. Fasilitas (Kategori)
              </label>
              <select
                value={formData.fasilitas}
                onChange={e => setFormData({ ...formData, fasilitas: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                <option value="Fasilitas Penunjang Bandar Udara">Fasilitas Penunjang Bandar Udara</option>
                <option value="Fasilitas IT">Fasilitas IT</option>
                <option value="Faskampen">Faskampen</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                4. Nama Peralatan
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Monitor Sign In"
                value={formData.peralatan}
                onChange={e => setFormData({ ...formData, peralatan: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                5. Bagian yang Rusak / Bermasalah
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: File / Media Player"
                value={formData.bagian}
                onChange={e => setFormData({ ...formData, bagian: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* 6 & 13. Kategori Kerusakan & Kode Hambatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                6. Kategori Kerusakan
              </label>
              <select
                value={formData.kategoriKerusakan}
                onChange={e => setFormData({ ...formData, kategoriKerusakan: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                {KATEGORI_KERUSAKAN_LIST.map(kat => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                13. Kode Hambatan
              </label>
              <select
                value={formData.kodeHambatan}
                onChange={e => setFormData({ ...formData, kodeHambatan: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              >
                {KODE_HAMBATAN_LIST.map(kh => (
                  <option key={kh.code} value={kh.code}>
                    {kh.code} - {kh.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 7. Uraian dan Dampak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                7a. Uraian Kondisi Kerusakan
              </label>
              <textarea
                rows={4}
                required
                placeholder="Contoh:&#10;Fasilitas pada peralatan Monitor Sign In terdapat kondisi sebagai berikut :&#10;1. File / Media Player sering mengalami file corrupt."
                value={formData.uraian}
                onChange={e => setFormData({ ...formData, uraian: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                7b. Dampak Kerusakan
              </label>
              <textarea
                rows={4}
                required
                placeholder="Contoh:&#10;1. Penumpang tidak dapat melihat informasi penunjuk arah dengan jelas...&#10;2. Kurangnya informasi dapat menyebabkan keterlambatan..."
                value={formData.dampak}
                onChange={e => setFormData({ ...formData, dampak: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* 8 & 9. Tindakan & Penyebab */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                8. Tindakan Pengecekan / Tindak Lanjut
              </label>
              <textarea
                rows={4}
                required
                placeholder="Contoh:&#10;Dilakukan pengecekan dan tindak lanjut oleh personil Electronic Facility & IT pada Monitor Sign In sebagai berikut :&#10;1. Pengecekan File/ media player..."
                value={formData.tindakan}
                onChange={e => setFormData({ ...formData, tindakan: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                9. Penyebab Kerusakan
              </label>
              <textarea
                rows={4}
                required
                placeholder="Contoh: Monitor Sign In beroperasi 24 Jam sehingga menyebabkan file selalu corrupt"
                value={formData.penyebab}
                onChange={e => setFormData({ ...formData, penyebab: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Penandatangan (Diketahui & Dibuat) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Diketahui Oleh
                </label>
                <input
                  type="text"
                  value={formData.diketahuiOleh}
                  onChange={e => setFormData({ ...formData, diketahuiOleh: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Jabatan Diketahui
                </label>
                <input
                  type="text"
                  value={formData.jabatanDiketahui}
                  onChange={e => setFormData({ ...formData, jabatanDiketahui: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Dibuat Oleh (Supervisor)
                </label>
                <input
                  type="text"
                  value={formData.dibuatOleh}
                  onChange={e => setFormData({ ...formData, dibuatOleh: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Jabatan Dibuat
                </label>
                <input
                  type="text"
                  value={formData.jabatanDibuat}
                  onChange={e => setFormData({ ...formData, jabatanDibuat: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Dokumentasi Foto */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Dokumentasi Foto Kerusakan
              </label>
              <label className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#175390] rounded-xl text-xs font-bold cursor-pointer border border-blue-200 transition-colors">
                📷 + Tambah Foto Dokumentasi
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {formData.dokumentasi.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.dokumentasi.map((doc, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          dokumentasi: prev.dokumentasi.filter((_, idx) => idx !== i)
                        }))
                      }
                      className="absolute top-5 right-5 w-7 h-7 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shadow-md"
                    >
                      ✕
                    </button>
                    <img src={doc.foto} alt="Preview" className="w-full h-44 object-contain bg-white rounded-xl border border-slate-100" />
                    <input
                      type="text"
                      placeholder="Keterangan foto (Contoh: File / Media Player (Rusak))"
                      value={doc.keterangan}
                      onChange={e => {
                        const next = [...formData.dokumentasi];
                        next[i].keterangan = e.target.value;
                        setFormData({ ...formData, dokumentasi: next });
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
              className="px-8 py-3 bg-[#175390] hover:bg-[#124273] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : editingReport ? 'Simpan Perubahan' : 'Simpan Laporan Kerusakan'}
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
                Laporan Kerusakan Peralatan
              </h1>
              <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-rose-200">
                Form Kondisi Peralatan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Daftar laporan kerusakan peralatan beserta Report Code sebagai acuan tindak lanjut perbaikan dan cetak PDF.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="px-5 py-3 bg-[#175390] hover:bg-[#124273] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
          >
            + Buat Laporan Kerusakan
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari berdasarkan Report Code, nama peralatan, lokasi, atau bagian..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {(['Semua', 'Open', 'Resolved'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  statusFilter === st
                    ? 'bg-[#175390] text-white border-[#175390]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'Semua' ? 'Semua Status' : st === 'Open' ? '🔴 Belum Diperbaiki' : '✅ Sudah Diperbaiki'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-bold text-xs">Memuat data laporan kerusakan...</div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <p className="text-slate-500 font-bold text-sm">Belum ada data Laporan Kerusakan Peralatan.</p>
            <button
              onClick={openCreateForm}
              className="mt-4 px-5 py-2.5 bg-[#175390] text-white rounded-xl text-xs font-bold hover:bg-[#124273]"
            >
              + Buat Laporan Kerusakan Sekarang
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Report Code</th>
                    <th className="py-3.5 px-4">Tgl & Jam Kerusakan</th>
                    <th className="py-3.5 px-4">Peralatan & Bagian</th>
                    <th className="py-3.5 px-4">Lokasi & Fasilitas</th>
                    <th className="py-3.5 px-4">Kategori & Hambatan</th>
                    <th className="py-3.5 px-4">Status Tindak Lanjut</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredReports.map(r => (
                    <tr key={r._id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-[#175390] border border-blue-200">
                          {r.reportCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{r.tglKerusakan}</div>
                        <div className="text-xs text-slate-500">{r.jamKerusakan}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800">{r.peralatan}</div>
                        <div className="text-xs text-slate-500">Bagian: {r.bagian}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-700">{r.lokasi}</div>
                        <div className="text-[11px] text-slate-500">{r.fasilitas}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-slate-700 max-w-xs truncate" title={r.kategoriKerusakan}>
                          {r.kategoriKerusakan}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-extrabold">
                          Hambatan: {r.kodeHambatan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.statusLaporan === 'Resolved' ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                              ✅ Selesai Diperbaiki
                            </span>
                            {r.repairReportCode && (
                              <div className="text-[11px] font-mono font-bold text-slate-600">
                                Ref: {r.repairReportCode}
                              </div>
                            )}
                            {r.jumlahJamTerputus && r.jumlahJamTerputus !== '-' && (
                              <div className="text-[11px] font-bold text-blue-700">
                                ⏱️ Terputus: {r.jumlahJamTerputus}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                            🔴 Menunggu Perbaikan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReport(r);
                              setMode('detail');
                            }}
                            className="px-3 py-1.5 bg-[#175390] hover:bg-[#124273] text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            📄 Detail & PDF
                          </button>
                          {onNavigateToPerbaikan && r.statusLaporan !== 'Resolved' && (
                            <button
                              onClick={() => onNavigateToPerbaikan(r)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              🛠️ Perbaiki
                            </button>
                          )}
                          <button
                            onClick={() => openEditForm(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Hapus"
                          >
                            🗑️
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
