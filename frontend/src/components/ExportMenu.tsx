import { useState } from 'react';
import html2pdf from 'html2pdf.js';
import ExcelJS from 'exceljs';

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
        margin:       0.3,
        filename:     `LogBook_${selectedReport.dinas}_${selectedReport.tanggal}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
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
    let html = '';
    if (isFasilitasOnly) {
      const tgl = selectedReport.tanggal;
      const dn = selectedReport.dinas;
      const ap = selectedReport.personil?.apindo?.map((p: any) => `👷🏻 ${p.nama}`).join('<br>') || '👷🏻 -';
      const is = selectedReport.personil?.omIassNti?.map((p: any) => `👷🏻 ${p.nama}`).join('<br>') || '👷🏻 -';
      
      let docContent = `
        <div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5;">
          <p>Assalamu'alaikum. Wr. Wb<br>Bersama ini dilaporkan, kegiatan ELECTRONIC & IT FACILITY – KSO HLP pada hari ini ${tgl} sebagai berikut :</p>
          <p><strong>ELECTRONIC & IT FACILITY – KSO HLP</strong><br><strong>A. PERSONIL DINAS ${dn} - ELIT</strong><br>APINDO<br>${ap}<br><br>OM IASS - NTI<br>${is}</p>
          <p><strong>B. LAPORAN KONDISI FASILITAS – ELIT</strong></p>
      `;
      
      const grouped = selectedReport.kondisiFasilitas.reduce((acc: any, curr: any) => {
        if (!acc[curr.namaPeralatan]) acc[curr.namaPeralatan] = { total: 0, normal: 0, rusak: 0, listRusak: [] };
        acc[curr.namaPeralatan].total += 1;
        if (curr.kondisi === 'Normal') acc[curr.namaPeralatan].normal += 1;
        if (curr.kondisi === 'Rusak') {
          acc[curr.namaPeralatan].rusak += 1;
          if(curr.keteranganRusak) acc[curr.namaPeralatan].listRusak.push(`${curr.lokasi} (${curr.keteranganRusak})`);
        }
        return acc;
      }, {});
      
      Object.entries(grouped).forEach(([nama, data]: [string, any]) => {
        docContent += `<p style="margin-bottom: 5px;"><strong>${nama.toUpperCase()} (${data.total} Unit)</strong><br>`;
        docContent += `- ✅ Normal : ${data.normal} Unit<br>`;
        if (data.rusak > 0) {
            const ketStr = data.listRusak.length > 0 ? ` (${data.listRusak.join(', ')})` : '';
            docContent += `- ❌ Rusak : ${data.rusak} Unit${ketStr}</p>`;
        } else {
            docContent += `- ❌ Rusak : -</p>`;
        }
      });
      
      if (selectedReport.catatan) { docContent += `<p><strong>Catatan :</strong><br>${selectedReport.catatan.replace(/\n/g, '<br>')}</p>`; } 
      else { docContent += `<p>"FASILITAS MANDATORY ELECTRONIC & IT FACILITY DALAM KONDISI BAIK DAN NORMAL"</p>`; }
      docContent += `<p>Demikian disampaikan.<br>Haturnuhun</p></div>`;
      
      html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Laporan Fasilitas</title></head><body>${docContent}</body></html>`;
    } else {
      const content = document.getElementById('print-area')?.innerHTML;
      if (!content) return;
      html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Export HTML To Doc</title></head><body>${content}</body></html>`;
    }
    
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isFasilitasOnly ? 'Fasilitas' : 'LogBook'}_${selectedReport.dinas}_${selectedReport.tanggal}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
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

  const copyFormatWA = () => {
    const tgl = selectedReport.tanggal;
    const dn = selectedReport.dinas;
    const ap = selectedReport.personil?.apindo?.map((p: any) => `👷🏻 ${p.nama}`).join('\n') || '👷🏻 -';
    const is = selectedReport.personil?.omIassNti?.map((p: any) => `👷🏻 ${p.nama}`).join('\n') || '👷🏻 -';

    let text = `Assalamu'alaikum. Wr. Wb\nBersama ini dilaporkan, kegiatan ELECTRONIC & IT FACILITY – KSO HLP pada hari ini ${tgl} sebagai berikut :\n\nELECTRONIC & IT FACILITY – KSO HLP\nA. PERSONIL DINAS ${dn} - ELIT\nAPINDO\n${ap}\n\nOM IASS - NTI\n${is}\n\n`;

    if (isFasilitasOnly) {
       text += `B. LAPORAN KONDISI FASILITAS – ELIT\n`;
       const grouped = selectedReport.kondisiFasilitas.reduce((acc: any, curr: any) => {
         if (!acc[curr.namaPeralatan]) acc[curr.namaPeralatan] = { total: 0, normal: 0, rusak: 0, listRusak: [] };
         acc[curr.namaPeralatan].total += 1;
         if (curr.kondisi === 'Normal') acc[curr.namaPeralatan].normal += 1;
         if (curr.kondisi === 'Rusak') {
           acc[curr.namaPeralatan].rusak += 1;
           if(curr.keteranganRusak) acc[curr.namaPeralatan].listRusak.push(`${curr.lokasi} (${curr.keteranganRusak})`);
         }
         return acc;
       }, {});

       Object.entries(grouped).forEach(([nama, data]: [string, any]) => {
         text += `${nama.toUpperCase()} (${data.total} Unit)\n- ✅ Normal : ${data.normal} Unit\n`;
         if (data.rusak > 0) { text += `- ❌ Rusak : ${data.rusak} Unit ${data.listRusak.length > 0 ? `(${data.listRusak.join(', ')})` : ''}\n\n`; } 
         else { text += `- ❌ Rusak : -\n\n`; }
       });
       text += selectedReport.catatan ? `Catatan :\n${selectedReport.catatan}\n\n` : `"FASILITAS MANDATORY ELECTRONIC & IT FACILITY DALAM KONDISI BAIK DAN NORMAL"\n\n`;
    } else {
        text += `B. LAPORAN KEGIATAN DINAS ${dn} - ELIT\n`;
        selectedReport.kegiatan?.forEach((k: any) => {
          const urText = k.uraian.replace(/Laporan Dari:[\s\S]*?Uraian:\s*/i, '').replace(/Tindak Lanjut:[\s\S]*/i, '').trim();
          const jamMulaiClean = k.jamMulai?.replace(/ WIB/gi, '').trim();
          const jamSelesaiClean = k.jamSelesai?.replace(/ WIB/gi, '').trim();
          text += `Jam ${jamMulaiClean} - ${jamSelesaiClean} WIB\n- ${urText}\n\n`;
        });
    }
    text += `Demikian disampaikan.\nHaturnuhun`;
    navigator.clipboard.writeText(text);
    alert('✅ Format teks WA berhasil disalin ke clipboard!');
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
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[110] animate-fadeIn">
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
          <button onClick={copyFormatWA} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 border-t border-slate-50">
            <span className="text-base">💬</span> Salin Format Teks WA
          </button>
        </div>
      )}
    </div>
  );
}