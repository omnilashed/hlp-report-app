import { forwardRef } from 'react';

const formatNamaPendek = (nama: string) => {
  if (!nama) return '';
  const lower = nama.toLowerCase();
  
  if (lower.includes('fachreza')) return 'M. Fachreza';
  if (lower.includes('luthfianda')) return 'Luthfianda M.';
  if (lower.includes('desi dwi')) return 'Desi D.';
  if (lower.includes('mahdi')) return 'Mahdi A.';
  if (lower.includes('dennis')) return 'Dennis S..';
  if (lower.includes('adelia')) return 'Adelia P.';
  if (lower.includes('eka yuliani')) return 'Eka Yuliani S.';
  if (lower.includes('maulana hady')) return 'Maulana Hady C. S.';
  if (lower.includes('abdul kodir')) return 'Abdul Kodir';
  if (lower.includes('roim')) return 'M. Roim';

  const kata = nama.trim().split(' ');
  if (kata.length === 1) return kata[0].charAt(0).toUpperCase() + kata[0].slice(1).toLowerCase();
  
  const first = kata[0].charAt(0).toUpperCase() + kata[0].slice(1).toLowerCase();
  const lastInitials = kata.slice(1).map(k => k.charAt(0).toUpperCase() + '.').join(' ');
  return `${first} ${lastInitials}`;
};

