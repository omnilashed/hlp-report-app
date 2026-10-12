import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Equipment from '../models/Equipment';
import StockEquipment from '../models/StockEquipment';

const router = express.Router();

let isInitialized = false;

// Normalisasi dokumen agar _id selalu string dan field kondisi & statusPeralatan selalu terisi
const normalizeEquipmentDoc = (doc: any) => {
  if (!doc) return doc;
  const rawId = doc._id && typeof doc._id === 'object' && doc._id.$oid
    ? String(doc._id.$oid)
    : String(doc._id);

  return {
    ...doc,
    _id: rawId,
    namaPeralatan: doc.namaPeralatan || '',
    lokasi: doc.lokasi || '',
    merek: doc.merek || '-',
    serialNumber: doc.serialNumber || doc.snPeralatan || '-',
    nomorSertifikasi: doc.nomorSertifikasi || '-',
    tipePeralatan: doc.tipePeralatan || doc.seriesPeralatan || '-',
    statusKepemilikan: doc.statusKepemilikan || 'Inventaris API',
    mainCategory: doc.mainCategory || 'Faskampen',
    subCategory: doc.mainCategory === 'Elban' ? (doc.subCategory || 'Fasilitas IT') : '',
    kondisi: doc.kondisi || 'Normal',
    statusPeralatan: doc.statusPeralatan || 'Ready',
    lokasiStatus: doc.lokasiStatus || '',
    keteranganRusak: doc.keteranganRusak || ''
  };
};

// Auto-seed dari test.equipment.json jika kosong & pastikan seluruh data memiliki kondisi='Normal' dan statusPeralatan='Ready'
const ensureSeededAndMigrated = async () => {
  if (isInitialized) return;
  try {
    const count = await Equipment.collection.countDocuments();
    if (count === 0) {
      const jsonPath = path.resolve(__dirname, '../../../test.equipment.json');
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const docs = items.map((item: any) => {
            const oid = item._id?.$oid;
            return {
              ...(oid && mongoose.Types.ObjectId.isValid(oid) ? { _id: new mongoose.Types.ObjectId(oid) } : {}),
              namaPeralatan: item.namaPeralatan,
              lokasi: item.lokasi,
              merek: item.merek || '-',
              serialNumber: item.serialNumber || item.snPeralatan || '-',
              nomorSertifikasi: item.nomorSertifikasi || '-',
              tipePeralatan: item.tipePeralatan || item.seriesPeralatan || '-',
              statusKepemilikan: item.statusKepemilikan || 'Inventaris API',
              mainCategory: item.mainCategory,
              ...(item.mainCategory === 'Elban' && item.subCategory ? { subCategory: item.subCategory } : {}),
              kondisi: item.kondisi || 'Normal',
              statusPeralatan: item.statusPeralatan || 'Ready',
              lokasiStatus: item.lokasiStatus || '',
              keteranganRusak: item.keteranganRusak || '',
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });
          await Equipment.collection.insertMany(docs, { ordered: false });
          console.log(`[Equipment] Berhasil memuat ${docs.length} data master dari test.equipment.json`);
        }
      }
    } else {
      // Pastikan semua data yang belum memiliki kondisi diisi 'Normal' dan statusPeralatan diisi 'Ready'
      await Equipment.collection.updateMany(
        { $or: [{ kondisi: { $exists: false } }, { kondisi: null }, { kondisi: '' }] },
        { $set: { kondisi: 'Normal', keteranganRusak: '' } }
      );
      await Equipment.collection.updateMany(
        { $or: [{ statusPeralatan: { $exists: false } }, { statusPeralatan: null }, { statusPeralatan: '' }] },
        { $set: { statusPeralatan: 'Ready', lokasiStatus: '' } }
      );
      // Migrasi kolom baru: serialNumber, nomorSertifikasi, tipePeralatan, statusKepemilikan
      await Equipment.collection.updateMany(
        { $or: [{ statusKepemilikan: { $exists: false } }, { statusKepemilikan: null }, { statusKepemilikan: '' }] },
        { $set: { statusKepemilikan: 'Inventaris API' } }
      );
      await Equipment.collection.updateMany(
        { $or: [{ serialNumber: { $exists: false } }, { serialNumber: null }] },
        { $set: { serialNumber: '-' } }
      );
      await Equipment.collection.updateMany(
        { $or: [{ nomorSertifikasi: { $exists: false } }, { nomorSertifikasi: null }] },
        { $set: { nomorSertifikasi: '-' } }
      );
      await Equipment.collection.updateMany(
        { $or: [{ tipePeralatan: { $exists: false } }, { tipePeralatan: null }] },
        { $set: { tipePeralatan: '-' } }
      );
    }
    isInitialized = true;
  } catch (err) {
    console.error('[Equipment] Auto-seed / migration info:', err);
  }
};

