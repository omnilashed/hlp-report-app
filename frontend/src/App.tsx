import { useState, useEffect, useRef } from 'react';
import ReportForm from './ReportForm';
import FasilitasForm from './FasilitasForm';
import { PrintTemplate, PrintFasilitasTemplate } from './PrintTemplate';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

type UserRole = 'OFFICE' | 'SUPERVISOR' | 'ASMEN' | 'GUYS';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedShift, setSelectedShift] = useState<'PAGI' | 'MALAM'>('PAGI');
  const [isLaporanMenuOpen, setIsLaporanMenuOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const [userRole, setUserRole] = useState<UserRole>('OFFICE');
  
  const printLogbookRef = useRef<HTMLDivElement>(null);
  const printFasilitasRef = useRef<HTMLDivElement>(null);

  // === DITAMBAHKAN PENDETEKSI ERROR SAAT MENARIK DATA ===
  const fetchReports = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/reports?t=${new Date().getTime()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Gagal dari server');
      }
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
      // alert('❌ Gagal menarik data Riwayat Laporan. Pastikan terminal Backend (Server Node.js) menyala.');
    }
  };

  useEffect(() => {
    if (isLoggedIn && (currentView === 'dashboard' || currentView === 'riwayat')) {
      fetchReports();
    }
  }, [currentView, isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'office' && loginPassword === 'office123') { setUserRole('OFFICE'); setIsLoggedIn(true); setCurrentView('dashboard'); }
    else if (loginUsername === 'spv' && loginPassword === 'spv123') { setUserRole('SUPERVISOR'); setIsLoggedIn(true); setCurrentView('dashboard'); }
    else if (loginUsername === 'asmen' && loginPassword === 'asmen123') { setUserRole('ASMEN'); setIsLoggedIn(true); setCurrentView('dashboard'); }
    else if (loginUsername === 'guest' && loginPassword === 'guest123') { setUserRole('GUYS'); setIsLoggedIn(true); setCurrentView('dashboard'); }
    else { alert('❌ Username atau Password salah!'); }
  };

  const handleLogout = () => {
    if (window.confirm('Yakin ingin keluar dari aplikasi?')) {
      setIsLoggedIn(false); 
      setLoginUsername(''); 
      setLoginPassword('');
      setReports([]); 
      setSelectedReport(null);
      setCurrentView('dashboard');
    }
  };

  const handleUpdateStatus = async (report: any, newStatus: string, catatan: string = '') => {
    const payloadOnly = { status: newStatus, catatanAsmen: catatan };

    try {
      const response = await fetch(`http://localhost:5000/api/reports/${report._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadOnly)
      });
      
      if (response.ok) {
        const resData = await response.json();
        const updatedReport = resData.data || { ...report, status: newStatus, catatanAsmen: catatan };
        
        setReports(prev => prev.map(r => r._id === report._id ? updatedReport : r));
        setSelectedReport(updatedReport); 
        
        alert(`✅ Laporan berhasil di-${newStatus}!`);
        fetchReports();
      } else {
        alert('❌ Terjadi kesalahan! Database menolak pembaruan status.');
      }
    } catch (e) { alert('Tidak bisa terhubung ke server backend.'); }
  };

  const handleApprove = (report: any) => {
    if(window.confirm('Setujui laporan ini dan izinkan dicetak?')) handleUpdateStatus(report, 'Approved', '');
  };

  const handleReject = (report: any) => {
    const catatan = window.prompt('Masukkan alasan Reject / Catatan Perbaikan:');
    if(catatan !== null) handleUpdateStatus(report, 'Rejected', catatan);
  };

  const openForm = (shift: 'PAGI' | 'MALAM') => {
    setSelectedReport(null); setSelectedShift(shift); setCurrentView('form'); setIsSidebarOpen(false);
  };

  const editReport = (report: any) => {
    setSelectedReport(report);
    if (report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0)) {
      setCurrentView('fasilitasForm');
    } else {
      setSelectedShift(report.dinas); setCurrentView('form');
    }
  };

  const deleteReport = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus laporan ini? Tindakan ini permanen.')) {
      try {
        const response = await fetch(`http://localhost:5000/api/reports/${id}`, { method: 'DELETE' });
        if (response.ok) setReports(reports.filter(r => r._id !== id));
      } catch (e) { alert('Tidak bisa terhubung ke server.'); }
    }
  };

  const viewReportDetail = (report: any) => { setSelectedReport(report); setCurrentView('detail'); };

  const getPercentage = (names: string[]) => {
    let total = 0, normal = 0;
    selectedReport.kondisiFasilitas?.forEach((f: any) => {
      if (names.some(n => f.namaFasilitas.includes(n))) { total += f.totalUnit; normal += f.normal; }
    });
    if (total === 0) return '100%';
    const pct = (normal / total) * 100;
    return pct % 1 === 0 ? pct + '%' : pct.toFixed(2).replace('.', ',') + '%';
  };

  const generateReportText = (isHtml: boolean = false) => {
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
      selectedReport.kegiatan.forEach((k: any) => {
        text += `Jam ${k.jamMulai.replace(' WIB', '')} - ${k.jamSelesai}${br}- ${k.uraian?.split('\n\nUraian: ')[1]?.split('\nTindak Lanjut:')[0].replace(/^- /, '') || ''}${br}`;
      });
    }

    if (selectedReport.kondisiFasilitas?.length > 0) {
      text += `${br}C. PERFORMANCE FASILITAS - ELIT${br}- ✅ X-RAY : ${getPercentage(['X-RAY'])}${br}- ✅ WTMD : ${getPercentage(['WTMD'])}${br}- ✅ HHMD : ${getPercentage(['HHMD'])}${br}- ✅ ETD : ${getPercentage(['ETD'])}${br}- ✅ CCTV : ${getPercentage(['CCTV'])}${br}- ✅ Access Control : ${getPercentage(['ACCESS CONTROL'])}${br}- ✅ Fire Alarm : ${getPercentage(['FAS'])}${br}- ✅ Radio Communication : ${getPercentage(['VHF'])}${br}- ✅ FIDS : ${getPercentage(['FIDS'])}${br}- ✅ Public Addressing : ${getPercentage(['PAS'])}${br}- ✅ Data Network : ${getPercentage(['SWITCH', 'RADIOLINK', 'ACCESS POINT'])}${br}${br}D. LAPORAN KONDISI FASILITAS – ELIT${br}`;
      
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

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(generateReportText(false)).then(() => alert('Disalin ke clipboard!')).catch(() => alert('Gagal menyalin.'));
  };

  const handleDownloadWord = () => {
    if (!selectedReport) return;
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Laporan</title></head>
      <body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5;">
        ${generateReportText(true)}
      </body></html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    saveAs(blob, `Laporan_${selectedReport.tanggal}_${selectedReport.dinas}.doc`);
  };

  const downloadPDF = (ref: any, nama: string) => {
    if (!selectedReport || !ref.current) return;
    const opt = {
      margin: 0.2,
      filename: `${nama}_${selectedReport.tanggal}_${selectedReport.dinas}.pdf`,
      image: { type: 'jpeg' as const, quality: 1 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    html2pdf().set(opt).from(ref.current).save();
  };

  const handleDownloadExcel = async () => {
    if (!selectedReport) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Log Book', {
      pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 } }
    });

    sheet.views = [{ state: 'normal', showGridLines: false }];
    sheet.properties.defaultRowHeight = 20;

    const columnWidths = [5, 15, 12, 40, 15, 12, 12, 20];
    columnWidths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });

    const borderAll = { 
      top: { style: 'thin' as any }, left: { style: 'thin' as any }, 
      bottom: { style: 'thin' as any }, right: { style: 'thin' as any } 
    };

    const isPagi = String(selectedReport.dinas).toUpperCase() === 'PAGI';
    const headBgColor = isPagi ? 'FFFFFF00' : 'FFBDD7EE';
    const headTxtColor = 'FF000000';

    const headerTheme = { 
      font: { bold: true, name: 'Arial', size: 10, color: { argb: headTxtColor } }, 
      alignment: { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true }, 
      fill: { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: headBgColor } }, 
      border: borderAll 
    };
    
    const dataLeftStyle = { 
      font: { name: 'Arial', size: 10 }, 
      alignment: { horizontal: 'left' as any, vertical: 'top' as any, wrapText: true }, 
      border: borderAll 
    };

    const headerCells = [
      'A1','B1','C1','D1','E1','F1','G1','H1', 
      'A2','B2','C2','D2','E2','F2','G2','H2', 
      'A3','B3','C3','D3','E3','F3','G3','H3', 
      'A4','B4','C4','D4','E4','F4','G4','H4', 
      'A5','B5','C5','D5','E5','F5','G5','H5'
    ];
    headerCells.forEach(cell => { sheet.getCell(cell).border = borderAll; });

    sheet.mergeCells('A1:B1'); sheet.getCell('A1').value = 'FUNGSI'; sheet.getCell('A1').style = headerTheme;
    sheet.getCell('C1').value = 'DINAS'; sheet.getCell('C1').style = headerTheme;
    sheet.getCell('D1').value = 'TANGGAL'; sheet.getCell('D1').style = headerTheme;

    sheet.mergeCells('A2:B2'); sheet.getCell('A2').value = 'ELECTRONIC & IT\nFACILITY'; sheet.getCell('A2').style = dataLeftStyle;
    sheet.getCell('C2').value = selectedReport.dinas; sheet.getCell('C2').style = dataLeftStyle;
    sheet.getCell('D2').value = selectedReport.tanggal; sheet.getCell('D2').style = dataLeftStyle;

    sheet.mergeCells('G1:H2');
    const logoCell = sheet.getCell('G1');
    logoCell.value = {
      richText: [
        { font: { bold: true, size: 14, color: { argb: 'FF000080' }, name: 'Arial' }, text: 'HLP ✈\n' },
        { font: { bold: true, size: 11, color: { argb: 'FF000080' }, name: 'Arial' }, text: 'JAKARTA CITY AIRPORT' }
      ]
    };
    logoCell.alignment = { horizontal: 'right' as any, vertical: 'bottom' as any, wrapText: true };

    sheet.getRow(3).height = 10;

    sheet.mergeCells('A4:H4');
    sheet.getCell('A4').value = 'LAPORAN KEGIATAN HARIAN (LOG BOOK)';
    sheet.getCell('A4').font = { bold: true, size: 12, name: 'Arial' };
    sheet.getCell('A4').alignment = { horizontal: 'center' as any, vertical: 'middle' as any };
    sheet.getRow(4).height = 25;

    sheet.getRow(5).height = 10;

    sheet.getRow(6).values = ['NO', 'LAPORAN DARI', 'JAM', 'URAIAN KEGIATAN /\nPERMASALAHAN', 'TINDAK LANJUT', 'JAM SELESAI', 'HASIL /\nKONDISI', 'KETERANGAN'];
    sheet.getRow(6).height = 35;
    for (let i = 1; i <= 8; i++) sheet.getCell(6, i).style = headerTheme;

    let currentRow = 7;
    let allDocs: string[] = []; 

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

        if (item.dokumentasi && item.dokumentasi.length > 0) {
          allDocs = allDocs.concat(item.dokumentasi);
        }
      });
    }

    for(let j=0; j<3; j++) {
      sheet.getRow(currentRow).values = ['', '', '', '', '', '', '', ''];
      for (let i = 1; i <= 8; i++) sheet.getCell(currentRow, i).style = dataLeftStyle;
      sheet.getRow(currentRow).height = 20;
      currentRow++;
    }

    if (allDocs.length > 0) {
      currentRow += 2;
      for(let i=1; i<=8; i++) sheet.getCell(currentRow, i).border = borderAll;
      sheet.mergeCells(`A${currentRow}:H${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = 'DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)';
      sheet.getCell(`A${currentRow}`).style = { ...headerTheme, fill: { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: 'FFD9D9D9' } } };
      sheet.getRow(currentRow).height = 25;

      let imgRow = currentRow + 1;
      let imgCol = 0;
      sheet.getRow(imgRow).height = 180;

      allDocs.forEach((imgBase64: string) => {
        try {
          const base64Data = imgBase64.split(',')[1];
          const extension = imgBase64.includes('png') ? 'png' : 'jpeg';
          const imageId = workbook.addImage({ base64: base64Data, extension: extension as any });
          
          sheet.addImage(imageId, {
            tl: { col: imgCol, row: imgRow - 1 },
            ext: { width: 220, height: 220 }
          });

          imgCol += 2; 
          if (imgCol >= 8) { 
            imgCol = 0; imgRow++; sheet.getRow(imgRow).height = 180; 
          }
        } catch (err) { console.error('Gagal memasukkan gambar', err); }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `LogBook_${selectedReport.tanggal}_${selectedReport.dinas}.xlsx`);
  };

  const getRoleUI = () => {
    switch(userRole) {
      case 'OFFICE': return { name: 'OFFICE', desc: 'Input Data', initial: 'OF', color: 'from-blue-500 to-indigo-500' };
      case 'SUPERVISOR': return { name: 'SUPERVISOR', desc: 'Approval & Input', initial: 'SP', color: 'from-purple-500 to-fuchsia-500' };
      case 'ASMEN': return { name: 'ASMEN', desc: 'Izin Cetak & Approval', initial: 'AM', color: 'from-emerald-500 to-teal-500' };
      case 'GUYS': return { name: 'GUEST', desc: 'Viewer Only', initial: 'GS', color: 'from-slate-400 to-gray-500' };
    }
  };
  const roleUI = getRoleUI();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden text-slate-800">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute w-[400px] h-[400px] bg-blue-300 rounded-full blur-[100px] opacity-40 -top-20 -left-20"></div>
           <div className="absolute w-[600px] h-[600px] bg-indigo-300 rounded-full blur-[120px] opacity-30 -bottom-40 -right-20"></div>
        </div>

        <div className="w-full max-w-sm z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 mb-5">
              <span className="text-2xl font-black text-blue-600">HLP</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">Layanan Pengaduan<br/>Fasilitas Umum</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">ELIT KSO - Jakarta City Airport</p>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <input type="text" placeholder="Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full px-5 py-3.5 bg-white/60 border border-white/60 rounded-xl text-slate-800 placeholder-slate-400 font-medium focus:ring-4 focus:ring-blue-500/20 focus:bg-white/80 transition-all outline-none shadow-inner" required />
              </div>
              <div>
                <input type="password" placeholder="Kata Sandi" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-5 py-3.5 bg-white/60 border border-white/60 rounded-xl text-slate-800 placeholder-slate-400 font-medium focus:ring-4 focus:ring-blue-500/20 focus:bg-white/80 transition-all outline-none shadow-inner" required />
              </div>
              <button type="submit" className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5">
                MASUK
              </button>
            </form>
            <p className="text-[10px] text-center mt-5 text-slate-400 font-medium">Login: office, spv, asmen, guest</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'form') return <ReportForm shift={selectedShift} initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />;
  if (currentView === 'fasilitasForm') return <FasilitasForm initialData={selectedReport} onBack={() => setCurrentView('dashboard')} />;

  const getMenuClass = (menuName: string) => `w-full flex items-center px-4 py-3 transition-all text-left rounded-xl mb-1 ${currentView === menuName ? 'bg-white/60 shadow-sm border border-white/60 text-blue-700 font-bold' : 'hover:bg-white/30 text-slate-600'}`;
  const getSubMenuClass = (menuName: string) => `w-full flex items-center pl-12 pr-4 py-2.5 text-left transition-all rounded-xl mb-1 ${currentView === menuName ? 'bg-white/60 shadow-sm border border-white/60 text-blue-700 font-bold' : 'hover:bg-white/30 text-slate-500 hover:text-slate-800'}`;
  const handleMenuClick = (viewName: string) => { setCurrentView(viewName); setIsSidebarOpen(false); };

  const canInput = userRole === 'OFFICE' || userRole === 'SUPERVISOR';
  const canApprove = userRole === 'SUPERVISOR' || userRole === 'ASMEN';

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans text-sm overflow-hidden relative text-slate-800">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-300/40 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 z-50 h-full w-[260px] bg-white/40 backdrop-blur-2xl border-r border-white/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-white/40">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md mr-3">H</div>
          <div>
            <span className="font-extrabold text-lg tracking-wide text-slate-800 leading-none block">ELIT KSO</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jakarta Airport</span>
          </div>
          <button className="md:hidden text-slate-500 ml-auto" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <ul className="space-y-1">
            <li><button onClick={() => handleMenuClick('dashboard')} className={getMenuClass('dashboard')}><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Beranda</button></li>
            
            <li className="px-4 py-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layanan Pengaduan</li>
            <li>
              <button onClick={() => setIsLaporanMenuOpen(!isLaporanMenuOpen)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 rounded-xl transition-all mb-1 text-slate-600">
                <div className="flex items-center font-medium"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Laporan Masuk</div>
                <svg className={`w-4 h-4 transform transition-transform ${isLaporanMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              {isLaporanMenuOpen && (
                <ul className="mb-2">
                  {canInput && (
                    <>
                      <li><button onClick={() => openForm('PAGI')} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3"></div>Buat Laporan Pagi</button></li>
                      <li><button onClick={() => openForm('MALAM')} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3"></div>Buat Laporan Malam</button></li>
                      <li><button onClick={() => { setSelectedReport(null); setCurrentView('fasilitasForm'); setIsSidebarOpen(false); }} className="w-full flex items-center pl-12 pr-4 py-2.5 hover:bg-white/30 text-left text-slate-500 hover:text-slate-800 transition-all rounded-xl mb-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-3"></div>Pengecekan Fasilitas</button></li>
                    </>
                  )}
                  <li><button onClick={() => handleMenuClick('riwayat')} className={getSubMenuClass('riwayat')}><div className="w-1.5 h-1.5 rounded-full bg-current mr-3"></div>Riwayat Laporan</button></li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative z-10">
        <header className="h-20 bg-white/30 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] w-full">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-500 hover:text-slate-800 bg-white/50 p-2 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="font-bold text-sm text-slate-800">{roleUI.name}</div>
              <div className="text-[10px] text-slate-500">{roleUI.desc}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleUI.color} flex items-center justify-center font-bold text-white shadow-md border border-white/20`}>
              {roleUI.initial}
            </div>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-600 ml-1 p-2 bg-white/40 hover:bg-white/80 rounded-xl transition-all" title="Keluar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 w-full scrollbar-hide">
          {(currentView === 'dashboard' || currentView === 'riwayat') && (
            <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full overflow-hidden">
              <div className="p-6 border-b border-white/50 bg-white/30 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-slate-800 text-lg">Riwayat Laporan Masuk</h2>
                  {/* === TOMBOL REFRESH AGAR BISA MEMAKSA MINTA DATA KE SERVER === */}
                  <button onClick={fetchReports} className="px-3 py-1.5 bg-blue-100 text-blue-600 font-bold rounded-lg hover:bg-blue-200 transition-all text-xs flex items-center shadow-sm">
                    🔄 Segarkan Data
                  </button>
                </div>
              </div>
              
              <div className="hidden md:block overflow-x-auto w-full p-2">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/60 text-slate-400 font-bold whitespace-nowrap text-xs uppercase tracking-wider">
                      <th className="p-5 text-center">No</th>
                      <th className="p-5">Jenis Laporan</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5">Tanggal & Shift</th>
                      <th className="p-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {reports.length > 0 ? (
                      reports.map((report, index) => {
                        const isFasilitasOnly = report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0);
                        const status = report.status || 'Draft';
                        const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';

                        return (
                          <tr key={report._id || index} className="border-b border-white/30 hover:bg-white/40 transition-colors">
                            <td className="p-4 text-center font-medium text-slate-500">{index + 1}</td>
                            <td className="p-4 font-bold text-slate-800">{isFasilitasOnly ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</td>
                            <td className="p-4 text-center">
                               <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusClass}`}>{status}</span>
                            </td>
                            <td className="p-4 font-medium text-slate-600">{report.tanggal} <span className="ml-2 bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200/50">Shift {report.dinas}</span></td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => viewReportDetail(report)} className="px-4 py-2 bg-white/60 text-blue-600 font-bold rounded-xl hover:bg-white border border-white shadow-sm text-xs transition-all">Detail</button>
                                
                                {canInput && status !== 'Approved' && (
                                  <>
                                   <button onClick={() => editReport(report)} className="px-4 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl hover:bg-yellow-100 border border-yellow-100 shadow-sm text-xs transition-all">Edit</button>
                                   <button onClick={() => deleteReport(report._id)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 border border-red-100 shadow-sm text-xs transition-all">Hapus</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Belum ada laporan masuk. Jika Anda sudah membuat laporan, silakan klik tombol Segarkan Data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden flex flex-col p-4 space-y-4">
                {reports.length > 0 ? (
                  reports.map((report, index) => {
                    const isFasilitasOnly = report.kondisiFasilitas?.length > 0 && (!report.kegiatan || report.kegiatan.length === 0);
                    const status = report.status || 'Draft';
                    const statusClass = status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300';

                    return (
                      <div key={report._id || index} className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2.5 py-1 rounded-lg border border-white">#{index + 1} • {report.tanggal}</span>
                            <h3 className="font-bold text-slate-800 mt-3 text-base">{isFasilitasOnly ? 'Pengecekan Fasilitas' : 'Log Book Harian'}</h3>
                            <p className="text-sm text-blue-600 font-bold mt-1">Shift {report.dinas}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusClass}`}>{status}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 border-t border-white/50 pt-4">
                          <button onClick={() => viewReportDetail(report)} className="flex-1 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 shadow-md text-xs transition-all">Detail</button>
                          
                          {canInput && status !== 'Approved' && (
                            <>
                             <button onClick={() => editReport(report)} className="flex-1 py-2 bg-yellow-400 text-white font-bold rounded-xl hover:bg-yellow-500 shadow-md text-xs transition-all">Edit</button>
                             <button onClick={() => deleteReport(report._id)} className="flex-1 py-2 bg-red-400 text-white font-bold rounded-xl hover:bg-red-500 shadow-md text-xs transition-all">Hapus</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-400 py-10 font-medium">Belum ada laporan masuk. Jika Anda sudah membuat laporan, silakan klik tombol Segarkan Data.</div>
                )}
              </div>
            </div>
          )}

          {currentView === 'detail' && selectedReport && (
            <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full flex flex-col overflow-hidden">
              <div className="bg-white/30 p-6 border-b border-white/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-slate-800">{selectedReport.kegiatan?.length > 0 ? 'Detail Logbook' : 'Detail Fasilitas'}</h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${selectedReport.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : selectedReport.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>{selectedReport.status || 'Draft'}</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-1">{selectedReport.tanggal} • <span className="text-blue-600">Shift {selectedReport.dinas}</span></p>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {canApprove && selectedReport.status !== 'Approved' && (
                     <button onClick={() => handleApprove(selectedReport)} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-md shadow-emerald-500/20 transition-all text-xs">
                       ✅ Setujui (Approve)
                     </button>
                  )}
                  {canApprove && selectedReport.status !== 'Rejected' && (
                     <button onClick={() => handleReject(selectedReport)} className="px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all text-xs">
                       ❌ Tolak (Reject)
                     </button>
                  )}

                  <button onClick={handleCopyWhatsApp} className="flex-1 sm:flex-none px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-md shadow-green-500/20 transition-all text-xs">Copy WA</button>
                  
                  {(selectedReport.status === 'Approved' || userRole === 'ASMEN' || userRole === 'SUPERVISOR') ? (
                    <>
                      <button onClick={handleDownloadWord} className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all text-xs">Unduh Word</button>
                      {selectedReport.kegiatan?.length > 0 && <button onClick={handleDownloadExcel} className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 shadow-md transition-all text-xs">Unduh Excel</button>}
                      <button onClick={() => downloadPDF(selectedReport.kegiatan?.length > 0 ? printLogbookRef : printFasilitasRef, selectedReport.kegiatan?.length > 0 ? 'LogBook' : 'Fasilitas')} className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-md transition-all text-xs">Unduh PDF</button>
                    </>
                  ) : (
                    <div className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold border border-slate-200 flex items-center">
                      🔒 Menunggu Izin Asmen (Approval) untuk Cetak
                    </div>
                  )}

                  <button onClick={() => setCurrentView('dashboard')} className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-white/60 text-slate-600 font-bold rounded-xl hover:bg-white/50 shadow-sm transition-all text-xs">Kembali</button>
                </div>
              </div>
              
              <div className="p-6 sm:p-8 bg-white/20">
                {selectedReport.status === 'Rejected' && selectedReport.catatanAsmen && (
                  <div className="mb-8 bg-rose-50 border border-rose-200 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center font-bold flex-shrink-0">⚠️</div>
                    <div>
                      <h4 className="font-extrabold text-rose-800 text-sm">Catatan Perbaikan dari Asmen</h4>
                      <p className="text-rose-600 mt-1 text-sm whitespace-pre-wrap">{selectedReport.catatanAsmen}</p>
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-white/50 pb-3 mb-5">Tim Personil</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-sm">
                      <h4 className="font-extrabold text-slate-800 mb-3 flex items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>APINDO</h4>
                      <ul className="space-y-1.5 text-slate-600 font-medium ml-4">{selectedReport.personil?.apindo?.length > 0 ? selectedReport.personil.apindo.map((p: any, i: number) => <li key={i} className="list-disc">{p.nama || p}</li>) : <li>-</li>}</ul>
                    </div>
                    <div className="bg-white/40 p-5 rounded-2xl border border-white/60 shadow-sm">
                      <h4 className="font-extrabold text-slate-800 mb-3 flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div>OM IASS / NTI</h4>
                      <ul className="space-y-1.5 text-slate-600 font-medium ml-4">{selectedReport.personil?.omIassNti?.length > 0 ? selectedReport.personil.omIassNti.map((p: any, i: number) => <li key={i} className="list-disc">{p.nama || p}</li>) : <li>-</li>}</ul>
                    </div>
                  </div>
                </div>

                {selectedReport.kegiatan?.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-white/50 pb-3 mb-5">Daftar Kegiatan</h3>
                    <div className="space-y-5">
                      {selectedReport.kegiatan.map((item: any, i: number) => (
                        <div key={i} className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row gap-6">
                          <div className="flex-1">
                            <div className="inline-flex px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm mb-3">
                              {item.jamMulai.replace(' WIB', '')} - {item.jamSelesai}
                            </div>
                            <div className="text-slate-700 text-sm whitespace-pre-wrap font-medium leading-relaxed">{item.uraian}</div>
                          </div>
                          {item.dokumentasi && item.dokumentasi.length > 0 && (
                            <div className="w-full lg:w-72 shrink-0 grid grid-cols-2 gap-3">
                              {item.dokumentasi.map((img: string, idx: number) => (
                                <img key={idx} src={img} alt="Bukti" className="w-full h-28 object-cover rounded-xl border border-white shadow-sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {selectedReport && (
        <>
          <PrintTemplate ref={printLogbookRef} data={selectedReport} />
          <PrintFasilitasTemplate ref={printFasilitasRef} data={selectedReport} />
        </>
      )}
    </div>
  );
}