const formatTanggalTitleCase = (tanggalStr: string) => {
  if (!tanggalStr) return '';
  const parts = tanggalStr.toLowerCase().split(' ');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

export const PrintTemplate = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  if (!data) return null;

  const apindo = data.personil?.apindo || [];
  const iass = data.personil?.omIassNti?.slice(0, 4) || [];
  const nti = data.personil?.omIassNti?.slice(4) || [];
  const maxRows = Math.max(apindo.length, iass.length, nti.length, 4);
  
  const personnelRows = Array.from({ length: maxRows }).map((_, i) => ({
    apindo: formatNamaPendek(apindo[i]?.nama || ''),
    iass: formatNamaPendek(iass[i]?.nama || ''),
    nti: formatNamaPendek(nti[i]?.nama || '')
  }));

  const isPagi = data.dinas === 'PAGI';
  const themeBg = isPagi ? '#FFFF00' : '#5B9BD5'; 
  const themeText = '#000000'; 

  const cellStyle = { 
    border: '1px solid black', 
    padding: '4px 5px', 
    verticalAlign: 'top' as any, 
    color: '#000000', 
    backgroundColor: '#FFFFFF',
    fontSize: '10px', 
    lineHeight: '1.25',
    wordWrap: 'break-word' as any
  };
  
  const headerStyle = { 
    border: '1px solid black', 
    padding: '4px', 
    backgroundColor: themeBg, 
    color: themeText, 
    fontWeight: 'bold', 
    textAlign: 'center' as any, 
    verticalAlign: 'middle' as any,
    fontSize: '10px'
  };
  
  const signatureHeaderStyle = { ...headerStyle, backgroundColor: '#e5e7eb', padding: '3px', fontSize: '9px' };
  const signatureCellStyle = { ...cellStyle, padding: '3px 4px', fontSize: '9px', verticalAlign: 'middle' as any };

  const allPhotos: string[] = [];
  data.kegiatan?.forEach((k: any) => {
    if (k.dokumentasi && k.dokumentasi.length > 0) {
      allPhotos.push(...k.dokumentasi);
    }
  });

  return (
    <div ref={ref} id="print-area" style={{ width: '100%', minWidth: '1024px', padding: '10px 20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#000000', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '8px' }}>
        <table border={1} style={{ borderCollapse: 'collapse', fontSize: '10px', width: '38%', fontWeight: 'bold', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={headerStyle}>FUNGSI</th>
              <th style={headerStyle}>DINAS</th>
              <th style={headerStyle}>TANGGAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '4px' }}>ELECTRONIC & IT FACILITY</td>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '4px' }}>{data.dinas}</td>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '4px' }}>{formatTanggalTitleCase(data.tanggal)}</td>
            </tr>
          </tbody>
        </table>
        
        <img src="/hlp.png" alt="HLP Logo" style={{ height: '65px', objectFit: 'contain' }} />
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
        LAPORAN KEGIATAN HARIAN (LOG BOOK)
      </h1>

      <table id="print-table" border={1} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <thead>
          <tr>
            <th style={{...headerStyle, width: '4%'}}>NO</th>
            <th style={{...headerStyle, width: '12%'}}>LAPORAN DARI</th>
            <th style={{...headerStyle, width: '9%'}}>JAM</th>
            <th style={{...headerStyle, width: '35%'}}>URAIAN KEGIATAN /<br/>PERMASALAHAN</th>
            <th style={{...headerStyle, width: '14%'}}>TINDAK LANJUT</th>
            <th style={{...headerStyle, width: '8%'}}>JAM SELESAI</th>
            <th style={{...headerStyle, width: '8%'}}>HASIL /<br/>KONDISI</th>
            <th style={{...headerStyle, width: '10%'}}>KETERANGAN</th>
          </tr>
        </thead>
        <tbody>
          {data.kegiatan?.map((k: any, i: number) => {
            const raw = k.uraian || '';
            const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
            const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || raw;
            const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '';
            const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '';

            const jamMulaiClean = k.jamMulai?.replace(/ WIB/gi, '').trim();
            const jamSelesaiClean = k.jamSelesai?.replace(/ WIB/gi, '').trim();

            return (
              <tr key={i} className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{...cellStyle, textAlign: 'center'}}>{i + 1}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{lDari}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{jamMulaiClean} WIB</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap'}}><span style={{fontWeight:'bold'}}>Kegiatan:</span><br/>{urText.trim()}</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap', textAlign: 'center'}}>{tLanjut.trim() === '-' ? '' : tLanjut.trim()}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{jamSelesaiClean} WIB</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{k.hasilKondisi === '-' ? '' : k.hasilKondisi}</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap', textAlign: 'center'}}>{ket.trim() === '-' ? '' : ket.trim()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <table id="print-table-signature" border={1} style={{ borderCollapse: 'collapse', width: '55%', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{...signatureHeaderStyle, width: '6%'}}>NO</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>APINDO</th>
              <th style={{...signatureHeaderStyle, width: '7%'}}>PARAF</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>OS - IASS</th>
              <th style={{...signatureHeaderStyle, width: '7%'}}>PARAF</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>OM - NTI</th>
              <th style={{...signatureHeaderStyle, width: '7%'}}>PARAF</th>
            </tr>
          </thead>
          <tbody>
            {personnelRows.map((row, i) => (
              <tr key={i}>
                <td style={{...signatureCellStyle, textAlign: 'center'}}>{i + 1}</td>
                <td style={{...signatureCellStyle, textAlign: 'left'}}>{row.apindo}</td>
                <td style={{...signatureCellStyle}}></td>
                <td style={{...signatureCellStyle, textAlign: 'left'}}>{row.iass}</td>
                <td style={{...signatureCellStyle}}></td>
                <td style={{...signatureCellStyle, textAlign: 'left'}}>{row.nti}</td>
                <td style={{...signatureCellStyle}}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ width: '35%', textAlign: 'center', fontSize: '10px' }}>
          <p style={{ margin: '0 0 5px 0' }}>Mengetahui,</p>
          <p style={{ margin: '0 0 30px 0' }}>ASST. MANAGER OF FACILITY MAINTENANCE</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>AEP MASHUM NURZAMAN</p>
        </div>
      </div>

      {allPhotos.length > 0 && (
        <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: '20px', width: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '0px', right: '0px' }}>
            <img src="/hlp.png" alt="HLP Logo" style={{ height: '75px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginTop: '40px', marginBottom: '20px', textTransform: 'uppercase' }}>
            DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)
          </h2>
          
          <div style={{ display: 'flex', border: '1px solid black', width: '100%', height: '350px' }}>
            {allPhotos.slice(0, 4).map((foto: string, fIdx: number) => (
              <div key={fIdx} style={{ width: '25%', height: '100%', borderRight: fIdx < 3 ? '1px solid black' : 'none', overflow: 'hidden' }}>
                <img src={foto} alt="Dokumentasi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - allPhotos.slice(0,4).length) }).map((_, fIdx) => (
               <div key={`empty-${fIdx}`} style={{ width: '25%', height: '100%', borderRight: (allPhotos.slice(0,4).length + fIdx) < 3 ? '1px solid black' : 'none', backgroundColor: '#f3f4f6' }}></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const PrintFasilitasTemplate = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  if (!data) return null;
  return (<div ref={ref}></div>);
});