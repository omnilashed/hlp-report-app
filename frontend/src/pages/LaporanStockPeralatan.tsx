import { useState, useEffect, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

export interface StockEquipmentItem {
  _id: string;
  namaPeralatan: string;
  lokasi: string;
  lokasiPenyimpanan: string;
  merek: string;
  serialNumber: string;
  nomorSertifikasi: string;
  tipePeralatan: string;
  statusKepemilikan: 'Inventaris API' | 'Sewa';
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: string;
  kondisi: 'Normal' | 'Rusak';
  statusPeralatan: 'Standby' | 'Ready' | 'Damaged' | 'Maintenance';
  keterangan?: string;
  equipmentMasterId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LaporanStockProps {
  userRole: string;
}

export default function LaporanStockPeralatan({ userRole }: LaporanStockProps) {
  const [stocks, setStocks] = useState<StockEquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [activeMainCategory, setActiveMainCategory] = useState<'Semua' | 'Faskampen' | 'Elban'>('Semua');
  const [activeSubCategory, setActiveSubCategory] = useState<'Semua' | 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedKondisi, setSelectedKondisi] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // CRUD Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockEquipmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deploy to Master Modal
  const [deployItem, setDeployItem] = useState<StockEquipmentItem | null>(null);
  const [deployLocation, setDeployLocation] = useState('');
  const [deployNotes, setDeployNotes] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    namaPeralatan: '',
    lokasi: '',
    lokasiPenyimpanan: 'Gudang ELIT',
    merek: '',
    serialNumber: '',
    nomorSertifikasi: '',
    tipePeralatan: '',
    statusKepemilikan: 'Inventaris API' as 'Inventaris API' | 'Sewa',
    mainCategory: 'Faskampen' as 'Faskampen' | 'Elban',
    subCategory: 'Fasilitas IT',
    kondisi: 'Normal' as 'Normal' | 'Rusak',
    statusPeralatan: 'Standby' as 'Standby' | 'Ready' | 'Damaged' | 'Maintenance',
    keterangan: ''
  });

  // Notification dialog
  const [notification, setNotification] = useState<{ title: string; message: string; isError?: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const canManage = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'OFFICE';

  const fetchStocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stock-equipments');
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch (err) {
      console.error('Error fetching stock equipments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleSyncFromMaster = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/stock-equipments/sync-from-master', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotification({ title: 'Sinkronisasi Berhasil', message: data.message });
        await fetchStocks();
      } else {
        setNotification({ title: 'Gagal', message: data.message || 'Gagal sinkronisasi data', isError: true });
      }
    } catch (err) {
      setNotification({ title: 'Error', message: 'Gagal terhubung ke server', isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter list
  const filteredStocks = useMemo(() => {
    return stocks.filter(item => {
      if (activeMainCategory !== 'Semua' && item.mainCategory !== activeMainCategory) return false;
      if (activeMainCategory === 'Elban' && activeSubCategory !== 'Semua' && item.subCategory !== activeSubCategory) return false;
      if (selectedStatus !== 'Semua' && item.statusPeralatan !== selectedStatus) return false;
      if (selectedKondisi !== 'Semua' && item.kondisi !== selectedKondisi) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.namaPeralatan || '').toLowerCase().includes(q);
        const matchLoc = (item.lokasi || '').toLowerCase().includes(q);
        const matchStockLoc = (item.lokasiPenyimpanan || '').toLowerCase().includes(q);
        const matchMerek = (item.merek || '').toLowerCase().includes(q);
        const matchSN = (item.serialNumber || '').toLowerCase().includes(q);
        const matchTipe = (item.tipePeralatan || '').toLowerCase().includes(q);
        if (!matchName && !matchLoc && !matchStockLoc && !matchMerek && !matchSN && !matchTipe) {
          return false;
        }
      }

      return true;
    });
  }, [stocks, activeMainCategory, activeSubCategory, selectedStatus, selectedKondisi, searchQuery]);

  // Grouped by namaPeralatan
  const groupedStocks = useMemo(() => {
    return filteredStocks.reduce((acc, item) => {
      const g = item.namaPeralatan.trim() || 'Lain-lain';
      if (!acc[g]) acc[g] = [];
      acc[g].push(item);
      return acc;
    }, {} as Record<string, StockEquipmentItem[]>);
  }, [filteredStocks]);

  // Stats
  const stats = useMemo(() => {
    const total = stocks.length;
    const standbyCount = stocks.filter(s => s.statusPeralatan === 'Standby').length;
    const readyCount = stocks.filter(s => s.statusPeralatan === 'Ready').length;
    const damagedCount = stocks.filter(s => s.statusPeralatan === 'Damaged' || s.kondisi === 'Rusak').length;
    const faskampen = stocks.filter(s => s.mainCategory === 'Faskampen').length;
    const elban = stocks.filter(s => s.mainCategory === 'Elban').length;
    return { total, standbyCount, readyCount, damagedCount, faskampen, elban };
  }, [stocks]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      namaPeralatan: '',
      lokasi: '-',
      lokasiPenyimpanan: 'Gudang ELIT',
      merek: '',
      serialNumber: '',
      nomorSertifikasi: '',
      tipePeralatan: '',
      statusKepemilikan: 'Inventaris API',
      mainCategory: activeMainCategory === 'Semua' ? 'Faskampen' : activeMainCategory,
      subCategory: activeSubCategory === 'Semua' ? 'Fasilitas IT' : activeSubCategory,
      kondisi: 'Normal',
      statusPeralatan: 'Standby',
      keterangan: ''
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: StockEquipmentItem) => {
    setEditingItem(item);
    setFormData({
      namaPeralatan: item.namaPeralatan,
      lokasi: item.lokasi || '-',
      lokasiPenyimpanan: item.lokasiPenyimpanan || 'Gudang ELIT',
      merek: item.merek === '-' ? '' : item.merek,
      serialNumber: item.serialNumber === '-' ? '' : item.serialNumber,
      nomorSertifikasi: item.nomorSertifikasi === '-' ? '' : item.nomorSertifikasi,
      tipePeralatan: item.tipePeralatan === '-' ? '' : item.tipePeralatan,
      statusKepemilikan: item.statusKepemilikan,
      mainCategory: item.mainCategory,
      subCategory: item.subCategory || 'Fasilitas IT',
      kondisi: item.kondisi,
      statusPeralatan: item.statusPeralatan,
      keterangan: item.keterangan || ''
    });
    setIsFormModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPeralatan.trim() || !formData.lokasiPenyimpanan.trim()) {
      setNotification({ title: 'Peringatan', message: 'Nama peralatan dan lokasi penyimpanan spesifik wajib diisi!', isError: true });
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    const payload: any = {
      namaPeralatan: formData.namaPeralatan.trim(),
      lokasi: formData.lokasi.trim() || '-',
      lokasiPenyimpanan: formData.lokasiPenyimpanan.trim(),
      merek: formData.merek.trim() || '-',
      serialNumber: formData.serialNumber.trim() || '-',
      nomorSertifikasi: formData.nomorSertifikasi.trim() || '-',
      tipePeralatan: formData.tipePeralatan.trim() || '-',
      statusKepemilikan: formData.statusKepemilikan,
      mainCategory: formData.mainCategory,
      subCategory: formData.mainCategory === 'Elban' ? formData.subCategory : '',
      kondisi: formData.kondisi,
      statusPeralatan: formData.statusPeralatan,
      keterangan: formData.keterangan.trim()
    };

    try {
      const url = editingItem ? `/api/stock-equipments/${editingItem._id}` : '/api/stock-equipments';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setIsFormModalOpen(false);
        setNotification({
          title: 'Berhasil',
          message: editingItem ? 'Data stock berhasil diperbarui!' : 'Stock peralatan baru berhasil ditambahkan!'
        });
        await fetchStocks();
      } else {
        setNotification({ title: 'Gagal', message: data.message || 'Gagal menyimpan data stock', isError: true });
      }
    } catch (err) {
      setNotification({ title: 'Error', message: 'Gagal menghubungi server', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployToMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployItem || !deployLocation.trim()) return;

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/stock-equipments/${deployItem._id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetLokasi: deployLocation.trim(),
          keteranganDeploy: deployNotes.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDeployItem(null);
        setNotification({
          title: 'Berhasil Diaktifkan ke Data Master',
          message: `Unit ${deployItem.namaPeralatan} (${deployItem.serialNumber}) telah aktif di lokasi ${deployLocation.trim()} dengan status READY!`
        });
        await fetchStocks();
      } else {
        setNotification({ title: 'Gagal', message: data.message || 'Gagal deploy stock', isError: true });
      }
    } catch (err) {
      setNotification({ title: 'Error', message: 'Gagal menghubungi server', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStock = async (item: StockEquipmentItem) => {
    if (!window.confirm(`Hapus stock peralatan ${item.namaPeralatan} (${item.serialNumber}) dari gudang?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/stock-equipments/${item._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({ title: 'Berhasil', message: 'Data stock berhasil dihapus!' });
        await fetchStocks();
      } else {
        const data = await res.json();
        setNotification({ title: 'Gagal', message: data.message || 'Gagal menghapus data', isError: true });
      }
    } catch (err) {
      setNotification({ title: 'Error', message: 'Gagal menghubungi server', isError: true });
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Peralatan', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Peralatan', key: 'nama', width: 28 },
      { header: 'Lokasi Penyimpanan Spesifik', key: 'lokasiStock', width: 30 },
      { header: 'Lokasi Asal/Ref', key: 'lokasi', width: 22 },
      { header: 'Merek', key: 'merek', width: 16 },
      { header: 'Serial Number (S/N)', key: 'sn', width: 20 },
      { header: 'Tipe / Series', key: 'tipe', width: 22 },
      { header: 'Nomor Sertifikasi', key: 'sertifikat', width: 22 },
      { header: 'Kepemilikan', key: 'kepemilikan', width: 16 },
      { header: 'Kategori', key: 'kategori', width: 16 },
      { header: 'Kondisi', key: 'kondisi', width: 12 },
      { header: 'Status Peralatan', key: 'status', width: 16 },
      { header: 'Keterangan', key: 'keterangan', width: 30 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF175390' } };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    filteredStocks.forEach((item, idx) => {
      const row = sheet.addRow({
        no: idx + 1,
        nama: item.namaPeralatan,
        lokasiStock: item.lokasiPenyimpanan,
        lokasi: item.lokasi,
        merek: item.merek,
        sn: item.serialNumber,
        tipe: item.tipePeralatan,
        sertifikat: item.nomorSertifikasi,
        kepemilikan: item.statusKepemilikan,
        kategori: item.mainCategory,
        kondisi: item.kondisi,
        status: item.statusPeralatan,
        keterangan: item.keterangan || ''
      });

      row.alignment = { vertical: 'middle' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Laporan_Stock_Peralatan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!printRef.current) return;
    const opt: any = {
      margin: [8, 8, 8, 8],
      filename: `Laporan_Stock_Peralatan_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', '.break-inside-avoid'] }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-[#175390] rounded-2xl border border-blue-100 text-xl font-bold shadow-sm">
              📦
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Laporan Stock Peralatan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Monitoring unit cadangan/standby di gudang, terintegrasi otomatis dengan Data Master Fasilitas
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncFromMaster}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Tarik unit berstatus Standby dari Data Master Fasilitas ke Stock"
          >
            <span>{isSyncing ? '⏳' : '🔄'}</span>
            <span>Tarik Standby dari Master</span>
          </button>

          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>📊</span>
            <span>Excel</span>
          </button>

          <button
            onClick={exportToPDF}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>📄</span>
            <span>PDF</span>
          </button>

          {canManage && (
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-gradient-to-r from-[#175390] to-blue-600 hover:from-[#134477] hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>+</span>
              <span>Tambah Stock Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#175390] flex items-center justify-center text-lg font-black shrink-0">
            📦
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stock Unit</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg font-black shrink-0">
            🟡
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-700">{stats.standbyCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Standby (Siap Pakai)</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black shrink-0">
            🟢
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{stats.readyCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ready (Terdeploy)</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg font-black shrink-0">
            🔴
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-700">{stats.damagedCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rusak / Perlu Servis</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['Semua', 'Faskampen', 'Elban'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveMainCategory(cat);
                  setActiveSubCategory('Semua');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMainCategory === cat
                    ? 'bg-white text-[#175390] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'Faskampen' ? '🛡️ Faskampen' : cat === 'Elban' ? '⚡ Elban' : '🌐 Semua'}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'grouped' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>🗂️</span>
              <span>Grup Kartu</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>📋</span>
              <span>Tabel</span>
            </button>
          </div>
        </div>

        {/* Sub Category Tabs jika Elban */}
        {activeMainCategory === 'Elban' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500">Sub-Kategori Elban:</span>
            {(['Semua', 'Fasilitas IT', 'Fasilitas Penunjang Bandar Udara'] as const).map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubCategory(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  activeSubCategory === sub
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
          <input
            type="text"
            placeholder="Cari nama peralatan, S/N, tipe, lokasi penyimpanan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          />

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Status Operasional</option>
            <option value="Standby">🟡 Standby (Di Gudang)</option>
            <option value="Ready">🟢 Ready (Terdeploy)</option>
            <option value="Maintenance">🟠 Maintenance</option>
            <option value="Damaged">🔴 Damaged / Rusak</option>
          </select>

          <select
            value={selectedKondisi}
            onChange={e => setSelectedKondisi(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Kondisi Fisik</option>
            <option value="Normal">✅ Normal</option>
            <option value="Rusak">❌ Rusak</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">
          ⏳ Memuat data stock peralatan...
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="text-4xl">📦</div>
          <div className="text-base font-bold text-slate-700">Tidak ada data stock peralatan</div>
          <p className="text-xs text-slate-500">
            Belum ada peralatan standby di gudang atau filter tidak menemukan hasil yang cocok.
          </p>
          {canManage && (
            <button
              onClick={openAddModal}
              className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100"
            >
              + Tambah Stock Sekarang
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED VIEW */
        <div className="space-y-4">
          {Object.entries(groupedStocks).map(([namaPeralatan, items]) => {
            const isExpanded = expandedGroups[namaPeralatan] !== false;
            return (
              <div key={namaPeralatan} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  onClick={() => toggleGroup(namaPeralatan)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-all select-none border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📦</span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">{namaPeralatan}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                          {items.length} Unit di Stock
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Kategori: <strong>{items[0]?.mainCategory} {items[0]?.subCategory ? `• ${items[0].subCategory}` : ''}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">{isExpanded ? '▲ Ciutkan' : '▼ Buka'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {items.map(item => (
                      <div
                        key={item._id}
                        className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between gap-3 hover:border-blue-300 transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            {/* Lokasi Penyimpanan Spesifik (FITUR UTAMA) */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                                📍 {item.lokasiPenyimpanan}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 font-medium pt-1">
                              Lokasi Asal/Ref: <strong className="text-slate-700">{item.lokasi || '-'}</strong>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="text-xs text-slate-500">
                                Merek: <strong className="text-slate-700">{item.merek || '-'}</strong>
                              </span>
                              <span className="text-xs text-slate-500">
                                S/N: <strong className="text-slate-700 font-mono">{item.serialNumber || '-'}</strong>
                              </span>
                              <span className="text-xs text-slate-500">
                                Tipe: <strong className="text-slate-700">{item.tipePeralatan || '-'}</strong>
                              </span>
                              {item.nomorSertifikasi && item.nomorSertifikasi !== '-' && (
                                <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  📜 {item.nomorSertifikasi}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                item.statusKepemilikan === 'Sewa'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                🏷️ {item.statusKepemilikan}
                              </span>
                            </div>

                            {item.keterangan && (
                              <p className="text-[11px] text-slate-500 italic pt-1">
                                Ket: {item.keterangan}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions */}
                          {canManage && (
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setDeployItem(item);
                                  setDeployLocation(item.lokasi !== '-' ? item.lokasi : '');
                                  setDeployNotes('');
                                }}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                title="Pindahkan unit ke Data Master Fasilitas (Status Ready)"
                              >
                                <span>🚀</span>
                                <span>Deploy</span>
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStock(item)}
                                className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-center"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Status Badges Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              item.kondisi === 'Normal'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {item.kondisi === 'Normal' ? '✅ Normal' : '❌ Rusak'}
                            </span>

                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              item.statusPeralatan === 'Standby'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.statusPeralatan === 'Ready'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {item.statusPeralatan === 'Standby' ? '🟡 Standby di Gudang' : item.statusPeralatan === 'Ready' ? '🟢 Ready (Master)' : item.statusPeralatan}
                            </span>
                          </div>

                          {item.equipmentMasterId && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Linked to Master
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Peralatan</th>
                  <th className="py-3 px-4">Lokasi Penyimpanan Spesifik</th>
                  <th className="py-3 px-4">Lokasi Asal/Ref</th>
                  <th className="py-3 px-4">Merek & S/N</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Kondisi</th>
                  <th className="py-3 px-4">Status</th>
                  {canManage && <th className="py-3 px-4 text-right w-28">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStocks.map((item, idx) => (
                  <tr key={item._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div>{item.namaPeralatan}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{item.tipePeralatan || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        📍 {item.lokasiPenyimpanan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{item.lokasi || '-'}</td>
                    <td className="py-3 px-4">
                      <div>{item.merek || '-'}</div>
                      <div className="font-mono text-[10px] text-slate-500">{item.serialNumber || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.mainCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.kondisi === 'Normal' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}>
                        {item.kondisi}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.statusPeralatan === 'Standby' ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {item.statusPeralatan}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setDeployItem(item);
                              setDeployLocation(item.lokasi !== '-' ? item.lokasi : '');
                              setDeployNotes('');
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-sm"
                            title="Deploy ke Data Master"
                          >
                            Deploy
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteStock(item)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                            title="Hapus"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden container for PDF export */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ width: '1060px', padding: '16px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>LAPORAN STOCK PERALATAN</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#475569' }}>
              Bandara Internasional Halim Perdanakusuma • Dicetak pada {new Date().toLocaleDateString('id-ID')}
            </p>
          </div>
          <table border={1} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#175390', color: '#fff', textAlign: 'center' }}>
                <th style={{ padding: '6px' }}>No</th>
                <th style={{ padding: '6px' }}>Nama Peralatan</th>
                <th style={{ padding: '6px' }}>Lokasi Penyimpanan Spesifik</th>
                <th style={{ padding: '6px' }}>Merek</th>
                <th style={{ padding: '6px' }}>S/N</th>
                <th style={{ padding: '6px' }}>Tipe</th>
                <th style={{ padding: '6px' }}>Kategori</th>
                <th style={{ padding: '6px' }}>Kondisi</th>
                <th style={{ padding: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>{item.namaPeralatan}</td>
                  <td style={{ padding: '5px', color: '#1e3a8a', fontWeight: 'bold' }}>{item.lokasiPenyimpanan}</td>
                  <td style={{ padding: '5px' }}>{item.merek}</td>
                  <td style={{ padding: '5px', fontFamily: 'monospace' }}>{item.serialNumber}</td>
                  <td style={{ padding: '5px' }}>{item.tipePeralatan}</td>
                  <td style={{ padding: '5px', textAlign: 'center' }}>{item.mainCategory}</td>
                  <td style={{ padding: '5px', textAlign: 'center' }}>{item.kondisi}</td>
                  <td style={{ padding: '5px', textAlign: 'center' }}>{item.statusPeralatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT STOCK */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 bg-gradient-to-r from-[#175390] to-blue-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">
                  {editingItem ? 'Edit Data Stock Peralatan' : 'Tambah Stock Peralatan Baru'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Masukkan unit cadangan / standby dengan lokasi penyimpanan spesifik
                </p>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-white/80 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Nama Peralatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CCTV Indoor, Switch Access, HT Motorola, X-Ray..."
                  value={formData.namaPeralatan}
                  onChange={e => setFormData({ ...formData, namaPeralatan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* LOKASI PENYIMPANAN SPESIFIK (FITUR UTAMA) */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <label className="text-xs font-black text-indigo-900 uppercase tracking-wider block">
                  📍 Lokasi Penyimpanan Spesifik (Wajib Diisi) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gudang ELIT Rak A-2, Workshop Elban Laci 1, Ruang Server Rack 3..."
                  value={formData.lokasiPenyimpanan}
                  onChange={e => setFormData({ ...formData, lokasiPenyimpanan: e.target.value })}
                  className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-sm font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-[11px] text-indigo-700 font-medium">
                  Menunjukkan letak fisik persis tempat peralatan standby disimpan untuk berjaga-jaga.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Kategori Utama
                  </label>
                  <select
                    value={formData.mainCategory}
                    onChange={e => setFormData({ ...formData, mainCategory: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Faskampen">Faskampen (Keamanan Penerbangan)</option>
                    <option value="Elban">Elban (Elektronika Bandara)</option>
                  </select>
                </div>

                {formData.mainCategory === 'Elban' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Sub-Kategori Elban
                    </label>
                    <select
                      value={formData.subCategory}
                      onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Fasilitas IT">Fasilitas IT</option>
                      <option value="Fasilitas Penunjang Bandar Udara">Fasilitas Penunjang Bandar Udara</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Merek Peralatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cisco, Hikvision, Smith..."
                    value={formData.merek}
                    onChange={e => setFormData({ ...formData, merek: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SN-884920..."
                    value={formData.serialNumber}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Tipe / Series Peralatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Catalyst 2960, DS-2CD..."
                    value={formData.tipePeralatan}
                    onChange={e => setFormData({ ...formData, tipePeralatan: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Status Kepemilikan
                  </label>
                  <select
                    value={formData.statusKepemilikan}
                    onChange={e => setFormData({ ...formData, statusKepemilikan: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Inventaris API">Inventaris API (Milik API)</option>
                    <option value="Sewa">Sewa (Vendor / Pihak Ketiga)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Status Peralatan di Stock
                  </label>
                  <select
                    value={formData.statusPeralatan}
                    onChange={e => setFormData({ ...formData, statusPeralatan: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Standby">🟡 Standby (Di Gudang)</option>
                    <option value="Ready">🟢 Ready (Otomatis masuk ke Master)</option>
                    <option value="Maintenance">🟠 Maintenance</option>
                    <option value="Damaged">🔴 Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                    Kondisi Fisik
                  </label>
                  <select
                    value={formData.kondisi}
                    onChange={e => setFormData({ ...formData, kondisi: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Normal">✅ Normal</option>
                    <option value="Rusak">❌ Rusak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Catatan kondisi, riwayat servis, atau kelengkapan aksesoris..."
                  value={formData.keterangan}
                  onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#175390] hover:bg-[#124273] shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEPLOY KE DATA MASTER (STATUS READY) */}
      {deployItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <div className="text-2xl mb-1">🚀</div>
              <h3 className="font-extrabold text-lg">Aktifkan ke Data Master Fasilitas</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Unit stock akan dipindahkan ke operasional aktif lapangan dengan status <strong>READY</strong>.
              </p>
            </div>

            <form onSubmit={handleDeployToMaster} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>Peralatan: <strong className="text-slate-800">{deployItem.namaPeralatan}</strong></div>
                <div>S/N: <strong className="font-mono text-slate-800">{deployItem.serialNumber}</strong></div>
                <div>Lokasi Simpan: <strong className="text-indigo-700">{deployItem.lokasiPenyimpanan}</strong></div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Lokasi Operasional Lapangan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SCP2 Line C, Terminal Sewa, Ruang Server..."
                  value={deployLocation}
                  onChange={e => setDeployLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Catatan Penggantian / Deploy (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Menggantikan unit yang rusak di SCP2..."
                  value={deployNotes}
                  onChange={e => setDeployNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeployItem(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Aktifkan Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATION DIALOG */}
      {notification && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 text-center space-y-3">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl ${
              notification.isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {notification.isError ? '⚠️' : '✅'}
            </div>
            <h4 className="font-extrabold text-base text-slate-800">{notification.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="mt-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
