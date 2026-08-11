import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

export const getPercentage = (selectedReport: any, names: string[]) => {
  let total = 0, normal = 0;
  selectedReport.kondisiFasilitas?.forEach((f: any) => { if (names.some(n => f.namaFasilitas.includes(n))) { total += f.totalUnit; normal += f.normal; } });
  if (total === 0) return '100%';
  const pct = (normal / total) * 100;
  return pct % 1 === 0 ? pct + '%' : pct.toFixed(2).replace('.', ',') + '%';
};

export const generateReportText = (selectedReport: any, isHtml: boolean = false) => {
  if (!selectedReport) return '';
  const br = isHtml ? '<br>' : '\n';
  let text = `Assalamu'alaikum. Wr. Wb${br}Bersama ini dilaporkan, kegiatan ELECTRONIC & IT FACILITY – KSO HLP pada hari ini ${selectedReport.tanggal} sebagai berikut :${br}${br}ELECTRONIC & IT FACILITY – KSO HLP${br}A. PERSONIL DINAS ${selectedReport.dinas} - ELIT${br}APINDO${br}`;
  const apindo = selectedReport.personil?.apindo || [];
  if (apindo.length > 0) apindo.forEach((p: any) => { if(p.nama) text += `👷🏻 ${p.nama}${br}`; }); else text += `👷🏻 -${br}`;
  text += `OM IASS - NTI${br}`;
  const om = selectedReport.personil?.omIassNti || [];
  if (om.length > 0) om.forEach((p: any) => { if(p.nama) text += `👷🏻 ${p.nama}${br}`; }); else text += `👷🏻 -${br}`;
  if (selectedReport.kegiatan?.length > 0) {
    text += `${br}B. LAPORAN KEGIATAN DINAS ${selectedReport.dinas} - ELIT${br}`;
    selectedReport.kegiatan.forEach((k: any) => { text += `Jam ${k.jamMulai.replace(' WIB', '')} - ${k.jamSelesai}${br}- ${k.uraian?.split('\n\nUraian: ')[1]?.split('\nTindak Lanjut:')[0].replace(/^- /, '') || ''}${br}`; });
  }
  if (selectedReport.kondisiFasilitas?.length > 0) {
    text += `${br}C. PERFORMANCE FASILITAS - ELIT${br}- ✅ X-RAY : ${getPercentage(selectedReport, ['X-RAY'])}${br}- ✅ WTMD : ${getPercentage(selectedReport, ['WTMD'])}${br}- ✅ HHMD : ${getPercentage(selectedReport, ['HHMD'])}${br}- ✅ ETD : ${getPercentage(selectedReport, ['ETD'])}${br}- ✅ CCTV : ${getPercentage(selectedReport, ['CCTV'])}${br}- ✅ Access Control : ${getPercentage(selectedReport, ['ACCESS CONTROL'])}${br}- ✅ Fire Alarm : ${getPercentage(selectedReport, ['FAS'])}${br}- ✅ Radio Communication : ${getPercentage(selectedReport, ['VHF'])}${br}- ✅ FIDS : ${getPercentage(selectedReport, ['FIDS'])}${br}- ✅ Public Addressing : ${getPercentage(selectedReport, ['PAS'])}${br}- ✅ Data Network : ${getPercentage(selectedReport, ['SWITCH', 'RADIOLINK', 'ACCESS POINT'])}${br}${br}D. LAPORAN KONDISI FASILITAS – ELIT${br}`;
    selectedReport.kondisiFasilitas.forEach((f: any) => {
      const unitLabel = f.namaFasilitas === 'CRASHBELL' ? 'System' : 'Unit';
      text += `${f.namaFasilitas} (${f.totalUnit} ${unitLabel})${br}- ✅ Normal : ${f.normal} ${unitLabel} ${f.namaFasilitas === 'SIGN RUANG TUNGGU' && f.keteranganRusak ? '(' + f.keteranganRusak + ')' : ''}${br}`;
      text += f.rusak > 0 ? `- ❌ Rusak : ${f.rusak} ${unitLabel} ${f.namaFasilitas !== 'SIGN RUANG TUNGGU' && f.keteranganRusak ? '(' + f.keteranganRusak + ')' : ''}${br}` : `- ❌ Rusak : -${br}`;
    });
    const catatanList = selectedReport.kondisiFasilitas.filter((f: any) => f.rusak > 0 && f.keteranganRusak && f.namaFasilitas !== 'SIGN RUANG TUNGGU');
    if (catatanList.length > 0) {
      text += `${br}"FASILITAS MANDATORY ELECTRONIC & IT FACILITY DALAM KONDISI BAIK DAN NORMAL"${br}Catatan :${br}`;
      catatanList.forEach((f: any, i: number) => { text += `${i+1}. ${f.namaFasilitas} : ${f.keteranganRusak}${br}`; });
      text += `${br}`;
    } else text += `${br}"FASILITAS MANDATORY ELECTRONIC & IT FACILITY DALAM KONDISI BAIK DAN NORMAL"${br}${br}`;
  }
  text += `Demikian disampaikan.${br}Haturnuhun`;
  return text;
};

