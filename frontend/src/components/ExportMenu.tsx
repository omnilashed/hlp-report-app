import { useState } from 'react';
import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';
import { shareToWhatsAppWithPhotos, generateReportText } from '../utils/exportUtils';

interface ExportMenuProps {
  selectedReport: any;
  isFasilitasOnly: boolean;
}

export default function ExportMenu({ selectedReport, isFasilitasOnly }: ExportMenuProps) {
  const [exportOpen, setExportOpen] = useState(false);

  const downloadPDF = async () => {
    if (isFasilitasOnly) return;
    setExportOpen(false);
    const element = document.getElementById('print-area');
    if (!element) return alert('Template cetak tidak ditemukan!');
    const btn = document.getElementById('btn-download-pdf');
    if(btn) btn.innerHTML = '⏳ Memproses PDF...';
    
    try {
      const container = document.getElementById('hidden-print-container');
      if (container) { container.style.opacity = '1'; container.style.zIndex = '1'; }
      
      // Fix TS Error: Tambahkan `as any` agar TS tidak protes soal tipe data image
      const opt: any = {
        margin:       [8, 8, 8, 8],
        filename:     `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak:    {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['tr', '.break-inside-avoid', '.page-break-avoid']
        }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      if (container) { container.style.opacity = '0'; container.style.zIndex = '-100'; }
    } catch (err) {
      alert('Gagal memproses PDF.');
    } finally {
      if(btn) btn.innerHTML = '<span class="text-base">📄</span> Download PDF File';
    }
  };

  const exportToWord = () => {
    const reportHtml = generateReportText(selectedReport, true);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Laporan Harian ELIT - ${selectedReport.tanggal}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    strong {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div>${reportHtml}</div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_ELIT_${selectedReport.dinas}_${selectedReport.tanggal}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportOpen(false);
  };

  const exportToExcel = async () => {
    if (isFasilitasOnly) return; 
    setExportOpen(false);
    const btn = document.getElementById('btn-download-excel');
    if(btn) btn.innerHTML = '⏳ Menyusun Excel...';
    
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Log Book');
      
      const isPagi = selectedReport.dinas === 'PAGI';
      const bgArgb = isPagi ? 'FFFFFF00' : 'FF5B9BD5'; 
      const fgArgb = 'FF000000'; 
      const whiteArgb = 'FFFFFFFF'; 
      
      sheet.columns = [ { width: 6 }, { width: 16 }, { width: 14 }, { width: 38 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 22 } ];
      
      // Fix TS Error: Tambahkan tipe data `: any` pada object thinBorder
      const thinBorder: any = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

      sheet.mergeCells('A1:B1'); sheet.mergeCells('D1:E1'); sheet.mergeCells('A2:B2'); sheet.mergeCells('D2:E2');
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

      sheet.mergeCells('A4:H4');
      const titleCell = sheet.getCell('A4');
      titleCell.value = 'LAPORAN KEGIATAN HARIAN (LOG BOOK)';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      try {
        const response = await fetch('/hlp.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise(resolve => {
          reader.onloadend = () => {
            const logoId = workbook.addImage({ base64: reader.result as string, extension: 'png' });
            sheet.addImage(logoId, { tl: { col: 6.5, row: 0.2 }, ext: { width: 140, height: 50 } });
            resolve(null);
          };
        });
      } catch (e) {}

      const headerRow = sheet.getRow(6);
      headerRow.values = ['NO', 'LAPORAN DARI', 'JAM', 'URAIAN KEGIATAN / PERMASALAHAN', 'TINDAK LANJUT', 'JAM SELESAI', 'HASIL / KONDISI', 'KETERANGAN'];
      headerRow.height = 30;
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { color: { argb: fgArgb }, bold: true, size: 10 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

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

      currentRowIdx += 2; 
      const sigHeaderRow = sheet.getRow(currentRowIdx);
      sigHeaderRow.values = ['NO', 'APINDO', 'PARAF', 'OS - IASS', 'PARAF', 'OM - NTI', 'PARAF'];
      sigHeaderRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { color: { argb: fgArgb }, bold: true, size: 10 };
        cell.border = thinBorder; cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

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

      currentRowIdx -= (maxRows + 1); 
      sheet.mergeCells(`F${currentRowIdx}:H${currentRowIdx}`);
      const cellMengetahui = sheet.getCell(`F${currentRowIdx}`);
      cellMengetahui.value = 'Mengetahui,'; cellMengetahui.font = { size: 10 }; cellMengetahui.alignment = { horizontal: 'center' };
      
      sheet.mergeCells(`F${currentRowIdx+1}:H${currentRowIdx+1}`);
      const cellTitle = sheet.getCell(`F${currentRowIdx+1}`);
      cellTitle.value = 'ASST. MANAGER OF FACILITY MAINTENANCE'; cellTitle.font = { size: 10 }; cellTitle.alignment = { horizontal: 'center' };
      
      sheet.mergeCells(`F${currentRowIdx+5}:H${currentRowIdx+5}`);
      const cellName = sheet.getCell(`F${currentRowIdx+5}`);
      cellName.value = 'AEP MASHUM NURZAMAN'; cellName.font = { size: 10, bold: true }; cellName.alignment = { horizontal: 'center' };

      currentRowIdx += 8;
      sheet.mergeCells(`A${currentRowIdx}:H${currentRowIdx}`);
      const docHeader = sheet.getCell(`A${currentRowIdx}`);
      docHeader.value = 'DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)';
      docHeader.font = { bold: true, size: 16 }; docHeader.alignment = { horizontal: 'center' };

      const allPhotos: string[] = [];
      selectedReport.kegiatan?.forEach((k: any) => { if (k.dokumentasi?.length > 0) allPhotos.push(...k.dokumentasi); });
      const cols = [0, 2, 4, 6]; 
      allPhotos.slice(0, 4).forEach((foto, i) => {
        try {
          const imgId = workbook.addImage({ base64: foto.includes(',') ? foto.split(',')[1] : foto, extension: foto.includes('png') ? 'png' : 'jpeg' as any });
          sheet.addImage(imgId, { tl: { col: cols[i], row: currentRowIdx + 1 }, ext: { width: 220, height: 260 } });
        } catch (e) { }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (err) {
      alert('Gagal memproses Excel.');
    } finally {
      if(btn) btn.innerHTML = '<span class="text-base">📊</span> Download Excel (.xlsx)';
    }
  };

  const handleDirectWA = async () => {
    setExportOpen(false);
    await shareToWhatsAppWithPhotos(selectedReport);
  };

  const handleCopyTextOnly = async () => {
    const text = generateReportText(selectedReport, false);
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Format teks laporan WA berhasil disalin ke clipboard!\n\nAnda dapat langsung paste di WhatsApp.');
    } catch (e) {
      alert('Gagal menyalin teks.');
    }
    setExportOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setExportOpen(!exportOpen)} className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Download Laporan
        <svg className={`w-4 h-4 transition-transform ${exportOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {exportOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[110] animate-fadeIn">
          {!isFasilitasOnly && (
            <button id="btn-download-pdf" onClick={downloadPDF} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3">
              <span className="text-base">📄</span> Download PDF File
            </button>
          )}
          <button onClick={exportToWord} className={`w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 ${!isFasilitasOnly ? 'border-t border-slate-50' : ''}`}>
            <span className="text-base">📝</span> Download Word (.doc)
          </button>
          {!isFasilitasOnly && (
            <button id="btn-download-excel" onClick={exportToExcel} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 border-t border-slate-50">
              <span className="text-base">📊</span> Download Excel (.xlsx)
            </button>
          )}
          <div className="border-t border-slate-100 bg-emerald-50/30">
            <button onClick={handleDirectWA} className="w-full text-left px-4 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 flex items-center gap-3">
              <span className="text-base">📲</span>
              <span>Direct WA + Foto Terlampir</span>
            </button>
            <button onClick={handleCopyTextOnly} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 border-t border-emerald-100/60">
              <span className="text-base">📋</span>
              <span>Salin Teks WA Saja (Tanpa Foto)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}