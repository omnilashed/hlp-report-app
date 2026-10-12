import mongoose, { Schema, Document } from 'mongoose';

export interface IStockEquipment extends Document {
  namaPeralatan: string;
  lokasi: string;
  lokasiPenyimpanan: string; // Lokasi penyimpanan spesifik (Gudang ELIT, Workshop, etc.)
  merek?: string;
  serialNumber?: string;
  nomorSertifikasi?: string;
  tipePeralatan?: string;
  statusKepemilikan?: 'Inventaris API' | 'Sewa';
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara' | '';
  kondisi: 'Normal' | 'Rusak';
  statusPeralatan: 'Standby' | 'Ready' | 'Damaged' | 'Maintenance';
  keterangan?: string;
  equipmentMasterId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockEquipmentSchema: Schema = new Schema(
  {
    namaPeralatan: { type: String, required: true, trim: true },
    lokasi: { type: String, default: '-', trim: true },
    lokasiPenyimpanan: { type: String, required: true, trim: true }, // Lokasi spesifik penyimpanan stock
    merek: { type: String, default: '-', trim: true },
    serialNumber: { type: String, default: '-', trim: true },
    nomorSertifikasi: { type: String, default: '-', trim: true },
    tipePeralatan: { type: String, default: '-', trim: true },
    statusKepemilikan: {
      type: String,
      enum: ['Inventaris API', 'Sewa'],
      default: 'Inventaris API',
      trim: true
    },
    mainCategory: {
      type: String,
      enum: ['Faskampen', 'Elban'],
      required: true
    },
    subCategory: {
      type: String,
      enum: ['Fasilitas IT', 'Fasilitas Penunjang Bandar Udara', ''],
      default: ''
    },
    kondisi: {
      type: String,
      enum: ['Normal', 'Rusak'],
      default: 'Normal'
    },
    statusPeralatan: {
      type: String,
      enum: ['Standby', 'Ready', 'Damaged', 'Maintenance'],
      default: 'Standby'
    },
    keterangan: {
      type: String,
      default: '',
      trim: true
    },
    equipmentMasterId: {
      type: Schema.Types.ObjectId,
      ref: 'Equipment',
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model<IStockEquipment>('StockEquipment', StockEquipmentSchema);