export const copyToWhatsApp = (selectedReport: any) => {
  navigator.clipboard.writeText(generateReportText(selectedReport, false)).then(() => alert('Disalin ke clipboard!')).catch(() => alert('Gagal menyalin.'));
};

export const exportToWord = (selectedReport: any) => {
  if (!selectedReport) return;
  const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Laporan</title></head><body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">${generateReportText(selectedReport, true)}</body></html>`;
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  saveAs(blob, `Laporan_${selectedReport.tanggal}_${selectedReport.dinas}.doc`);
};

export const exportToPDF = (ref: any, nama: string, selectedReport: any) => {
  if (!selectedReport || !ref.current) return;
  const opt = { margin: 0.2, filename: `${nama}_${selectedReport.tanggal}_${selectedReport.dinas}.pdf`, image: { type: 'jpeg' as const, quality: 1 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const } };
  html2pdf().set(opt).from(ref.current).save();
};

export const exportToExcel = async (selectedReport: any) => {
  if (!selectedReport) return;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Log Book', { pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 } } });
  sheet.views = [{ state: 'normal', showGridLines: false }]; sheet.properties.defaultRowHeight = 20;
  const columnWidths = [5, 15, 12, 40, 15, 12, 12, 20];
  columnWidths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  const borderAll = { top: { style: 'thin' as any }, left: { style: 'thin' as any }, bottom: { style: 'thin' as any }, right: { style: 'thin' as any } };
  const isPagi = String(selectedReport.dinas).toUpperCase() === 'PAGI';
  const headBgColor = isPagi ? 'FFFFFF00' : 'FFBDD7EE';
  const headerTheme = { font: { bold: true, name: 'Arial', size: 10, color: { argb: 'FF000000' } }, alignment: { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true }, fill: { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: headBgColor } }, border: borderAll };
  const dataLeftStyle = { font: { name: 'Arial', size: 10 }, alignment: { horizontal: 'left' as any, vertical: 'top' as any, wrapText: true }, border: borderAll };
  const headerCells = ['A1','B1','C1','D1','E1','F1','G1','H1', 'A2','B2','C2','D2','E2','F2','G2','H2', 'A3','B3','C3','D3','E3','F3','G3','H3', 'A4','B4','C4','D4','E4','F4','G4','H4', 'A5','B5','C5','D5','E5','F5','G5','H5'];
  headerCells.forEach(cell => { sheet.getCell(cell).border = borderAll; });
  sheet.mergeCells('A1:B1'); sheet.getCell('A1').value = 'FUNGSI'; sheet.getCell('A1').style = headerTheme;
  sheet.getCell('C1').value = 'DINAS'; sheet.getCell('C1').style = headerTheme;
  sheet.getCell('D1').value = 'TANGGAL'; sheet.getCell('D1').style = headerTheme;
  sheet.mergeCells('A2:B2'); sheet.getCell('A2').value = 'ELECTRONIC & IT\nFACILITY'; sheet.getCell('A2').style = dataLeftStyle;
  sheet.getCell('C2').value = selectedReport.dinas; sheet.getCell('C2').style = dataLeftStyle;
  sheet.getCell('D2').value = selectedReport.tanggal; sheet.getCell('D2').style = dataLeftStyle;
  sheet.mergeCells('G1:H2');
  const logoCell = sheet.getCell('G1');
  logoCell.value = { richText: [{ font: { bold: true, size: 14, color: { argb: 'FF000080' }, name: 'Arial' }, text: 'HLP ✈\n' }, { font: { bold: true, size: 11, color: { argb: 'FF000080' }, name: 'Arial' }, text: 'JAKARTA CITY AIRPORT' }] };
  logoCell.alignment = { horizontal: 'right' as any, vertical: 'bottom' as any, wrapText: true };
  sheet.getRow(3).height = 10;
  sheet.mergeCells('A4:H4'); sheet.getCell('A4').value = 'LAPORAN KEGIATAN HARIAN (LOG BOOK)'; sheet.getCell('A4').font = { bold: true, size: 12, name: 'Arial' }; sheet.getCell('A4').alignment = { horizontal: 'center' as any, vertical: 'middle' as any };
  sheet.getRow(4).height = 25; sheet.getRow(5).height = 10;
  sheet.getRow(6).values = ['NO', 'LAPORAN DARI', 'JAM', 'URAIAN KEGIATAN /\nPERMASALAHAN', 'TINDAK LANJUT', 'JAM SELESAI', 'HASIL /\nKONDISI', 'KETERANGAN'];
  sheet.getRow(6).height = 35;
  for (let i = 1; i <= 8; i++) sheet.getCell(6, i).style = headerTheme;
  let currentRow = 7; let allDocs: string[] = []; 
  if (selectedReport.kegiatan) {
    selectedReport.kegiatan.forEach((item: any, index: number) => {
      const rawText = item.uraian || '';
      const laporanDari = rawText.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
      const uraianText = rawText.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1]?.trim() || '';
      const tindakLanjut = rawText.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1]?.trim() || '-';
      const keterangan = rawText.match(/Keterangan:\s*([\s\S]*)$/i)?.[1]?.trim() || '-';
      let jamMulai = item.jamMulai || ''; if(!jamMulai.includes('WIB')) jamMulai += ' WIB';
      let jamSelesai = item.jamSelesai || ''; if(!jamSelesai.includes('WIB')) jamSelesai += ' WIB';
      sheet.getRow(currentRow).values = [index + 1, laporanDari, jamMulai, `Kegiatan :\n- ${uraianText.replace(/^- /, '')}`, tindakLanjut, jamSelesai, item.hasilKondisi || '-', keterangan];
      for (let i = 1; i <= 8; i++) sheet.getCell(currentRow, i).style = dataLeftStyle;
      sheet.getRow(currentRow).height = Math.max(45, (uraianText.length / 40) * 15 + 15);
      currentRow++;
      if (item.dokumentasi && item.dokumentasi.length > 0) { allDocs = allDocs.concat(item.dokumentasi); }
    });
  }
  for(let j=0; j<3; j++) {
    sheet.getRow(currentRow).values = ['', '', '', '', '', '', '', ''];
    for (let i = 1; i <= 8; i++) sheet.getCell(currentRow, i).style = dataLeftStyle;
    sheet.getRow(currentRow).height = 20; currentRow++;
  }
  if (allDocs.length > 0) {
    currentRow += 2;
    for(let i=1; i<=8; i++) sheet.getCell(currentRow, i).border = borderAll;
    sheet.mergeCells(`A${currentRow}:H${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)';
    sheet.getCell(`A${currentRow}`).style = { ...headerTheme, fill: { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: 'FFD9D9D9' } } };
    sheet.getRow(currentRow).height = 25;
    let imgRow = currentRow + 1; let imgCol = 0; sheet.getRow(imgRow).height = 180;
    allDocs.forEach((imgBase64: string) => {
      try {
        const base64Data = imgBase64.split(',')[1];
        const extension = imgBase64.includes('png') ? 'png' : 'jpeg';
        const imageId = workbook.addImage({ base64: base64Data, extension: extension as any });
        sheet.addImage(imageId, { tl: { col: imgCol, row: imgRow - 1 }, ext: { width: 220, height: 220 } });
        imgCol += 2; if (imgCol >= 8) { imgCol = 0; imgRow++; sheet.getRow(imgRow).height = 180; }
      } catch (err) { console.error('Gagal memasukkan gambar', err); }
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `LogBook_${selectedReport.tanggal}_${selectedReport.dinas}.xlsx`);
};