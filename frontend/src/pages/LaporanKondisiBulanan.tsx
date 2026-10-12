import React, { useState, useEffect, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

interface DailyCellData {
  code: string;
  color: string;
  downHours: number;
  status: string;
  kondisi: string;
}

interface EquipmentRowItem {
  no: number;
  _id: string;
  namaPeralatan: string;
  lokasi: string;
  merek: string;
  serialNumber: string;
  tipePeralatan: string;
  statusKepemilikan: string;
  mainCategory: string;
  subCategory: string;
  days: Record<number, DailyCellData>;
  jmlJamTerputus: number;
  jmlJamOpsBln: number;
  availability: number;
  keterangan: string;
}

interface EquipmentGroup {
  groupLetter: string;
  groupName: string;
  totalItems: number;
  availabilityFacility: number;
  items: EquipmentRowItem[];
}

interface MonthlyMatrixResponse {
  bandarUdara: string;
  bulan: number;
  tahun: number;
  namaBulan: string;
  bulanTahun: string;
  daysInMonth: number;
  totalMonthHours: number;
  mainCategory: string;
  subCategory: string;
  totalPeralatan: number;
  totalTerputus: number;
  overallAvailability: number;
  groups: EquipmentGroup[];
}

const BULAN_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

export default function LaporanKondisiBulanan() {
  const now = new Date();
  const [selectedBulan, setSelectedBulan] = useState<number>(now.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(now.getFullYear());
  const [activeCategoryTab, setActiveCategoryTab] = useState<'Semua' | 'Faskampen' | 'Fasilitas IT' | 'Fasilitas Penunjang'>('Faskampen');
  const [searchQuery, setSearchQuery] = useState('');

  const [matrixData, setMatrixData] = useState<MonthlyMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      let mainCat = 'Semua';
      let subCat = 'Semua';

      if (activeCategoryTab === 'Faskampen') {
        mainCat = 'Faskampen';
      } else if (activeCategoryTab === 'Fasilitas IT') {
        mainCat = 'Elban';
        subCat = 'Fasilitas IT';
      } else if (activeCategoryTab === 'Fasilitas Penunjang') {
        mainCat = 'Elban';
        subCat = 'Fasilitas Penunjang Bandar Udara';
      }

      const params = new URLSearchParams({
        bulan: String(selectedBulan),
        tahun: String(selectedTahun),
        mainCategory: mainCat,
        subCategory: subCat
      });

      const res = await fetch(`/api/equipment-monthly?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMatrixData(data);
      }
    } catch (err) {
      console.error('Error fetching monthly matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedBulan, selectedTahun, activeCategoryTab]);

  const handleSyncFromDailyReports = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/equipment-monthly/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message || 'Sinkronisasi berhasil!');
        await fetchMatrix();
      } else {
        setSyncMessage(data.message || 'Gagal sinkronisasi');
      }
    } catch (err) {
      setSyncMessage('Gagal menghubungi server');
    } finally {
      setIsSyncing(false);
    }
  };

  const daysInMonth = matrixData?.daysInMonth || 30;
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!matrixData?.groups) return [];
    if (!searchQuery.trim()) return matrixData.groups;

    const q = searchQuery.toLowerCase().trim();
    return matrixData.groups
      .map(group => {
        const matchingItems = group.items.filter(
          item =>
            item.namaPeralatan.toLowerCase().includes(q) ||
            item.lokasi.toLowerCase().includes(q) ||
            item.merek.toLowerCase().includes(q) ||
            item.serialNumber.toLowerCase().includes(q)
        );
        return {
          ...group,
          items: matchingItems
        };
      })
      .filter(group => group.items.length > 0);
  }, [matrixData, searchQuery]);

  // Export to Excel (.xlsx) exactly matching the user's Injourney Airports sheet
  const handleExportExcel = async () => {
    if (!matrixData) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Availability Bulanan', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 }
    });

    // Header info (Baris 1-4)
    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'BANDAR UDARA : HALIM PERDANAKUSUMA';
    sheet.getCell('A1').font = { bold: true, size: 9 };

    sheet.mergeCells('A2:C2');
    sheet.getCell('A2').value = `FASILITAS : ${activeCategoryTab.toUpperCase()}`;
    sheet.getCell('A2').font = { bold: true, size: 9 };

    sheet.mergeCells('A3:C3');
    sheet.getCell('A3').value = `BULAN / TAHUN : ${matrixData.namaBulan.toUpperCase()} ${matrixData.tahun}`;
    sheet.getCell('A3').font = { bold: true, size: 9 };

    // Judul Dokumen (Center)
    sheet.mergeCells('D2:U2');
    const titleCell = sheet.getCell('D2');
    titleCell.value = 'LAPORAN BULANAN KESIAPAN FASILITAS / AVAILABILITY';
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Logo text (Right)
    sheet.getCell('V1').value = 'INJOURNEY AIRPORTS';
    sheet.getCell('V1').font = { bold: true, size: 11, color: { argb: 'FF175390' } };

    // Header Baris Tabel (Row 6 & 7)
    // Kolom 1-4
    sheet.mergeCells('A6:A7');
    sheet.getCell('A6').value = 'NO';
    sheet.mergeCells('B6:B7');
    sheet.getCell('B6').value = 'NAMA PERALATAN';
    sheet.mergeCells('C6:C7');
    sheet.getCell('C6').value = 'LOKASI';
    sheet.mergeCells('D6:D7');
    sheet.getCell('D6').value = 'MEREK';

    // Kolom Tanggal 1 s.d. daysInMonth
    const startDayCol = 5; // Kolom E
    const endDayCol = startDayCol + daysInMonth - 1;

    // Merge header "TANGGAL"
    const startColLetter = sheet.getColumn(startDayCol).letter;
    const endColLetter = sheet.getColumn(endDayCol).letter;
    sheet.mergeCells(`${startColLetter}6:${endColLetter}6`);
    const tglHeader = sheet.getCell(`${startColLetter}6`);
    tglHeader.value = 'TANGGAL';
    tglHeader.font = { bold: true, size: 9 };
    tglHeader.alignment = { horizontal: 'center' };

    // Sub-header tanggal 1, 2, 3 ...
    for (let d = 1; d <= daysInMonth; d++) {
      const colIdx = startDayCol + d - 1;
      sheet.getCell(7, colIdx).value = d;
      sheet.getCell(7, colIdx).font = { bold: true, size: 8 };
      sheet.getCell(7, colIdx).alignment = { horizontal: 'center' };
      sheet.getColumn(colIdx).width = 3.2;
    }

    // Kolom Hasil
    const jamTerputusCol = endDayCol + 1;
    const jamOpsCol = endDayCol + 2;
    const availCol = endDayCol + 3;
    const availFacCol = endDayCol + 4;
    const ketCol = endDayCol + 5;

    sheet.mergeCells(6, jamTerputusCol, 7, jamTerputusCol);
    sheet.getCell(6, jamTerputusCol).value = 'JML JAM OPS TERPUTUS';

    sheet.mergeCells(6, jamOpsCol, 7, jamOpsCol);
    sheet.getCell(6, jamOpsCol).value = 'JML JAM OPS / BLN';

    sheet.mergeCells(6, availCol, 7, availCol);
    sheet.getCell(6, availCol).value = 'AVAILABILITY';

    sheet.mergeCells(6, availFacCol, 7, availFacCol);
    sheet.getCell(6, availFacCol).value = 'AVAILABILITY FACILITY';

    sheet.mergeCells(6, ketCol, 7, ketCol);
    sheet.getCell(6, ketCol).value = 'KETERANGAN';

    // Lebar kolom utama
    sheet.getColumn('A').width = 5;
    sheet.getColumn('B').width = 24;
    sheet.getColumn('C').width = 24;
    sheet.getColumn('D').width = 14;
    sheet.getColumn(jamTerputusCol).width = 12;
    sheet.getColumn(jamOpsCol).width = 11;
    sheet.getColumn(availCol).width = 12;
    sheet.getColumn(availFacCol).width = 14;
    sheet.getColumn(ketCol).width = 16;

    // Style baris header tabel (Row 6 dan 7)
    [6, 7].forEach(r => {
      sheet.getRow(r).font = { bold: true, size: 8 };
      sheet.getRow(r).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    let currentRow = 8;

    // Baris Kategori Utama (e.g. FASILITAS KEAMANAN PENERBANGAN)
    sheet.mergeCells(currentRow, 1, currentRow, ketCol);
    const catBar = sheet.getCell(currentRow, 1);
    catBar.value = `I. ${activeCategoryTab.toUpperCase()}`;
    catBar.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    catBar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    currentRow++;

    // Render per grup peralatan
    filteredGroups.forEach(group => {
      // Group header row (e.g. A. FTD, B. X-RAY, etc.)
      const gRow = sheet.getRow(currentRow);
      sheet.getCell(currentRow, 1).value = group.groupLetter;
      sheet.getCell(currentRow, 2).value = group.groupName;
      gRow.font = { bold: true, size: 9 };
      gRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      currentRow++;

      // Render items
      group.items.forEach(item => {
        const row = sheet.getRow(currentRow);
        sheet.getCell(currentRow, 2).value = item.namaPeralatan;
        sheet.getCell(currentRow, 1).value = item.no;
        sheet.getCell(currentRow, 3).value = item.lokasi;
        sheet.getCell(currentRow, 4).value = item.merek;

        // Render cell hari 1 s.d. daysInMonth
        for (let d = 1; d <= daysInMonth; d++) {
          const dayCell = item.days[d] || { code: '0', color: 'green' };
          const cell = sheet.getCell(currentRow, startDayCol + d - 1);
          cell.value = dayCell.code;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 8, bold: true };

          if (dayCell.color === 'yellow') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } }; // Light yellow
          } else if (dayCell.color === 'red') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } }; // Light red
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }; // Light green
          }
        }

        sheet.getCell(currentRow, jamTerputusCol).value = item.jmlJamTerputus;
        sheet.getCell(currentRow, jamOpsCol).value = item.jmlJamOpsBln;
        sheet.getCell(currentRow, availCol).value = item.availability;
        sheet.getCell(currentRow, availCol).numFmt = '0.0';

        sheet.getCell(currentRow, ketCol).value = item.keterangan;

        row.font = { size: 8 };
        row.alignment = { vertical: 'middle' };
        currentRow++;
      });

      // Set AVAILABILITY FACILITY di baris pertama grup
      const groupStartRow = currentRow - group.items.length;
      if (group.items.length > 1) {
        sheet.mergeCells(groupStartRow, availFacCol, currentRow - 1, availFacCol);
      }
      const facCell = sheet.getCell(groupStartRow, availFacCol);
      facCell.value = group.availabilityFacility;
      facCell.numFmt = '0.0';
      facCell.alignment = { horizontal: 'center', vertical: 'middle' };
      facCell.font = { bold: true, size: 9 };
    });

    // Tambahkan Tanda Tangan di akhir sheet
    currentRow += 2;
    sheet.mergeCells(currentRow, endDayCol, currentRow, ketCol);
    sheet.getCell(currentRow, endDayCol).value = 'PT. Angkasa Pura Indonesia';
    sheet.getCell(currentRow, endDayCol).font = { size: 8 };
    sheet.getCell(currentRow, endDayCol).alignment = { horizontal: 'center' };
    currentRow++;

    sheet.mergeCells(currentRow, endDayCol, currentRow, ketCol);
    sheet.getCell(currentRow, endDayCol).value = 'KC Bandara Halim Perdanakusuma';
    sheet.getCell(currentRow, endDayCol).font = { size: 8 };
    sheet.getCell(currentRow, endDayCol).alignment = { horizontal: 'center' };
    currentRow++;

    sheet.mergeCells(currentRow, endDayCol, currentRow, ketCol);
    sheet.getCell(currentRow, endDayCol).value = 'Asst. Manager of Facility Maintenance';
    sheet.getCell(currentRow, endDayCol).font = { size: 8 };
    sheet.getCell(currentRow, endDayCol).alignment = { horizontal: 'center' };
    currentRow += 4;

    sheet.mergeCells(currentRow, endDayCol, currentRow, ketCol);
    sheet.getCell(currentRow, endDayCol).value = 'AEP MASHUM NURZAMAN';
    sheet.getCell(currentRow, endDayCol).font = { bold: true, size: 8, underline: true };
    sheet.getCell(currentRow, endDayCol).alignment = { horizontal: 'center' };

    // Berikan border tipis ke seluruh tabel data
    for (let r = 6; r < currentRow - 5; r++) {
      for (let c = 1; c <= ketCol; c++) {
        sheet.getCell(r, c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer]),
      `Laporan_Bulanan_Availability_${matrixData.namaBulan}_${matrixData.tahun}.xlsx`
    );
  };

  // Export to PDF (A4 Landscape)
  const handleExportPDF = () => {
    if (!printAreaRef.current) return;
    const opt: any = {
      margin: [6, 6, 6, 6],
      filename: `Laporan_Bulanan_Availability_${matrixData?.namaBulan || 'Bulanan'}_${matrixData?.tahun || '2026'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', '.break-inside-avoid'] }
    };
    html2pdf().set(opt).from(printAreaRef.current).save();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-[#175390] rounded-2xl border border-blue-100 text-xl font-bold shadow-sm">
              📈
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Laporan Kondisi Peralatan Bulanan (Availability)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Rekapitulasi kesiapan fasilitas per hari dalam sebulan, terintegrasi otomatis dengan laporan logbook harian
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncFromDailyReports}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Tarik dan perbarui log seluruh laporan logbook harian ke rekap bulanan"
          >
            <span>{isSyncing ? '⏳' : '🔄'}</span>
            <span>Sinkronisasi Laporan</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>📊</span>
            <span>Download Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <span>📄</span>
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between">
          <span>ℹ️ {syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-blue-500 hover:text-blue-800">✕</button>
        </div>
      )}

      {/* Filter Period & Category Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Periode:</span>
            <select
              value={selectedBulan}
              onChange={e => setSelectedBulan(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              {BULAN_OPTIONS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>

            <select
              value={selectedTahun}
              onChange={e => setSelectedTahun(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari nama peralatan, lokasi, S/N..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
          {(
            [
              { key: 'Faskampen', label: '🛡️ Fasilitas Keamanan (Faskampen)' },
              { key: 'Fasilitas IT', label: '💻 Fasilitas IT' },
              { key: 'Fasilitas Penunjang', label: '🔊 Fasilitas Penunjang Bandara' },
              { key: 'Semua', label: '🌐 Semua Fasilitas' }
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveCategoryTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeCategoryTab === tab.key
                  ? 'bg-[#175390] text-white border-[#175390] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#175390] flex items-center justify-center text-lg font-black shrink-0">
            📊
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {matrixData?.totalPeralatan || 0}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Dipantau</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg font-black shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              {matrixData?.overallAvailability || 100}%
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rata-rata Availability</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg font-black shrink-0">
            ⏱️
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-700">
              {matrixData?.totalTerputus || 0} Jam
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Jam Terputus</div>
          </div>
        </div>

        <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg font-black shrink-0">
            📑
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-700">
              {matrixData?.totalMonthHours || 720} Jam
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jam Operasi / Bulan</div>
          </div>
        </div>
      </div>

      {/* Legend Information */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
        <span className="text-slate-400 uppercase tracking-wider text-[10px]">Keterangan Simbol:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold border border-emerald-300">0</span>
          <span>Beroperasi Normal (0 Jam Terputus)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold border border-amber-300">-</span>
          <span>Standby / Cadangan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-bold border border-rose-300">X</span>
          <span>Rusak / Jam Operasional Terputus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-orange-100 text-orange-800 flex items-center justify-center text-[10px] font-bold border border-orange-300">M</span>
          <span>Pemeliharaan / Maintenance</span>
        </div>
      </div>

      {/* THE MAIN MATRIX TABLE (Matching exact Injourney Airports Form) */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">
          ⏳ Memuat matriks kesiapan fasilitas bulanan...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-16 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">
          Tidak ada data peralatan untuk filter yang dipilih.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto" ref={printAreaRef}>
            <div className="p-4 sm:p-6 min-w-[1200px]">
              {/* Document Header in Print Style */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-4">
                <div className="text-[11px] font-bold text-slate-700 leading-tight space-y-0.5">
                  <div>BANDAR UDARA : HALIM PERDANAKUSUMA</div>
                  <div>FASILITAS : {activeCategoryTab.toUpperCase()}</div>
                  <div>BULAN / TAHUN : {matrixData?.namaBulan.toUpperCase()} {matrixData?.tahun}</div>
                </div>

                <div className="text-center">
                  <h2 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                    LAPORAN BULANAN KESIAPAN FASILITAS / AVAILABILITY
                  </h2>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-[#175390] tracking-wider">injourney</div>
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">AIRPORTS</div>
                </div>
              </div>

              {/* Table Matrix */}
              <table className="w-full border-collapse border border-slate-800 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-extrabold">
                    <th rowSpan={2} className="border border-slate-800 p-1 w-8 text-center">NO</th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-left w-48">NAMA PERALATAN</th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-left w-44">LOKASI</th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-left w-24">MEREK</th>
                    <th colSpan={daysInMonth} className="border border-slate-800 p-1 text-center bg-slate-200">
                      TANGGAL (JAM OPERASIONAL TERPUTUS)
                    </th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-center w-16 leading-tight">
                      JML JAM OPS TERPUTUS
                    </th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-center w-14 leading-tight">
                      JML JAM OPS / BLN
                    </th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-center w-14 leading-tight">
                      AVAILABILITY
                    </th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-center w-16 leading-tight bg-slate-50">
                      AVAILABILITY FACILITY
                    </th>
                    <th rowSpan={2} className="border border-slate-800 p-1 text-left w-28">KETERANGAN</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-800 text-slate-900 font-extrabold text-[9px]">
                    {daysArray.map(d => (
                      <th key={d} className="border border-slate-800 p-0.5 w-6 text-center">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Category Banner Row */}
                  <tr className="bg-slate-700 text-white font-extrabold text-[11px]">
                    <td colSpan={daysInMonth + 9} className="border border-slate-800 px-3 py-1 uppercase tracking-wider">
                      {activeCategoryTab.toUpperCase()}
                    </td>
                  </tr>

                  {/* Groups */}
                  {filteredGroups.map(group => (
                    <React.Fragment key={group.groupName}>
                      {/* Sub-Group Header */}
                      <tr className="bg-slate-100 font-extrabold text-slate-800">
                        <td className="border border-slate-800 p-1 text-center">{group.groupLetter}</td>
                        <td colSpan={daysInMonth + 8} className="border border-slate-800 p-1 uppercase">
                          {group.groupName}
                        </td>
                      </tr>

                      {/* Items */}
                      {group.items.map((item, idx) => (
                        <tr key={item._id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="border border-slate-800 p-1 text-center text-slate-600">{item.no}</td>
                          <td className="border border-slate-800 p-1 font-bold text-slate-800">{item.namaPeralatan}</td>
                          <td className="border border-slate-800 p-1 text-slate-700">{item.lokasi}</td>
                          <td className="border border-slate-800 p-1 text-slate-600">{item.merek}</td>

                          {/* Day Columns */}
                          {daysArray.map(d => {
                            const cell = item.days[d] || { code: '0', color: 'green' };
                            const bgClass =
                              cell.color === 'yellow'
                                ? 'bg-amber-100 text-amber-900'
                                : cell.color === 'red'
                                ? 'bg-rose-200 text-rose-950 font-black'
                                : cell.color === 'orange'
                                ? 'bg-orange-100 text-orange-900'
                                : 'bg-emerald-50 text-emerald-900';

                            return (
                              <td
                                key={d}
                                className={`border border-slate-800 p-0 text-center font-mono font-bold text-[9px] ${bgClass}`}
                                title={`Tgl ${d}: ${cell.status} (${cell.kondisi})`}
                              >
                                {cell.code}
                              </td>
                            );
                          })}

                          {/* Stat Columns */}
                          <td className="border border-slate-800 p-1 text-center font-bold">
                            {item.jmlJamTerputus}
                          </td>
                          <td className="border border-slate-800 p-1 text-center text-slate-600">
                            {item.jmlJamOpsBln}
                          </td>
                          <td className="border border-slate-800 p-1 text-center font-extrabold text-slate-800">
                            {item.availability.toFixed(1)}%
                          </td>

                          {/* Group Availability Cell (Span across rows of the group) */}
                          {idx === 0 && (
                            <td
                              rowSpan={group.items.length}
                              className="border border-slate-800 p-1 text-center font-black bg-slate-50 text-slate-900 text-xs"
                            >
                              {group.availabilityFacility.toFixed(1)}%
                            </td>
                          )}

                          <td className="border border-slate-800 p-1 text-[9px] text-slate-500">
                            {item.keterangan || '-'}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Footer Tanda Tangan */}
              <div className="mt-8 flex justify-end">
                <div className="w-64 text-center text-[10px] space-y-1">
                  <div>PT. Angkasa Pura Indonesia</div>
                  <div>KC Bandara Halim Perdanakusuma</div>
                  <div className="font-bold">Asst. Manager of Facility Maintenance</div>
                  <div className="h-14"></div>
                  <div className="font-bold underline text-slate-900">AEP MASHUM NURZAMAN</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
