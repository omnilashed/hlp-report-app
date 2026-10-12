import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import DamageReport from '../models/DamageReport';
import Equipment from '../models/Equipment';

const router = express.Router();

// GET semua laporan kerusakan & perbaikan
router.get('/', async (req: Request, res: Response) => {
  try {
    const { equipmentId, statusLaporan, search } = req.query;
    const filter: any = {};

    if (equipmentId) {
      filter.equipmentId = String(equipmentId);
    }
    if (statusLaporan && statusLaporan !== 'Semua') {
      filter.statusLaporan = statusLaporan;
    }
    if (search && String(search).trim() !== '') {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { reportCode: regex },
        { repairReportCode: regex },
        { peralatan: regex },
        { lokasi: regex },
        { fasilitas: regex },
        { bagian: regex },
        { penyebab: regex }
      ];
    }

    const reports = await DamageReport.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error: any) {
    console.error('[DamageReport GET Error]:', error);
    res.status(500).json({ message: 'Gagal mengambil data laporan kerusakan', error: error?.message });
  }
});

// GET detail 1 laporan kerusakan berdasarkan ID atau reportCode
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    let report = null;
    if (mongoose.Types.ObjectId.isValid(idParam)) {
      report = await DamageReport.findById(idParam);
    }
    if (!report) {
      report = await DamageReport.findOne({
        $or: [{ reportCode: idParam }, { repairReportCode: idParam }]
      });
    }
    if (!report) {
      return res.status(404).json({ message: 'Laporan kerusakan tidak ditemukan' });
    }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil detail laporan kerusakan', error: error?.message });
  }
});

// Helper filter pencarian peralatan untuk semua format _id (ObjectId, string, $oid, atau namaPeralatan + lokasi)
const buildEquipmentFilter = (eqId?: string, namaPeralatan?: string, lokasi?: string) => {
  const orConditions: any[] = [];
  if (eqId && String(eqId).trim() !== '') {
    const clean = String(eqId).trim();
    if (mongoose.Types.ObjectId.isValid(clean)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(clean) });
    }
    orConditions.push({ _id: clean });
    orConditions.push({ '_id.$oid': clean });
  }
  if (namaPeralatan && lokasi) {
    orConditions.push({ namaPeralatan: String(namaPeralatan).trim(), lokasi: String(lokasi).trim() });
  }
  return orConditions.length > 0 ? { $or: orConditions } : null;
};

// POST buat laporan kerusakan baru (mendukung pembuatan berulang jika peralatan rusak kembali setelah diperbaiki)
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.reportCode || !body.peralatan || !body.lokasi) {
      return res.status(400).json({ message: 'Report Code, Nama Peralatan, dan Lokasi wajib diisi!' });
    }

    const newReport = await DamageReport.create({
      ...body,
      statusLaporan: body.statusLaporan || 'Open'
    });

    // Sinkronkan peralatan di Data Master menjadi Rusak / Damaged jika belum
    const filterEq = buildEquipmentFilter(body.equipmentId, body.peralatan, body.lokasi);
    if (filterEq) {
      const existingEq: any = await Equipment.collection.findOne(filterEq);
      if (existingEq) {
        const nextStatus =
          existingEq.statusPeralatan === 'Maintenance' ? 'Maintenance' : 'Damaged';
        await Equipment.collection.updateOne(
          { _id: existingEq._id },
          {
            $set: {
              kondisi: 'Rusak',
              statusPeralatan: nextStatus,
              lokasiStatus: existingEq.lokasiStatus || body.lokasi,
              keteranganRusak: body.uraian || existingEq.keteranganRusak || 'Dilaporkan rusak',
              updatedAt: new Date()
            }
          }
        );
      }
    }

    res.status(201).json(newReport);
  } catch (error: any) {
    console.error('[DamageReport POST Error]:', error);
    res.status(500).json({ message: 'Gagal membuat laporan kerusakan', error: error?.message });
  }
});

// PUT update laporan kerusakan atau simpan tindak lanjut Laporan Perbaikan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { updateEquipmentToReady, ...updateFields } = req.body;

    const updated = await DamageReport.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(idParam) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Laporan kerusakan tidak ditemukan' });
    }

    // Jika dari Laporan Perbaikan diminta mengembalikan status peralatan ke Ready & Normal di Data Master
    if (updateEquipmentToReady) {
      const filterEq = buildEquipmentFilter(updated.equipmentId, updated.peralatan, updated.lokasi);
      if (filterEq) {
        const existingEq: any = await Equipment.collection.findOne(filterEq);
        if (existingEq) {
          await Equipment.collection.updateOne(
            { _id: existingEq._id },
            {
              $set: {
                kondisi: 'Normal',
                statusPeralatan: 'Ready',
                lokasiStatus: '',
                keteranganRusak: '',
                updatedAt: new Date()
              }
            }
          );
        }
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('[DamageReport PUT Error]:', error);
    res.status(500).json({ message: 'Gagal memperbarui laporan', error: error?.message });
  }
});

// DELETE hapus laporan kerusakan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await DamageReport.findByIdAndDelete(idParam);
    if (!deleted) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' });
    }
    res.json({ message: 'Laporan berhasil dihapus', data: deleted });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal menghapus laporan', error: error?.message });
  }
});

export default router;
