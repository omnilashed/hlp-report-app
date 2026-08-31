import { useState, useMemo } from 'react';

interface RekapBulananProps {
  reports: any[];
}

const tupoksiList = [
  "Serah Terima Dinas Malam ke Dinas Pagi.",
  "Serah Terima Dinas Pagi ke Dinas Malam.",
  "Pembuatan Laporan Harian Shift MALAM.",
  "Pembuatan Laporan Harian Shift PAGI.",
  "Melakukan pengecekan & konfigurasi resolusi CCTV.",
  "Melakukan preventif maintenance harian X-Ray, WTMD, HHMD.",
  "Melakukan pengecekan harian peralatan Elektronika dan IT di Bandara Halim PK.",
  "Melakukan pengecekan dan pembersihan X-Ray.",
  "Update suara announcer."
];

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const years = ['2025', '2026', '2027', '2028', '2029'];

export default function RekapBulanan({ reports }: RekapBulananProps) {
  const [selectedMonth, setSelectedMonth] = useState('Agustus');
  const [selectedYear, setSelectedYear] = useState('2026');

  const rekapData = useMemo(() => {
    const filteredReports = reports.filter((report) => {
      return report.tanggal && report.tanggal.includes(selectedMonth) && report.tanggal.includes(selectedYear);
    });

    const targetSebulan = 30; 
    const rekapMap = new Map<string, any>();

    tupoksiList.forEach(t => {
      rekapMap.set(t, { tupoksi: t, realisasi: 0, target: targetSebulan, kendalaList: [], isStandar: true });
    });

    filteredReports.forEach((report) => {
      if (report.kegiatan && Array.isArray(report.kegiatan)) {
        report.kegiatan.forEach((keg: any) => {
          const uraianText = keg.uraian || '';
          
          const barisTugas = uraianText.split('\n')
            .map((u: string) => u.replace(/^-\s*/, '').trim())
            .filter((u: string) => u.length > 0);

          barisTugas.forEach((tugasMurni: string) => {
            const matchedStandar = tupoksiList.find(standar => 
              tugasMurni.toLowerCase().includes(standar.toLowerCase()) || 
              standar.toLowerCase().includes(tugasMurni.toLowerCase())
            );
            
            if (matchedStandar) {
              const data = rekapMap.get(matchedStandar);
              data.realisasi += 1;
              if (keg.tindakLanjut && keg.tindakLanjut !== '-') data.kendalaList.push(keg.tindakLanjut);
            } else {
              const namaTugasTambahan = `[Insidental] ${tugasMurni}`;
              if (rekapMap.has(namaTugasTambahan)) {
                const data = rekapMap.get(namaTugasTambahan);
                data.realisasi += 1;
                data.target += 1; 
                if (keg.tindakLanjut && keg.tindakLanjut !== '-') data.kendalaList.push(keg.tindakLanjut);
              } else {
                rekapMap.set(namaTugasTambahan, { 
                  tupoksi: namaTugasTambahan, 
                  realisasi: 1, 
                  target: 1, 
                  kendalaList: keg.tindakLanjut && keg.tindakLanjut !== '-' ? [keg.tindakLanjut] : [], 
                  isStandar: false 
                });
              }
            }
          });
        });
      }
    });

    return Array.from(rekapMap.values()).map(item => {
      const persentase = item.isStandar 
        ? Math.min(Math.round((item.realisasi / item.target) * 100), 100)
        : 100;
        
      const kendala = item.kendalaList.length > 0 
        ? [...new Set(item.kendalaList)].join('; ') 
        : (persentase < 100 ? 'Menunggu rekap laporan lapangan' : 'Sesuai, tidak ada kendala.');

      return {
        ...item,
        persentase,
        kendala
      };
    });
  }, [reports, selectedMonth, selectedYear]);

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] w-full overflow-hidden p-6 mt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/50 pb-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl">Rekapitulasi Kinerja Bulanan (KPI)</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Evaluasi Kesesuaian Tupoksi & Tugas Insidental Teknisi</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 bg-white/80 text-slate-700 text-sm font-bold rounded-xl border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2.5 bg-white/80 text-slate-700 text-sm font-bold rounded-xl border border-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-blue-50/50 border-b border-blue-100 text-blue-800 font-bold text-xs uppercase tracking-wider">
              <th className="p-4 rounded-tl-xl w-1/4">Tugas (SK & Insidental)</th>
              <th className="p-4 w-1/5 text-center">Realisasi (Harian)</th>
              <th className="p-4 w-1/6 text-center">Pencapaian (%)</th>
              <th className="p-4 rounded-tr-xl w-1/3">Tindak Lanjut / Kendala</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rekapData.map((item, index) => (
              <tr key={index} className={`border-b border-slate-200/50 transition-colors ${item.isStandar ? 'hover:bg-white/40' : 'bg-slate-50/50 hover:bg-slate-100/50'}`}>
                <td className="p-4 font-bold text-slate-700 leading-relaxed">
                  {item.isStandar ? `${index + 1}. ${item.tupoksi}` : (
                    <span className="flex items-start">
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded mr-2 mt-0.5 whitespace-nowrap">Tambahan</span>
                      <span>{item.tupoksi.replace('[Insidental] ', '')}</span>
                    </span>
                  )}
                </td>
                <td className="p-4 text-center font-medium text-slate-600">
                  Terlaksana <span className="font-bold text-blue-600">{item.realisasi}</span> dari {item.target} {item.isStandar ? 'hari' : 'kasus'}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border shadow-sm ${
                    item.persentase >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                    item.persentase >= 70 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                    'bg-rose-100 text-rose-700 border-rose-200'
                  }`}>
                    {item.persentase}%
                  </span>
                </td>
                <td className="p-4 text-slate-600 text-xs font-medium leading-relaxed bg-white/20">
                  {item.kendala}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}