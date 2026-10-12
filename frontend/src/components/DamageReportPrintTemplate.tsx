import { forwardRef } from 'react';
import html2pdf from 'html2pdf.js';

export const KODE_HAMBATAN_LIST = [
  { code: 'AU', label: 'Tidak ada alat ukur' },
  { code: 'PK', label: 'Menunggu Penerbangan Kalibrasi' },
  { code: 'TT', label: 'Tidak ada teknisi' },
  { code: 'SC', label: 'Menunggu suku cadang' },
  { code: 'TR', label: 'Tidak ada transportasi' },
  { code: 'ST', label: 'Peralatan belum serah terima' },
  { code: 'PC', label: 'Pengaruh cuaca' },
  { code: 'AL', label: 'Alasan lain' },
  { code: 'TH', label: 'Tidak ada hambatan' }
];

export const KATEGORI_KERUSAKAN_LIST = [
  'Kategori 1 : System Tidak Beroperasi',
  'Kategori 2 : System beroperasi tetapi performa menurun',
  'Kategori 3 : System Beroperasi dan Performance Tidak Menurun'
];

export const exportElementToPDF = (element: HTMLElement | null, filename: string) => {
  if (!element) return;
  const opt: any = {
    margin: [8, 8, 8, 8],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: ['tr', '.break-inside-avoid', '.page-break-avoid']
    }
  };
  html2pdf().set(opt).from(element).save();
};

interface DamageReportPrintProps {
  report: any;
  mode?: 'kerusakan' | 'perbaikan';
}

