import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipment extends Document {
  namaPeralatan: string;
  lokasi: string;
  merek?: string;
  serialNumber?: string;
  nomorSertifikasi?: string;
  tipePeralatan?: string;
  statusKepemilikan?: 'Inventaris API' | 'Sewa';
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara';
  kondisi: 'Normal' | 'Rusak';
  statusPeralatan: 'Ready' | 'Standby' | 'Damaged' | 'Maintenance';
  lokasiStatus?: string;
  keteranganRusak?: string;
}

const EquipmentSchema: Schema = new Schema({
  namaPeralatan: { type: String, required: true, trim: true },
  lokasi: { type: String, required: true, trim: true },
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
    enum: ['Fasilitas IT', 'Fasilitas Penunjang Bandar Udara'],
    required: false
  },
  kondisi: {
    type: String,
    enum: ['Normal', 'Rusak'],
    default: 'Normal'
  },
  statusPeralatan: {
    type: String,
    enum: ['Ready', 'Standby', 'Damaged', 'Maintenance'],
    default: 'Ready'
  },
  lokasiStatus: {
    type: String,
    default: '',
    trim: true
  },
  keteranganRusak: {
    type: String,
    default: '',
    trim: true
  }
}, { timestamps: true });

export default mongoose.model<IEquipment>('Equipment', EquipmentSchema);