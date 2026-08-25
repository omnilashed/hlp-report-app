import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  tanggal: { type: String, required: true },
  dinas: { type: String, enum: ['PAGI', 'MALAM'], required: true },
  apindo: [{ nama: String }],
  osIass: [{ nama: String }],
  omNti: [{ nama: String }]
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);