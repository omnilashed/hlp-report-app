import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

export const formatTanggalWithDay = (tanggalStr?: string): string => {
  if (!tanggalStr) return '';
  if (/^[A-Za-z]+,/.test(tanggalStr)) return tanggalStr;
  const parts = tanggalStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const dNum = parseInt(parts[0], 10);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const mIdx = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
    const yNum = parseInt(parts[2], 10);
    if (!isNaN(dNum) && mIdx !== -1 && !isNaN(yNum)) {
      const d = new Date(yNum, mIdx, dNum);
      const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return `${daysIndo[d.getDay()]}, ${parts[0]} ${parts[1]} ${parts[2]}`;
    }
  }
  return tanggalStr;
};

export const getFasilitasGrouped = (kondisiFasilitas: any[]): Array<{
  nama: string;
  total: number;
  normal: number;
  rusak: number;
  unitLabel: string;
  keteranganNormal?: string;
  keteranganRusak?: string;
}> => {
  if (!Array.isArray(kondisiFasilitas) || kondisiFasilitas.length === 0) return [];

  // Jika item pertama sudah memiliki `totalUnit` (format summary)
  if (kondisiFasilitas[0] && typeof kondisiFasilitas[0].totalUnit === 'number') {
    return kondisiFasilitas.map(f => {
      const nama = f.namaFasilitas || f.namaPeralatan || '';
      const unitLabel = nama.toUpperCase().includes('CRASHBELL') ? 'System' : 'Unit';
      return {
        nama,
        total: f.totalUnit,
        normal: f.normal ?? (f.totalUnit - (f.rusak || 0)),
        rusak: f.rusak || 0,
        unitLabel,
        keteranganNormal: f.keteranganNormal || (nama === 'SIGN RUANG TUNGGU' ? 'sign ruang tunggu dan sign jalan khusus difabel' : undefined),
        keteranganRusak: f.keteranganRusak || ''
      };
    });
  }

  // Jika berupa array peralatan individual
  const grouped: Record<string, { total: number; normal: number; rusak: number; unitLabel: string; listRusak: string[] }> = {};
  kondisiFasilitas.forEach(item => {
    const rawName = item.namaPeralatan || item.namaFasilitas || 'PERALATAN';
    const nama = rawName.toUpperCase();
    const unitLabel = nama.includes('CRASHBELL') ? 'System' : 'Unit';
    if (!grouped[nama]) {
      grouped[nama] = { total: 0, normal: 0, rusak: 0, unitLabel, listRusak: [] };
    }
    grouped[nama].total += 1;
    if (item.kondisi === 'Rusak') {
      grouped[nama].rusak += 1;
      const desc = item.keteranganRusak ? `${item.lokasi || ''} (${item.keteranganRusak})`.trim() : (item.lokasi || '');
      if (desc) grouped[nama].listRusak.push(desc);
    } else {
      grouped[nama].normal += 1;
    }
  });

  return Object.entries(grouped).map(([nama, val]) => ({
    nama,
    total: val.total,
    normal: val.normal,
    rusak: val.rusak,
    unitLabel: val.unitLabel,
    keteranganNormal: nama === 'SIGN RUANG TUNGGU' ? 'sign ruang tunggu dan sign jalan khusus difabel' : undefined,
    keteranganRusak: val.listRusak.join(', ')
  }));
};

