import { useState, useEffect, useMemo } from 'react';

type EquipmentStatus = 'Ready' | 'Standby' | 'Damaged' | 'Maintenance';

export default function FormFasilitas({
  fasilitas: propFasilitas,
  setFasilitas: propSetFasilitas,
  catatanFasilitas: propCatatan,
  setCatatanFasilitas: propSetCatatan,
  isLocked = false,
  initialData,
  showAlert: propShowAlert
}: any) {
  const [internalFasilitas, setInternalFasilitas] = useState<any[]>(initialData?.kondisiFasilitas || []);
  const [internalCatatan, setInternalCatatan] = useState<string>(initialData?.catatan || '');

  const fasilitas: any[] = propFasilitas !== undefined ? propFasilitas : internalFasilitas;
  const setFasilitas = propSetFasilitas !== undefined ? propSetFasilitas : setInternalFasilitas;
  const catatanFasilitas = propCatatan !== undefined ? propCatatan : internalCatatan;
  const setCatatanFasilitas = propSetCatatan !== undefined ? propSetCatatan : setInternalCatatan;

  const showAlert = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (propShowAlert) {
      propShowAlert(msg, type);
    } else {
      alert(msg);
    }
  };

  const [activeMainCategory, setActiveMainCategory] = useState<'Faskampen' | 'Elban'>('Faskampen');
  const [activeSubCategory, setActiveSubCategory] = useState<'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara'>('Fasilitas IT');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter searching, merek & status di Pengecekan Fasilitas
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMerek, setSelectedMerek] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState<'Semua' | EquipmentStatus>('Semua');

  // State CRUD Modal (Add / Edit) di Pengecekan Fasilitas
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isSavingCrud, setIsSavingCrud] = useState(false);
  const [crudForm, setCrudForm] = useState({
    namaPeralatan: '',
    lokasi: '',
    merek: '',
    serialNumber: '',
    nomorSertifikasi: '',
    tipePeralatan: '',
    statusKepemilikan: 'Inventaris API' as 'Inventaris API' | 'Sewa',
    mainCategory: 'Faskampen' as 'Faskampen' | 'Elban',
    subCategory: 'Fasilitas IT' as 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara',
    kondisi: 'Normal' as 'Normal' | 'Rusak',
    statusPeralatan: 'Ready' as EquipmentStatus,
    lokasiStatus: '',
    keteranganRusak: ''
  });

  // State Pagination untuk Riwayat Laporan Done per Peralatan (Limit 3 per halaman)
  const [historyPages, setHistoryPages] = useState<Record<string, number>>({});

  // State Modal Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State Daftar Laporan Kerusakan & Popup Ringkasan
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [popupDamageReport, setPopupDamageReport] = useState<{ equipment: any; report: any } | null>(null);

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

  // Sinkronisasi dengan Data Master (/api/equipments & /api/damage-reports)
  const syncWithMasterData = async (silent = true) => {
    const token = localStorage.getItem('token');
    try {
      const [resEq, resDmg] = await Promise.all([
        fetch('/api/equipments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/damage-reports', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (resDmg.ok) {
        const dmgData = await resDmg.json();
        setDamageReports(Array.isArray(dmgData) ? dmgData : []);
      }
      if (resEq.ok) {
        const masterData = await resEq.json();
        setFasilitas((prev: any[]) => {
          const prevList = Array.isArray(prev) ? prev : [];
          return masterData.map((item: any) => {
            const cleanId = item._id && typeof item._id === 'object' && item._id.$oid ? String(item._id.$oid) : String(item._id);
            const existing = prevList.find(
              (p: any) =>
                (p._id && String(p._id) === cleanId) ||
                (p.namaPeralatan === item.namaPeralatan && p.lokasi === item.lokasi)
            );
            return {
              _id: cleanId,
              namaPeralatan: item.namaPeralatan,
              lokasi: item.lokasi,
              merek: item.merek || '-',
              mainCategory: item.mainCategory,
              subCategory: item.subCategory || '',
              kondisi: existing && existing.kondisi === 'Rusak' ? 'Rusak' : (item.kondisi || 'Normal'),
              statusPeralatan: item.statusPeralatan || existing?.statusPeralatan || 'Ready',
              lokasiStatus: item.lokasiStatus ?? existing?.lokasiStatus ?? '',
              keteranganRusak: existing && existing.keteranganRusak ? existing.keteranganRusak : (item.keteranganRusak || '')
            };
          });
        });
        if (!silent) {
          showAlert('Data fasilitas berhasil disinkronkan dengan Data Master terbaru!', 'success');
        }
      }
    } catch (e) {
      if (!silent) {
        showAlert('Gagal menyinkronkan dengan Data Master.', 'error');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/damage-reports', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => (res.ok ? res.json() : []))
      .then(data => setDamageReports(Array.isArray(data) ? data : []))
      .catch(() => {});

    if (initialData && initialData.kondisiFasilitas?.length > 0) return;
    syncWithMasterData(true);
  }, [initialData]);

  const getAllLinkedDamageReports = (item: any): any[] => {
    return damageReports
      .filter(
        (r: any) =>
          (r.equipmentId && String(r.equipmentId) === String(item._id)) ||
          ((r.peralatan || '').toLowerCase().trim() === (item.namaPeralatan || '').toLowerCase().trim() &&
            (r.lokasi || '').toLowerCase().trim() === (item.lokasi || '').toLowerCase().trim())
      )
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  };

  const getEquipmentReportState = (item: any) => {
    const history = getAllLinkedDamageReports(item);
    const openReport = history.find((r: any) => r.statusLaporan !== 'Resolved') || null;
    const resolvedReports = history.filter((r: any) => r.statusLaporan === 'Resolved');
    const isBroken =
      item.statusPeralatan === 'Damaged' ||
      item.statusPeralatan === 'Maintenance' ||
      item.kondisi === 'Rusak';

    if (openReport) return { status: 'Done', report: openReport, history };
    if (isBroken) {
      if (resolvedReports.length > 0) return { status: 'Laporan Kerusakan New', report: null, history };
      return { status: 'Not Yet', report: null, history };
    }
    if (resolvedReports.length > 0) return { status: 'Done', report: resolvedReports[0], history };
    return { status: 'Tidak Wajib', report: null, history };
  };

  const handleSyncPreviousData = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const resRep = await fetch('/api/reports?limit=10', { headers: { 'Authorization': `Bearer ${token}` } });
      if (resRep.ok) {
        const parsedRep = await resRep.json();
        const currentReportId = initialData?._id;
        const latestReportData = parsedRep.data.find((r: any) => 
          (!currentReportId || r._id !== currentReportId) && 
          r.kondisiFasilitas && 
          r.kondisiFasilitas.length > 0
        );
        if (latestReportData) {
          let hasCarryOver = false;
          const newFasilitas = fasilitas.map((item: any) => {
            const riwayatAlat = latestReportData.kondisiFasilitas.find(
              (f: any) => f.namaPeralatan === item.namaPeralatan && f.lokasi === item.lokasi
            );
            if (riwayatAlat && riwayatAlat.kondisi === 'Rusak') {
              hasCarryOver = true;
              return { ...item, kondisi: 'Rusak', keteranganRusak: riwayatAlat.keteranganRusak };
            }
            return item;
          });
          setFasilitas(newFasilitas);

          // Tarik juga catatan tambahan dari laporan shift sebelumnya
          const previousCatatan = latestReportData.catatan || latestReportData.catatanFasilitas || '';
          let hasCatatan = false;
          if (previousCatatan && typeof previousCatatan === 'string' && previousCatatan.trim()) {
            setCatatanFasilitas(previousCatatan.trim());
            hasCatatan = true;
          }

          if (hasCarryOver && hasCatatan) {
            showAlert('Sinkronisasi Berhasil. Data alat rusak dan catatan tambahan dari shift sebelumnya diwariskan.', 'success');
          } else if (hasCarryOver) {
            showAlert('Sinkronisasi Berhasil. Data alat rusak dari shift sebelumnya diwariskan.', 'success');
          } else if (hasCatatan) {
            showAlert('Sinkronisasi Berhasil. Catatan tambahan dari shift sebelumnya berhasil ditarik.', 'success');
          } else {
            showAlert('Tidak ditemukan alat rusak atau catatan pada laporan shift sebelumnya.', 'success');
          }
        } else {
          showAlert('Belum ada riwayat laporan fasilitas sebelumnya.', 'warning');
        }
      }
    } catch (error) {
      showAlert('Terjadi kesalahan saat menarik data.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleKondisi = (id: string) =>
    setFasilitas((prev: any) =>
      prev.map((f: any) =>
        f._id === id
          ? { ...f, kondisi: f.kondisi === 'Normal' ? 'Rusak' : 'Normal', keteranganRusak: '' }
          : f
      )
    );

  const updateKeterangan = (id: string, ket: string) =>
    setFasilitas((prev: any) =>
      prev.map((f: any) => (f._id === id ? { ...f, keteranganRusak: ket } : f))
    );

  const toggleAccordion = (namaPeralatan: string) =>
    setExpandedGroups(prev => ({ ...prev, [namaPeralatan]: !prev[namaPeralatan] }));

  // Daftar merek unik pada kategori aktif untuk filter merek
  const availableMereks = useMemo(() => {
    const categoryItems = fasilitas.filter((item: any) =>
      activeMainCategory === 'Faskampen'
        ? item.mainCategory === 'Faskampen'
        : item.mainCategory === 'Elban' && item.subCategory === activeSubCategory
    );
    const set = new Set<string>();
    categoryItems.forEach((item: any) => {
      const m = (item.merek || '-').trim();
      set.add(m === '' ? '-' : m);
    });
    return Array.from(set).sort((a, b) => {
      if (a === '-') return 1;
      if (b === '-') return -1;
      return a.localeCompare(b);
    });
  }, [fasilitas, activeMainCategory, activeSubCategory]);

  const uniqueNamaPeralatanList = useMemo(() => {
    const set = new Set<string>();
    fasilitas.forEach((item: any) => {
      if (item.namaPeralatan) set.add(item.namaPeralatan.trim());
    });
    return Array.from(set).sort();
  }, [fasilitas]);

  const allMerekList = useMemo(() => {
    const set = new Set<string>();
    fasilitas.forEach((item: any) => {
      const m = (item.merek || '').trim();
      if (m && m !== '-') set.add(m);
    });
    return Array.from(set).sort();
  }, [fasilitas]);

  // Filter fasilitas berdasarkan kategori, sub-kategori, merek, status, dan searching
  const filteredFasilitas = useMemo(() => {
    return fasilitas.filter((item: any) => {
      const matchCategory =
        activeMainCategory === 'Faskampen'
          ? item.mainCategory === 'Faskampen'
          : item.mainCategory === 'Elban' && item.subCategory === activeSubCategory;
      if (!matchCategory) return false;

      if (selectedMerek !== 'Semua') {
        const itemMerek = (item.merek || '-').trim() || '-';
        if (itemMerek.toLowerCase() !== selectedMerek.toLowerCase()) return false;
      }

      if (selectedStatus !== 'Semua' && (item.statusPeralatan || 'Ready') !== selectedStatus) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = (item.namaPeralatan || '').toLowerCase().includes(q);
        const matchLokasi = (item.lokasi || '').toLowerCase().includes(q);
        const matchMerek = (item.merek || '').toLowerCase().includes(q);
        const matchLokasiStatus = (item.lokasiStatus || '').toLowerCase().includes(q);
        if (!matchNama && !matchLokasi && !matchMerek && !matchLokasiStatus) return false;
      }

      return true;
    });
  }, [fasilitas, activeMainCategory, activeSubCategory, selectedMerek, selectedStatus, searchQuery]);

  const groupedFasilitas = useMemo(() => {
    return filteredFasilitas.reduce((acc: any, item: any) => {
      if (!acc[item.namaPeralatan]) acc[item.namaPeralatan] = [];
      acc[item.namaPeralatan].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredFasilitas]);

  const openAddModal = (preset?: Partial<typeof crudForm>) => {
    setEditingItem(null);
    setCrudForm({
      namaPeralatan: preset?.namaPeralatan || '',
      lokasi: preset?.lokasi || '',
      merek: preset?.merek || '',
      serialNumber: '',
      nomorSertifikasi: '',
      tipePeralatan: '',
      statusKepemilikan: 'Inventaris API',
      mainCategory: preset?.mainCategory || activeMainCategory,
      subCategory: preset?.subCategory || activeSubCategory,
      kondisi: 'Normal',
      statusPeralatan: 'Ready',
      lokasiStatus: '',
      keteranganRusak: ''
    });
    setIsCrudModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setCrudForm({
      namaPeralatan: item.namaPeralatan || '',
      lokasi: item.lokasi || '',
      merek: item.merek === '-' ? '' : (item.merek || ''),
      serialNumber: item.serialNumber === '-' ? '' : (item.serialNumber || item.snPeralatan || ''),
      nomorSertifikasi: item.nomorSertifikasi === '-' ? '' : (item.nomorSertifikasi || ''),
      tipePeralatan: item.tipePeralatan === '-' ? '' : (item.tipePeralatan || item.seriesPeralatan || ''),
      statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
      mainCategory: item.mainCategory || activeMainCategory,
      subCategory: item.subCategory || activeSubCategory,
      kondisi: item.kondisi || 'Normal',
      statusPeralatan: item.statusPeralatan || 'Ready',
      lokasiStatus: item.lokasiStatus || '',
      keteranganRusak: item.keteranganRusak || ''
    });
    setIsCrudModalOpen(true);
  };

  const handleSaveCrud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crudForm.namaPeralatan.trim() || !crudForm.lokasi.trim()) {
      showAlert('Nama peralatan dan lokasi wajib diisi!', 'warning');
      return;
    }

    if (['Standby', 'Damaged', 'Maintenance'].includes(crudForm.statusPeralatan) && !crudForm.lokasiStatus.trim()) {
      showAlert(`Harap isi lokasi ${crudForm.statusPeralatan} terlebih dahulu!`, 'warning');
      return;
    }

    setIsSavingCrud(true);
    const token = localStorage.getItem('token');
    const payload: any = {
      namaPeralatan: crudForm.namaPeralatan.trim(),
      lokasi: crudForm.lokasi.trim(),
      merek: crudForm.merek.trim() !== '' ? crudForm.merek.trim() : '-',
      serialNumber: crudForm.serialNumber.trim() !== '' ? crudForm.serialNumber.trim() : '-',
      nomorSertifikasi: crudForm.nomorSertifikasi.trim() !== '' ? crudForm.nomorSertifikasi.trim() : '-',
      tipePeralatan: crudForm.tipePeralatan.trim() !== '' ? crudForm.tipePeralatan.trim() : '-',
      statusKepemilikan: crudForm.statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API',
      mainCategory: crudForm.mainCategory,
      subCategory: crudForm.mainCategory === 'Elban' ? crudForm.subCategory : undefined,
      kondisi: crudForm.kondisi,
      statusPeralatan: crudForm.statusPeralatan,
      lokasiStatus: crudForm.statusPeralatan === 'Ready' ? '' : crudForm.lokasiStatus.trim(),
      keteranganRusak: crudForm.kondisi === 'Rusak' ? crudForm.keteranganRusak.trim() : ''
    };

    try {
      if (editingItem) {
        payload.oldNamaPeralatan = editingItem.namaPeralatan;
        payload.oldLokasi = editingItem.lokasi;

        let updatedMaster: any = null;
        const targetId = editingItem._id ? String(editingItem._id) : 'lookup';
        const res = await fetch(`/api/equipments/${encodeURIComponent(targetId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          updatedMaster = await res.json();
        } else {
          const errData = await res.json();
          throw new Error(errData.message || 'Gagal memperbarui data fasilitas.');
        }

        setFasilitas((prev: any[]) =>
          prev.map((f: any) => {
            const isMatch = editingItem._id
              ? String(f._id) === String(editingItem._id)
              : f.namaPeralatan === editingItem.namaPeralatan && f.lokasi === editingItem.lokasi;
            if (!isMatch) return f;
            return {
              ...f,
              _id: updatedMaster?._id ? String(updatedMaster._id) : f._id,
              namaPeralatan: payload.namaPeralatan,
              lokasi: payload.lokasi,
              merek: payload.merek,
              serialNumber: payload.serialNumber,
              nomorSertifikasi: payload.nomorSertifikasi,
              tipePeralatan: payload.tipePeralatan,
              statusKepemilikan: payload.statusKepemilikan,
              mainCategory: payload.mainCategory,
              subCategory: payload.mainCategory === 'Elban' ? payload.subCategory : '',
              kondisi: crudForm.kondisi,
              statusPeralatan: crudForm.statusPeralatan,
              lokasiStatus: payload.lokasiStatus,
              keteranganRusak: payload.keteranganRusak
            };
          })
        );

        setActiveMainCategory(payload.mainCategory);
        if (payload.mainCategory === 'Elban' && payload.subCategory) {
          setActiveSubCategory(payload.subCategory);
        }
        setExpandedGroups(prev => ({ ...prev, [payload.namaPeralatan]: true }));
        setIsCrudModalOpen(false);
        showAlert('Data fasilitas berhasil diperbarui di Laporan & Data Master!', 'success');
      } else {
        const res = await fetch('/api/equipments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Gagal menambah fasilitas ke server.');
        }

        const createdMaster = await res.json();
        const newFacilityItem = {
          _id: String(createdMaster._id),
          namaPeralatan: createdMaster.namaPeralatan,
          lokasi: createdMaster.lokasi,
          merek: createdMaster.merek || '-',
          serialNumber: createdMaster.serialNumber || '-',
          nomorSertifikasi: createdMaster.nomorSertifikasi || '-',
          tipePeralatan: createdMaster.tipePeralatan || '-',
          statusKepemilikan: createdMaster.statusKepemilikan || 'Inventaris API',
          mainCategory: createdMaster.mainCategory,
          subCategory: createdMaster.subCategory || '',
          kondisi: createdMaster.kondisi || crudForm.kondisi,
          statusPeralatan: createdMaster.statusPeralatan || crudForm.statusPeralatan,
          lokasiStatus: createdMaster.lokasiStatus ?? payload.lokasiStatus,
          keteranganRusak: createdMaster.keteranganRusak ?? payload.keteranganRusak
        };

        setFasilitas((prev: any[]) => [...prev, newFacilityItem]);
        setActiveMainCategory(createdMaster.mainCategory);
        if (createdMaster.mainCategory === 'Elban' && createdMaster.subCategory) {
          setActiveSubCategory(createdMaster.subCategory);
        }
        setExpandedGroups(prev => ({ ...prev, [createdMaster.namaPeralatan]: true }));
        setIsCrudModalOpen(false);
        showAlert('Fasilitas baru berhasil ditambahkan ke Laporan & Data Master!', 'success');
      }
    } catch (err: any) {
      showAlert(err.message || 'Terjadi kesalahan saat menyimpan data fasilitas.', 'error');
    } finally {
      setIsSavingCrud(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const token = localStorage.getItem('token');
    try {
      const targetId = deleteTarget._id ? String(deleteTarget._id) : 'lookup';
      const query = new URLSearchParams({
        namaPeralatan: deleteTarget.namaPeralatan || '',
        lokasi: deleteTarget.lokasi || ''
      }).toString();
      await fetch(`/api/equipments/${encodeURIComponent(targetId)}?${query}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setFasilitas((prev: any[]) =>
        prev.filter((f: any) =>
          deleteTarget._id
            ? String(f._id) !== String(deleteTarget._id)
            : !(f.namaPeralatan === deleteTarget.namaPeralatan && f.lokasi === deleteTarget.lokasi)
        )
      );

      setDeleteTarget(null);
      showAlert('Data fasilitas berhasil dihapus dari Laporan & Data Master!', 'success');
    } catch (err) {
      showAlert('Gagal menghapus data fasilitas.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Bar Kategori & Tombol Aksi */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { setActiveMainCategory('Faskampen'); setSelectedMerek('Semua'); }}
            className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${
              activeMainCategory === 'Faskampen'
                ? 'bg-[#175390] text-white border-[#175390] shadow-md'
                : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
            }`}
          >
            FASKAMPEN
          </button>
          <button
            type="button"
            onClick={() => { setActiveMainCategory('Elban'); setSelectedMerek('Semua'); }}
            className={`px-6 py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs transition-all shadow-sm flex items-center gap-2 border ${
              activeMainCategory === 'Elban'
                ? 'bg-[#175390] text-white border-[#175390] shadow-md'
                : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
            }`}
          >
            ELBAN
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {!isLocked && (
            <button
              type="button"
              onClick={() => openAddModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#175390] hover:bg-[#124273] text-white font-bold rounded-xl text-xs shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Fasilitas
            </button>
          )}
          {!isLocked && (
            <button
              type="button"
              onClick={() => syncWithMasterData(false)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs shadow-sm transition-all border border-blue-200"
            >
              🔄 Sinkron Master
            </button>
          )}
          {!isLocked && (
            <button
              type="button"
              onClick={handleSyncPreviousData}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs shadow-sm transition-all border border-amber-200"
            >
              {isSyncing ? '⏳ Menyinkronkan...' : '🔄 GET DATA SEBELUMNYA'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-Kategori Elban */}
      {activeMainCategory === 'Elban' && (
        <div className="flex gap-6 justify-center pb-2">
          <button
            type="button"
            onClick={() => { setActiveSubCategory('Fasilitas IT'); setSelectedMerek('Semua'); }}
            className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubCategory === 'Fasilitas IT'
                ? 'border-[#175390] text-[#175390]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            FASILITAS IT
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubCategory('Fasilitas Penunjang Bandar Udara'); setSelectedMerek('Semua'); }}
            className={`pb-2 text-[11px] sm:text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubCategory === 'Fasilitas Penunjang Bandar Udara'
                ? 'border-[#175390] text-[#175390]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            PENUNJANG BANDARA
          </button>
        </div>
      )}

      {/* Bar Pencarian, Filter Merek & Filter Status di Pengecekan Fasilitas */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
        <div className="relative sm:col-span-5">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari peralatan, lokasi, merek, lokasi standby..."
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedMerek}
            onChange={(e) => setSelectedMerek(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="Semua">🏷️ Semua Merek ({availableMereks.length})</option>
            {availableMereks.map((m) => (
              <option key={m} value={m}>
                Merek: {m === '-' ? 'Tanpa Merek (-)' : m}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="Semua">📌 Semua Status</option>
            <option value="Ready">🟢 Ready</option>
            <option value="Standby">🔵 Standby</option>
            <option value="Damaged">🔴 Damaged</option>
            <option value="Maintenance">🟡 Maintenance</option>
          </select>
        </div>

        <div className="sm:col-span-1 flex items-center">
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSelectedMerek('Semua'); setSelectedStatus('Semua'); }}
            className="w-full py-2.5 px-2 bg-slate-200/70 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Daftar Accordion Grup Fasilitas */}
      <div className="mt-4 space-y-4">
        {(Object.entries(groupedFasilitas) as [string, any[]][]).map(([namaPeralatan, items]) => {
          const isExpanded = expandedGroups[namaPeralatan];
          const countRusak = items.filter((i: any) => i.kondisi === 'Rusak').length;
          const sample = items[0];

          return (
            <div
              key={namaPeralatan}
              className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md"
            >
              <div className="w-full flex justify-between items-center p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => toggleAccordion(namaPeralatan)}
                  className="flex-1 flex justify-between items-center text-left focus:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-slate-800 text-sm">{namaPeralatan}</span>
                    <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {items.length} Unit
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {countRusak > 0 && (
                      <span className="bg-rose-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse">
                        {countRusak} Rusak
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={() =>
                      openAddModal({
                        namaPeralatan,
                        mainCategory: sample?.mainCategory || activeMainCategory,
                        subCategory: sample?.subCategory || activeSubCategory,
                        merek: sample?.merek === '-' ? '' : (sample?.merek || '')
                      })
                    }
                    title={`Tambah unit untuk ${namaPeralatan}`}
                    className="ml-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#175390] border border-blue-200 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap"
                  >
                    + Unit
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {items.map((item: any) => {
                    const statusVal: EquipmentStatus = item.statusPeralatan || 'Ready';
                    const repState = getEquipmentReportState(item);
                    return (
                      <div
                        key={item._id || `${item.namaPeralatan}-${item.lokasi}`}
                        className={`p-4 rounded-xl border transition-all ${
                          item.kondisi === 'Normal'
                            ? 'bg-white border-slate-200 hover:border-blue-300'
                            : 'bg-rose-50 border-rose-300 shadow-inner'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-sm text-slate-800">{item.lokasi}</h4>
                            <div className="flex flex-wrap items-center gap-2">
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
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getStatusBadgeStyle(statusVal)}`}>
                                {getStatusIcon(statusVal)} {statusVal}
                              </span>
                              {statusVal !== 'Ready' && item.lokasiStatus && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  📍 {getLokasiStatusLabel(statusVal)}: <strong className="text-slate-800">{item.lokasiStatus}</strong>
                                </span>
                              )}
                              {repState.status === 'Done' && repState.report ? (
                                <button
                                  type="button"
                                  onClick={() => setPopupDamageReport({ equipment: item, report: repState.report })}
                                  title="Klik untuk melihat ringkasan Laporan Kerusakan"
                                  className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 shadow-sm transition-all cursor-pointer"
                                >
                                  ✅ Laporan Kerusakan: Done ({repState.report.reportCode})
                                </button>
                              ) : repState.status === 'Laporan Kerusakan New' ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-gradient-to-r from-rose-600 to-amber-600 text-white border border-rose-600 animate-pulse">
                                  🆕 Laporan Kerusakan New (Wajib Buat Baru)
                                </span>
                              ) : repState.status === 'Not Yet' ? (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500 text-white border border-rose-600 animate-pulse">
                                  🔴 Laporan Kerusakan: Not Yet
                                </span>
                              ) : null}
                            </div>

                            {/* Riwayat Peralatan untuk Laporan Done dengan Pagination Limit 3 Waktu Terbaru */}
                            {(() => {
                              const doneReports = repState.history.filter(
                                (h: any) =>
                                  h.statusLaporan === 'Resolved' ||
                                  h.statusLaporan === 'Selesai Diperbaiki' ||
                                  h.repairReportCode ||
                                  h.status === 'Done'
                              );
                              if (doneReports.length === 0) return null;

                              const eqKey = String(item._id || `${item.namaPeralatan}-${item.lokasi}`);
                              const curPage = historyPages[eqKey] || 1;
                              const limit = 3;
                              const totalPages = Math.max(1, Math.ceil(doneReports.length / limit));
                              const validPage = Math.min(Math.max(1, curPage), totalPages);
                              const paginated = doneReports.slice((validPage - 1) * limit, validPage * limit);

                              return (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                                    Riwayat Done ({doneReports.length}):
                                  </span>
                                  {paginated.map((h: any, idx: number) => (
                                    <div
                                      key={h._id || idx}
                                      className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px]"
                                    >
                                      <span className="font-mono font-bold text-rose-700">{h.reportCode}</span>
                                      {h.repairReportCode && (
                                        <span className="font-mono font-bold text-emerald-700">→ {h.repairReportCode}</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setPopupDamageReport({ equipment: item, report: h })}
                                        className="ml-1 px-1.5 py-0.5 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded font-extrabold cursor-pointer"
                                      >
                                        Detail
                                      </button>
                                    </div>
                                  ))}

                                  {/* Kontrol Pagination jika riwayat done lebih dari 3 */}
                                  {totalPages > 1 && (
                                    <div className="inline-flex items-center gap-1 ml-2 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-2xs">
                                      <button
                                        type="button"
                                        disabled={validPage <= 1}
                                        onClick={() =>
                                          setHistoryPages(prev => ({ ...prev, [eqKey]: Math.max(1, validPage - 1) }))
                                        }
                                        className="px-1 text-[10px] font-black text-slate-600 disabled:opacity-30 hover:text-blue-600 cursor-pointer"
                                        title="Halaman Sebelumnya"
                                      >
                                        ◀
                                      </button>
                                      <span className="text-[9px] font-bold text-slate-500">
                                        {validPage}/{totalPages}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={validPage >= totalPages}
                                        onClick={() =>
                                          setHistoryPages(prev => ({ ...prev, [eqKey]: Math.min(totalPages, validPage + 1) }))
                                        }
                                        className="px-1 text-[10px] font-black text-slate-600 disabled:opacity-30 hover:text-blue-600 cursor-pointer"
                                        title="Halaman Berikutnya"
                                      >
                                        ▶
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => toggleKondisi(item._id)}
                              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors flex-shrink-0 disabled:opacity-60 ${
                                item.kondisi === 'Normal'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'
                              }`}
                            >
                              {item.kondisi === 'Normal' ? '✅ Normal' : '❌ Rusak'}
                            </button>

                            {!isLocked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  title="Edit peralatan / ubah status & lokasi"
                                  className="p-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  title="Hapus peralatan ini"
                                  className="p-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {item.kondisi === 'Rusak' && (
                          <div className="mt-4 animate-fadeIn">
                            <input
                              disabled={isLocked}
                              type="text"
                              value={item.keteranganRusak}
                              onChange={(e) => updateKeterangan(item._id, e.target.value)}
                              placeholder="Tuliskan detail kerusakan..."
                              className="w-full p-3 bg-white border border-rose-200 rounded-lg outline-none font-medium text-xs focus:ring-2 focus:ring-rose-500/20 text-slate-700 disabled:opacity-60"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(groupedFasilitas).length === 0 && (
          <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl">
            <p className="text-slate-500 font-bold text-sm">Tidak ada alat yang ditemukan pada filter/kategori ini.</p>
          </div>
        )}
      </div>

      {/* Catatan Tambahan */}
      <div className="mt-8 bg-slate-50/80 border border-slate-200 p-5 rounded-2xl shadow-sm">
        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 block flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>Catatan Tambahan (Opsional)
        </label>
        <textarea
          disabled={isLocked}
          value={catatanFasilitas}
          onChange={(e) => setCatatanFasilitas(e.target.value)}
          placeholder="Contoh: Terdapat kerusakan pada VHF HT RIG Mobile Motorola di Mobil Operasional..."
          className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/10 min-h-[100px] disabled:opacity-60"
        />
      </div>

      {/* Modal Tambah / Edit Fasilitas langsung dari Pengecekan Fasilitas */}
      {isCrudModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] shadow-2xl relative flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-extrabold text-slate-800">
                {editingItem ? 'Edit Data Fasilitas' : 'Tambah Data Fasilitas Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCrudModalOpen(false)}
                className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCrud} className="p-6 space-y-4 overflow-y-auto">
              {/* Kategori Utama */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Kategori Utama
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCrudForm({ ...crudForm, mainCategory: 'Faskampen' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      crudForm.mainCategory === 'Faskampen'
                        ? 'bg-[#175390] text-white border-[#175390]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    FASKAMPEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrudForm({ ...crudForm, mainCategory: 'Elban', subCategory: crudForm.subCategory || 'Fasilitas IT' })}
                    className={`py-2.5 px-4 rounded-xl font-extrabold text-xs border transition-all ${
                      crudForm.mainCategory === 'Elban'
                        ? 'bg-[#175390] text-white border-[#175390]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ELBAN
                  </button>
                </div>
              </div>

              {/* Sub-Kategori Elban */}
              {crudForm.mainCategory === 'Elban' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Sub-Kategori Elban
                  </label>
                  <select
                    value={crudForm.subCategory}
                    onChange={(e) => setCrudForm({ ...crudForm, subCategory: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Fasilitas IT">Fasilitas IT</option>
                    <option value="Fasilitas Penunjang Bandar Udara">Fasilitas Penunjang Bandar Udara (Penunjang Bandara)</option>
                  </select>
                </div>
              )}

              {/* Nama Peralatan */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Nama Peralatan
                </label>
                <input
                  type="text"
                  required
                  list="fasilitas-nama-list"
                  placeholder="Contoh: X-Ray Bagasi, CCTV Indoor, Switch Core..."
                  value={crudForm.namaPeralatan}
                  onChange={(e) => setCrudForm({ ...crudForm, namaPeralatan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                />
                <datalist id="fasilitas-nama-list">
                  {uniqueNamaPeralatanList.map((n) => (
                    <option key={n} value={n} />
                  ))}
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
                    value={crudForm.lokasi}
                    onChange={(e) => setCrudForm({ ...crudForm, lokasi: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Merek
                  </label>
                  <input
                    type="text"
                    list="fasilitas-merek-list"
                    placeholder="Contoh: Smith, Hikvision, Garrett..."
                    value={crudForm.merek}
                    onChange={(e) => setCrudForm({ ...crudForm, merek: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <datalist id="fasilitas-merek-list">
                    {allMerekList.map((m) => (
                      <option key={m} value={m} />
                    ))}
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
                    value={crudForm.serialNumber}
                    onChange={(e) => setCrudForm({ ...crudForm, serialNumber: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Nomor Sertifikasi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: CERT-DKP-2026/089, BAP-992..."
                    value={crudForm.nomorSertifikasi}
                    onChange={(e) => setCrudForm({ ...crudForm, nomorSertifikasi: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
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
                    value={crudForm.tipePeralatan}
                    onChange={(e) => setCrudForm({ ...crudForm, tipePeralatan: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Status Kepemilikan (Default: Inventaris API)
                  </label>
                  <select
                    value={crudForm.statusKepemilikan}
                    onChange={(e) => setCrudForm({ ...crudForm, statusKepemilikan: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Inventaris API">Inventaris API (Milik API)</option>
                    <option value="Sewa">Sewa (Vendor / Pihak Ketiga)</option>
                  </select>
                </div>
              </div>

              {/* Kondisi Saat Ini */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Kondisi Peralatan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCrudForm({ ...crudForm, kondisi: 'Normal', keteranganRusak: '' })}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${
                      crudForm.kondisi === 'Normal'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    ✅ Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrudForm({ ...crudForm, kondisi: 'Rusak' })}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs border transition-all ${
                      crudForm.kondisi === 'Rusak'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    ❌ Rusak
                  </button>
                </div>
              </div>

              {crudForm.kondisi === 'Rusak' && (
                <div>
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1.5 block">
                    Keterangan Kerusakan
                  </label>
                  <input
                    type="text"
                    placeholder="Tuliskan detail kerusakan..."
                    value={crudForm.keteranganRusak}
                    onChange={(e) => setCrudForm({ ...crudForm, keteranganRusak: e.target.value })}
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
                        setCrudForm(prev => ({
                          ...prev,
                          statusPeralatan: st,
                          lokasiStatus: st === 'Ready' ? '' : prev.lokasiStatus,
                          kondisi: st === 'Damaged' ? 'Rusak' : prev.kondisi
                        }))
                      }
                      className={`py-2.5 px-3 rounded-xl font-extrabold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                        crudForm.statusPeralatan === st
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

              {crudForm.statusPeralatan !== 'Ready' && (
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 animate-fadeIn space-y-2">
                  <label className="text-[11px] font-extrabold text-[#175390] uppercase tracking-wider block">
                    📍 {getLokasiStatusLabel(crudForm.statusPeralatan)} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      crudForm.statusPeralatan === 'Standby'
                        ? 'Masukkan lokasi standby peralatan (Cth: Gudang ELIT / Ruang Server)...'
                        : crudForm.statusPeralatan === 'Damaged'
                        ? 'Masukkan lokasi peralatan yang damaged/rusak...'
                        : 'Masukkan lokasi maintenance / perbaikan peralatan...'
                    }
                    value={crudForm.lokasiStatus}
                    onChange={(e) => setCrudForm({ ...crudForm, lokasiStatus: e.target.value })}
                    className="w-full p-3 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-[#175390] transition-all"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCrudModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCrud}
                  className="px-6 py-2.5 bg-[#175390] hover:bg-[#124273] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingCrud ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah & Update Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Fasilitas */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl flex flex-col text-center border border-slate-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Hapus Peralatan?</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6 leading-relaxed">
              Yakin ingin menghapus <strong>"{deleteTarget.namaPeralatan}"</strong> di lokasi <strong>"{deleteTarget.lokasi}"</strong>? Data ini akan dihapus dari laporan yang sedang dikerjakan sekaligus dari Data Master.
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 text-xs sm:text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Ringkasan Laporan Kerusakan ketika tombol Done diklik */}
      {popupDamageReport && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-[#175390] to-blue-700 text-white flex justify-between items-center">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-black uppercase tracking-wider mb-1">
                  ✅ Laporan Kerusakan Tersedia
                </span>
                <h3 className="text-base font-extrabold leading-tight">
                  {popupDamageReport.report.reportCode} — {popupDamageReport.report.peralatan}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPopupDamageReport(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kode Laporan</span>
                  <span className="font-black text-blue-700 text-sm">{popupDamageReport.report.reportCode}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Perbaikan</span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      popupDamageReport.report.statusLaporan === 'Selesai Diperbaiki'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {popupDamageReport.report.statusLaporan === 'Selesai Diperbaiki'
                      ? `✅ Selesai (${popupDamageReport.report.repairReportCode || '-'})`
                      : '⏳ Belum Diperbaiki'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Lokasi</span>
                  <span className="font-bold text-slate-800">{popupDamageReport.report.lokasi}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Waktu Kerusakan</span>
                  <span className="font-bold text-slate-800">
                    {popupDamageReport.report.tanggalKerusakan} ({popupDamageReport.report.jamKerusakan})
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/60 border border-rose-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold text-rose-600 uppercase block mb-1">
                  Petunjuk / Tanda Kerusakan
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {popupDamageReport.report.petunjukKerusakan || '-'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                  Tindakan Perbaikan & teknisi
                </span>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {popupDamageReport.report.tindakanPerbaikan || '-'}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1.5">
                  👷 Teknisi: <span className="text-slate-800">{popupDamageReport.report.namaTeknisi || '-'}</span> | Kode Hambatan:{' '}
                  <span className="text-slate-800">{popupDamageReport.report.kodeHambatan || '-'}</span>
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPopupDamageReport(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}