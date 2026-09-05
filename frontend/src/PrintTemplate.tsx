import { forwardRef } from 'react';

export const PrintTemplate = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  if (!data) return null;

  const apindo = data.personil?.apindo || [];
  const iass = data.personil?.omIassNti?.slice(0, 4) || [];
  const nti = data.personil?.omIassNti?.slice(4) || [];
  const maxRows = Math.max(apindo.length, iass.length, nti.length, 4);
  const personnelRows = Array.from({ length: maxRows }).map((_, i) => ({
    apindo: apindo[i]?.nama || '',
    iass: iass[i]?.nama || '',
    nti: nti[i]?.nama || ''
  }));

  const isPagi = data.dinas === 'PAGI';
  const themeBg = isPagi ? '#FFFF00' : '#5B9BD5'; 
  const themeText = '#000000'; 

  const cellStyle = { border: '1px solid black', padding: '6px', verticalAlign: 'top' as any, color: '#000000', backgroundColor: '#FFFFFF' };
  const headerStyle = { border: '1px solid black', padding: '6px', backgroundColor: themeBg, color: themeText, fontWeight: 'bold', textAlign: 'center' as any, verticalAlign: 'middle' as any };
  
  const signatureHeaderStyle = { ...headerStyle, backgroundColor: '#e5e7eb', padding: '4px', fontSize: '10px' };
  const signatureCellStyle = { ...cellStyle, padding: '4px', fontSize: '10px' };

  const allPhotos: string[] = [];
  data.kegiatan?.forEach((k: any) => {
    if (k.dokumentasi && k.dokumentasi.length > 0) {
      allPhotos.push(...k.dokumentasi);
    }
  });

  return (
    <div ref={ref} id="print-area" style={{ width: '100%', minWidth: '1024px', padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#000000', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <table border={1} style={{ borderCollapse: 'collapse', fontSize: '11px', width: '40%', fontWeight: 'bold', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={headerStyle}>FUNGSI</th>
              <th style={headerStyle}>DINAS</th>
              <th style={headerStyle}>TANGGAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}>ELECTRONIC & IT FACILITY</td>
              <td style={cellStyle}>{data.dinas}</td>
              <td style={cellStyle}>{data.tanggal?.toUpperCase()}</td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <img src="/hlp.png" alt="HLP Logo" style={{ height: '155px', objectFit: 'contain' }} />
        </div>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px 0', textTransform: 'uppercase' }}>
        LAPORAN KEGIATAN HARIAN (LOG BOOK)
      </h1>

      <table id="print-table" border={1} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '40px' }}>
        <thead>
          <tr>
            <th style={{...headerStyle, width: '4%'}}>NO</th>
            <th style={{...headerStyle, width: '14%'}}>LAPORAN DARI</th>
            <th style={{...headerStyle, width: '10%'}}>JAM</th>
            <th style={{...headerStyle, width: '28%'}}>URAIAN KEGIATAN / PERMASALAHAN</th>
            <th style={{...headerStyle, width: '18%'}}>TINDAK LANJUT</th>
            <th style={{...headerStyle, width: '8%'}}>JAM SELESAI</th>
            <th style={{...headerStyle, width: '8%'}}>HASIL / KONDISI</th>
            <th style={{...headerStyle, width: '10%'}}>KETERANGAN</th>
          </tr>
        </thead>
        <tbody>
          {data.kegiatan?.map((k: any, i: number) => {
            const raw = k.uraian || '';
            const lDari = raw.match(/Laporan Dari:\s*(.*?)(?=\n|$)/i)?.[1] || 'ELIT';
            const urText = raw.match(/Uraian:\s*([\s\S]*?)(?=\n*Tindak Lanjut:|$)/i)?.[1] || raw;
            const tLanjut = raw.match(/Tindak Lanjut:\s*([\s\S]*?)(?=\n*Keterangan:|$)/i)?.[1] || '-';
            const ket = raw.match(/Keterangan:\s*([\s\S]*)$/i)?.[1] || '-';

            const jamMulaiClean = k.jamMulai?.replace(/ WIB/gi, '').trim();
            const jamSelesaiClean = k.jamSelesai?.replace(/ WIB/gi, '').trim();

            return (
              <tr key={i} className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{...cellStyle, textAlign: 'center', fontWeight: 'bold'}}>{i + 1}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{lDari}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{jamMulaiClean} WIB</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap'}}><span style={{fontWeight:'bold'}}>Kegiatan :</span><br/>{urText}</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap', textAlign: 'center'}}>{tLanjut}</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{jamSelesaiClean} WIB</td>
                <td style={{...cellStyle, textAlign: 'center'}}>{k.hasilKondisi}</td>
                <td style={{...cellStyle, whiteSpace: 'pre-wrap', textAlign: 'center'}}>{ket}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', paddingTop: '60px' }}>
        <table id="print-table-signature" border={1} style={{ borderCollapse: 'collapse', width: '48%', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{...signatureHeaderStyle, width: '5%'}}>NO</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>APINDO</th>
              <th style={{...signatureHeaderStyle, width: '10%'}}>PARAF</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>OS - IASS</th>
              <th style={{...signatureHeaderStyle, width: '10%'}}>PARAF</th>
              <th style={{...signatureHeaderStyle, width: '25%'}}>OM - NTI</th>
              <th style={{...signatureHeaderStyle, width: '10%'}}>PARAF</th>
            </tr>
          </thead>
          <tbody>
            {personnelRows.map((row, i) => (
              <tr key={i} style={{ height: '20px' }}>
                <td style={{...signatureCellStyle, textAlign: 'center', fontWeight: 'bold'}}>{i + 1}</td>
                <td style={{...signatureCellStyle, textAlign: 'center'}}>{row.apindo}</td>
                <td style={{...signatureCellStyle}}></td>
                <td style={{...signatureCellStyle, textAlign: 'center'}}>{row.iass}</td>
                <td style={{...signatureCellStyle}}></td>
                <td style={{...signatureCellStyle, textAlign: 'center'}}>{row.nti}</td>
                <td style={{...signatureCellStyle}}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ width: '40%', textAlign: 'center', fontSize: '11px', marginTop: '10px' }}>
          <p style={{ margin: '0 0 5px 0' }}>Mengetahui,</p>
          <p style={{ margin: '0 0 60px 0' }}>ASST. MANAGER OF FACILITY MAINTENANCE</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>AEP MASHUM NURZAMAN</p>
        </div>
      </div>

      {allPhotos.length > 0 && (
        <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: '30px', width: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10px', right: '0px' }}>
            <img src="/hlp.png" alt="HLP Logo" style={{ height: '155px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginTop: '60px', marginBottom: '20px', textTransform: 'uppercase' }}>
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