export const getPercentage = (selectedReport: any, keywords: string[]): string => {
  const groups = getFasilitasGrouped(selectedReport?.kondisiFasilitas || []);
  let total = 0;
  let normal = 0;

  groups.forEach(g => {
    const match = keywords.some(kw => g.nama.toUpperCase().includes(kw.toUpperCase()));
    if (match) {
      total += g.total;
      normal += g.normal;
    }
  });

  if (total === 0) return '100%';
  const pct = (normal / total) * 100;
  return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(2).replace('.', ',')}%`;
};

export const generateReportText = (selectedReport: any, isHtml: boolean = false): string => {
  if (!selectedReport) return '';
  const br = isHtml ? '<br>' : '\n';
  const bold = (s: string) => isHtml ? `<strong>${s}</strong>` : `*${s}*`;

  const formattedTanggal = formatTanggalWithDay(selectedReport.tanggal);
  const dinas = String(selectedReport.dinas || 'PAGI').toUpperCase();

  let text = `Assalamu'alaikum. Wr. Wb${br}${br}`;
  text += `Bersama ini dilaporkan, kegiatan ${bold('ELECTRONIC & IT FACILITY – KSO HLP')} pada hari ini ${bold(formattedTanggal + ' sebagai berikut:')}${br}${br}`;
  text += `${bold('ELECTRONIC & IT FACILITY – KSO HLP')}${br}${br}`;
  text += `${bold(`A. PERSONIL DINAS ${dinas} - ELIT`)}${br}${br}`;

  // APINDO
  text += `${bold('APINDO')}${br}`;
  const apindo = selectedReport.personil?.apindo || [];
  if (apindo.length > 0 && apindo.some((p: any) => p?.nama)) {
    apindo.forEach((p: any) => {
      if (p?.nama) {
        text += `👷🏻 ${p.nama}${p.keterangan ? ` (${p.keterangan})` : ''}${br}`;
      }
    });
  } else {
    text += `👷🏻 -${br}`;
  }
  text += `${br}`;

  // OM IASS - NTI
  text += `${bold('OM IASS - NTI')}${br}`;
  let omList = selectedReport.personil?.omIassNti || [];
  if (omList.length === 0) {
    omList = [...(selectedReport.personil?.osIass || []), ...(selectedReport.personil?.omNti || [])];
  }
  if (omList.length > 0 && omList.some((p: any) => p?.nama)) {
    omList.forEach((p: any) => {
      if (p?.nama) {
        text += `👷🏻 ${p.nama}${p.keterangan ? ` (${p.keterangan})` : ''}${br}`;
      }
    });
  } else {
    text += `👷🏻 -${br}`;
  }

  // B. KEGIATAN
  if (Array.isArray(selectedReport.kegiatan) && selectedReport.kegiatan.length > 0) {
    text += `${br}${bold(`B. LAPORAN KEGIATAN DINAS ${dinas} - ELIT`)}${br}${br}`;
    selectedReport.kegiatan.forEach((k: any) => {
      const jamMulaiClean = String(k.jamMulai || '07:00').replace(/ WIB/gi, '').trim();
      const jamSelesaiClean = String(k.jamSelesai || '19:00').replace(/ WIB/gi, '').trim();
      let uraianText = k.uraian || '';
      // Ekstrak teks uraian jika formatnya Laporan Dari / Uraian / Tindak Lanjut
      if (uraianText.includes('Uraian:')) {
        uraianText = uraianText.split('Uraian:')[1]?.split('Tindak Lanjut:')[0]?.trim() || uraianText;
      }
      uraianText = uraianText.replace(/^Kegiatan\s*:\s*/i, '').trim();

      text += `Jam ${jamMulaiClean} - ${jamSelesaiClean} WIB${br}`;
      const lines = uraianText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        lines.forEach((line: string) => {
          const cleanLine = line.replace(/^- /, '');
          text += `- ${cleanLine}${br}`;
        });
      } else {
        text += `- ${uraianText}${br}`;
      }
      text += `${br}`;
    });
  }

  // C. PERFORMANCE & D. KONDISI FASILITAS
  const groups = getFasilitasGrouped(selectedReport.kondisiFasilitas || []);
  if (groups.length > 0) {
    text += `${bold('C. PERFORMANCE FASILITAS - ELIT')}${br}`;
    text += `- ✅ X-RAY : ${getPercentage(selectedReport, ['X-RAY'])}${br}`;
    text += `- ✅ WTMD : ${getPercentage(selectedReport, ['WTMD'])}${br}`;
    text += `- ✅ HHMD : ${getPercentage(selectedReport, ['HHMD'])}${br}`;
    text += `- ✅ ETD : ${getPercentage(selectedReport, ['ETD'])}${br}`;
    text += `- ✅ CCTV : ${getPercentage(selectedReport, ['CCTV'])}${br}`;
    text += `- ✅ Access Control : ${getPercentage(selectedReport, ['ACCESS CONTROL'])}${br}`;
    text += `- ✅ Fire Alarm : ${getPercentage(selectedReport, ['FAS', 'FIRE ALARM', 'DETECTOR FAS', 'MCFA'])}${br}`;
    text += `- ✅ Radio Communication : ${getPercentage(selectedReport, ['VHF', 'HT', 'RIG', 'RADIO'])}${br}`;
    text += `- ✅ FIDS : ${getPercentage(selectedReport, ['FIDS'])}${br}`;
    text += `- ✅ Public Addressing : ${getPercentage(selectedReport, ['PAS', 'SPEAKER', 'AMPLIFIER', 'MIXER'])}${br}`;
    text += `- ✅ Data Network : ${getPercentage(selectedReport, ['SWITCH', 'RADIOLINK', 'ACCESS POINT'])}${br}${br}`;

    text += `${bold('D. LAPORAN KONDISI FASILITAS – ELIT')}${br}${br}`;
    groups.forEach(g => {
      text += `${bold(`${g.nama.toUpperCase()} (${g.total} ${g.unitLabel})`)}${br}`;
      const normalNote = g.keteranganNormal ? ` (${g.keteranganNormal})` : '';
      text += `* ✅ Normal : ${g.normal} ${g.unitLabel}${normalNote}${br}`;
      if (g.rusak > 0) {
        const rusakNote = g.keteranganRusak ? ` (${g.keteranganRusak})` : '';
        text += `* ❌ Rusak : ${g.rusak} ${g.unitLabel}${rusakNote}${br}${br}`;
      } else {
        text += `* ❌ Rusak : -${br}${br}`;
      }
    });

    text += `${bold('"FASILITAS MANDATORY ELECTRONIC & IT FACILITY DALAM KONDISI BAIK DAN NORMAL"')}${br}${br}`;

    // Catatan
    const catatanItems: string[] = [];
    if (selectedReport.catatan && selectedReport.catatan.trim()) {
      const userNotes = selectedReport.catatan.split('\n').map((n: string) => n.trim()).filter(Boolean);
      userNotes.forEach((n: string) => {
        catatanItems.push(n.replace(/^[0-9]+[.)]\s*/, ''));
      });
    }

    groups.filter(g => g.rusak > 0 && g.keteranganRusak && g.nama !== 'SIGN RUANG TUNGGU').forEach(g => {
      const autoNote = `${g.nama} : terdapat kerusakan (${g.keteranganRusak}) sebanyak ${g.rusak} ${g.unitLabel}`;
      if (!catatanItems.some(c => c.toLowerCase().includes(g.nama.toLowerCase()))) {
        catatanItems.push(autoNote);
      }
    });

    if (catatanItems.length > 0) {
      text += `Catatan :${br}`;
      catatanItems.forEach((note, idx) => {
        text += `${idx + 1}. ${note}${br}`;
      });
      text += `${br}`;
    }
  }

  text += `Demikian disampaikan.${br}Haturnuhun`;
  return text;
};

