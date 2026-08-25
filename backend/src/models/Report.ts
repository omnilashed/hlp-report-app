import mongoose from 'mongoose';

const editHistorySchema = new mongoose.Schema({
  user: String,
  action: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  fungsi: { type: String, default: 'ELECTRONIC & IT FACILITY' },
  dinas: { type: String, required: true },
  tanggal: { type: String, required: true },
  status: { type: String, default: 'Draft' },
  personil: {
    apindo: [{ nama: String }],
    omIassNti: [{ nama: String }]
  },
  kegiatan: [{
    laporanDari: String,
    jamMulai: String,
    jamSelesai: String,
    uraian: String,
    tindakLanjut: String,
    hasilKondisi: String,
    keterangan: String,
    dokumentasi: [String]
  }],
  kondisiFasilitas: mongoose.Schema.Types.Mixed,
  catatanSpv: String,
  catatanAsmen: String,
  createdBy: String,
  editHistory: [editHistorySchema]
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);