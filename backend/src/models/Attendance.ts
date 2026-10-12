import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  tanggal: { type: String, required: true },
  dinas: { type: String, enum: ['PAGI', 'MALAM'], required: true },
  apindo: [{ nama: String, absensi: { type: String, default: 'H' } }],
  osIass: [{ nama: String, absensi: { type: String, default: 'H' } }],
  omNti: [{ nama: String, absensi: { type: String, default: 'H' } }]
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);