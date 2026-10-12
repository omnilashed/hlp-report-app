import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Equipment from '../models/Equipment';
import EquipmentMonthlyLog from '../models/EquipmentMonthlyLog';
import StockEquipment from '../models/StockEquipment';
import Report from '../models/Report';
import DamageReport from '../models/DamageReport';

const router = express.Router();

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper parse string tanggal "09 Oktober 2026" atau "2026-10-09"
const parseIndonesianDate = (dateStr: string) => {
  if (!dateStr) return { day: 1, month: 10, year: 2026 };
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10)
      };
    }
  }

  const parts = dateStr.trim().split(' ');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10) || 1;
    const mIdx = NAMA_BULAN.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
    const month = mIdx !== -1 ? mIdx + 1 : 10;
    const year = parseInt(parts[2], 10) || 2026;
    return { day, month, year };
  }

  return { day: 1, month: 10, year: 2026 };
};

// GET data matrix Laporan Bulanan Kesiapan Fasilitas / Availability
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    const tahun = parseInt(req.query.tahun as string, 10) || todayYear;
    const bulan = parseInt(req.query.bulan as string, 10) || todayMonth;
    const mainCategory = (req.query.mainCategory as string) || 'Semua';
    const subCategory = (req.query.subCategory as string) || 'Semua';

    const namaBulan = NAMA_BULAN[bulan - 1] || 'Oktober';
    const bulanTahun = `${namaBulan} ${tahun}`;
    const daysInMonth = new Date(tahun, bulan, 0).getDate();
    const totalMonthHours = daysInMonth * 24;

    // Filter master peralatan
    const eqFilter: any = {};
    if (mainCategory !== 'Semua') eqFilter.mainCategory = mainCategory;
    if (subCategory !== 'Semua') eqFilter.subCategory = subCategory;

    const equipments = await Equipment.find(eqFilter)
      .sort({ mainCategory: 1, subCategory: 1, namaPeralatan: 1, lokasi: 1 })
      .lean();

    // Ambil seluruh laporan logbook harian aktif (tanpa field gambar berat) agar selalu sinkron 100%
    const allActiveReports = await Report.find(
      {},
      { _id: 1, tanggal: 1, dinas: 1, kondisiFasilitas: 1, status: 1, createdAt: 1, updatedAt: 1 }
    )
      .sort({ createdAt: 1, updatedAt: 1 })
      .lean();

    const validReportIdSet = new Set(allActiveReports.map(r => String(r._id)));

    // Ambil logs harian yang tercatat di bulan ini
    const rawLogs = await EquipmentMonthlyLog.find({ tahun, bulan }).lean();
    // Filter hanya log yang berasal dari report aktif (atau log mandiri tanpa reportId)
    const logs = rawLogs.filter(lg => !lg.reportId || validReportIdSet.has(String(lg.reportId)));

    // Bersihkan log yatim (orphaned) di background jika ada report yang sudah dihapus
    if (rawLogs.length !== logs.length) {
      const orphanIds = rawLogs
        .filter(lg => lg.reportId && !validReportIdSet.has(String(lg.reportId)))
        .map(lg => lg._id);
      if (orphanIds.length > 0) {
        EquipmentMonthlyLog.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
      }
    }

    // Ambil data laporan kerusakan di bulan ini untuk mengidentifikasi jam terputus jika ada
    const damageReports = await DamageReport.find({}).lean();

    // Map logs berdasarkan ID maupun namaPeralatan + lokasi + hari, serta catat hari yang memiliki logbook
    const logByIdMap: Record<string, any[]> = {};
    const logByNameLocMap: Record<string, any[]> = {};
    const daysWithLogbook = new Set<number>();

    const registerLogEntry = (entry: {
      equipmentId?: string;
      namaPeralatan: string;
      lokasi: string;
      hari: number;
      kondisi: string;
      statusPeralatan: string;
    }) => {
      if (!entry.namaPeralatan || !entry.hari) return;
      daysWithLogbook.add(entry.hari);
      if (entry.equipmentId) {
        const idKey = `${String(entry.equipmentId).trim()}__${entry.hari}`;
        if (!logByIdMap[idKey]) logByIdMap[idKey] = [];
        logByIdMap[idKey].push(entry);
      }
      const nameLocKey = `${entry.namaPeralatan.toLowerCase().trim()}__${(entry.lokasi || '-').toLowerCase().trim()}__${entry.hari}`;
      if (!logByNameLocMap[nameLocKey]) logByNameLocMap[nameLocKey] = [];
      logByNameLocMap[nameLocKey].push(entry);
    };

    // 1. Masukkan dari EquipmentMonthlyLog
    for (const lg of logs) {
      registerLogEntry({
        equipmentId: lg.equipmentId ? String(lg.equipmentId) : '',
        namaPeralatan: lg.namaPeralatan,
        lokasi: lg.lokasi || '-',
        hari: lg.hari,
        kondisi: lg.kondisi || 'Normal',
        statusPeralatan: lg.statusPeralatan || 'Ready'
      });
    }

    // 2. Pastikan laporan harian (Report) pada bulan & tahun ini langsung terbaca (menimpa dengan data terbaru dari logbook harian)
    for (const rep of allActiveReports) {
      if (!Array.isArray(rep.kondisiFasilitas) || rep.kondisiFasilitas.length === 0) continue;
      const dInfo = parseIndonesianDate(rep.tanggal);
      if (dInfo.year !== tahun || dInfo.month !== bulan) continue;

      for (const kf of rep.kondisiFasilitas) {
        if (!kf || !kf.namaPeralatan) continue;
        registerLogEntry({
          equipmentId: kf._id ? String(kf._id) : '',
          namaPeralatan: kf.namaPeralatan,
          lokasi: kf.lokasi || '-',
          hari: dInfo.day,
          kondisi: kf.kondisi || 'Normal',
          statusPeralatan: kf.statusPeralatan || 'Ready'
        });
      }
    }

    // Kelompokkan peralatan berdasarkan namaPeralatan (seperti FTD, X-RAY, WTMD, HHMD, CCTV, dll.)
    const groupMap: Record<string, any[]> = {};
    for (const eq of equipments) {
      const gName = eq.namaPeralatan.toUpperCase().trim();
      if (!groupMap[gName]) groupMap[gName] = [];
      groupMap[gName].push(eq);
    }

    const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let gLetterIdx = 0;

    const resultGroups = [];
    let totalAllPeralatan = 0;
    let totalAllTerputus = 0;
    let sumAvailability = 0;

    for (const [groupName, items] of Object.entries(groupMap)) {
      const groupLetter = groupLetters[gLetterIdx % groupLetters.length] || 'A';
      gLetterIdx++;

      let groupTerputus = 0;
      let groupTotalHours = items.length * totalMonthHours;
      const formattedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        totalAllPeralatan++;

        const daysData: Record<number, { code: string; color: string; downHours: number; status: string; kondisi: string }> = {};
        let itemDownHours = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const idKey = `${String(item._id).trim()}__${d}`;
          const nameLocKey = `${item.namaPeralatan.toLowerCase().trim()}__${(item.lokasi || '-').toLowerCase().trim()}__${d}`;
          const dayLogs = logByIdMap[idKey] || logByNameLocMap[nameLocKey] || [];

          const isPastDay =
            tahun < todayYear ||
            (tahun === todayYear && bulan < todayMonth) ||
            (tahun === todayYear && bulan === todayMonth && d < todayDay);

          const hasLogForDay = dayLogs.length > 0 || daysWithLogbook.has(d);

          // Jika hari ini / hari ke depan (bukan hari yang lalu) DAN belum ada logbook harian yang diisi,
          // maka biarkan sel kondisi peralatan KOSONG hingga logbook hariannya diisi
          if (!hasLogForDay && !isPastDay) {
            daysData[d] = {
              code: '',
              color: 'empty',
              downHours: 0,
              status: 'Belum Diisi',
              kondisi: '-'
            };
            continue;
          }

          // Jika ada logbook harian yang diisi, ikuti hasil pengecekan fasilitas harian dari logbook.
          // Jika tidak ada logbook namun merupakan hari yang lalu, tetap terisi default operasional.
          let cellStatus = item.statusPeralatan === 'Standby' ? 'Standby' : 'Ready';
          let cellKondisi = 'Normal';

          if (dayLogs.length > 0) {
            const latestLog = dayLogs[dayLogs.length - 1];
            cellStatus = latestLog.statusPeralatan || 'Ready';
            cellKondisi = latestLog.kondisi || 'Normal';
          }

          // Cek apakah ada laporan kerusakan aktif pada peralatan & hari tersebut
          const matchingDamage = damageReports.find(dr => {
            const drDate = parseIndonesianDate(dr.tglKerusakan || dr.tanggal);
            const drName = (dr.peralatan || '').toLowerCase().trim();
            const drLoc = (dr.lokasi || '').toLowerCase().trim();
            return drDate.year === tahun && drDate.month === bulan && drDate.day === d &&
                   drName === item.namaPeralatan.toLowerCase().trim() &&
                   (drLoc === item.lokasi.toLowerCase().trim() || !drLoc);
          });

          let cellCode = '0';
          let cellColor = 'green';
          let cellDownHours = 0;

          if (cellStatus === 'Standby') {
            cellCode = '-';
            cellColor = 'yellow';
            cellDownHours = 0;
          } else if (cellStatus === 'Damaged' || cellKondisi === 'Rusak' || matchingDamage) {
            cellCode = 'X';
            cellColor = 'red';
            const rawJam = matchingDamage?.jumlahJamTerputus;
            let hVal = 24;
            if (rawJam) {
              const numMatch = String(rawJam).match(/\d+(\.\d+)?/);
              if (numMatch) hVal = Math.min(24, Math.max(1, parseFloat(numMatch[0])));
            }
            cellDownHours = hVal;
          } else if (cellStatus === 'Maintenance') {
            cellCode = 'M';
            cellColor = 'orange';
            cellDownHours = 0;
          } else {
            cellCode = '0';
            cellColor = 'green';
            cellDownHours = 0;
          }

          itemDownHours += cellDownHours;
          daysData[d] = {
            code: cellCode,
            color: cellColor,
            downHours: cellDownHours,
            status: cellStatus,
            kondisi: cellKondisi
          };
        }

        const itemAvailability = totalMonthHours > 0
          ? Math.max(0, Math.min(100, ((totalMonthHours - itemDownHours) / totalMonthHours) * 100))
          : 100;

        groupTerputus += itemDownHours;
        totalAllTerputus += itemDownHours;

        formattedItems.push({
          no: i + 1,
          _id: String(item._id),
          namaPeralatan: item.namaPeralatan,
          lokasi: item.lokasi,
          merek: item.merek || '-',
          serialNumber: item.serialNumber || '-',
          tipePeralatan: item.tipePeralatan || '-',
          statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
          mainCategory: item.mainCategory,
          subCategory: item.subCategory || '',
          days: daysData,
          jmlJamTerputus: itemDownHours,
          jmlJamOpsBln: totalMonthHours,
          availability: parseFloat(itemAvailability.toFixed(1)),
          keterangan: itemDownHours > 0 ? `Terputus ${itemDownHours} Jam` : ''
        });
      }

      const groupAvailability = groupTotalHours > 0
        ? Math.max(0, Math.min(100, ((groupTotalHours - groupTerputus) / groupTotalHours) * 100))
        : 100;

      sumAvailability += groupAvailability;

      resultGroups.push({
        groupLetter,
        groupName,
        totalItems: items.length,
        availabilityFacility: parseFloat(groupAvailability.toFixed(1)),
        items: formattedItems
      });
    }

    const overallAvailability = resultGroups.length > 0
      ? parseFloat((sumAvailability / resultGroups.length).toFixed(1))
      : 100.0;

    res.json({
      bandarUdara: 'HALIM PERDANAKUSUMA',
      bulan,
      tahun,
      namaBulan,
      bulanTahun,
      daysInMonth,
      totalMonthHours,
      mainCategory,
      subCategory,
      totalPeralatan: totalAllPeralatan,
      totalTerputus: totalAllTerputus,
      overallAvailability,
      groups: resultGroups
    });
  } catch (error: any) {
    console.error('[EquipmentMonthly GET Error]:', error);
    res.status(500).json({ message: 'Gagal mengambil data laporan kondisi peralatan bulanan', error: error?.message });
  }
});

