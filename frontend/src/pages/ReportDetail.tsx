import { useState } from 'react';

interface ReportDetailProps {
  selectedReport: any;
  userRole: string;
  canSpvApprove: boolean;
  canAsmenApprove: boolean;
  handleApprove: (report: any) => void;
  handleReject: (report: any) => void;
  handleDelete?: (id: string) => void; // Tombol Hapus Khusus Admin
  setCurrentView: (view: string) => void;
  printLogbookRef?: any;
  printFasilitasRef?: any;
}

export default function ReportDetail({
  selectedReport,
  userRole,
  canSpvApprove,
  canAsmenApprove,
  handleApprove,
  handleReject,
  handleDelete,
  setCurrentView
}: ReportDetailProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  if (!selectedReport) return null;

  const isFasilitasOnly = selectedReport.kondisiFasilitas?.length > 0 && (!selectedReport.kegiatan || selectedReport.kegiatan.length === 0);
  const status = selectedReport.status || 'Draft';
  const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Revisi' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200';

  const downloadPDF = async () => {
    setExportOpen(false);
    const element = document.getElementById('print-area');
    if (!element) return alert('Template cetak tidak ditemukan!');

    const btn = document.getElementById('btn-download-pdf');
    if(btn) btn.innerHTML = '⏳ Memproses PDF...';

    try {
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const container = document.getElementById('hidden-print-container');
      if (container) {
        container.style.opacity = '1';
        container.style.zIndex = '1';
      }

      const opt = {
        margin:       0.3,
        filename:     `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
      };

      await (window as any).html2pdf().set(opt).from(element).save();

      if (container) {
        container.style.opacity = '0';
        container.style.zIndex = '-100';
      }
    } catch (err) {
      alert('Gagal mendownload PDF. Pastikan komputer terhubung ke internet.');
    } finally {
      if(btn) btn.innerHTML = '<span class="text-base">📄</span> Download PDF File';
    }
  };

  const exportToWord = () => {
    const content = document.getElementById('print-area')?.innerHTML;
    if (!content) return;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Export HTML To Doc</title></head><body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setExportOpen(false);
  };

  const exportToExcel = async () => {
    setExportOpen(false);
    const btn = document.getElementById('btn-download-excel');
    if(btn) btn.innerHTML = '⏳ Menyusun Excel...';

    try {
      if (!(window as any).ExcelJS) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      const ExcelJS = (window as any).ExcelJS;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Log Book');

      const isPagi = selectedReport.dinas === 'PAGI';
      const bgArgb = isPagi ? 'FFFFFF00' : 'FF5B9BD5'; 
      const fgArgb = 'FF000000'; 
      const whiteArgb = 'FFFFFFFF'; 

      sheet.columns = [
        { width: 6 },  { width: 16 }, { width: 14 }, { width: 38 },
        { width: 22 }, { width: 14 }, { width: 16 }, { width: 22 }
      ];

      const thinBorder = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

      // 1. KOP SURAT
      sheet.mergeCells('A1:B1'); sheet.mergeCells('D1:E1');
      sheet.mergeCells('A2:B2'); sheet.mergeCells('D2:E2');
      const fHeader = sheet.getCell('A1'); fHeader.value = 'FUNGSI';
      const dHeader = sheet.getCell('C1'); dHeader.value = 'DINAS';
      const tHeader = sheet.getCell('D1'); tHeader.value = 'TANGGAL';
      [fHeader, dHeader, tHeader].forEach(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { color: { argb: fgArgb }, bold: true, size: 11 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      const fVal = sheet.getCell('A2'); fVal.value = 'ELECTRONIC & IT FACILITY';
      const dVal = sheet.getCell('C2'); dVal.value = selectedReport.dinas;
      const tVal = sheet.getCell('D2'); tVal.value = selectedReport.tanggal?.toUpperCase();
      [fVal, dVal, tVal].forEach(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: whiteArgb } };
        cell.font = { color: { argb: 'FF000000' }, size: 11 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 2. JUDUL TENGAH
      sheet.mergeCells('A4:H4');
      const titleCell = sheet.getCell('A4');
      titleCell.value = 'LAPORAN KEGIATAN HARIAN (LOG BOOK)';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // LOGO
      try {
        const response = await fetch('/hlp.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise(resolve => {
          reader.onloadend = () => {
            const base64data = reader.result;
            const logoId = workbook.addImage({ base64: base64data as string, extension: 'png' });
            sheet.addImage(logoId, { tl: { col: 6.5, row: 0.2 }, ext: { width: 140, height: 50 } });
            resolve(null);
          };
        });
      } catch (e) {}

      // 3. TABEL UTAMA - HEADER
      const headerRowIdx = 6;
      const mainHeaders = ['NO', 'LAPORAN DARI', 'JAM', 'URAIAN KEGIATAN / PERMASALAHAN', 'TINDAK LANJUT', 'JAM SELESAI', 'HASIL / KONDISI', 'KETERANGAN'];
      const headerRow = sheet.getRow(headerRowIdx);
      headerRow.values = mainHeaders;
      headerRow.height = 30;
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { color: { argb: fgArgb }, bold: true, size: 10 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      // 4. TABEL UTAMA - DATA
      let currentRowIdx = 7;
      selectedReport.kegiatan?.forEach((k: any, i: number) => {
        const raw = k.uraian || '';
        const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
        const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || raw;
        const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
        const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';
        const jamMulaiClean = k.jamMulai?.replace(/ WIB/gi, '').trim();
        const jamSelesaiClean = k.jamSelesai?.replace(/ WIB/gi, '').trim();

        const row = sheet.getRow(currentRowIdx);
        row.values = [ i + 1, lDari, `${jamMulaiClean} WIB`, `Kegiatan :\n${urText}`, tLanjut, `${jamSelesaiClean} WIB`, k.hasilKondisi, ket ];
        row.eachCell((cell: any, colNumber: number) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: whiteArgb } };
          cell.font = { color: { argb: 'FF000000' }, size: 10 };
          cell.border = thinBorder;
          cell.alignment = { vertical: 'top', horizontal: colNumber === 4 || colNumber === 5 || colNumber === 8 ? 'left' : 'center', wrapText: true };
        });
        currentRowIdx++;
      });

      // 5. TABEL TANDA TANGAN - HEADER
      currentRowIdx += 2; 
      const sigHeaderRow = sheet.getRow(currentRowIdx);
      sigHeaderRow.values = ['NO', 'APINDO', 'PARAF', 'OS - IASS', 'PARAF', 'OM - NTI', 'PARAF'];
      sigHeaderRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { color: { argb: fgArgb }, bold: true, size: 10 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 6. TABEL TANDA TANGAN - DATA
      currentRowIdx++;
      const apindo = selectedReport.personil?.apindo || [];
      const iass = selectedReport.personil?.omIassNti?.slice(0, 4) || [];
      const nti = selectedReport.personil?.omIassNti?.slice(4) || [];
      const maxRows = Math.max(apindo.length, iass.length, nti.length, 5);

      for (let i = 0; i < maxRows; i++) {
        const row = sheet.getRow(currentRowIdx);
        row.values = [ i + 1, apindo[i]?.nama || '', '', iass[i]?.nama || '', '', nti[i]?.nama || '', '' ];
        row.eachCell((cell: any, colNumber: number) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: whiteArgb } };
          cell.font = { color: { argb: 'FF000000' }, size: 10, bold: colNumber === 1 };
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
        });
        currentRowIdx++;
      }

      // 7. BLOK TANDA TANGAN (Bawah Kanan)
      currentRowIdx -= (maxRows + 1); 
      sheet.mergeCells(`F${currentRowIdx}:H${currentRowIdx}`);
      const cellMengetahui = sheet.getCell(`F${currentRowIdx}`);
      cellMengetahui.value = 'Mengetahui,'; cellMengetahui.font = { size: 10 }; cellMengetahui.alignment = { horizontal: 'center' };
      currentRowIdx++;

      sheet.mergeCells(`F${currentRowIdx}:H${currentRowIdx}`);
      const cellTitle = sheet.getCell(`F${currentRowIdx}`);
      cellTitle.value = 'ASST. MANAGER OF FACILITY MAINTENANCE'; cellTitle.font = { size: 10 }; cellTitle.alignment = { horizontal: 'center' };
      currentRowIdx += 4; 

      sheet.mergeCells(`F${currentRowIdx}:H${currentRowIdx}`);
      const cellName = sheet.getCell(`F${currentRowIdx}`);
      cellName.value = 'AEP MASHUM NURZAMAN'; cellName.font = { size: 10, bold: true }; cellName.alignment = { horizontal: 'center' };

      // 8. DOKUMENTASI
      currentRowIdx += 3;
      sheet.mergeCells(`A${currentRowIdx}:H${currentRowIdx}`);
      const docHeader = sheet.getCell(`A${currentRowIdx}`);
      docHeader.value = 'DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)';
      docHeader.font = { bold: true, size: 16 }; docHeader.alignment = { horizontal: 'center' };

      currentRowIdx += 2;
      let rowIdxForImg = currentRowIdx - 1; 

      const allPhotos: string[] = [];
      selectedReport.kegiatan?.forEach((k: any) => {
        if (k.dokumentasi && k.dokumentasi.length > 0) allPhotos.push(...k.dokumentasi);
      });

      const cols = [0, 2, 4, 6]; 
      allPhotos.slice(0, 4).forEach((foto, i) => {
        try {
          const base64Data = foto.includes(',') ? foto.split(',')[1] : foto;
          const extension = foto.includes('png') ? 'png' : 'jpeg';
          const imgId = workbook.addImage({ base64: base64Data, extension: extension as any });
          sheet.addImage(imgId, { tl: { col: cols[i], row: rowIdxForImg }, ext: { width: 220, height: 260 } });
        } catch (e) { }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);

    } catch (err) {
      alert('Gagal mendownload Excel. Pastikan komputer terhubung ke internet.');
    } finally {
      if(btn) btn.innerHTML = '<span class="text-base">📊</span> Download Excel (.xlsx)';
    }
  };

  const copyFormatWA = () => {
    const tgl = selectedReport.tanggal;
    const dn = selectedReport.dinas;
    const ap = selectedReport.personil?.apindo?.map((p: any) => `👷🏻 ${p.nama}`).join('\n') || '👷🏻 -';
    const is = selectedReport.personil?.omIassNti?.map((p: any) => `👷🏻 ${p.nama}`).join('\n') || '👷🏻 -';

    let text = `Assalamu'alaikum. Wr. Wb\nBersama ini dilaporkan, kegiatan ELECTRONIC & IT FACILITY – KSO HLP pada hari ini ${tgl} sebagai berikut :\n\nELECTRONIC & IT FACILITY – KSO HLP\n`;
    text += `A. PERSONIL DINAS ${dn} - ELIT\nAPINDO\n${ap}\n\nOM IASS - NTI\n${is}\n\n`;
    text += `B. LAPORAN KEGIATAN DINAS ${dn} - ELIT\n`;

    selectedReport.kegiatan?.forEach((k: any) => {
      const urText = k.uraian.replace(/Laporan Dari:[\s\S]*?Uraian:\s*/i, '').replace(/Tindak Lanjut:[\s\S]*/i, '').trim();
      const jamMulaiClean = k.jamMulai?.replace(/ WIB/gi, '').trim();
      const jamSelesaiClean = k.jamSelesai?.replace(/ WIB/gi, '').trim();
      text += `Jam ${jamMulaiClean} - ${jamSelesaiClean} WIB\n- ${urText}\n\n`;
    });

    text += `\nDemikian disampaikan.\nHaturnuhun`;
    navigator.clipboard.writeText(text);
    alert('✅ Format teks WA berhasil disalin ke clipboard!');
    setExportOpen(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('dashboard')} 
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 transition-all shadow-sm flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                {isFasilitasOnly ? 'Pengecekan Fasilitas' : 'Log Book Harian'}
              </h1>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${statusClass}`}>{status}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{selectedReport.tanggal} • Shift {selectedReport.dinas}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {/* TOMBOL HAPUS KHUSUS ADMIN MUNCUL DI SINI */}
          {userRole === 'ADMIN' && (
            <button 
              onClick={() => handleDelete && handleDelete(selectedReport._id)}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs border border-rose-200 shadow-sm transition-all"
            >
              Hapus Laporan
            </button>
          )}

          {status === 'Approved' && (
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)}
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Laporan
                <svg className={`w-4 h-4 transition-transform ${exportOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[110] animate-fadeIn">
                  <button id="btn-download-pdf" onClick={downloadPDF} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3">
                    <span className="text-base">📄</span> Download PDF File
                  </button>
                  <button onClick={exportToWord} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 border-t border-slate-50">
                    <span className="text-base">📝</span> Download Word (.doc)
                  </button>
                  <button id="btn-download-excel" onClick={exportToExcel} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 border-t border-slate-50">
                    <span className="text-base">📊</span> Download Excel (.xlsx)
                  </button>
                  <button onClick={copyFormatWA} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 border-t border-slate-50">
                    <span className="text-base">💬</span> Salin Format Teks WA
                  </button>
                </div>
              )}
            </div>
          )}

          {(canSpvApprove || canAsmenApprove) && (
            <>
              <button 
                onClick={() => handleReject(selectedReport)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs border border-rose-200 shadow-sm transition-all"
              >
                Minta Revisi
              </button>
              <button 
                onClick={() => handleApprove(selectedReport)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
              >
                {status === 'Menunggu Asmen' ? 'Setujui Laporan Final (Approve)' : 'Setujui & Teruskan ke Asmen'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* CATATAN REVISI SEKARANG MENAMPILKAN NAMA */}
      {selectedReport.catatanSpv && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Catatan Supervisor:</h3>
          <p className="text-sm text-amber-900 font-medium">{selectedReport.catatanSpv}</p>
        </div>
      )}

      {selectedReport.catatanAsmen && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">Catatan Asmen:</h3>
          <p className="text-sm text-rose-900 font-medium">{selectedReport.catatanAsmen}</p>
        </div>
      )}

      <div className="bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Tim Bertugas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">APINDO</span>
            <div className="space-y-1">
              {selectedReport.personil?.apindo?.map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">OS - IASS</span>
            <div className="space-y-1">
              {selectedReport.personil?.omIassNti?.slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded-2xl border border-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">OM - NTI</span>
            <div className="space-y-1">
              {selectedReport.personil?.omIassNti?.slice(4).map((p: any, i: number) => (
                <div key={i} className="text-xs font-bold text-slate-700">{p.nama || '-'}</div>
              )) || <div className="text-xs text-slate-400">-</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Daftar Kegiatan & Aduan</h2>
        {selectedReport.kegiatan?.map((keg: any, index: number) => {
          const raw = keg.uraian || '';
          const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || '-';
          const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || raw;
          const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
          const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';

          const jamMulaiClean = keg.jamMulai?.replace(/ WIB/gi, '').trim();
          const jamSelesaiClean = keg.jamSelesai?.replace(/ WIB/gi, '').trim();

          return (
            <div key={index} className="bg-white/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-600 font-extrabold text-xs rounded-xl border border-blue-100">
                  {jamMulaiClean} - {jamSelesaiClean} WIB
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Laporan Dari: <strong className="text-slate-800">{lDari}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Progress / Uraian</label>
                    <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{urText}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tindak Lanjut</label>
                    <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{tLanjut}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Keterangan Tambahan</label>
                    <p className="text-slate-800 font-medium whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{ket}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kondisi Akhir</label>
                    <p className="text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">{keg.hasilKondisi || '-'}</p>
                  </div>
                </div>
              </div>

              {keg.dokumentasi && keg.dokumentasi.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Dokumentasi Foto (Klik untuk memperbesar)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {keg.dokumentasi.map((foto: string, fIdx: number) => (
                      <div 
                        key={fIdx} 
                        onClick={() => setPreviewImage(foto)}
                        className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all"
                      >
                        <img 
                          src={foto} 
                          alt="Dokumentasi" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedReport.editHistory && selectedReport.editHistory.length > 0 && (
        <div className="bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/80 shadow-sm space-y-5 mt-6">
          <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Riwayat & Jejak Dokumen</h2>
          <div className="bg-white/50 border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {selectedReport.editHistory.map((hist: any, i: number) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {hist.user ? hist.user.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{hist.user}</p>
                    <p className="text-xs text-slate-500 font-medium">{hist.action}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 whitespace-nowrap">
                  {new Date(hist.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewImage && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white hover:text-rose-400 bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-all font-bold text-lg">✕</button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20" />
          </div>
        </div>
      )}
    </div>
  );
}