// Helper mencari filter yang cocok untuk dokumen di MongoDB (mendukung ObjectId, String _id, $oid, maupun fallback namaPeralatan+lokasi)
const buildFindFilter = async (idParam: string, fallbackNama?: string, fallbackLokasi?: string) => {
  const cleanId = String(idParam || '').trim();

  if (cleanId && cleanId !== '[object Object]' && cleanId !== 'undefined') {
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      const byObjId = await Equipment.collection.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
      if (byObjId) return { _id: byObjId._id };
    }

    const byStrId = await Equipment.collection.findOne({ _id: cleanId as any });
    if (byStrId) return { _id: byStrId._id };

    const byOidField = await Equipment.collection.findOne({ '_id.$oid': cleanId } as any);
    if (byOidField) return { _id: byOidField._id };
  }

  if (fallbackNama && fallbackLokasi) {
    const byNameLoc = await Equipment.collection.findOne({
      namaPeralatan: String(fallbackNama).trim(),
      lokasi: String(fallbackLokasi).trim()
    });
    if (byNameLoc) return { _id: byNameLoc._id };
  }

  return null;
};

// GET semua data fasilitas (mendukung filter mainCategory, subCategory, merek, kondisi, statusPeralatan, dan search)
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureSeededAndMigrated();

    const { mainCategory, subCategory, merek, kondisi, statusPeralatan, search } = req.query;

    const filter: any = {};
    if (mainCategory && mainCategory !== 'Semua') {
      filter.mainCategory = mainCategory;
    }
    if (subCategory && subCategory !== 'Semua') {
      filter.subCategory = subCategory;
    }
    if (merek && merek !== 'Semua') {
      filter.merek = merek;
    }
    if (kondisi && kondisi !== 'Semua') {
      filter.kondisi = kondisi;
    }
    if (statusPeralatan && statusPeralatan !== 'Semua') {
      filter.statusPeralatan = statusPeralatan;
    }
    if (search && String(search).trim() !== '') {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { namaPeralatan: regex },
        { lokasi: regex },
        { merek: regex },
        { serialNumber: regex },
        { nomorSertifikasi: regex },
        { tipePeralatan: regex },
        { statusKepemilikan: regex },
        { mainCategory: regex },
        { subCategory: regex },
        { statusPeralatan: regex },
        { lokasiStatus: regex }
      ];
    }

    const rawEquipments = await Equipment.collection
      .find(filter)
      .sort({ mainCategory: 1, subCategory: 1, namaPeralatan: 1, lokasi: 1 })
      .toArray();

    const equipments = rawEquipments.map(normalizeEquipmentDoc);
    res.json(equipments);
  } catch (error) {
    console.error('[Equipment GET Error]:', error);
    res.status(500).json({ message: 'Gagal mengambil data fasilitas' });
  }
});

