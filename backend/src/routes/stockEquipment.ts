import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import StockEquipment from '../models/StockEquipment';
import Equipment from '../models/Equipment';

const router = express.Router();

// Helper untuk normalisasi dokumen stock
const normalizeStockDoc = (doc: any) => {
  if (!doc) return doc;
  const rawId = doc._id && typeof doc._id === 'object' && doc._id.$oid
    ? String(doc._id.$oid)
    : String(doc._id);

  return {
    ...doc,
    _id: rawId,
    namaPeralatan: doc.namaPeralatan || '',
    lokasi: doc.lokasi || '-',
    lokasiPenyimpanan: doc.lokasiPenyimpanan || 'Gudang ELIT',
    merek: doc.merek || '-',
    serialNumber: doc.serialNumber || '-',
    nomorSertifikasi: doc.nomorSertifikasi || '-',
    tipePeralatan: doc.tipePeralatan || '-',
    statusKepemilikan: doc.statusKepemilikan || 'Inventaris API',
    mainCategory: doc.mainCategory || 'Faskampen',
    subCategory: doc.subCategory || '',
    kondisi: doc.kondisi || 'Normal',
    statusPeralatan: doc.statusPeralatan || 'Standby',
    keterangan: doc.keterangan || ''
  };
};

// GET semua stock peralatan (mendukung filter category, status, search)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mainCategory, subCategory, statusPeralatan, kondisi, search } = req.query;

    const filter: any = {};
    if (mainCategory && mainCategory !== 'Semua') {
      filter.mainCategory = mainCategory;
    }
    if (subCategory && subCategory !== 'Semua') {
      filter.subCategory = subCategory;
    }
    if (statusPeralatan && statusPeralatan !== 'Semua') {
      filter.statusPeralatan = statusPeralatan;
    }
    if (kondisi && kondisi !== 'Semua') {
      filter.kondisi = kondisi;
    }
    if (search && String(search).trim() !== '') {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { namaPeralatan: regex },
        { lokasi: regex },
        { lokasiPenyimpanan: regex },
        { merek: regex },
        { serialNumber: regex },
        { tipePeralatan: regex },
        { nomorSertifikasi: regex },
        { keterangan: regex }
      ];
    }

    const stocks = await StockEquipment.find(filter)
      .sort({ mainCategory: 1, subCategory: 1, namaPeralatan: 1, createdAt: -1 })
      .lean();

    res.json(stocks.map(normalizeStockDoc));
  } catch (error: any) {
    console.error('[Stock GET Error]:', error);
    res.status(500).json({ message: 'Gagal mengambil data stock peralatan', error: error?.message });
  }
});

// POST tambah data stock baru
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      namaPeralatan,
      lokasi,
      lokasiPenyimpanan,
      merek,
      serialNumber,
      nomorSertifikasi,
      tipePeralatan,
      statusKepemilikan,
      mainCategory,
      subCategory,
      kondisi,
      statusPeralatan,
      keterangan
    } = req.body;

    if (!namaPeralatan || !String(namaPeralatan).trim() || !lokasiPenyimpanan || !String(lokasiPenyimpanan).trim() || !mainCategory) {
      return res.status(400).json({ message: 'Nama peralatan, lokasi penyimpanan spesifik, dan kategori utama wajib diisi!' });
    }

    const payload: any = {
      namaPeralatan: String(namaPeralatan).trim(),
      lokasi: lokasi && String(lokasi).trim() !== '' ? String(lokasi).trim() : '-',
      lokasiPenyimpanan: String(lokasiPenyimpanan).trim(),
      merek: merek && String(merek).trim() !== '' ? String(merek).trim() : '-',
      serialNumber: serialNumber && String(serialNumber).trim() !== '' ? String(serialNumber).trim() : '-',
      nomorSertifikasi: nomorSertifikasi && String(nomorSertifikasi).trim() !== '' ? String(nomorSertifikasi).trim() : '-',
      tipePeralatan: tipePeralatan && String(tipePeralatan).trim() !== '' ? String(tipePeralatan).trim() : '-',
      statusKepemilikan: statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API',
      mainCategory,
      subCategory: mainCategory === 'Elban' ? (subCategory || '') : '',
      kondisi: kondisi || 'Normal',
      statusPeralatan: statusPeralatan || 'Standby',
      keterangan: keterangan ? String(keterangan).trim() : ''
    };

    // Jika status langsung diset Ready saat tambah stock, masukkan juga ke Data Master
    if (payload.statusPeralatan === 'Ready') {
      const masterEquipment = new Equipment({
        namaPeralatan: payload.namaPeralatan,
        lokasi: payload.lokasi !== '-' ? payload.lokasi : payload.lokasiPenyimpanan,
        merek: payload.merek,
        serialNumber: payload.serialNumber,
        nomorSertifikasi: payload.nomorSertifikasi,
        tipePeralatan: payload.tipePeralatan,
        statusKepemilikan: payload.statusKepemilikan,
        mainCategory: payload.mainCategory,
        subCategory: payload.subCategory,
        kondisi: payload.kondisi,
        statusPeralatan: 'Ready',
        lokasiStatus: ''
      });
      await masterEquipment.save();
      payload.equipmentMasterId = masterEquipment._id;
    }

    const newStock = await StockEquipment.create(payload);
    res.status(201).json(normalizeStockDoc(newStock.toObject()));
  } catch (error: any) {
    console.error('[Stock POST Error]:', error);
    res.status(500).json({ message: 'Gagal menambahkan data stock peralatan', error: error?.message });
  }
});

