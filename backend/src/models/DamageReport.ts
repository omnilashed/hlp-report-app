import mongoose, { Schema, Document } from 'mongoose';

export interface IDokumentasiItem {
  foto: string;
  keterangan: string;
}

export interface IDamageReport extends Document {
  reportCode: string;
  repairReportCode?: string;
  equipmentId?: string;
  tanggal: string;
  lokasi: string;
  fasilitas: string;
  peralatan: string;
  bagian: string;
  kategoriKerusakan: string;
  uraian: string;
  dampak: string;
  tindakan: string;
  penyebab: string;
  tglKerusakan: string;
  jamKerusakan: string;
  waktuKerusakanISO?: string;
  tglSelesaiPerbaikan: string;
  jamSelesaiPerbaikan: string;
  waktuSelesaiISO?: string;
  jumlahJamTerputus: string;
  kodeHambatan: string;
  tindakanPerbaikan?: string;
  kodeHambatanPerbaikan?: string;
  tanggalPerbaikan?: string;
  dibuatOlehPerbaikan?: string;
  jabatanDibuatPerbaikan?: string;
  diketahuiOleh: string;
  jabatanDiketahui: string;
  dibuatOleh: string;
  jabatanDibuat: string;
  dokumentasi: IDokumentasiItem[];
  dokumentasiPerbaikan: IDokumentasiItem[];
  statusLaporan: 'Open' | 'Resolved';
  createdBy?: string;
}

const DokumentasiSchema = new Schema({
  foto: { type: String, required: true },
  keterangan: { type: String, default: '' }
}, { _id: false });

const DamageReportSchema: Schema = new Schema({
  reportCode: { type: String, required: true, trim: true },
  repairReportCode: { type: String, default: '', trim: true },
  equipmentId: { type: String, default: '', trim: true },
  tanggal: { type: String, required: true, trim: true },
  lokasi: { type: String, required: true, trim: true },
  fasilitas: { type: String, required: true, trim: true },
  peralatan: { type: String, required: true, trim: true },
  bagian: { type: String, default: '-', trim: true },
  kategoriKerusakan: {
    type: String,
    default: 'Kategori 2 : System beroperasi tetapi performa menurun',
    trim: true
  },
  uraian: { type: String, default: '' },
  dampak: { type: String, default: '' },
  tindakan: { type: String, default: '' },
  penyebab: { type: String, default: '' },
  tglKerusakan: { type: String, required: true, trim: true },
  jamKerusakan: { type: String, required: true, trim: true },
  waktuKerusakanISO: { type: String, default: '' },
  tglSelesaiPerbaikan: { type: String, default: '-', trim: true },
  jamSelesaiPerbaikan: { type: String, default: '-', trim: true },
  waktuSelesaiISO: { type: String, default: '' },
  jumlahJamTerputus: { type: String, default: '-', trim: true },
  kodeHambatan: { type: String, default: 'SC', trim: true },
  tindakanPerbaikan: { type: String, default: '' },
  kodeHambatanPerbaikan: { type: String, default: 'TH', trim: true },
  tanggalPerbaikan: { type: String, default: '' },
  dibuatOlehPerbaikan: { type: String, default: '' },
  jabatanDibuatPerbaikan: { type: String, default: 'Electronic Facility & IT Supervisor' },
  diketahuiOleh: { type: String, default: 'AEP MASHUM NURZAMAN' },
  jabatanDiketahui: { type: String, default: 'Asst. Manager Of Facility Maintenance' },
  dibuatOleh: { type: String, default: 'RAHMAT D. CAHYO' },
  jabatanDibuat: { type: String, default: 'Electronic Facility & IT Supervisor' },
  dokumentasi: { type: [DokumentasiSchema], default: [] },
  dokumentasiPerbaikan: { type: [DokumentasiSchema], default: [] },
  statusLaporan: {
    type: String,
    enum: ['Open', 'Resolved'],
    default: 'Open'
  },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IDamageReport>('DamageReport', DamageReportSchema);
