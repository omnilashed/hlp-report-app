import { forwardRef } from 'react';

// 1. TEMPLATE UNTUK LOGBOOK (LANDSCAPE)
export const PrintTemplate = forwardRef<HTMLDivElement, { data: any }>((props, ref) => {
  const { data } = props;
  if (!data) return null;

  const isPagi = String(data.dinas).toUpperCase() === 'PAGI';
  const headerColor = isPagi ? '#ffff00' : '#bdd7ee'; // Kuning (Pagi) atau Biru Muda (Malam)
  const headerTextColor = 'black'; 
  const personilHeaderColor = '#b3b3b3'; // Abu-abu gelap sesuai foto
  const personilTextColor = 'black';

  const allDocs = data.kegiatan?.reduce((acc: string[], k: any) => acc.concat(k.dokumentasi || []), []) || [];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', width: '1024px' }}>
      <div ref={ref} className="bg-white text-black font-sans" style={{ width: '1024px', padding: '30px 40px', boxSizing: 'border-box', fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
        
        {/* === HEADER KOP SURAT === */}
        <div className="flex justify-between items-start mb-6" style={{ flexWrap: 'nowrap' }}>
          <table className="border-collapse border border-black text-center" style={{ width: '400px' }}>
            <thead>
              <tr className="font-bold text-[12px]" style={{ backgroundColor: headerColor, color: headerTextColor }}>
                <th className="border border-black py-1.5 px-1" style={{ width: '40%' }}>FUNGSI</th>
                <th className="border border-black py-1.5 px-1" style={{ width: '25%' }}>DINAS</th>
                <th className="border border-black py-1.5 px-1" style={{ width: '35%' }}>TANGGAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[11px]">
                <td className="border border-black py-1 px-1">ELECTRONIC & IT FACILITY</td>
                <td className="border border-black py-1 px-1 uppercase">{data.dinas}</td>
                <td className="border border-black py-1 px-1 uppercase">{data.tanggal}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-right" style={{ width: '300px', flexShrink: 0 }}>
            <h1 className="text-4xl font-extrabold text-[#002060] tracking-tighter m-0 leading-none">HLP<span className="text-[#00b0f0] ml-1">✈</span></h1>
            <p className="text-[10px] font-bold text-[#002060] tracking-widest m-0 mt-1">JAKARTA CITY AIRPORT</p>
          </div>
        </div>

        <h2 className="text-center text-[18px] font-extrabold mb-5" style={{ wordSpacing: '2px', letterSpacing: '0.5px' }}>LAPORAN KEGIATAN HARIAN (LOG BOOK)</h2>

        {/* === TABEL UTAMA (LEBAR DIKUNCI DI TH) === */}
        <table className="border-collapse border border-black mb-8 align-top" style={{ width: '100%', wordWrap: 'break-word' }}>
          <thead>
            <tr className="font-bold text-[10px] text-center" style={{ backgroundColor: headerColor, color: headerTextColor }}>
              <th className="border border-black py-2 px-1" style={{ width: '3%' }}>NO</th>
              <th className="border border-black py-2 px-1" style={{ width: '10%' }}>LAPORAN DARI</th>
              <th className="border border-black py-2 px-1" style={{ width: '8%' }}>JAM</th>
              <th className="border border-black py-2 px-1" style={{ width: '32%' }}>URAIAN KEGIATAN /<br/>PERMASALAHAN</th>
              <th className="border border-black py-2 px-1" style={{ width: '18%' }}>TINDAK LANJUT</th>
              <th className="border border-black py-2 px-1" style={{ width: '9%' }}>JAM SELESAI</th>
              <th className="border border-black py-2 px-1" style={{ width: '9%' }}>HASIL /<br/>KONDISI</th>
              <th className="border border-black py-2 px-1" style={{ width: '11%' }}>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {data.kegiatan && data.kegiatan.map((item: any, idx: number) => {
              const rawText = item.uraian || '';
              const uraianText = rawText.split('\n\nUraian: ')[1]?.split('\nTindak Lanjut:')[0] || rawText.replace('- ', '');
              
              return (
                <tr key={idx} className="text-[11px]" style={{ pageBreakInside: 'avoid' }}>
                  <td className="border border-black py-1.5 px-1 text-center align-top">{idx + 1}</td>
                  <td className="border border-black py-1.5 px-1 text-center align-top">{item.laporanDari || 'ELIT'}</td>
                  <td className="border border-black py-1.5 px-1 text-center align-top">{item.jamMulai}</td>
                  <td className="border border-black py-1.5 px-2 text-left align-top" style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="font-bold">Kegiatan :</span><br/>
                    {uraianText}
                  </td>
                  <td className="border border-black py-1.5 px-1 text-center align-top" style={{ whiteSpace: 'pre-wrap' }}>{item.tindakLanjut}</td>
                  <td className="border border-black py-1.5 px-1 text-center align-top">{item.jamSelesai}</td>
                  <td className="border border-black py-1.5 px-1 text-center align-top">{item.hasilKondisi}</td>
                  <td className="border border-black py-1.5 px-1 text-center align-top" style={{ whiteSpace: 'pre-wrap' }}>{item.keterangan}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* === TABEL PERSONIL & TANDA TANGAN === */}
        <div className="flex justify-between items-start" style={{ flexWrap: 'nowrap', pageBreakInside: 'avoid' }}>
          <table className="border-collapse border border-black text-center" style={{ width: '600px' }}>
            <thead>
              <tr className="font-bold text-[10px]" style={{ backgroundColor: personilHeaderColor, color: personilTextColor }}>
                <th className="border border-black py-1 px-1" style={{ width: '5%' }}>NO</th>
                <th className="border border-black py-1 px-1" style={{ width: '22%' }}>APINDO</th>
                <th className="border border-black py-1 px-1" style={{ width: '10%' }}>PARAF</th>
                <th className="border border-black py-1 px-1" style={{ width: '22%' }}>OS - IASS</th>
                <th className="border border-black py-1 px-1" style={{ width: '10%' }}>PARAF</th>
                <th className="border border-black py-1 px-1" style={{ width: '21%' }}>OM - NTI</th>
                <th className="border border-black py-1 px-1" style={{ width: '10%' }}>PARAF</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="text-[10px]" style={{ height: '22px' }}>
                  <td className="border border-black py-0.5 px-1">{idx + 1}</td>
                  <td className="border border-black py-0.5 px-1" style={{ wordBreak: 'break-word' }}>{data.personil?.apindo?.[idx]?.nama || ''}</td>
                  <td className="border border-black py-0.5 px-1"></td>
                  <td className="border border-black py-0.5 px-1" style={{ wordBreak: 'break-word' }}>{data.personil?.omIassNti?.[idx]?.nama || ''}</td>
                  <td className="border border-black py-0.5 px-1"></td>
                  <td className="border border-black py-0.5 px-1" style={{ wordBreak: 'break-word' }}>{data.personil?.omIassNti?.[idx + 4]?.nama || ''}</td>
                  <td className="border border-black py-0.5 px-1"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-center text-[11px] pt-1" style={{ width: '300px', flexShrink: 0 }}>
            <p className="mb-0">Mengetahui,</p>
            <p className="mb-14">ASST. MANAGER OF FACILITY MAINTENANCE</p>
            <p className="font-bold">AEP MASHUM NURZAMAN</p>
          </div>
        </div>

        {/* === DOKUMENTASI (FOTO) === */}
        {allDocs.length > 0 && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '30px' }}>
            <h3 className="font-bold text-center bg-[#d9d9d9] py-3 border border-black mb-6 text-[13px] uppercase" style={{ wordSpacing: '2px' }}>
              DOKUMENTASI LAPORAN KEGIATAN HARIAN (LOG BOOK)
            </h3>
            <div className="grid grid-cols-4 gap-0 border-l border-t border-black">
              {allDocs.map((img: string, idx: number) => (
                <div key={idx} className="border-r border-b border-black flex items-center justify-center bg-gray-50 h-[250px] overflow-hidden p-2">
                  <img src={img} alt="Dokumentasi" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
            <div className="text-right mt-6">
              <h1 className="text-3xl font-extrabold text-[#002060] tracking-tighter m-0 leading-none">HLP<span className="text-[#00b0f0] ml-1">✈</span></h1>
              <p className="text-[10px] font-bold text-[#002060] tracking-widest m-0 mt-1">JAKARTA CITY AIRPORT</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

// 2. TEMPLATE UNTUK KONDISI FASILITAS (PORTRAIT)
export const PrintFasilitasTemplate = forwardRef<HTMLDivElement, { data: any }>((props, ref) => {
  const { data } = props;
  if (!data) return null;

  const isPagi = String(data.dinas).toUpperCase() === 'PAGI';
  const headerColor = isPagi ? '#ffff00' : '#bdd7ee'; // Biru Muda untuk Malam
  const headerTextColor = 'black'; 

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', width: '794px' }}>
      <div ref={ref} className="bg-white text-black font-sans" style={{ width: '794px', padding: '30px 40px', boxSizing: 'border-box', fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
        
        <div className="flex justify-between items-start mb-6" style={{ flexWrap: 'nowrap' }}>
          <div>
            <h1 className="text-[20px] font-extrabold text-black tracking-wide" style={{ wordSpacing: '3px' }}>
              LAPORAN KONDISI FASILITAS
            </h1>
            <p className="text-[13px] font-bold mt-1 uppercase">
              TANGGAL: {data.tanggal} | SHIFT: {data.dinas}
            </p>
          </div>
          <div className="text-right" style={{ width: '200px', flexShrink: 0 }}>
            <h1 className="text-3xl font-extrabold text-[#002060] tracking-tighter m-0 leading-none">HLP<span className="text-[#00b0f0] ml-1">✈</span></h1>
            <p className="text-[9px] font-bold text-[#002060] tracking-widest m-0 mt-1">JAKARTA CITY AIRPORT</p>
          </div>
        </div>

        <table className="border-collapse border border-black text-center" style={{ width: '100%', wordWrap: 'break-word' }}>
          <thead>
            <tr className="font-bold text-[11px]" style={{ backgroundColor: headerColor, color: headerTextColor }}>
              <th className="border border-black py-2 px-1" style={{ width: '6%' }}>NO</th>
              <th className="border border-black py-2 px-3 text-left" style={{ width: '44%' }}>NAMA FASILITAS</th>
              <th className="border border-black py-2 px-1" style={{ width: '10%' }}>TOTAL</th>
              <th className="border border-black py-2 px-1" style={{ width: '10%' }}>NORMAL</th>
              <th className="border border-black py-2 px-1" style={{ width: '10%' }}>RUSAK</th>
              <th className="border border-black py-2 px-3 text-left" style={{ width: '20%' }}>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            {data.kondisiFasilitas?.map((item: any, idx: number) => (
              <tr key={idx} className="text-[11px] font-bold" style={{ height: '26px', pageBreakInside: 'avoid' }}>
                <td className="border border-black py-1 px-1">{idx + 1}</td>
                <td className="border border-black py-1 px-3 text-left uppercase">{item.namaFasilitas}</td>
                <td className="border border-black py-1 px-1">{item.totalUnit}</td>
                <td className="border border-black py-1 px-1">{item.normal}</td>
                <td className="border border-black py-1 px-1">{item.rusak > 0 ? item.rusak : '-'}</td>
                <td className="border border-black py-1 px-3 text-left font-normal">{item.keteranganRusak || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
});

PrintTemplate.displayName = 'PrintTemplate';
PrintFasilitasTemplate.displayName = 'PrintFasilitasTemplate';