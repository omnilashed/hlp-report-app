import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'SUPERVISOR', 'ASMEN', 'OFFICE', 'GUEST'], required: true },
  namaLengkap: { type: String, default: '' },
  nik: { type: String, default: '' },
  noWA: { type: String, default: '' },
  perusahaan: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);