// Ambil semua foto lampiran kegiatan / kolase dari laporan
export const extractReportPhotos = (selectedReport: any): string[] => {
  const photos: string[] = [];
  if (Array.isArray(selectedReport?.finalCollages)) {
    selectedReport.finalCollages.forEach((img: any) => {
      if (typeof img === 'string' && img.trim().length > 50 && !photos.includes(img)) {
        photos.push(img);
      }
    });
  }
  if (Array.isArray(selectedReport?.kegiatan)) {
    selectedReport.kegiatan.forEach((k: any) => {
      if (Array.isArray(k.dokumentasi)) {
        k.dokumentasi.forEach((doc: any) => {
          if (typeof doc === 'string' && doc.trim().length > 50 && !photos.includes(doc)) {
            photos.push(doc);
          }
        });
      }
    });
  }
  if (Array.isArray(selectedReport?.dokumentasi)) {
    selectedReport.dokumentasi.forEach((doc: any) => {
      if (typeof doc === 'string' && doc.trim().length > 50 && !photos.includes(doc)) {
        photos.push(doc);
      }
    });
  }
  return photos;
};

// Konversi data string base64 / data URL ke File binary
export const base64ToFile = (dataUrl: string, filename: string): File => {
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1] || parts[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

// Fitur Direct WhatsApp beserta Foto Terlampir (Mobile & Web)
// CATATAN: WhatsApp TIDAK mendukung text + files secara bersamaan di Web Share API.
// Jika keduanya dikirim, WhatsApp hanya menampilkan text saja dan mengabaikan files.
// Solusi: LANGKAH 1 — Kirim foto terlebih dahulu (files-only share → WhatsApp menerima foto).
//         LANGKAH 2 — Salin teks ke clipboard & buka WhatsApp link dengan teks agar user tinggal paste/kirim.
export const shareToWhatsAppWithPhotos = async (selectedReport: any) => {
  const text = generateReportText(selectedReport, false);
  const photos = extractReportPhotos(selectedReport);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ============================================================================
  // MOBILE: Gunakan Web Share API dengan 2 langkah terpisah (foto dulu, lalu teks)
  // ============================================================================
  if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
    // --- LANGKAH 1: Kirim FOTO ke WhatsApp via Web Share API (files-only, tanpa text) ---
    if (photos.length > 0) {
      try {
        const files: File[] = [];
        photos.forEach((base64Str, i) => {
          try {
            const ext = base64Str.includes('png') ? 'png' : 'jpg';
            files.push(base64ToFile(base64Str, `Dokumentasi_Kegiatan_${i + 1}.${ext}`));
          } catch (e) { console.warn(`Gagal konversi foto ${i + 1}:`, e); }
        });

        if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
          // Salin teks ke clipboard SEBELUM share foto, sebagai cadangan jika user ingin paste langsung
          try { await navigator.clipboard.writeText(text); } catch (e) {}

          // Langkah 1: Buka share foto ke WhatsApp
          await navigator.share({ files });

          // Langkah 2: Setelah foto selesai dikirim (user kembali ke browser),
          // LANGSUNG otomatis direct ke WhatsApp dengan format salinan teks laporan tanpa pop-up tanya lagi
          const encodedText = encodeURIComponent(text);
          setTimeout(() => {
            window.location.href = `whatsapp://send?text=${encodedText}`;
          }, 350);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Web Share API (files-only) gagal:', err);
      }
    }

    // Jika TIDAK ada foto, langsung direct TEKS saja ke WhatsApp
    try {
      const encodedText = encodeURIComponent(text);
      window.location.href = `whatsapp://send?text=${encodedText}`;
      return;
    } catch (err: any) {
      console.warn('Direct WhatsApp teks gagal:', err);
    }
  }

  // ============================================================================
  // DESKTOP / Fallback: Salin teks + unduh foto + buka WhatsApp Web
  // ============================================================================

  // 1. Salin teks laporan ke Clipboard
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {}

  // 2. Unduh semua foto otomatis ke perangkat agar user dapat melampirkan manual
  if (photos.length > 0) {
    // Gunakan interval kecil antar-download agar browser tidak memblokir
    for (let i = 0; i < photos.length; i++) {
      try {
        const base64Str = photos[i];
        const ext = base64Str.includes('png') ? 'png' : 'jpg';
        const link = document.createElement('a');
        link.href = base64Str;
        link.download = `Foto_Kegiatan_${i + 1}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Jeda 300ms antar file agar browser tidak memblokir download beruntun
        if (i < photos.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (e) {}
    }
  }

  // 3. Buka WhatsApp Web/Desktop dengan teks laporan
  const encodedText = encodeURIComponent(text);
  const waUrl = isMobile
    ? `whatsapp://send?text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  window.open(waUrl, '_blank');

  if (photos.length > 0) {
    alert(
      `✅ Format teks WA berhasil disalin ke clipboard & WhatsApp terbuka!\n\n` +
      `📸 Sebanyak ${photos.length} foto lampiran kegiatan telah otomatis diunduh.\n\n` +
      `Langkah selanjutnya:\n` +
      `1. Pilih kontak/grup tujuan di WhatsApp\n` +
      `2. Kirim teks laporan (sudah terisi otomatis)\n` +
      `3. Lampirkan foto yang sudah diunduh (📎 Attach → Photos)`
    );
  } else {
    alert('✅ Format teks WA berhasil disalin ke clipboard & WhatsApp terbuka!');
  }
};

export const copyToWhatsApp = (selectedReport: any) => {
  shareToWhatsAppWithPhotos(selectedReport);
};

export const exportToWord = (selectedReport: any) => {
  if (!selectedReport) return;
  const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Laporan</title></head><body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">${generateReportText(selectedReport, true)}</body></html>`;
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  saveAs(blob, `Laporan_${selectedReport.tanggal}_${selectedReport.dinas}.doc`);
};

export const exportToPDF = (ref: any, nama: string, selectedReport: any) => {
  if (!selectedReport || !ref.current) return;
  const opt: any = {
    margin: [8, 8, 8, 8],
    filename: `${nama}_${selectedReport.tanggal}_${selectedReport.dinas}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: ['tr', '.break-inside-avoid', '.page-break-avoid']
    }
  };
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