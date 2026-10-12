import { forwardRef } from 'react';

const formatNamaPendek = (nama: string) => {
  if (!nama) return '';
  const lower = nama.toLowerCase();

  if (lower.includes('fachreza')) return 'M. Fachreza';
  if (lower.includes('luthfianda')) return 'Luthfianda M.';
  if (lower.includes('desi dwi')) return 'Desi D.';
  if (lower.includes('mahdi')) return 'Mahdi A.';
  if (lower.includes('dennis')) return 'Dennis S.';
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

  const cellStyle: React.CSSProperties = {
    border: '1px solid black',
    padding: '8px 8px',
    verticalAlign: 'top',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    fontSize: '10px',
    lineHeight: '1.4',
    wordWrap: 'break-word'
  };

  const headerStyle: React.CSSProperties = {
    border: '1px solid black',
    padding: '8px 6px',
    backgroundColor: themeBg,
    color: themeText,
    fontWeight: 'bold',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '10px',
    lineHeight: '1.3'
  };

  const signatureHeaderStyle: React.CSSProperties = {
    ...headerStyle,
    backgroundColor: '#e5e7eb',
    padding: '6px 4px',
    fontSize: '9.5px'
  };

  const signatureCellStyle: React.CSSProperties = {
    ...cellStyle,
    padding: '7px 6px',
    fontSize: '9.5px',
    lineHeight: '1.35',
    verticalAlign: 'middle'
  };

  const allPhotos: string[] = [];
  data.kegiatan?.forEach((k: any) => {
    if (k.dokumentasi && k.dokumentasi.length > 0) {
      allPhotos.push(...k.dokumentasi);
    }
  });

  return (
    <div
      ref={ref}
      id="print-area"
      style={{
        width: '1060px',
        maxWidth: '1060px',
        margin: '0 auto',
        padding: '12px 16px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#ffffff',
        color: '#000000',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Info Shift & Logo HLP */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: '10px'
        }}
      >
        <table
          border={1}
          style={{
            borderCollapse: 'collapse',
            fontSize: '10px',
            width: '38%',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          <thead>
            <tr>
              <th style={headerStyle}>FUNGSI</th>
              <th style={headerStyle}>DINAS</th>
              <th style={headerStyle}>TANGGAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '6px', textAlign: 'center' }}>
                ELECTRONIC & IT FACILITY
              </td>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '6px', textAlign: 'center' }}>
                {data.dinas}
              </td>
              <td style={{ ...cellStyle, verticalAlign: 'middle', padding: '6px', textAlign: 'center' }}>
                {formatTanggalTitleCase(data.tanggal)}
              </td>
            </tr>
          </tbody>
        </table>

        <img src="/hlp.png" alt="HLP Logo" style={{ height: '55px', objectFit: 'contain' }} />
      </div>

      <h1
        style={{
          textAlign: 'center',
          fontSize: '17px',
          fontWeight: 'bold',
          margin: '4px 0 14px 0',
          textTransform: 'uppercase'
        }}
      >
        LAPORAN KEGIATAN HARIAN (LOG BOOK)
      </h1>

      {/* Tabel Utama Kegiatan */}
      <table
        id="print-table"
        border={1}
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: '4%' }}>NO</th>
            <th style={{ ...headerStyle, width: '10%' }}>LAPORAN DARI</th>
            <th style={{ ...headerStyle, width: '9%' }}>JAM</th>
            <th style={{ ...headerStyle, width: '37%' }}>
              URAIAN KEGIATAN /<br />PERMASALAHAN
            </th>
            <th style={{ ...headerStyle, width: '14%' }}>TINDAK LANJUT</th>
            <th style={{ ...headerStyle, width: '8%' }}>JAM SELESAI</th>
            <th style={{ ...headerStyle, width: '8%' }}>
              HASIL /<br />KONDISI
            </th>
            <th style={{ ...headerStyle, width: '10%' }}>KETERANGAN</th>
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
              <tr
                key={i}
                className="break-inside-avoid"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                <td style={{ ...cellStyle, width: '4%', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ ...cellStyle, width: '10%', textAlign: 'center', fontWeight: 'bold' }}>{lDari}</td>
                <td style={{ ...cellStyle, width: '9%', textAlign: 'center' }}>{jamMulaiClean} WIB</td>
                <td style={{ ...cellStyle, width: '37%', whiteSpace: 'pre-wrap' }}>
                  <span style={{ fontWeight: 'bold' }}>Kegiatan:</span>
                  <br />
                  {urText.trim()}
                </td>
                <td style={{ ...cellStyle, width: '14%', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                  {tLanjut.trim() === '-' ? '' : tLanjut.trim()}
                </td>
                <td style={{ ...cellStyle, width: '8%', textAlign: 'center' }}>{jamSelesaiClean} WIB</td>
                <td style={{ ...cellStyle, width: '8%', textAlign: 'center' }}>
                  {k.hasilKondisi === '-' ? '' : k.hasilKondisi}
                </td>
                <td style={{ ...cellStyle, width: '10%', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                  {ket.trim() === '-' ? '' : ket.trim()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Blok Tanda Tangan (Personil & Mengetahui) */}
      <div
        className="break-inside-avoid"
        style={{
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          width: '100%',
          marginTop: '10px'
        }}
      >
        {/* Tabel Paraf Personil */}
        <table
          id="print-table-signature"
          border={1}
          style={{ borderCollapse: 'collapse', width: '58%', textAlign: 'center' }}
        >
          <thead>
            <tr>
              <th style={{ ...signatureHeaderStyle, width: '6%' }}>NO</th>
              <th style={{ ...signatureHeaderStyle, width: '25%' }}>APINDO</th>
              <th style={{ ...signatureHeaderStyle, width: '7%' }}>PARAF</th>
              <th style={{ ...signatureHeaderStyle, width: '25%' }}>OS - IASS</th>
              <th style={{ ...signatureHeaderStyle, width: '7%' }}>PARAF</th>
              <th style={{ ...signatureHeaderStyle, width: '25%' }}>OM - NTI</th>
              <th style={{ ...signatureHeaderStyle, width: '7%' }}>PARAF</th>
            </tr>
          </thead>
          <tbody>
            {personnelRows.map((row, i) => (
              <tr key={i} style={{ height: '28px' }}>
                <td style={{ ...signatureCellStyle, textAlign: 'center', width: '6%' }}>{i + 1}</td>
                <td style={{ ...signatureCellStyle, textAlign: 'left', width: '25%' }}>{row.apindo}</td>
                <td style={{ ...signatureCellStyle, width: '7%' }}></td>
                <td style={{ ...signatureCellStyle, textAlign: 'left', width: '25%' }}>{row.iass}</td>
                <td style={{ ...signatureCellStyle, width: '7%' }}></td>
                <td style={{ ...signatureCellStyle, textAlign: 'left', width: '25%' }}>{row.nti}</td>
                <td style={{ ...signatureCellStyle, width: '7%' }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kolom Mengetahui */}
        <div
          style={{
            width: '38%',
            textAlign: 'center',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '6px 12px'
          }}
        >
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px' }}>Mengetahui,</p>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11px' }}>
              ASST. MANAGER OF FACILITY MAINTENANCE
            </p>
          </div>
          <div style={{ height: '48px' }}></div>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '11px' }}>
              AEP MASHUM NURZAMAN
            </p>
          </div>
        </div>
      </div>

      {/* Halaman Dokumentasi Foto (Jika Ada) */}
      {allPhotos.length > 0 && (
        <div
          className="page-break-before"
          style={{
            pageBreakBefore: 'always',
            breakBefore: 'page',
            paddingTop: '16px',
            width: '100%',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              borderBottom: '2px solid #000',
              paddingBottom: '8px'
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  margin: 0
                }}
              >
                DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#475569' }}>
                Electronic & IT Facility • Shift {data.dinas} • {formatTanggalTitleCase(data.tanggal)}
              </p>
            </div>
            <img src="/hlp.png" alt="HLP Logo" style={{ height: '45px', objectFit: 'contain' }} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: allPhotos.length === 1 ? '1fr' : '1fr 1fr',
              gap: '14px',
              width: '100%'
            }}
          >
            {allPhotos.map((foto: string, fIdx: number) => (
              <div
                key={fIdx}
                className="break-inside-avoid"
                style={{
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: allPhotos.length <= 2 ? '420px' : '260px'
                }}
              >
                <img
                  src={foto}
                  alt={`Dokumentasi ${fIdx + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
                <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '6px' }}>
                  Dokumentasi #{fIdx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export const PrintFasilitasTemplate = forwardRef<HTMLDivElement, { data: any }>(({ data }, ref) => {
  if (!data) return null;
  return <div ref={ref}></div>;
});