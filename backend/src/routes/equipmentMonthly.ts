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
    const tahun = parseInt(req.query.tahun as string, 10) || now.getFullYear();
    const bulan = parseInt(req.query.bulan as string, 10) || (now.getMonth() + 1);
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

    // Ambil logs harian yang tercatat di bulan ini
    const logs = await EquipmentMonthlyLog.find({ tahun, bulan }).lean();

    // Ambil data laporan kerusakan di bulan ini untuk mengidentifikasi jam terputus jika ada
    const damageReports = await DamageReport.find({}).lean();

    // Map logs berdasarkan key: `${namaPeralatan}__${lokasi}__${day}`
    const logMap: Record<string, any[]> = {};
    for (const lg of logs) {
      const key = `${lg.namaPeralatan.toLowerCase().trim()}__${lg.lokasi.toLowerCase().trim()}__${lg.hari}`;
      if (!logMap[key]) logMap[key] = [];
      logMap[key].push(lg);
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
          const logKey = `${item.namaPeralatan.toLowerCase().trim()}__${item.lokasi.toLowerCase().trim()}__${d}`;
          const dayLogs = logMap[logKey] || [];

          // Status & kondisi hari ini (ambil yang terbaru pada hari tersebut)
          let cellCode = '0'; // default Normal / Ready (0 jam terputus)
          let cellColor = 'green';
          let cellDownHours = 0;
          let cellStatus = item.statusPeralatan || 'Ready';
          let cellKondisi = item.kondisi || 'Normal';

          if (dayLogs.length > 0) {
            const latestLog = dayLogs[dayLogs.length - 1];
            cellStatus = latestLog.statusPeralatan || cellStatus;
            cellKondisi = latestLog.kondisi || cellKondisi;
          }

          // Cek apakah ada laporan kerusakan aktif pada peralatan & hari ini
          const matchingDamage = damageReports.find(dr => {
            const drDate = parseIndonesianDate(dr.tglKerusakan || dr.tanggal);
            const drName = (dr.peralatan || '').toLowerCase().trim();
            const drLoc = (dr.lokasi || '').toLowerCase().trim();
            return drDate.year === tahun && drDate.month === bulan && drDate.day === d &&
                   drName === item.namaPeralatan.toLowerCase().trim() &&
                   (drLoc === item.lokasi.toLowerCase().trim() || !drLoc);
          });

          if (cellStatus === 'Standby') {
            cellCode = '-';
            cellColor = 'yellow';
            cellDownHours = 0;
          } else if (cellStatus === 'Damaged' || cellKondisi === 'Rusak' || matchingDamage) {
            cellCode = 'X';
            cellColor = 'red';
            // Hitung jam terputus hari ini (default 24 jam per hari jika damaged penuh, atau dari laporan)
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
            // Normal / Ready
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
    let totalLogsCreated = 0;
    let totalStandbySynced = 0;

    for (const rep of allReports) {
      if (!Array.isArray(rep.kondisiFasilitas) || rep.kondisiFasilitas.length === 0) continue;

      const dateInfo = parseIndonesianDate(rep.tanggal);
      const namaBulan = NAMA_BULAN[dateInfo.month - 1] || 'Oktober';
      const bulanTahun = `${namaBulan} ${dateInfo.year}`;
      const yearMonth = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}`;

      // Hapus log lama untuk report ini jika ada agar tidak duplikat
      await EquipmentMonthlyLog.deleteMany({ reportId: rep._id });

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
