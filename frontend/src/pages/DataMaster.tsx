import { useState, useEffect, useMemo } from 'react';

export type EquipmentStatus = 'Ready' | 'Standby' | 'Damaged' | 'Maintenance';
export type EquipmentCondition = 'Normal' | 'Rusak';

export interface EquipmentItem {
  _id: string;
  namaPeralatan: string;
  lokasi: string;
  merek: string;
  serialNumber?: string;
  snPeralatan?: string;
  nomorSertifikasi?: string;
  tipePeralatan?: string;
  seriesPeralatan?: string;
  statusKepemilikan?: 'Inventaris API' | 'Sewa';
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara' | '';
  kondisi: EquipmentCondition;
  statusPeralatan: EquipmentStatus;
  lokasiStatus?: string;
  keteranganRusak?: string;
}

interface DataMasterProps {
  userRole: string;
  onCreateDamageReport?: (equipment: EquipmentItem) => void;
  onViewDamageReportDetail?: (reportId: string) => void;
  onViewRepairReportDetail?: (reportId: string) => void;
}

export default function DataMaster({
  userRole,
  onCreateDamageReport,
  onViewDamageReportDetail,
  onViewRepairReportDetail
}: DataMasterProps) {
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [activeMainCategory, setActiveMainCategory] = useState<'Semua' | 'Faskampen' | 'Elban'>('Semua');
  const [activeSubCategory, setActiveSubCategory] = useState<'Semua' | 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerek, setSelectedMerek] = useState('Semua');
  const [selectedJenis, setSelectedJenis] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState<'Semua' | EquipmentStatus>('Semua');
  const [selectedKondisi, setSelectedKondisi] = useState<'Semua' | EquipmentCondition>('Semua');
  const [selectedReportStatus, setSelectedReportStatus] = useState<'Semua' | 'Not Yet' | 'Laporan Kerusakan New' | 'Done'>('Semua');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Popup ringkasan laporan kerusakan ketika status "Done" diklik
  const [popupDamageReport, setPopupDamageReport] = useState<any | null>(null);

  // CRUD Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    namaPeralatan: '',
    lokasi: '',
    merek: '',
    serialNumber: '',
    nomorSertifikasi: '',
    tipePeralatan: '',
    statusKepemilikan: 'Inventaris API' as 'Inventaris API' | 'Sewa',
    mainCategory: 'Faskampen' as 'Faskampen' | 'Elban',
    subCategory: 'Fasilitas IT' as 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara',
    kondisi: 'Normal' as EquipmentCondition,
    statusPeralatan: 'Ready' as EquipmentStatus,
    lokasiStatus: '',
    keteranganRusak: ''
  });

  // Confirmation / Notification modal
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    dangerMode: false,
    isNotificationOnly: false,
    actionLabel: 'OK',
    secondaryActionLabel: '',
    onSecondaryAction: undefined as (() => void) | undefined,
    onConfirm: () => {}
  });

  const canManage = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'OFFICE';

  const showNotification = (
    title: string,
    message: string,
    dangerMode = false,
    secondaryActionLabel = '',
    onSecondaryAction?: () => void
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      dangerMode,
      isNotificationOnly: true,
      actionLabel: 'Tutup',
      secondaryActionLabel,
      onSecondaryAction,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  const fetchAllMasterData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [resEq, resDmg] = await Promise.all([
        fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/damage-reports', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resEq.ok) {
        const data = await resEq.json();
        const normalized: EquipmentItem[] = (Array.isArray(data) ? data : []).map((item: any) => ({
          ...item,
          _id: item._id && typeof item._id === 'object' && item._id.$oid ? String(item._id.$oid) : String(item._id),
          merek: item.merek || '-',
          kondisi: item.kondisi || 'Normal',
          statusPeralatan: item.statusPeralatan || 'Ready',
          lokasiStatus: item.lokasiStatus || '',
          keteranganRusak: item.keteranganRusak || ''
        }));
        setEquipments(normalized);
      } else {
        showNotification('Gagal', 'Gagal mengambil data master fasilitas.', true);
      }

      if (resDmg.ok) {
        const dmgData = await resDmg.json();
        setDamageReports(Array.isArray(dmgData) ? dmgData : []);
      }
    } catch (error) {
      console.error('Error fetching equipments:', error);
      showNotification('Error', 'Tidak dapat terhubung ke server backend.', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMasterData();
  }, []);

  // Ambil SEMUA riwayat laporan kerusakan & perbaikan untuk suatu unit peralatan (diurutkan dari yang terbaru)
  const getAllLinkedDamageReports = (item: EquipmentItem): any[] => {
    return damageReports
      .filter(
        r =>
          (r.equipmentId && String(r.equipmentId) === String(item._id)) ||
          ((r.peralatan || '').toLowerCase().trim() === (item.namaPeralatan || '').toLowerCase().trim() &&
            (r.lokasi || '').toLowerCase().trim() === (item.lokasi || '').toLowerCase().trim())
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  };

  // Cari laporan kerusakan yang masih aktif (Open / belum diperbaiki) untuk peralatan ini
  const getActiveOpenDamageReport = (item: EquipmentItem) => {
    const all = getAllLinkedDamageReports(item);
    return all.find(r => r.statusLaporan !== 'Resolved') || null;
  };

  // Status pembuatan laporan kerusakan untuk setiap peralatan:
  // - Jika ada laporan kerusakan yang masih Open -> 'Done' (mengacu ke laporan aktif tersebut)
  // - Jika alat rusak kembali (Damaged / Maintenance / Kondisi Rusak) padahal laporan sebelumnya sudah Done + ada Laporan Perbaikan (Resolved) -> 'Laporan Kerusakan New'
  // - Jika alat rusak pertama kali dan belum ada laporan sama sekali -> 'Not Yet'
  // - Jika alat saat ini Normal/Ready namun punya riwayat yang sudah selesai diperbaiki -> 'Done' (mengacu ke riwayat terakhir)
  const getDamageReportStatus = (
    item: EquipmentItem
  ): { status: 'Done' | 'Not Yet' | 'Laporan Kerusakan New' | 'Tidak Wajib'; report: any | null; history: any[] } => {
    const history = getAllLinkedDamageReports(item);
    const openReport = history.find(r => r.statusLaporan !== 'Resolved') || null;
    const resolvedReports = history.filter(r => r.statusLaporan === 'Resolved');
    const isBrokenOrMaint =
      item.statusPeralatan === 'Damaged' ||
      item.statusPeralatan === 'Maintenance' ||
      item.kondisi === 'Rusak';

    if (openReport) {
      return { status: 'Done', report: openReport, history };
    }

    if (isBrokenOrMaint) {
      if (resolvedReports.length > 0) {
        return { status: 'Laporan Kerusakan New', report: null, history };
      }
      return { status: 'Not Yet', report: null, history };
    }

    if (resolvedReports.length > 0) {
      return { status: 'Done', report: resolvedReports[0], history };
    }

    return { status: 'Tidak Wajib', report: null, history };
  };

  // Reset halaman ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeMainCategory,
    activeSubCategory,
    searchQuery,
    selectedMerek,
    selectedJenis,
    selectedStatus,
    selectedKondisi,
    selectedReportStatus
  ]);

  // Daftar merek unik
  const uniqueMereks = useMemo(() => {
    const scoped = equipments.filter(item => {
      if (activeMainCategory !== 'Semua' && item.mainCategory !== activeMainCategory) return false;
      if (activeMainCategory === 'Elban' && activeSubCategory !== 'Semua' && item.subCategory !== activeSubCategory) return false;
      return true;
    });
    const set = new Set<string>();
    scoped.forEach(item => {
      const m = (item.merek || '-').trim();
      set.add(m === '' ? '-' : m);
    });
    return Array.from(set).sort((a, b) => {
      if (a === '-') return 1;
      if (b === '-') return -1;
      return a.localeCompare(b);
    });
  }, [equipments, activeMainCategory, activeSubCategory]);

  const allMereksList = useMemo(() => {
    const set = new Set<string>();
    equipments.forEach(item => {
      const m = (item.merek || '').trim();
      if (m && m !== '-') set.add(m);
    });
    return Array.from(set).sort();
  }, [equipments]);

  const uniqueJenisList = useMemo(() => {
    const scoped = equipments.filter(item => {
      if (activeMainCategory !== 'Semua' && item.mainCategory !== activeMainCategory) return false;
      if (activeMainCategory === 'Elban' && activeSubCategory !== 'Semua' && item.subCategory !== activeSubCategory) return false;
      return true;
    });
    const set = new Set<string>();
    scoped.forEach(item => {
      if (item.namaPeralatan) set.add(item.namaPeralatan.trim());
    });
    return Array.from(set).sort();
  }, [equipments, activeMainCategory, activeSubCategory]);

  // Filter peralatan
  const filteredEquipments = useMemo(() => {
    return equipments.filter(item => {
      if (activeMainCategory !== 'Semua' && item.mainCategory !== activeMainCategory) return false;
      if (activeMainCategory === 'Elban' && activeSubCategory !== 'Semua' && item.subCategory !== activeSubCategory) return false;
      if (selectedMerek !== 'Semua') {
        const itemMerek = (item.merek || '-').trim() || '-';
        if (itemMerek.toLowerCase() !== selectedMerek.toLowerCase()) return false;
      }
      if (selectedJenis !== 'Semua' && item.namaPeralatan !== selectedJenis) return false;
      if (selectedStatus !== 'Semua' && (item.statusPeralatan || 'Ready') !== selectedStatus) return false;
      if (selectedKondisi !== 'Semua' && (item.kondisi || 'Normal') !== selectedKondisi) return false;
      if (selectedReportStatus !== 'Semua') {
        const repSt = getDamageReportStatus(item).status;
        if (repSt !== selectedReportStatus) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = (item.namaPeralatan || '').toLowerCase().includes(q);
        const matchLokasi = (item.lokasi || '').toLowerCase().includes(q);
        const matchMerek = (item.merek || '').toLowerCase().includes(q);
        const matchCat = (item.mainCategory || '').toLowerCase().includes(q);
        const matchSub = (item.subCategory || '').toLowerCase().includes(q);
        const matchStatus = (item.statusPeralatan || '').toLowerCase().includes(q);
        const matchLokasiStatus = (item.lokasiStatus || '').toLowerCase().includes(q);
        const matchSN = (item.serialNumber || item.snPeralatan || '').toLowerCase().includes(q);
        const matchTipe = (item.tipePeralatan || item.seriesPeralatan || '').toLowerCase().includes(q);
        const matchSertifikat = (item.nomorSertifikasi || '').toLowerCase().includes(q);
        const matchKepemilikan = (item.statusKepemilikan || '').toLowerCase().includes(q);
        if (!matchNama && !matchLokasi && !matchMerek && !matchCat && !matchSub && !matchStatus && !matchLokasiStatus && !matchSN && !matchTipe && !matchSertifikat && !matchKepemilikan) {
          return false;
        }
      }
      return true;
    });
  }, [
    equipments,
    damageReports,
    activeMainCategory,
    activeSubCategory,
    selectedMerek,
    selectedJenis,
    selectedStatus,
    selectedKondisi,
    selectedReportStatus,
    searchQuery
  ]);

  const groupedEquipments = useMemo(() => {
    return filteredEquipments.reduce((acc, item) => {
      if (!acc[item.namaPeralatan]) acc[item.namaPeralatan] = [];
      acc[item.namaPeralatan].push(item);
      return acc;
    }, {} as Record<string, EquipmentItem[]>);
  }, [filteredEquipments]);

  const stats = useMemo(() => {
    const total = equipments.length;
    const faskampen = equipments.filter(e => e.mainCategory === 'Faskampen').length;
    const elbanIT = equipments.filter(e => e.mainCategory === 'Elban' && e.subCategory === 'Fasilitas IT').length;
    const elbanPenunjang = equipments.filter(e => e.mainCategory === 'Elban' && e.subCategory === 'Fasilitas Penunjang Bandar Udara').length;
    const readyCount = equipments.filter(e => (e.statusPeralatan || 'Ready') === 'Ready').length;
    const standbyCount = equipments.filter(e => e.statusPeralatan === 'Standby').length;
    const damagedCount = equipments.filter(e => e.statusPeralatan === 'Damaged').length;
    const maintenanceCount = equipments.filter(e => e.statusPeralatan === 'Maintenance').length;
    const notYetCount = equipments.filter(e => {
      const st = getDamageReportStatus(e).status;
      return st === 'Not Yet' || st === 'Laporan Kerusakan New';
    }).length;
    const doneCount = equipments.filter(e => getDamageReportStatus(e).status === 'Done').length;
    return {
      total,
      faskampen,
      elbanIT,
      elbanPenunjang,
      readyCount,
      standbyCount,
      damagedCount,
      maintenanceCount,
      notYetCount,
      doneCount
    };
  }, [equipments, damageReports]);

  const totalPages = Math.max(1, Math.ceil(filteredEquipments.length / itemsPerPage));
  const paginatedEquipments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEquipments.slice(start, start + itemsPerPage);
  }, [filteredEquipments, currentPage]);

  const openAddModal = (preset?: Partial<typeof formData>) => {
    setEditingItem(null);
    const defaultMain = activeMainCategory === 'Semua' ? 'Faskampen' : activeMainCategory;
    const defaultSub = activeSubCategory === 'Semua' ? 'Fasilitas IT' : activeSubCategory;
    setFormData({
      namaPeralatan: preset?.namaPeralatan || '',
      lokasi: preset?.lokasi || '',
      merek: preset?.merek || '',
      serialNumber: preset?.serialNumber || '',
      nomorSertifikasi: preset?.nomorSertifikasi || '',
      tipePeralatan: preset?.tipePeralatan || '',
      statusKepemilikan: preset?.statusKepemilikan || 'Inventaris API',
      mainCategory: preset?.mainCategory || defaultMain,
      subCategory: preset?.subCategory || defaultSub,
      kondisi: preset?.kondisi || 'Normal',
      statusPeralatan: preset?.statusPeralatan || 'Ready',
      lokasiStatus: preset?.lokasiStatus || '',
      keteranganRusak: preset?.keteranganRusak || ''
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormData({
      namaPeralatan: item.namaPeralatan || '',
      lokasi: item.lokasi || '',
      merek: item.merek === '-' ? '' : (item.merek || ''),
      serialNumber: (item.serialNumber === '-' ? '' : (item.serialNumber || item.snPeralatan || '')) || '',
      nomorSertifikasi: (item.nomorSertifikasi === '-' ? '' : (item.nomorSertifikasi || '')) || '',
      tipePeralatan: (item.tipePeralatan === '-' ? '' : (item.tipePeralatan || item.seriesPeralatan || '')) || '',
      statusKepemilikan: item.statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API',
      mainCategory: item.mainCategory || 'Faskampen',
      subCategory: (item.subCategory as any) || 'Fasilitas IT',
      kondisi: item.kondisi || 'Normal',
      statusPeralatan: item.statusPeralatan || 'Ready',
      lokasiStatus: item.lokasiStatus || '',
      keteranganRusak: item.keteranganRusak || ''
    });
    setIsFormModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPeralatan.trim() || !formData.lokasi.trim()) {
      showNotification('Peringatan', 'Nama peralatan dan lokasi wajib diisi!', true);
      return;
    }

    if (['Standby', 'Damaged', 'Maintenance'].includes(formData.statusPeralatan) && !formData.lokasiStatus.trim()) {
      showNotification(
        'Lokasi Wajib Diisi',
        `Harap isi lokasi ${formData.statusPeralatan} terlebih dahulu ketika status peralatan diubah menjadi ${formData.statusPeralatan}!`,
        true
      );
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    const resolvedKondisi: EquipmentCondition =
      formData.statusPeralatan === 'Damaged' ? 'Rusak' : formData.kondisi;

    const payload: any = {
      namaPeralatan: formData.namaPeralatan.trim(),
      lokasi: formData.lokasi.trim(),
      merek: formData.merek.trim() !== '' ? formData.merek.trim() : '-',
      serialNumber: formData.serialNumber.trim() !== '' ? formData.serialNumber.trim() : '-',
      nomorSertifikasi: formData.nomorSertifikasi.trim() !== '' ? formData.nomorSertifikasi.trim() : '-',
      tipePeralatan: formData.tipePeralatan.trim() !== '' ? formData.tipePeralatan.trim() : '-',
      statusKepemilikan: formData.statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API',
      mainCategory: formData.mainCategory,
      subCategory: formData.mainCategory === 'Elban' ? formData.subCategory : undefined,
      kondisi: resolvedKondisi,
      statusPeralatan: formData.statusPeralatan,
      lokasiStatus: formData.statusPeralatan === 'Ready' ? '' : formData.lokasiStatus.trim(),
      keteranganRusak: resolvedKondisi === 'Rusak' ? formData.keteranganRusak.trim() : ''
    };

    try {
      if (editingItem) {
        payload.oldNamaPeralatan = editingItem.namaPeralatan;
        payload.oldLokasi = editingItem.lokasi;

        const res = await fetch(`/api/equipments/${encodeURIComponent(editingItem._id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          const updatedItem: EquipmentItem = {
            ...data,
            _id: String(data._id || editingItem._id),
            namaPeralatan: payload.namaPeralatan,
            lokasi: payload.lokasi,
            merek: payload.merek,
            serialNumber: payload.serialNumber,
            nomorSertifikasi: payload.nomorSertifikasi,
            tipePeralatan: payload.tipePeralatan,
            statusKepemilikan: payload.statusKepemilikan,
            kondisi: data.kondisi || payload.kondisi,
            statusPeralatan: data.statusPeralatan || payload.statusPeralatan,
            lokasiStatus: data.lokasiStatus ?? payload.lokasiStatus,
            keteranganRusak: data.keteranganRusak ?? payload.keteranganRusak
          };

          setEquipments(prev =>
            prev.map(item =>
              item._id === editingItem._id ||
              (item.namaPeralatan === editingItem.namaPeralatan && item.lokasi === editingItem.lokasi)
                ? updatedItem
                : item
            )
          );
          setIsFormModalOpen(false);

          const hasOpenDamageReport = !!getActiveOpenDamageReport(updatedItem);
          const isBrokenNow =
            updatedItem.statusPeralatan === 'Damaged' ||
            updatedItem.statusPeralatan === 'Maintenance' ||
            updatedItem.kondisi === 'Rusak';
          const needsReport = isBrokenNow && !hasOpenDamageReport;
          const hasPreviousRepaired = getAllLinkedDamageReports(updatedItem).some(r => r.statusLaporan === 'Resolved');

          if (needsReport && onCreateDamageReport) {
            showNotification(
              hasPreviousRepaired
                ? 'Peralatan Rusak Kembali — Laporan Kerusakan New'
                : 'Status Diubah ke ' + updatedItem.statusPeralatan,
              hasPreviousRepaired
                ? `Peralatan "${updatedItem.namaPeralatan}" (${updatedItem.lokasi}) kembali mengalami kerusakan setelah perbaikan sebelumnya. Status laporan kini menjadi "Laporan Kerusakan New" dan wajib dibuatkan Laporan Kerusakan baru.`
                : `Peralatan "${updatedItem.namaPeralatan}" (${updatedItem.lokasi}) kini berstatus ${updatedItem.statusPeralatan} dan WAJIB dibuatkan Laporan Kerusakan (Status Laporan: Not Yet).`,
              false,
              '📝 Buat Laporan Kerusakan Sekarang',
              () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                onCreateDamageReport(updatedItem);
              }
            );
          } else {
            showNotification('Berhasil', 'Data master peralatan berhasil diperbarui!');
          }
        } else {
          showNotification('Gagal', data.message || 'Gagal memperbarui data.', true);
        }
      } else {
        const res = await fetch('/api/equipments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setEquipments(prev => [data, ...prev]);
          setIsFormModalOpen(false);
          setExpandedGroups(prev => ({ ...prev, [data.namaPeralatan]: true }));
          showNotification('Berhasil', 'Data master peralatan baru berhasil ditambahkan!');
        } else {
          showNotification('Gagal', data.message || 'Gagal menambahkan data.', true);
        }
      }
    } catch (error) {
      showNotification('Error', 'Gagal menghubungi server.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = (item: EquipmentItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data Master',
      message: `Yakin ingin menghapus "${item.namaPeralatan}" di lokasi "${item.lokasi}" (Merek: ${item.merek || '-'})? Data yang dihapus akan langsung terupdate pada daftar pengecekan fasilitas.`,
      dangerMode: true,
      isNotificationOnly: false,
      actionLabel: 'OK',
      secondaryActionLabel: '',
      onSecondaryAction: undefined,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const query = new URLSearchParams({
            namaPeralatan: item.namaPeralatan,
            lokasi: item.lokasi
          }).toString();
          const res = await fetch(`/api/equipments/${encodeURIComponent(item._id)}?${query}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setEquipments(prev =>
              prev.filter(
                e =>
                  e._id !== item._id &&
                  !(e.namaPeralatan === item.namaPeralatan && e.lokasi === item.lokasi)
              )
            );
            showNotification('Berhasil', 'Data peralatan berhasil dihapus dari Master Data.');
          } else {
            const err = await res.json();
            showNotification('Gagal', err.message || 'Gagal menghapus data.', true);
          }
        } catch (error) {
          showNotification('Error', 'Gagal menghubungi server.', true);
        }
      }
    });
  };

  const resetFilters = () => {
    setActiveMainCategory('Semua');
    setActiveSubCategory('Semua');
    setSelectedMerek('Semua');
    setSelectedJenis('Semua');
    setSelectedStatus('Semua');
    setSelectedKondisi('Semua');
    setSelectedReportStatus('Semua');
    setSearchQuery('');
  };

  const toggleGroup = (nama: string) => {
    setExpandedGroups(prev => ({ ...prev, [nama]: !prev[nama] }));
  };

  const getStatusBadgeStyle = (status: EquipmentStatus) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Standby':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Damaged':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusIcon = (status: EquipmentStatus) => {
    switch (status) {
      case 'Ready':
        return '🟢';
      case 'Standby':
        return '🔵';
      case 'Damaged':
        return '🔴';
      case 'Maintenance':
        return '🟡';
      default:
        return '🟢';
    }
  };

  const getLokasiStatusLabel = (status: EquipmentStatus) => {
    switch (status) {
      case 'Standby':
        return 'Lokasi Standby';
      case 'Damaged':
        return 'Lokasi Damaged';
      case 'Maintenance':
        return 'Lokasi Maintenance';
      default:
        return '';
    }
  };

  // Render komponen badge Status Pembuatan Laporan Kerusakan (Not Yet merah / Laporan Kerusakan New / Done hijau clickable)
  const renderDamageReportStatusBadge = (item: EquipmentItem) => {
    const { status, report } = getDamageReportStatus(item);

    if (status === 'Done' && report) {
      return (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setPopupDamageReport(report)}
            title="Klik untuk melihat ringkasan Laporan Kerusakan"
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all flex items-center gap-1.5 w-fit cursor-pointer"
          >
            <span>✅ Done</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">{report.reportCode}</span>
          </button>
          <span className="text-[10px] text-emerald-700 font-bold">
            {report.statusLaporan === 'Resolved' ? `Selesai (${report.repairReportCode})` : 'Klik untuk lihat laporan'}
          </span>
        </div>
      );
    }

    if (status === 'Laporan Kerusakan New') {
      return (
        <div className="flex flex-col gap-1.5">
          <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm animate-pulse inline-flex items-center gap-1.5 w-fit">
            <span>🆕 Laporan Kerusakan New</span>
          </span>
          <span className="text-[10px] font-bold text-rose-600">
            Alat rusak kembali! Wajib buat laporan kerusakan baru.
          </span>
          {onCreateDamageReport && (
            <button
              type="button"
              onClick={() => onCreateDamageReport(item)}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-extrabold transition-colors w-fit shadow-sm"
            >
              + Buat Laporan Kerusakan New
            </button>
          )}
        </div>
      );
    }

    if (status === 'Not Yet') {
      return (
        <div className="flex flex-col gap-1.5">
          <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-sm animate-pulse inline-flex items-center gap-1.5 w-fit">
            <span>🔴 Not Yet</span>
          </span>
          <span className="text-[10px] font-bold text-rose-600">Wajib Buat Laporan Kerusakan!</span>
          {onCreateDamageReport && (
            <button
              type="button"
              onClick={() => onCreateDamageReport(item)}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-extrabold transition-colors w-fit"
            >
              + Buat Laporan
            </button>
          )}
        </div>
      );
    }

    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-400 border border-slate-200 w-fit inline-block">
        - (Tidak Wajib)
      </span>
    );
  };

  // Render kolom Riwayat Peralatan (List Laporan Kerusakan & Laporan Perbaikan secara simpel + tombol Detail ke ID laporan)
  const renderEquipmentHistoryColumn = (item: EquipmentItem) => {
    const history = getAllLinkedDamageReports(item);
    if (history.length === 0) {
      return (
        <span className="text-[11px] font-semibold text-slate-400 italic">
          Belum ada riwayat
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1 min-w-[210px]">
        {history.map((rep, idx) => (
          <div
            key={rep._id || idx}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-[11px]"
          >
            {/* Item Laporan Kerusakan */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                <span className="font-mono font-extrabold text-rose-700 truncate" title={`Kerusakan: ${rep.reportCode} (${rep.tglKerusakan})`}>
                  {rep.reportCode}
                </span>
                <span className="text-[10px] text-slate-400 truncate">({rep.tglKerusakan})</span>
              </div>
              {onViewDamageReportDetail && (
                <button
                  type="button"
                  onClick={() => onViewDamageReportDetail(String(rep._id))}
                  className="px-2 py-0.5 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-extrabold shrink-0 transition-colors"
                >
                  Detail
                </button>
              )}
            </div>

            {/* Item Laporan Perbaikan (jika sudah ada) */}
            {rep.statusLaporan === 'Resolved' && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-mono font-extrabold text-emerald-700 truncate" title={`Perbaikan: ${rep.repairReportCode} (${rep.tglSelesaiPerbaikan})`}>
                    {rep.repairReportCode || 'LP-Selesai'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">({rep.tglSelesaiPerbaikan})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onViewRepairReportDetail) {
                      onViewRepairReportDetail(String(rep._id));
                    } else if (onViewDamageReportDetail) {
                      onViewDamageReportDetail(String(rep._id));
                    }
                  }}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold shrink-0 transition-colors"
                >
                  Detail
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#fafafa] w-full min-h-full rounded-[2rem] border border-slate-200 shadow-sm flex flex-col font-sans">
      {/* Header Section */}
      <div className="p-6 sm:p-8 border-b border-slate-200 bg-white rounded-t-[2rem] space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Management Data Master Fasilitas
              </h1>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">
                Faskampen & Elban
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Kelola data master peralatan, kondisi, status peralatan (Ready, Standby, Damaged, Maintenance), dan status pembuatan Laporan Kerusakan.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-2 px-5 py-3 bg-[#175390] hover:bg-[#124273] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm whitespace-nowrap transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Data Master
            </button>
          )}
        </div>

        {/* Alert Banner jika ada peralatan Damaged / Maintenance yang status laporan kerusakannya masih Not Yet */}
        {stats.notYetCount > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                !
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-rose-800">
                  Terdapat {stats.notYetCount} Peralatan (Damaged / Maintenance) yang Belum Dibuatkan Laporan Kerusakan (Status: Not Yet)
                </h4>
                <p className="text-xs text-rose-600 font-medium">
                  Setiap peralatan berstatus Damaged atau Maintenance wajib dibuatkan Laporan Kerusakan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedReportStatus(selectedReportStatus === 'Not Yet' ? 'Semua' : 'Not Yet')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold whitespace-nowrap shadow-sm transition-all"
            >
              {selectedReportStatus === 'Not Yet' ? 'Tampilkan Semua' : `Lihat ${stats.notYetCount} Alat "Not Yet"`}
            </button>
          </div>
        )}

        {/* Summary Cards Kategori & Status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
          <div
            onClick={() => resetFilters()}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeMainCategory === 'Semua' && selectedStatus === 'Semua' && selectedReportStatus === 'Semua'
                ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Unit</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">{stats.total}</div>
            <span className="text-[10px] font-semibold text-blue-600">Semua Alat</span>
          </div>

          <div
            onClick={() => { setActiveMainCategory('Faskampen'); setActiveSubCategory('Semua'); }}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeMainCategory === 'Faskampen'
                ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Faskampen</span>
            <div className="text-lg font-black text-indigo-700 mt-0.5">{stats.faskampen}</div>
            <span className="text-[10px] font-semibold text-indigo-600">Unit</span>
          </div>

          <div
            onClick={() => { setActiveMainCategory('Elban'); setActiveSubCategory('Fasilitas IT'); }}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeMainCategory === 'Elban' && activeSubCategory === 'Fasilitas IT'
                ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Fasilitas IT</span>
            <div className="text-lg font-black text-blue-700 mt-0.5">{stats.elbanIT}</div>
            <span className="text-[10px] font-semibold text-blue-600">Elban IT</span>
          </div>

          <div
            onClick={() => { setActiveMainCategory('Elban'); setActiveSubCategory('Fasilitas Penunjang Bandar Udara'); }}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              activeMainCategory === 'Elban' && activeSubCategory === 'Fasilitas Penunjang Bandar Udara'
                ? 'bg-purple-50/80 border-purple-300 shadow-sm'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Penunjang</span>
            <div className="text-lg font-black text-purple-700 mt-0.5">{stats.elbanPenunjang}</div>
            <span className="text-[10px] font-semibold text-purple-600">Bandara</span>
          </div>

          <div
            onClick={() => setSelectedStatus(selectedStatus === 'Ready' ? 'Semua' : 'Ready')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedStatus === 'Ready'
                ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">🟢 Ready</span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">{stats.readyCount}</div>
            <span className="text-[10px] font-semibold text-emerald-600">Siap</span>
          </div>

          <div
            onClick={() => setSelectedStatus(selectedStatus === 'Standby' ? 'Semua' : 'Standby')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedStatus === 'Standby'
                ? 'bg-sky-50 border-sky-400 shadow-sm'
                : 'bg-sky-50/40 border-sky-200/80 hover:bg-sky-50'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">🔵 Standby</span>
            <div className="text-lg font-black text-sky-700 mt-0.5">{stats.standbyCount}</div>
            <span className="text-[10px] font-semibold text-sky-600">Cadangan</span>
          </div>

          <div
            onClick={() => setSelectedStatus(selectedStatus === 'Damaged' ? 'Semua' : 'Damaged')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedStatus === 'Damaged'
                ? 'bg-rose-50 border-rose-400 shadow-sm'
                : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">🔴 Damaged</span>
            <div className="text-lg font-black text-rose-700 mt-0.5">{stats.damagedCount}</div>
            <span className="text-[10px] font-semibold text-rose-600">Rusak</span>
          </div>

          <div
            onClick={() => setSelectedStatus(selectedStatus === 'Maintenance' ? 'Semua' : 'Maintenance')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedStatus === 'Maintenance'
                ? 'bg-amber-50 border-amber-400 shadow-sm'
                : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">🟡 Maint.</span>
            <div className="text-lg font-black text-amber-700 mt-0.5">{stats.maintenanceCount}</div>
            <span className="text-[10px] font-semibold text-amber-600">Perbaikan</span>
          </div>

          <div
            onClick={() => setSelectedReportStatus(selectedReportStatus === 'Not Yet' ? 'Semua' : 'Not Yet')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedReportStatus === 'Not Yet'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${selectedReportStatus === 'Not Yet' ? 'text-rose-100' : 'text-rose-700'}`}>
               Laporan: Not Yet
            </span>
            <div className={`text-lg font-black mt-0.5 ${selectedReportStatus === 'Not Yet' ? 'text-white' : 'text-rose-700'}`}>
              {stats.notYetCount}
            </div>
            <span className={`text-[10px] font-semibold ${selectedReportStatus === 'Not Yet' ? 'text-rose-100' : 'text-rose-600'}`}>
              Wajib Buat
            </span>
          </div>

          <div
            onClick={() => setSelectedReportStatus(selectedReportStatus === 'Done' ? 'Semua' : 'Done')}
            className={`p-3 rounded-2xl border cursor-pointer transition-all ${
              selectedReportStatus === 'Done'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${selectedReportStatus === 'Done' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Laporan: Done
            </span>
            <div className={`text-lg font-black mt-0.5 ${selectedReportStatus === 'Done' ? 'text-white' : 'text-emerald-700'}`}>
              {stats.doneCount}
            </div>
            <span className={`text-[10px] font-semibold ${selectedReportStatus === 'Done' ? 'text-emerald-100' : 'text-emerald-600'}`}>
              Sudah Dibuat
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveMainCategory('Semua'); setActiveSubCategory('Semua'); }}
              className={`px-5 py-2.5 rounded-full font-extrabold text-xs transition-all border ${
                activeMainCategory === 'Semua'
                  ? 'bg-[#175390] text-white border-[#175390] shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              SEMUA ({stats.total})
            </button>
            <button
              onClick={() => { setActiveMainCategory('Faskampen'); setActiveSubCategory('Semua'); }}
              className={`px-5 py-2.5 rounded-full font-extrabold text-xs transition-all border ${
                activeMainCategory === 'Faskampen'
                  ? 'bg-[#175390] text-white border-[#175390] shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              FASKAMPEN ({stats.faskampen})
            </button>
            <button
              onClick={() => { setActiveMainCategory('Elban'); }}
              className={`px-5 py-2.5 rounded-full font-extrabold text-xs transition-all border ${
                activeMainCategory === 'Elban'
                  ? 'bg-[#175390] text-white border-[#175390] shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              ELBAN ({stats.elbanIT + stats.elbanPenunjang})
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-[#175390] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📋 Tabel Data
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grouped' ? 'bg-white text-[#175390] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📂 Grup Peralatan
            </button>
          </div>
        </div>

        {/* Sub-Category Tabs when Elban is selected */}
        {activeMainCategory === 'Elban' && (
          <div className="flex flex-wrap gap-3 pt-1 animate-fadeIn">
            <button
              onClick={() => setActiveSubCategory('Semua')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeSubCategory === 'Semua'
                  ? 'bg-blue-50 text-[#175390] border-blue-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua Sub-Kategori Elban ({stats.elbanIT + stats.elbanPenunjang})
            </button>
            <button
              onClick={() => setActiveSubCategory('Fasilitas IT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeSubCategory === 'Fasilitas IT'
                  ? 'bg-blue-50 text-[#175390] border-blue-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              💻 FASILITAS IT ({stats.elbanIT})
            </button>
            <button
              onClick={() => setActiveSubCategory('Fasilitas Penunjang Bandar Udara')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeSubCategory === 'Fasilitas Penunjang Bandar Udara'
                  ? 'bg-blue-50 text-[#175390] border-blue-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🛫 PENUNJANG BANDARA ({stats.elbanPenunjang})
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          <div className="relative md:col-span-4">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari peralatan, lokasi, merek, lokasi standby..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedMerek}
              onChange={(e) => setSelectedMerek(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">🏷️ Semua Merek ({uniqueMereks.length})</option>
              {uniqueMereks.map(merek => (
                <option key={merek} value={merek}>
                  Merek: {merek === '-' ? 'Tanpa Merek (-)' : merek}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">📌 Semua Status</option>
              <option value="Ready">🟢 Status: Ready</option>
              <option value="Standby">🔵 Status: Standby</option>
              <option value="Damaged">🔴 Status: Damaged</option>
              <option value="Maintenance">🟡 Status: Maintenance</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedReportStatus}
              onChange={(e) => setSelectedReportStatus(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">📑 Status Lap. Kerusakan</option>
              <option value="Not Yet">🔴 Not Yet (Wajib Buat)</option>
              <option value="Laporan Kerusakan New">🆕 Laporan Kerusakan New</option>
              <option value="Done">✅ Done (Sudah Ada)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              className="flex-1 min-w-0 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="Semua">🔧 Semua Jenis</option>
              {uniqueJenisList.map(jenis => (
                <option key={jenis} value={jenis}>
                  {jenis}
                </option>
              ))}
            </select>
            <button
              onClick={resetFilters}
              title="Reset Filter"
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all shrink-0"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <p className="text-xs font-bold text-slate-500">
            Menampilkan <span className="text-slate-800 font-extrabold">{filteredEquipments.length}</span> unit peralatan
            {selectedMerek !== 'Semua' && <> dengan merek <span className="text-blue-600 font-extrabold">"{selectedMerek}"</span></>}
            {selectedStatus !== 'Semua' && <> berstatus <span className="text-blue-600 font-extrabold">"{selectedStatus}"</span></>}
            {selectedReportStatus !== 'Semua' && <> status laporan kerusakan <span className="text-rose-600 font-extrabold">"{selectedReportStatus}"</span></>}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#175390] rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 mt-3">Memuat data master fasilitas...</p>
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <p className="text-slate-500 font-bold text-sm">Tidak ada data peralatan yang sesuai dengan filter.</p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
            >
              Tampilkan Semua Data
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Peralatan</th>
                    <th className="py-3.5 px-4">Lokasi Utama</th>
                    <th className="py-3.5 px-4">Merek</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Kondisi</th>
                    <th className="py-3.5 px-4">Status Peralatan & Lokasi</th>
                    <th className="py-3.5 px-4">Status Laporan Kerusakan</th>
                    <th className="py-3.5 px-4">Riwayat Peralatan</th>
                    {canManage && <th className="py-3.5 px-4 text-right w-28">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedEquipments.map((item, idx) => {
                    const statusVal: EquipmentStatus = item.statusPeralatan || 'Ready';
                    const kondisiVal: EquipmentCondition = item.kondisi || 'Normal';
                    return (
                      <tr key={item._id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-800">
                          <div>{item.namaPeralatan}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 font-normal">
                            {(item.serialNumber || item.snPeralatan) && (item.serialNumber !== '-' || item.snPeralatan !== '-') && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-200" title="Serial Number">
                                SN: {item.serialNumber || item.snPeralatan}
                              </span>
                            )}
                            {(item.tipePeralatan || item.seriesPeralatan) && (item.tipePeralatan !== '-' || item.seriesPeralatan !== '-') && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="Tipe/Series">
                                Tipe: {item.tipePeralatan || item.seriesPeralatan}
                              </span>
                            )}
                            {item.nomorSertifikasi && item.nomorSertifikasi !== '-' && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200" title="Nomor Sertifikasi">
                                📜 {item.nomorSertifikasi}
                              </span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                              (item.statusKepemilikan || 'Inventaris API') === 'Sewa'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              🏷️ {item.statusKepemilikan || 'Inventaris API'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{item.lokasi}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.merek || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider w-fit ${
                              item.mainCategory === 'Faskampen'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {item.mainCategory}
                            </span>
                            {item.mainCategory === 'Elban' && item.subCategory && (
                              <span className="text-[11px] font-semibold text-slate-500">{item.subCategory}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border w-fit ${
                              kondisiVal === 'Normal'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {kondisiVal === 'Normal' ? '✅ Normal' : '❌ Rusak'}
                            </span>
                            {kondisiVal === 'Rusak' && item.keteranganRusak && (
                              <span className="text-[11px] text-rose-600 font-medium">
                                Ket: {item.keteranganRusak}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border w-fit ${getStatusBadgeStyle(statusVal)}`}>
                              {getStatusIcon(statusVal)} {statusVal}
                            </span>
                            {statusVal !== 'Ready' && item.lokasiStatus && (
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 w-fit">
                                📍 {getLokasiStatusLabel(statusVal)}: <strong className="text-slate-800">{item.lokasiStatus}</strong>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {renderDamageReportStatusBadge(item)}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderEquipmentHistoryColumn(item)}
                        </td>
                        {canManage && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(item)}
                                title="Edit Data / Ubah Status & Kondisi"
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEquipment(item)}
                                title="Hapus Data"
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    « Awal
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    ‹ Prev
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Next ›
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Akhir »
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* GROUPED VIEW */
          <div className="space-y-3">
            {(Object.entries(groupedEquipments) as [string, EquipmentItem[]][]).map(([namaPeralatan, items]) => {
              const isExpanded = expandedGroups[namaPeralatan];
              const sample = items[0];
              const notYetInGroup = items.filter(i => {
                const st = getDamageReportStatus(i).status;
                return st === 'Not Yet' || st === 'Laporan Kerusakan New';
              }).length;
              return (
                <div key={namaPeralatan} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
                    <button
                      onClick={() => toggleGroup(namaPeralatan)}
                      className="flex-1 flex items-center justify-between text-left focus:outline-none"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-extrabold text-slate-800 text-sm">{namaPeralatan}</span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {items.length} Unit
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {sample.mainCategory}{sample.mainCategory === 'Elban' && sample.subCategory ? ` • ${sample.subCategory}` : ''}
                        </span>
                        {notYetInGroup > 0 && (
                          <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                            🔴 {notYetInGroup} Wajib Laporan
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-400 transition-transform ml-3 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {canManage && (
                      <button
                        onClick={() => openAddModal({
                          namaPeralatan,
                          mainCategory: sample.mainCategory,
                          subCategory: (sample.subCategory as any) || 'Fasilitas IT',
                          merek: sample.merek === '-' ? '' : sample.merek
                        })}
                        className="ml-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                      >
                        + Tambah Unit
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const statusVal: EquipmentStatus = item.statusPeralatan || 'Ready';
                        const kondisiVal: EquipmentCondition = item.kondisi || 'Normal';
                        return (
                          <div
                            key={item._id}
                            className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col justify-between gap-3 hover:border-blue-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-bold text-sm text-slate-800">{item.lokasi}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500 font-medium">
                                    Merek: <strong className="text-slate-700">{item.merek || '-'}</strong>
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    S/N: <strong className="text-slate-700 font-mono">{item.serialNumber || item.snPeralatan || '-'}</strong>
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    No. Sertifikasi: <strong className="text-slate-700">{item.nomorSertifikasi || '-'}</strong>
                                  </span>
                                  <span className="text-xs text-slate-500 font-medium">
                                    Tipe/Series: <strong className="text-slate-700">{item.tipePeralatan || item.seriesPeralatan || '-'}</strong>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                                    (item.statusKepemilikan || 'Inventaris API') === 'Sewa'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                    🏷️ {item.statusKepemilikan || 'Inventaris API'}
                                  </span>
                                </div>
                              </div>
                              {canManage && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEquipment(item)}
                                    className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                                  kondisiVal === 'Normal'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {kondisiVal === 'Normal' ? '✅ Normal' : '❌ Rusak'}
                                </span>

                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${getStatusBadgeStyle(statusVal)}`}>
                                  {getStatusIcon(statusVal)} {statusVal}
                                </span>

                                {statusVal !== 'Ready' && item.lokasiStatus && (
                                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                    📍 {getLokasiStatusLabel(statusVal)}: {item.lokasiStatus}
                                  </span>
                                )}
                              </div>

                              <div>
                                {renderDamageReportStatusBadge(item)}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                                Riwayat Peralatan (Kerusakan & Perbaikan)
                              </span>
                              {renderEquipmentHistoryColumn(item)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP RINGKASAN LAPORAN KERUSAKAN SAAT STATUS "DONE" DIKLIK */}
      {popupDamageReport && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPopupDamageReport(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-[#175390] to-blue-700 text-white flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-900">
                    ✅ Laporan Done
                  </span>
                  <span className="font-mono font-extrabold text-xs bg-white/20 px-2.5 py-0.5 rounded-lg">
                    {popupDamageReport.reportCode}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mt-2">{popupDamageReport.peralatan}</h3>
                <p className="text-xs text-blue-100 font-medium">
                  Lokasi: {popupDamageReport.lokasi} • {popupDamageReport.fasilitas}
                </p>
              </div>
              <button
                onClick={() => setPopupDamageReport(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tgl & Jam Kerusakan</span>
                  <span className="font-extrabold text-slate-800">
                    {popupDamageReport.tglKerusakan} ({popupDamageReport.jamKerusakan})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bagian & Hambatan</span>
                  <span className="font-extrabold text-slate-800">
                    {popupDamageReport.bagian} (Kode: {popupDamageReport.kodeHambatan})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kategori Kerusakan</span>
                <p className="font-bold text-slate-800 bg-amber-50/70 border border-amber-200 px-3 py-2 rounded-xl text-xs">
                  {popupDamageReport.kategoriKerusakan}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ringkasan Uraian & Penyebab</span>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-line">
                  <div><strong>Penyebab:</strong> {popupDamageReport.penyebab || '-'}</div>
                  <div><strong>Uraian:</strong> {popupDamageReport.uraian || '-'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500">Status Perbaikan:</span>
                {popupDamageReport.statusLaporan === 'Resolved' ? (
                  <span className="font-extrabold text-emerald-700">
                    ✅ Selesai ({popupDamageReport.repairReportCode}) • Terputus: {popupDamageReport.jumlahJamTerputus}
                  </span>
                ) : (
                  <span className="font-extrabold text-rose-600">🔴 Menunggu Tindak Lanjut Perbaikan</span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPopupDamageReport(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                >
                  Tutup
                </button>
                {onViewDamageReportDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = popupDamageReport._id;
                      setPopupDamageReport(null);
                      onViewDamageReportDetail(targetId);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#175390] hover:bg-[#124273] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5"
                  >
                    📄 Lihat Detail Laporan Kerusakan →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Data Master */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl relative flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#175390]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                {editingItem ? 'Edit Data Master Fasilitas' : 'Tambah Data Master Fasilitas'}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 space-y-5 overflow-y-auto">
              {/* Kategori Utama */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Kategori Utama
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mainCategory: 'Faskampen' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      formData.mainCategory === 'Faskampen'
                        ? 'bg-[#175390] text-white border-[#175390]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    FASKAMPEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mainCategory: 'Elban', subCategory: formData.subCategory || 'Fasilitas IT' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      formData.mainCategory === 'Elban'
                        ? 'bg-[#175390] text-white border-[#175390]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ELBAN
                  </button>
                </div>
              </div>

              {/* Sub Kategori jika Elban */}
              {formData.mainCategory === 'Elban' && (
                <div className="animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Sub-Kategori Elban
                  </label>
                  <select
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="Fasilitas IT">Fasilitas IT</option>
                    <option value="Fasilitas Penunjang Bandar Udara">Fasilitas Penunjang Bandar Udara (Penunjang Bandara)</option>
                  </select>
                </div>
              )}

              {/* Nama Peralatan */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Nama Peralatan / Jenis Fasilitas
                </label>
                <input
                  type="text"
                  required
                  list="master-jenis-list"
                  placeholder="Contoh: X-Ray Bagasi, CCTV Indoor, Switch Access..."
                  value={formData.namaPeralatan}
                  onChange={(e) => setFormData({ ...formData, namaPeralatan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <datalist id="master-jenis-list">
                  {uniqueJenisList.map(j => <option key={j} value={j} />)}
                </datalist>
              </div>

              {/* Lokasi & Merek */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Lokasi Utama / Detail Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Terminal Sewa, SCP2 Line C..."
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Merek Peralatan
                  </label>
                  <input
                    type="text"
                    list="master-merek-list"
                    placeholder="Contoh: Smith, Hikvision, Garrett..."
                    value={formData.merek}
                    onChange={(e) => setFormData({ ...formData, merek: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <datalist id="master-merek-list">
                    {allMereksList.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              {/* S/N Peralatan & Nomor Sertifikasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    S/N Peralatan (Serial Number)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SN-8839201, 2026-XRAY-01..."
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Nomor Sertifikat / Sertifikasi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: CERT-DKP-2026/089, BAP-992..."
                    value={formData.nomorSertifikasi}
                    onChange={(e) => setFormData({ ...formData, nomorSertifikasi: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Tipe / Series & Status Kepemilikan (Sewa / Inventaris API) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Tipe Peralatan / Series Peralatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: HI-SCAN 6040i, DS-2CD2143G2-I..."
                    value={formData.tipePeralatan}
                    onChange={(e) => setFormData({ ...formData, tipePeralatan: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Status Kepemilikan (Default: Inventaris API)
                  </label>
                  <select
                    value={formData.statusKepemilikan}
                    onChange={(e) => setFormData({ ...formData, statusKepemilikan: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="Inventaris API">Inventaris API (Milik API)</option>
                    <option value="Sewa">Sewa (Vendor / Pihak Ketiga)</option>
                  </select>
                </div>
              </div>

              {/* Kondisi Peralatan */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Kondisi Peralatan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, kondisi: 'Normal', keteranganRusak: '' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      formData.kondisi === 'Normal'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✅ Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, kondisi: 'Rusak' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      formData.kondisi === 'Rusak'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ❌ Rusak
                  </button>
                </div>
              </div>

              {formData.kondisi === 'Rusak' && (
                <div className="animate-fadeIn">
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1.5 block">
                    Keterangan Kerusakan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Tuliskan detail kerusakan peralatan..."
                    value={formData.keteranganRusak}
                    onChange={(e) => setFormData({ ...formData, keteranganRusak: e.target.value })}
                    className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-rose-400"
                  />
                </div>
              )}

              {/* Status Peralatan (Ready, Standby, Damaged, Maintenance) */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Status Peralatan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Ready', 'Standby', 'Damaged', 'Maintenance'] as EquipmentStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          statusPeralatan: st,
                          lokasiStatus: st === 'Ready' ? '' : prev.lokasiStatus,
                          kondisi: st === 'Damaged' ? 'Rusak' : prev.kondisi
                        }))
                      }
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                        formData.statusPeralatan === st
                          ? getStatusBadgeStyle(st) + ' ring-2 ring-offset-1 ring-blue-500/30 shadow-sm'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{getStatusIcon(st)}</span>
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Lokasi Standby / Damaged / Maintenance jika bukan Ready */}
              {formData.statusPeralatan !== 'Ready' && (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 animate-fadeIn space-y-2">
                  <label className="text-[11px] font-extrabold text-[#175390] uppercase tracking-wider block">
                    📍 {getLokasiStatusLabel(formData.statusPeralatan)} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.statusPeralatan === 'Standby'
                        ? 'Masukkan lokasi standby peralatan (Cth: Gudang ELIT / Ruang Server / Pos Cadangan)...'
                        : formData.statusPeralatan === 'Damaged'
                        ? 'Masukkan lokasi peralatan yang damaged/rusak (Cth: Gudang Barang Rusak / Workshop ELIT)...'
                        : 'Masukkan lokasi maintenance peralatan (Cth: Workshop ELIT / Vendor Service Center)...'
                    }
                    value={formData.lokasiStatus}
                    onChange={(e) => setFormData({ ...formData, lokasiStatus: e.target.value })}
                    className="w-full p-3 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#175390] focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {['Damaged', 'Maintenance'].includes(formData.statusPeralatan) && (
                    <p className="text-[11px] text-rose-600 font-bold">
                      ⚠️ Karena status peralatan diubah menjadi {formData.statusPeralatan}, peralatan ini wajib memiliki Laporan Kerusakan.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#175390] hover:bg-[#124273] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi / Notifikasi */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl flex flex-col text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-inner ${
              confirmDialog.dangerMode ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#175390]'
            }`}>
              {confirmDialog.isNotificationOnly && !confirmDialog.dangerMode ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {!confirmDialog.isNotificationOnly && (
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
              )}
              {confirmDialog.secondaryActionLabel && confirmDialog.onSecondaryAction && (
                <button
                  onClick={confirmDialog.onSecondaryAction}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md transition-colors"
                >
                  {confirmDialog.secondaryActionLabel}
                </button>
              )}
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3 text-white text-sm font-bold rounded-xl shadow-md transition-colors ${
                  confirmDialog.dangerMode ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-[#175390] hover:bg-[#124273] shadow-blue-500/30'
                }`}
              >
                {confirmDialog.actionLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
