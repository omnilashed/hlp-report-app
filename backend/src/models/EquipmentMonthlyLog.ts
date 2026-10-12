import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipmentMonthlyLog extends Document {
  reportId: mongoose.Types.ObjectId;
  equipmentId?: string;
  namaPeralatan: string;
  lokasi: string;
  merek?: string;
  serialNumber?: string;
  nomorSertifikasi?: string;
  tipePeralatan?: string;
  statusKepemilikan?: 'Inventaris API' | 'Sewa';
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: string;
  kondisi: 'Normal' | 'Rusak';
  statusPeralatan: 'Ready' | 'Standby' | 'Damaged' | 'Maintenance';
  lokasiStatus?: string;
  keteranganRusak?: string;
  tanggal: string; // "09 Oktober 2026"
  dinas: string; // "PAGI" | "MALAM"
  bulanTahun: string; // "Oktober 2026"
  yearMonth: string; // "2026-10"
  tahun: number; // 2026
  bulan: number; // 10
  hari: number; // 9
  checkedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentMonthlyLogSchema: Schema = new Schema(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true
    },
    equipmentId: { type: String, default: '' },
    namaPeralatan: { type: String, required: true, trim: true, index: true },
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
      required: true,
      index: true
    },
    subCategory: {
      type: String,
      default: '',
      trim: true
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
    lokasiStatus: { type: String, default: '', trim: true },
    keteranganRusak: { type: String, default: '', trim: true },
    tanggal: { type: String, required: true },
    dinas: { type: String, required: true },
    bulanTahun: { type: String, required: true, index: true },
    yearMonth: { type: String, required: true, index: true },
    tahun: { type: Number, required: true, index: true },
    bulan: { type: Number, required: true, index: true },
    hari: { type: Number, default: 1 },
    checkedBy: { type: String, default: '' }
  },
  { timestamps: true }
);

// Compound index for quick monthly lookups
EquipmentMonthlyLogSchema.index({ tahun: 1, bulan: 1, namaPeralatan: 1 });

export default mongoose.model<IEquipmentMonthlyLog>('EquipmentMonthlyLog', EquipmentMonthlyLogSchema);