// POST tambah data master fasilitas baru
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      namaPeralatan,
      lokasi,
      merek,
      serialNumber,
      nomorSertifikasi,
      tipePeralatan,
      statusKepemilikan,
      mainCategory,
      subCategory,
      kondisi,
      statusPeralatan,
      lokasiStatus,
      keteranganRusak
    } = req.body;

    if (!namaPeralatan || !String(namaPeralatan).trim() || !lokasi || !String(lokasi).trim() || !mainCategory) {
      return res.status(400).json({ message: 'Nama peralatan, lokasi, dan kategori utama wajib diisi!' });
    }

    if (mainCategory === 'Elban' && !subCategory) {
      return res.status(400).json({ message: 'Sub kategori wajib dipilih untuk kategori Elban!' });
    }

    const finalStatus = statusPeralatan || 'Ready';
    if (['Standby', 'Damaged', 'Maintenance'].includes(finalStatus) && (!lokasiStatus || !String(lokasiStatus).trim())) {
      return res.status(400).json({
        message: `Lokasi ${finalStatus} wajib diisi ketika status peralatan adalah ${finalStatus}!`
      });
    }

    const finalKondisi = kondisi || (finalStatus === 'Damaged' ? 'Rusak' : 'Normal');

    const payload: any = {
      namaPeralatan: String(namaPeralatan).trim(),
      lokasi: String(lokasi).trim(),
      merek: merek && String(merek).trim() !== '' ? String(merek).trim() : '-',
      serialNumber: serialNumber && String(serialNumber).trim() !== '' ? String(serialNumber).trim() : '-',
      nomorSertifikasi: nomorSertifikasi && String(nomorSertifikasi).trim() !== '' ? String(nomorSertifikasi).trim() : '-',
      tipePeralatan: tipePeralatan && String(tipePeralatan).trim() !== '' ? String(tipePeralatan).trim() : '-',
      statusKepemilikan: statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API',
      mainCategory,
      kondisi: finalKondisi,
      statusPeralatan: finalStatus,
      lokasiStatus: finalStatus === 'Ready' ? '' : String(lokasiStatus || '').trim(),
      keteranganRusak: finalKondisi === 'Rusak' ? String(keteranganRusak || '').trim() : ''
    };

    if (mainCategory === 'Elban') {
      payload.subCategory = subCategory;
    }

    const newEquipment = await Equipment.create(payload);
    res.status(201).json(normalizeEquipmentDoc(newEquipment.toObject()));
  } catch (error: any) {
    console.error('[Equipment POST Error]:', error);
    res.status(500).json({ message: 'Gagal menambahkan data fasilitas', error: error?.message });
  }
});

