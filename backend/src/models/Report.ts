import mongoose from 'mongoose';

const editHistorySchema = new mongoose.Schema({
  user: String,
  action: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  reportCode: { type: String, default: '' },
  fungsi: { type: String, default: 'ELECTRONIC & IT FACILITY' },
  dinas: { type: String, required: true },
  tanggal: { type: String, required: true },
  jamMulaiShift: { type: String, default: '' },
  jamSelesaiShift: { type: String, default: '' },
  status: { type: String, default: 'Draft' },
  personil: {
    apindo: [{ nama: String, absensi: { type: String, default: 'H' } }],
    osIass: [{ nama: String, absensi: { type: String, default: 'H' } }],
    omNti: [{ nama: String, absensi: { type: String, default: 'H' } }],
    omIassNti: [{ nama: String, absensi: { type: String, default: 'H' } }]
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
  rawKegiatan: mongoose.Schema.Types.Mixed,
  slotImages: mongoose.Schema.Types.Mixed,
  finalCollages: [String],
  kondisiFasilitas: mongoose.Schema.Types.Mixed,
  catatan: { type: String, default: '' },
  activeTab: { type: String, default: 'umum' },
  catatanSpv: String,
  catatanAsmen: String,
  createdBy: String,
  draftSavedAt: { type: Date, default: null },
  draftExpiresAt: { type: Date, default: null },
  editHistory: [editHistorySchema]
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);