// POST sinkronisasi logs bulanan dari seluruh laporan harian yang ada di database
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const allReports = await Report.find({}).lean();
    // Bersihkan seluruh log lama sebelum sinkronisasi ulang dari laporan harian yang aktif
    await EquipmentMonthlyLog.deleteMany({});
    let totalLogsCreated = 0;
    let totalStandbySynced = 0;

    for (const rep of allReports) {
      if (!Array.isArray(rep.kondisiFasilitas) || rep.kondisiFasilitas.length === 0) continue;

      const dateInfo = parseIndonesianDate(rep.tanggal);
      const namaBulan = NAMA_BULAN[dateInfo.month - 1] || 'Oktober';
      const bulanTahun = `${namaBulan} ${dateInfo.year}`;
      const yearMonth = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}`;

      const logsToInsert: any[] = [];

      for (const item of rep.kondisiFasilitas) {
        if (!item.namaPeralatan) continue;

        logsToInsert.push({
          reportId: rep._id,
          equipmentId: item._id ? String(item._id) : '',
          namaPeralatan: item.namaPeralatan,
          lokasi: item.lokasi || '-',
          merek: item.merek || '-',
          serialNumber: item.serialNumber || item.snPeralatan || '-',
          nomorSertifikasi: item.nomorSertifikasi || '-',
          tipePeralatan: item.tipePeralatan || item.seriesPeralatan || '-',
          statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
          mainCategory: item.mainCategory || 'Faskampen',
          subCategory: item.subCategory || '',
          kondisi: item.kondisi || 'Normal',
          statusPeralatan: item.statusPeralatan || 'Ready',
          lokasiStatus: item.lokasiStatus || '',
          keteranganRusak: item.keteranganRusak || '',
          tanggal: rep.tanggal,
          dinas: rep.dinas || 'PAGI',
          bulanTahun,
          yearMonth,
          tahun: dateInfo.year,
          bulan: dateInfo.month,
          hari: dateInfo.day,
          checkedBy: rep.createdBy || ''
        });

        // Sinkronisasi: jika status Standby, masukkan ke StockEquipment jika belum ada
        if (item.statusPeralatan === 'Standby') {
          const snVal = item.serialNumber || item.snPeralatan;
          const existingStock = await StockEquipment.findOne({
            $or: [
              ...(item._id ? [{ equipmentMasterId: item._id }] : []),
              ...(snVal && snVal !== '-' ? [{ serialNumber: snVal }] : []),
              { namaPeralatan: item.namaPeralatan, lokasi: item.lokasi }
            ]
          });

          if (!existingStock) {
            await StockEquipment.create({
              namaPeralatan: item.namaPeralatan,
              lokasi: item.lokasi || '-',
              lokasiPenyimpanan: item.lokasiStatus || 'Gudang ELIT',
              merek: item.merek || '-',
              serialNumber: item.serialNumber || item.snPeralatan || '-',
              nomorSertifikasi: item.nomorSertifikasi || '-',
              tipePeralatan: item.tipePeralatan || item.seriesPeralatan || '-',
              statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
              mainCategory: item.mainCategory || 'Faskampen',
              subCategory: item.subCategory || '',
              kondisi: item.kondisi || 'Normal',
              statusPeralatan: 'Standby',
              keterangan: 'Otomatis tersinkronisasi dari laporan harian fasilitas',
              equipmentMasterId: item._id || null
            });
            totalStandbySynced++;
          }
        }
      }

      if (logsToInsert.length > 0) {
        await EquipmentMonthlyLog.insertMany(logsToInsert);
        totalLogsCreated += logsToInsert.length;
      }
    }

    res.json({
      message: `Sinkronisasi berhasil! ${totalLogsCreated} log kondisi peralatan bulanan dibuat, ${totalStandbySynced} unit Standby disinkron ke stock.`,
      totalReportsScanned: allReports.length,
      totalLogsCreated,
      totalStandbySynced
    });
  } catch (error: any) {
    console.error('[EquipmentMonthly Sync Error]:', error);
    res.status(500).json({ message: 'Gagal melakukan sinkronisasi data bulanan', error: error?.message });
  }
});

// Helper fungsi sinkronisasi langsung saat simpan laporan harian
export const syncKondisiFasilitasToMonthlyLog = async (
  reportId: any,
  tanggal: string,
  dinas: string,
  kondisiFasilitas: any[],
  createdBy: string = ''
) => {
  if (!Array.isArray(kondisiFasilitas) || kondisiFasilitas.length === 0) return;
  try {
    const dateInfo = parseIndonesianDate(tanggal);
    const namaBulan = NAMA_BULAN[dateInfo.month - 1] || 'Oktober';
    const bulanTahun = `${namaBulan} ${dateInfo.year}`;
    const yearMonth = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}`;

    await EquipmentMonthlyLog.deleteMany({ reportId });

    const logsToInsert: any[] = [];
    for (const item of kondisiFasilitas) {
      if (!item.namaPeralatan) continue;

      logsToInsert.push({
        reportId,
        equipmentId: item._id ? String(item._id) : '',
        namaPeralatan: item.namaPeralatan,
        lokasi: item.lokasi || '-',
        merek: item.merek || '-',
        serialNumber: item.serialNumber || item.snPeralatan || '-',
        nomorSertifikasi: item.nomorSertifikasi || '-',
        tipePeralatan: item.tipePeralatan || item.seriesPeralatan || '-',
        statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
        mainCategory: item.mainCategory || 'Faskampen',
        subCategory: item.subCategory || '',
        kondisi: item.kondisi || 'Normal',
        statusPeralatan: item.statusPeralatan || 'Ready',
        lokasiStatus: item.lokasiStatus || '',
        keteranganRusak: item.keteranganRusak || '',
        tanggal,
        dinas: dinas || 'PAGI',
        bulanTahun,
        yearMonth,
        tahun: dateInfo.year,
        bulan: dateInfo.month,
        hari: dateInfo.day,
        checkedBy: createdBy
      });

      // Jika status Standby, sinkronkan ke StockEquipment jika belum ada
      if (item.statusPeralatan === 'Standby') {
        const snVal = item.serialNumber || item.snPeralatan;
        const existingStock = await StockEquipment.findOne({
          $or: [
            ...(item._id ? [{ equipmentMasterId: item._id }] : []),
            ...(snVal && snVal !== '-' ? [{ serialNumber: snVal }] : []),
            { namaPeralatan: item.namaPeralatan, lokasi: item.lokasi }
          ]
        });

        if (!existingStock) {
          await StockEquipment.create({
            namaPeralatan: item.namaPeralatan,
            lokasi: item.lokasi || '-',
            lokasiPenyimpanan: item.lokasiStatus || 'Gudang ELIT',
            merek: item.merek || '-',
            serialNumber: item.serialNumber || item.snPeralatan || '-',
            nomorSertifikasi: item.nomorSertifikasi || '-',
            tipePeralatan: item.tipePeralatan || item.seriesPeralatan || '-',
            statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
            mainCategory: item.mainCategory || 'Faskampen',
            subCategory: item.subCategory || '',
            kondisi: item.kondisi || 'Normal',
            statusPeralatan: 'Standby',
            keterangan: 'Otomatis tersinkronisasi dari laporan harian fasilitas',
            equipmentMasterId: item._id || null
          });
        }
      }
    }

    if (logsToInsert.length > 0) {
      await EquipmentMonthlyLog.insertMany(logsToInsert);
    }
  } catch (err) {
    console.error('[syncKondisiFasilitasToMonthlyLog Error]:', err);
  }
};

export default router;