// PUT update data stock peralatan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const stockId = req.params.id;
    const stock = await StockEquipment.findById(stockId);
    if (!stock) {
      return res.status(404).json({ message: 'Data stock tidak ditemukan' });
    }

    const {
      namaPeralatan,
      lokasi,
      lokasiPenyimpanan,
      merek,
      serialNumber,
      nomorSertifikasi,
      tipePeralatan,
      statusKepemilikan,
      mainCategory,
      subCategory,
      kondisi,
      statusPeralatan,
      keterangan
    } = req.body;

    if (namaPeralatan !== undefined) stock.namaPeralatan = String(namaPeralatan).trim();
    if (lokasi !== undefined) stock.lokasi = String(lokasi).trim();
    if (lokasiPenyimpanan !== undefined) stock.lokasiPenyimpanan = String(lokasiPenyimpanan).trim();
    if (merek !== undefined) stock.merek = String(merek).trim() || '-';
    if (serialNumber !== undefined) stock.serialNumber = String(serialNumber).trim() || '-';
    if (nomorSertifikasi !== undefined) stock.nomorSertifikasi = String(nomorSertifikasi).trim() || '-';
    if (tipePeralatan !== undefined) stock.tipePeralatan = String(tipePeralatan).trim() || '-';
    if (statusKepemilikan !== undefined) stock.statusKepemilikan = statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API';
    if (mainCategory !== undefined) stock.mainCategory = mainCategory;
    if (subCategory !== undefined) stock.subCategory = subCategory;
    if (kondisi !== undefined) stock.kondisi = kondisi;
    if (keterangan !== undefined) stock.keterangan = String(keterangan).trim();

    // Integrasi: Jika status berubah menjadi 'Ready', otomatis sinkron/masuk ke Data Master Fasilitas
    const previousStatus = stock.statusPeralatan;
    if (statusPeralatan !== undefined) {
      stock.statusPeralatan = statusPeralatan;

      if (statusPeralatan === 'Ready' && previousStatus !== 'Ready') {
        // Buat atau update di Data Master Fasilitas
        const targetLokasi = stock.lokasi && stock.lokasi !== '-' ? stock.lokasi : stock.lokasiPenyimpanan;
        const masterItem = await Equipment.findOneAndUpdate(
          {
            $or: [
              ...(stock.equipmentMasterId ? [{ _id: stock.equipmentMasterId }] : []),
              ...(stock.serialNumber && stock.serialNumber !== '-' ? [{ serialNumber: stock.serialNumber }] : []),
              { namaPeralatan: stock.namaPeralatan, lokasi: targetLokasi }
            ]
          },
          {
            $set: {
              namaPeralatan: stock.namaPeralatan,
              lokasi: targetLokasi,
              merek: stock.merek,
              serialNumber: stock.serialNumber,
              nomorSertifikasi: stock.nomorSertifikasi,
              tipePeralatan: stock.tipePeralatan,
              statusKepemilikan: stock.statusKepemilikan,
              mainCategory: stock.mainCategory,
              subCategory: stock.subCategory,
              kondisi: stock.kondisi,
              statusPeralatan: 'Ready',
              lokasiStatus: ''
            }
          },
          { upsert: true, new: true }
        );
        stock.equipmentMasterId = masterItem._id as any;
      }
    }

    await stock.save();
    res.json(normalizeStockDoc(stock.toObject()));
  } catch (error: any) {
    console.error('[Stock PUT Error]:', error);
    res.status(500).json({ message: 'Gagal memperbarui data stock', error: error?.message });
  }
});