// PUT update data master fasilitas berdasarkan ID
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const {
      namaPeralatan,
      lokasi,
      merek,
      serialNumber,
      nomorSertifikasi,
      tipePeralatan,
      statusKepemilikan,
      mainCategory,
      subCategory,
      kondisi,
      statusPeralatan,
      lokasiStatus,
      keteranganRusak,
      oldNamaPeralatan,
      oldLokasi,
      normal,
      rusak
    } = req.body;

    const matchFilter = await buildFindFilter(
      idParam,
      oldNamaPeralatan || namaPeralatan,
      oldLokasi || lokasi
    );

    if (!matchFilter) {
      return res.status(404).json({ message: 'Data fasilitas tidak ditemukan di database' });
    }

    const updateData: any = { updatedAt: new Date() };
    const unsetData: any = {};

    if (namaPeralatan !== undefined) updateData.namaPeralatan = String(namaPeralatan).trim();
    if (lokasi !== undefined) updateData.lokasi = String(lokasi).trim();
    if (merek !== undefined) updateData.merek = String(merek).trim() !== '' ? String(merek).trim() : '-';
    if (serialNumber !== undefined) updateData.serialNumber = String(serialNumber).trim() !== '' ? String(serialNumber).trim() : '-';
    if (nomorSertifikasi !== undefined) updateData.nomorSertifikasi = String(nomorSertifikasi).trim() !== '' ? String(nomorSertifikasi).trim() : '-';
    if (tipePeralatan !== undefined) updateData.tipePeralatan = String(tipePeralatan).trim() !== '' ? String(tipePeralatan).trim() : '-';
    if (statusKepemilikan !== undefined) updateData.statusKepemilikan = statusKepemilikan === 'Sewa' ? 'Sewa' : 'Inventaris API';

    if (mainCategory !== undefined) {
      updateData.mainCategory = mainCategory;
      if (mainCategory === 'Faskampen') {
        unsetData.subCategory = '';
      } else if (mainCategory === 'Elban' && subCategory) {
        updateData.subCategory = subCategory;
      }
    } else if (subCategory !== undefined) {
      updateData.subCategory = subCategory;
    }

    if (kondisi !== undefined) {
      updateData.kondisi = kondisi;
      if (kondisi === 'Normal' && keteranganRusak === undefined) {
        updateData.keteranganRusak = '';
      }
    }

    if (keteranganRusak !== undefined) {
      updateData.keteranganRusak = String(keteranganRusak).trim();
    }

    if (statusPeralatan !== undefined) {
      if (['Standby', 'Damaged', 'Maintenance'].includes(statusPeralatan)) {
        const locVal = lokasiStatus !== undefined ? String(lokasiStatus).trim() : '';
        if (!locVal) {
          return res.status(400).json({
            message: `Lokasi ${statusPeralatan} wajib diisi ketika status peralatan diubah menjadi ${statusPeralatan}!`
          });
        }
        updateData.lokasiStatus = locVal;
      } else if (statusPeralatan === 'Ready') {
        updateData.lokasiStatus = '';
      }
      updateData.statusPeralatan = statusPeralatan;
    } else if (lokasiStatus !== undefined) {
      updateData.lokasiStatus = String(lokasiStatus).trim();
    }

    if (normal !== undefined && rusak !== undefined) {
      updateData.normal = Number(normal);
      updateData.rusak = Number(rusak);
      updateData.total = Number(normal) + Number(rusak);
    }

    const updateQuery: any = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    const updateResult = await Equipment.collection.findOneAndUpdate(
      matchFilter,
      updateQuery,
      { returnDocument: 'after' }
    );

    const updatedDoc = updateResult && (updateResult as any).value !== undefined
      ? (updateResult as any).value
      : updateResult;

    const finalDoc = updatedDoc || (await Equipment.collection.findOne(matchFilter));
    if (!finalDoc) {
      return res.status(404).json({ message: 'Data fasilitas tidak ditemukan setelah pembaruan' });
    }

    // Sinkronisasi otomatis: Jika status menjadi Standby, masukkan ke StockEquipment
    if (finalDoc.statusPeralatan === 'Standby') {
      try {
        await StockEquipment.findOneAndUpdate(
          {
            $or: [
              { equipmentMasterId: finalDoc._id },
              ...(finalDoc.serialNumber && finalDoc.serialNumber !== '-' ? [{ serialNumber: finalDoc.serialNumber }] : []),
              { namaPeralatan: finalDoc.namaPeralatan, lokasi: finalDoc.lokasi }
            ]
          },
          {
            $set: {
              namaPeralatan: finalDoc.namaPeralatan,
              lokasi: finalDoc.lokasi || '-',
              lokasiPenyimpanan: finalDoc.lokasiStatus || 'Gudang ELIT',
              merek: finalDoc.merek || '-',
              serialNumber: finalDoc.serialNumber || '-',
              nomorSertifikasi: finalDoc.nomorSertifikasi || '-',
              tipePeralatan: finalDoc.tipePeralatan || '-',
              statusKepemilikan: finalDoc.statusKepemilikan || 'Inventaris API',
              mainCategory: finalDoc.mainCategory || 'Faskampen',
              subCategory: finalDoc.subCategory || '',
              kondisi: finalDoc.kondisi || 'Normal',
              statusPeralatan: 'Standby',
              equipmentMasterId: finalDoc._id
            }
          },
          { upsert: true, new: true }
        );
      } catch (syncErr) {
        console.error('[Equipment PUT Sync to Stock Error]:', syncErr);
      }
    }

    return res.json(normalizeEquipmentDoc(finalDoc));
  } catch (error: any) {
    console.error('[Equipment PUT Error]:', error);
    res.status(500).json({ message: 'Gagal memperbarui data fasilitas', error: error?.message });
  }
});

// DELETE hapus data master fasilitas berdasarkan ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { namaPeralatan, lokasi } = req.query;

    const matchFilter = await buildFindFilter(
      idParam,
      namaPeralatan ? String(namaPeralatan) : undefined,
      lokasi ? String(lokasi) : undefined
    );

    if (!matchFilter) {
      return res.status(404).json({ message: 'Data fasilitas tidak ditemukan' });
    }

    await Equipment.collection.deleteOne(matchFilter);
    res.json({ message: 'Data fasilitas berhasil dihapus', id: idParam });
  } catch (error: any) {
    console.error('[Equipment DELETE Error]:', error);
    res.status(500).json({ message: 'Gagal menghapus data fasilitas', error: error?.message });
  }
});

export default router;