export const DamageReportPrintTemplate = forwardRef<HTMLDivElement, DamageReportPrintProps>(
  ({ report, mode = 'kerusakan' }, ref) => {
    if (!report) return null;

    const isPerbaikan = mode === 'perbaikan';
    const docsToRender =
      isPerbaikan && report.dokumentasiPerbaikan && report.dokumentasiPerbaikan.length > 0
        ? report.dokumentasiPerbaikan
        : report.dokumentasi || [];

    const tanggalCetak = isPerbaikan && report.tanggalPerbaikan ? report.tanggalPerbaikan : report.tanggal;
    const pembuatNama =
      isPerbaikan && report.dibuatOlehPerbaikan ? report.dibuatOlehPerbaikan : report.dibuatOleh || 'RAHMAT D. CAHYO';
    const pembuatJabatan =
      isPerbaikan && report.jabatanDibuatPerbaikan
        ? report.jabatanDibuatPerbaikan
        : report.jabatanDibuat || 'Electronic Facility & IT Supervisor';
    const kodeHambatanAktif =
      isPerbaikan && report.kodeHambatanPerbaikan ? report.kodeHambatanPerbaikan : report.kodeHambatan || 'SC';

    const cellStyle: React.CSSProperties = {
      borderRight: '1px solid #000000',
      borderBottom: '1px solid #000000',
      padding: '7px 8px',
      fontSize: '11px',
      lineHeight: '1.4',
      color: '#000000'
    };

    return (
      <div ref={ref} style={{ width: '720px', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* HALAMAN 1: FORMULIR UTAMA */}
        <div
          style={{
            width: '720px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            border: '2px solid #000080'
          }}
        >
          {/* Header Judul */}
          <div
            style={{
              textAlign: 'center',
              padding: '8px 12px 6px 12px',
              borderBottom: '2px solid #000080'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
              {isPerbaikan ? 'LAPORAN PERBAIKAN PERALATAN' : 'LAPORAN KONDISI PERALATAN'}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
              {(report.peralatan || '').toUpperCase()}
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
              BANDARA INTERNASIONAL HALIM PERDANAKUSUMA
            </div>
            <div style={{ marginTop: '3px', fontSize: '10px', fontWeight: 'bold', color: '#1e293b' }}>
              {isPerbaikan ? (
                <span>
                  Kode Laporan Perbaikan: {report.repairReportCode || '-'} &nbsp;|&nbsp; Ref. Laporan Kerusakan:{' '}
                  {report.reportCode}
                </span>
              ) : (
                <span>Report Code: {report.reportCode}</span>
              )}
            </div>
          </div>

          {/* Tabel Utama 4-Kolom Standar */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    width: '38px',
                    borderRight: '1px solid #000',
                    borderBottom: '2px solid #000',
                    padding: '6px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                >
                  NO
                </th>
                <th
                  style={{
                    width: '180px',
                    borderRight: '1px solid #000',
                    borderBottom: '2px solid #000',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                >
                  URAIAN
                </th>
                <th
                  colSpan={2}
                  style={{
                    borderBottom: '2px solid #000',
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}
                >
                  DATA
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Tanggal/Bulan/Tahun */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>1.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Tanggal/Bulan/Tahun</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {tanggalCetak || '-'}
                </td>
              </tr>

              {/* 2. Lokasi */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>2.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Lokasi</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.lokasi || '-'}
                </td>
              </tr>

              {/* 3. Fasilitas */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>3.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Fasilitas</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.fasilitas || '-'}
                </td>
              </tr>

              {/* 4. Peralatan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>4.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Peralatan</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.peralatan || '-'}
                </td>
              </tr>

              {/* 5. Bagian */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>5.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Bagian</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.bagian || '-'}
                </td>
              </tr>

              {/* 6. Kategori Kerusakan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>6.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Kategori Kerusakan</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.kategoriKerusakan || '-'}
                </td>
              </tr>

              {/* 7. Uraian dan Dampak */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  style={{
                    ...cellStyle,
                    width: '38px',
                    textAlign: 'center',
                    verticalAlign: 'top',
                    fontWeight: 'bold'
                  }}
                >
                  7.
                </td>
                <td style={{ ...cellStyle, width: '180px', verticalAlign: 'top' }}>Uraian dan Dampak</td>
                <td
                  colSpan={2}
                  style={{
                    ...cellStyle,
                    borderRight: 'none',
                    verticalAlign: 'top',
                    padding: '8px'
                  }}
                >
                  <div>
                    <strong>Uraian :</strong>
                    <div style={{ marginTop: '2px', whiteSpace: 'pre-wrap' }}>{report.uraian || '-'}</div>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Dampak :</strong>
                    <div style={{ marginTop: '2px', whiteSpace: 'pre-wrap' }}>{report.dampak || '-'}</div>
                  </div>
                </td>
              </tr>

              {/* 8. Tindakan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  style={{
                    ...cellStyle,
                    width: '38px',
                    textAlign: 'center',
                    verticalAlign: 'top',
                    fontWeight: 'bold'
                  }}
                >
                  8.
                </td>
                <td style={{ ...cellStyle, width: '180px', verticalAlign: 'top' }}>Tindakan</td>
                <td
                  colSpan={2}
                  style={{
                    ...cellStyle,
                    borderRight: 'none',
                    verticalAlign: 'top',
                    padding: '8px'
                  }}
                >
                  {isPerbaikan && report.tindakanPerbaikan ? (
                    <div>
                      <div>
                        <strong>Tindakan Awal (Laporan Kerusakan {report.reportCode}) :</strong>
                        <div style={{ marginTop: '2px', whiteSpace: 'pre-wrap' }}>{report.tindakan || '-'}</div>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <strong>Tindakan Perbaikan ({report.repairReportCode || 'Selesai'}) :</strong>
                        <div style={{ marginTop: '2px', whiteSpace: 'pre-wrap' }}>{report.tindakanPerbaikan}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{report.tindakan || '-'}</div>
                  )}
                </td>
              </tr>

              {/* 9. Penyebab */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>9.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Penyebab</td>
                <td colSpan={2} style={{ ...cellStyle, borderRight: 'none' }}>
                  {report.penyebab || '-'}
                </td>
              </tr>

              {/* 10. Tgl & Jam Kerusakan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  rowSpan={2}
                  style={{
                    ...cellStyle,
                    width: '38px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold'
                  }}
                >
                  10.
                </td>
                <td style={{ ...cellStyle, width: '180px' }}>Tgl. Kerusakan</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {report.tglKerusakan || '-'}
                </td>
                {/* Kotak Kode Hambatan (rowSpan 6) */}
                <td
                  rowSpan={6}
                  style={{
                    width: '280px',
                    borderBottom: '1px solid #000',
                    padding: '6px 8px',
                    verticalAlign: 'top'
                  }}
                >
                  <div style={{ border: '1px solid #000', borderRadius: '2px' }}>
                    <div
                      style={{
                        borderBottom: '1px solid #000',
                        textAlign: 'center',
                        padding: '3px 4px',
                        fontWeight: 'bold',
                        fontSize: '10px'
                      }}
                    >
                      Kode Hambatan
                    </div>
                    <div style={{ padding: '4px 6px', fontSize: '9.5px', lineHeight: '1.45' }}>
                      {KODE_HAMBATAN_LIST.map((kh) => (
                        <div key={kh.code} style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', width: '22px' }}>{kh.code}</span>
                          <span>- {kh.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '180px' }}>Jam Kerusakan</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {report.jamKerusakan || '-'}
                </td>
              </tr>

              {/* 11. Tgl & Jam Selesai Perbaikan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  rowSpan={2}
                  style={{
                    ...cellStyle,
                    width: '38px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold'
                  }}
                >
                  11.
                </td>
                <td style={{ ...cellStyle, width: '180px' }}>Tgl. Selesai Perbaikan</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {report.tglSelesaiPerbaikan || '-'}
                </td>
              </tr>
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '180px' }}>Jam Selesai Perbaikan</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {report.jamSelesaiPerbaikan || '-'}
                </td>
              </tr>

              {/* 12. Jumlah Jam Operasi Terputus */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>12.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Jumlah Jam Operasi Terputus</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {report.jumlahJamTerputus || '-'}
                </td>
              </tr>

              {/* 13. Kode Hambatan */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td style={{ ...cellStyle, width: '38px', textAlign: 'center', fontWeight: 'bold' }}>13.</td>
                <td style={{ ...cellStyle, width: '180px' }}>Kode Hambatan</td>
                <td style={{ ...cellStyle, width: '222px', fontWeight: 'bold' }}>
                  {kodeHambatanAktif}
                </td>
              </tr>

              {/* Baris Tanggal Jakarta */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  colSpan={4}
                  style={{
                    textAlign: 'center',
                    padding: '6px 8px',
                    borderBottom: '1px solid #000',
                    fontSize: '11px'
                  }}
                >
                  Jakarta, {tanggalCetak || report.tanggal}
                </td>
              </tr>

              {/* Baris Tanda Tangan (Diketahui & Dibuat) */}
              <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td
                  colSpan={2}
                  style={{
                    width: '50%',
                    borderRight: '1px solid #000',
                    borderBottom: 'none',
                    textAlign: 'center',
                    padding: '8px 12px 10px 12px',
                    verticalAlign: 'top'
                  }}
                >
                  <div style={{ fontSize: '11px' }}>Diketahui</div>
                  <div style={{ height: '48px' }}></div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textTransform: 'uppercase',
                      fontSize: '11px'
                    }}
                  >
                    {report.diketahuiOleh || 'AEP MASHUM NURZAMAN'}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                    {report.jabatanDiketahui || 'Asst. Manager Of Facility Maintenance'}
                  </div>
                </td>
                <td
                  colSpan={2}
                  style={{
                    width: '50%',
                    borderBottom: 'none',
                    textAlign: 'center',
                    padding: '8px 12px 10px 12px',
                    verticalAlign: 'top'
                  }}
                >
                  <div style={{ fontSize: '11px' }}>Dibuat</div>
                  <div style={{ height: '48px' }}></div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textTransform: 'uppercase',
                      fontSize: '11px'
                    }}
                  >
                    {pembuatNama}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>{pembuatJabatan}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kotak Dokumentasi Ringkas (Hanya jika tidak ada foto lampiran, agar tetap muat tepat 1 halaman A4) */}
          {docsToRender.length === 0 && (
            <div style={{ padding: '8px 16px 12px 16px', borderTop: '2px solid #000080' }}>
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}
              >
                DOKUMENTASI
              </div>
              <div
                style={{
                  border: '1px dashed #94a3b8',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '10.5px'
                }}
              >
                Tidak ada foto dokumentasi dilampirkan
              </div>
            </div>
          )}
        </div>

        {/* HALAMAN 2+: LAMPIRAN FOTO DOKUMENTASI (Jika ada foto yang dilampirkan) */}
        {docsToRender.length > 0 && (
          <div
            className="page-break-before"
            style={{
              pageBreakBefore: 'always',
              breakBefore: 'page',
              width: '720px',
              margin: '0 auto',
              marginTop: '16px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'Arial, Helvetica, sans-serif',
              boxSizing: 'border-box',
              border: '2px solid #000080',
              padding: '16px 20px'
            }}
          >
            <div
              style={{
                textAlign: 'center',
                borderBottom: '2px solid #000080',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>
                LAMPIRAN DOKUMENTASI
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginTop: '2px' }}>
                {(report.peralatan || '').toUpperCase()} -{' '}
                {isPerbaikan ? 'LAPORAN PERBAIKAN PERALATAN' : 'LAPORAN KONDISI PERALATAN'}
              </div>
              <div style={{ fontSize: '10px', color: '#1e293b', marginTop: '3px', fontWeight: 'bold' }}>
                Bandara Internasional Halim Perdanakusuma •{' '}
                {isPerbaikan
                  ? `Ref: ${report.repairReportCode || report.reportCode}`
                  : `Report Code: ${report.reportCode}`}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {docsToRender.map((doc: any, idx: number) => (
                <div
                  key={idx}
                  className="break-inside-avoid"
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '10px',
                    backgroundColor: '#fafafa',
                    textAlign: 'center'
                  }}
                >
                  <img
                    src={doc.foto}
                    alt={doc.keterangan || `Dokumentasi ${idx + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '280px',
                      objectFit: 'contain',
                      margin: '0 auto',
                      display: 'block',
                      borderRadius: '4px'
                    }}
                  />
                  {doc.keterangan && (
                    <div
                      style={{
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '11px',
                        color: '#1e293b',
                        fontWeight: '500'
                      }}
                    >
                      {doc.keterangan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