// POST Deploy / Pindahkan Stock ke Data Master Fasilitas dengan status Ready
router.post('/:id/deploy', async (req: Request, res: Response) => {
  try {
    const stockId = req.params.id;
    const { targetLokasi, keteranganDeploy } = req.body;

    const stock = await StockEquipment.findById(stockId);
    if (!stock) {
      return res.status(404).json({ message: 'Data stock tidak ditemukan' });
    }

    if (!targetLokasi || !String(targetLokasi).trim()) {
      return res.status(400).json({ message: 'Lokasi operasional tujuan di lapangan wajib diisi!' });
    }

    const cleanLokasi = String(targetLokasi).trim();

    // Buat atau update di Data Master Fasilitas dengan status 'Ready'
    const deployedMaster = await Equipment.findOneAndUpdate(
      {
        $or: [
          ...(stock.equipmentMasterId ? [{ _id: stock.equipmentMasterId }] : []),
          ...(stock.serialNumber && stock.serialNumber !== '-' ? [{ serialNumber: stock.serialNumber }] : []),
          { namaPeralatan: stock.namaPeralatan, lokasi: cleanLokasi }
        ]
      },
      {
        $set: {
          namaPeralatan: stock.namaPeralatan,
          lokasi: cleanLokasi,
          merek: stock.merek,
          serialNumber: stock.serialNumber,
          nomorSertifikasi: stock.nomorSertifikasi,
          tipePeralatan: stock.tipePeralatan,
          statusKepemilikan: stock.statusKepemilikan,
          mainCategory: stock.mainCategory,
          subCategory: stock.subCategory,
          kondisi: stock.kondisi,
          statusPeralatan: 'Ready',
          lokasiStatus: ''
        }
      },
      { upsert: true, new: true }
    );

    // Update status di stock menjadi Ready & simpan riwayat deploy
    stock.statusPeralatan = 'Ready';
    stock.lokasi = cleanLokasi;
    stock.equipmentMasterId = deployedMaster._id as any;
    if (keteranganDeploy) {
      stock.keterangan = `[Deploy ke ${cleanLokasi}: ${new Date().toLocaleDateString('id-ID')}] ${stock.keterangan || ''}`;
    }
    await stock.save();

    res.json({
      message: `Peralatan berhasil diaktifkan ke Data Master Fasilitas di lokasi ${cleanLokasi}!`,
      stock: normalizeStockDoc(stock.toObject()),
      masterEquipment: deployedMaster
    });
  } catch (error: any) {
    console.error('[Stock Deploy Error]:', error);
    res.status(500).json({ message: 'Gagal memindahkan stock ke Data Master', error: error?.message });
  }
});

// DELETE hapus data stock
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await StockEquipment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Data stock tidak ditemukan' });
    }
    res.json({ message: 'Data stock berhasil dihapus', id: req.params.id });
  } catch (error: any) {
    console.error('[Stock DELETE Error]:', error);
    res.status(500).json({ message: 'Gagal menghapus data stock', error: error?.message });
  }
});

// POST Sinkronisasi peralatan berstatus 'Standby' dari Data Master ke Stock
router.post('/sync-from-master', async (_req: Request, res: Response) => {
  try {
    const standbyMasters = await Equipment.find({ statusPeralatan: 'Standby' }).lean();
    let syncedCount = 0;

    for (const master of standbyMasters) {
      const existingStock = await StockEquipment.findOne({
        $or: [
          { equipmentMasterId: master._id },
          ...(master.serialNumber && master.serialNumber !== '-' ? [{ serialNumber: master.serialNumber }] : []),
          { namaPeralatan: master.namaPeralatan, lokasi: master.lokasi }
        ]
      });

      if (!existingStock) {
        await StockEquipment.create({
          namaPeralatan: master.namaPeralatan,
          lokasi: master.lokasi || '-',
          lokasiPenyimpanan: master.lokasiStatus || 'Gudang ELIT',
          merek: master.merek || '-',
          serialNumber: master.serialNumber || '-',
          nomorSertifikasi: master.nomorSertifikasi || '-',
          tipePeralatan: master.tipePeralatan || '-',
          statusKepemilikan: master.statusKepemilikan || 'Inventaris API',
          mainCategory: master.mainCategory,
          subCategory: master.subCategory || '',
          kondisi: master.kondisi || 'Normal',
          statusPeralatan: 'Standby',
          keterangan: 'Otomatis ditarik dari Data Master Fasilitas (Status: Standby)',
          equipmentMasterId: master._id
        });
        syncedCount++;
      }
    }

    res.json({ message: `Sinkronisasi berhasil! ${syncedCount} unit Standby dimasukkan ke Stock.`, syncedCount });
  } catch (error: any) {
    console.error('[Stock Sync Error]:', error);
    res.status(500).json({ message: 'Gagal melakukan sinkronisasi dari Data Master', error: error?.message });
  }
});

export default router;
