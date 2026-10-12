import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Report from './models/Report';
import User from './models/User';
import Attendance from './models/Attendance';
import { verifyToken, requireRole, AuthRequest } from './middleware/auth';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import equipmentRoutes from './routes/equipment';
import damageReportRoutes from './routes/damageReport';
import attendanceRoutes from './routes/attendance';
import stockEquipmentRoutes from './routes/stockEquipment';
import equipmentMonthlyRoutes, { syncKondisiFasilitasToMonthlyLog } from './routes/equipmentMonthly';

dotenv.config();

const app = express();

const waClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

waClient.on('qr', (qr) => {
  console.log('SCAN BARCODE INI PAKAI WHATSAPP ANDA:');
  qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
  console.log('🤖 BOT WHATSAPP SUDAH SIAP DAN TERHUBUNG!');
});

waClient.initialize().catch((err) => {
  console.error('⚠️ Peringatan: Bot WhatsApp gagal diinisialisasi:', err.message);
  console.log('💡 Tip: Jika browser terkunci, pastikan tidak ada proses Chrome/Puppeteer yang menggantung.');
});

// Penanganan graceful shutdown agar proses Chrome tidak tertinggal di background
const cleanupWa = async () => {
  try {
    await waClient.destroy();
  } catch (e) {}
};
process.on('SIGINT', async () => {
  await cleanupWa();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await cleanupWa();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_env';
const DEFAULT_USER_PASS = process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!';

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

const ALLOWED_IPS = (process.env.ALLOWED_IPS || '172.23.5.').split(',').map(ip => ip.trim()).filter(Boolean); // Cukup awalan IP jaringannya saja
const ALLOWED_EXACT = ['127.0.0.1', '::1']; // Izinkan akses dari komputer server lokal itu sendiri

app.use((req, res, next) => {
  // Ambil IP pengunjung dari request
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  
  // Cek apakah IP pengunjung ada di daftar yang diizinkan
  const isAllowed = ALLOWED_EXACT.includes(clientIp) || 
                    ALLOWED_IPS.some(prefix => clientIp.includes(prefix));

  if (isAllowed) {
    next(); // Lolos, lanjutkan ke rute API di bawah
  } else {
    // Ditolak! Tampilkan pesan error
    console.log(`[BLOCKED] Akses ditolak dari IP: ${clientIp}`);
    res.status(403).json({ 
      error: "Akses Ditolak. Sistem ini hanya dapat diakses melalui jaringan internal ELIT Bandara Halim." 
    });
  }
});
// ==============================================================

app.use('/api/equipments', equipmentRoutes);
app.use('/api/damage-reports', damageReportRoutes);
app.use('/api/stock-equipments', stockEquipmentRoutes);
app.use('/api/equipment-monthly', equipmentMonthlyRoutes);

const initDefaultUsers = async () => {
  const count = await User.countDocuments();
  if (count === 0) {
    const defaultPass = await bcrypt.hash(DEFAULT_USER_PASS, 10);
    const employees = [
      { u: 'aep', n: 'AEP MASHUM NURZAMAN', nik: '20244401', p: 'APINDO', r: 'ASMEN' },
      { u: 'rahmat', n: 'RAHMAT D. CAHYO', nik: '20244641', p: 'APINDO', r: 'SUPERVISOR' },
      { u: 'eka', n: 'EKA YULIANI S.', nik: '20244934', p: 'APINDO', r: 'SUPERVISOR' },
      { u: 'rizko', n: 'RIZKO E. NUGRAHA', nik: '20247850', p: 'APINDO', r: 'SUPERVISOR' },
      { u: 'istianah', n: 'ISTIANAH RAHMAH DEWI', nik: '20247875', p: 'APINDO', r: 'OFFICE' },
      { u: 'maulana', n: 'MAULANA HADY C. S.', nik: '20246808', p: 'APINDO', r: 'ADMIN' },
      { u: 'adelia', n: 'ADELIA PUSPITA', nik: '241002009539', p: 'IASS', r: 'OFFICE' },
      { u: 'abdul', n: 'ABDUL KODIR', nik: '241002006220', p: 'IASS', r: 'OFFICE' },
      { u: 'riski', n: 'RISKI RACHMAD SANTOSO', nik: '250602994611', p: 'IASS', r: 'OFFICE' },
      { u: 'dennis', n: 'DENNIS SAYYIDINAA R', nik: '241002010885', p: 'IASS', r: 'OFFICE' },
      { u: 'yudha', n: 'YUDHA ISMUNANDAR', nik: '241002010829', p: 'IASS', r: 'OFFICE' },
      { u: 'ahmad', n: 'AHMAD FANGKY S.', nik: '241102011731', p: 'IASS', r: 'OFFICE' },
      { u: 'karuniawan', n: 'KARUNIAWAN GEOVANI', nik: '241002006219', p: 'IASS', r: 'OFFICE' },
      { u: 'mahdi', n: 'MAHDI ALHABSYI', nik: '241002009012', p: 'IASS', r: 'OFFICE' },
      { u: 'luthfianda', n: 'LUTHFIANDA MUZAKI S', nik: '-', p: 'NTI', r: 'OFFICE' },
      { u: 'fariz', n: 'FARIZ SOLAHUDIN', nik: '-', p: 'NTI', r: 'OFFICE' },
      { u: 'zaky', n: 'ZAKY ALHADY', nik: '-', p: 'NTI', r: 'OFFICE' },
      { u: 'muhammad', n: 'MUHAMMAD FACHREZA', nik: '-', p: 'NTI', r: 'OFFICE' },
      { u: 'yoan', n: 'YOAN HERNANTRA', nik: '-', p: 'NTI', r: 'OFFICE' }
    ];
    for (const emp of employees) {
      await User.create({ username: emp.u, password: defaultPass, role: emp.r as any, namaLengkap: emp.n, nik: emp.nik, perusahaan: emp.p, isActive: true });
    }
  }
};

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Username atau Password salah!" });
    if (!user.isActive) return res.status(403).json({ message: "Akun Anda telah dinonaktifkan oleh Admin!" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Username atau Password salah!" });
    
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role, namaLengkap: user.namaLengkap }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, role: user.role, username: user.username, namaLengkap: user.namaLengkap });
  } catch (error) { res.status(500).json({ message: 'Terjadi kesalahan pada server' }); }
});

app.get('/api/users/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: 'Error fetching user data' }); }
});

app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ role: 1, username: 1 });
    res.json(users);
  } catch (error) { res.status(500).json({ message: 'Error fetching users' }); }
});

app.post('/api/users', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { username, password, role, namaLengkap, nik, perusahaan, noWA } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username sudah terdaftar!' });
    const hashedPassword = await bcrypt.hash(password || DEFAULT_USER_PASS, 10);
    const newUser = await User.create({ username, password: hashedPassword, role: role || 'OFFICE', namaLengkap, nik, noWA, perusahaan, isActive: true });
    res.status(201).json(newUser);
  } catch (error) { res.status(500).json({ message: 'Gagal menambah karyawan baru' }); }
});

app.put('/api/users/:id', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!updatedUser) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ message: 'Data pengguna berhasil diperbarui', data: updatedUser });
  } catch (error) { res.status(500).json({ message: 'Gagal memperbarui data pengguna' }); }
});

app.put('/api/users/:id/toggle-status', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    if (user.role === 'ADMIN') return res.status(403).json({ message: 'Tidak bisa menonaktifkan Admin!' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `Akun ${user.username} berhasil di${user.isActive ? 'aktifkan' : 'nonaktifkan'}`, isActive: user.isActive });
  } catch (error) { res.status(500).json({ message: 'Error updating status' }); }
});

app.put('/api/users/:id/change-role', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { newRole } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    user.role = newRole;
    await user.save();
    res.json({ message: `Hak akses ${user.username} berhasil diubah menjadi ${newRole}`, role: user.role });
  } catch (error) { res.status(500).json({ message: 'Error updating role' }); }
});

app.put('/api/users/change-password', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Password lama salah!" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password berhasil diubah!" });
  } catch (error) { res.status(500).json({ message: 'Gagal mengubah password' }); }
});

app.post('/api/users/reset-password', verifyToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { targetUsername } = req.body;
    const user = await User.findOne({ username: targetUsername });
    if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    user.password = await bcrypt.hash(DEFAULT_USER_PASS, 10);
    await user.save();
    res.json({ message: `Password untuk ${targetUsername} berhasil direset ke password default!` });
  } catch (error) { res.status(500).json({ message: 'Gagal mereset password' }); }
});

// Bersihkan otomatis semua laporan berstatus Draft yang sudah lebih dari 24 jam
const cleanupExpiredDrafts = async () => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await Report.deleteMany({
      status: 'Draft',
      $or: [
        { draftExpiresAt: { $ne: null, $lt: now } },
        { draftExpiresAt: null, updatedAt: { $lt: twentyFourHoursAgo } }
      ]
    });
  } catch (e) {}
};

app.get('/api/personnel', verifyToken, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true }, isActive: { $ne: false } }).select('-password');
    const mapped = users.map((u: any) => ({
      _id: u._id,
      namaLengkap: u.namaLengkap || u.username,
      instansi: u.perusahaan || 'APINDO',
      perusahaan: u.perusahaan || 'APINDO',
      role: u.role,
      isActive: u.isActive !== false
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching personnel' });
  }
});

// Ambil laporan Draft aktif (< 24 jam) milik user yang sedang login
app.get('/api/reports/drafts/my', verifyToken, async (req: AuthRequest, res) => {
  try {
    await cleanupExpiredDrafts();
    const editorName = req.user.namaLengkap || req.user.username;
    const uname = req.user.username;
    const dinas = req.query.dinas as string | undefined;

    const filter: any = {
      status: 'Draft',
      $or: [
        { createdBy: editorName },
        { createdBy: uname },
        { 'personil.apindo.nama': editorName },
        { 'personil.omIassNti.nama': editorName }
      ]
    };
    if (dinas) {
      filter.dinas = dinas;
    }

    const drafts = await Report.find(filter).sort({ updatedAt: -1 });
    res.status(200).json({ data: drafts[0] || null, drafts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user drafts', error });
  }
});

app.post('/api/reports', verifyToken, requireRole(['ADMIN', 'SUPERVISOR', 'OFFICE']), async (req: AuthRequest, res) => {
  try {
    await cleanupExpiredDrafts();
    const editorName = req.user.namaLengkap || req.user.username;
    const isDraft = (req.body.status || 'Draft') === 'Draft';
    const now = new Date();
    const expiresAt = isDraft ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null;

    const newReport = new Report({ 
      ...req.body, 
      createdBy: editorName,
      draftSavedAt: isDraft ? now : null,
      draftExpiresAt: expiresAt,
      editHistory: [{ user: editorName, action: isDraft ? 'Menyimpan Draft Laporan (Sementara 24 Jam)' : 'Membuat Laporan Baru', date: now }]
    });
    await newReport.save();
    if (newReport.kondisiFasilitas && Array.isArray(newReport.kondisiFasilitas)) {
      await syncKondisiFasilitasToMonthlyLog(newReport._id, newReport.tanggal, newReport.dinas, newReport.kondisiFasilitas, editorName);
    }
    res.status(201).json({ message: 'Report saved successfully', data: newReport });
  } catch (error) { res.status(500).json({ message: 'Error saving report', error }); }
});

app.put('/api/reports/:id', verifyToken, requireRole(['ADMIN', 'SUPERVISOR', 'ASMEN', 'OFFICE']), async (req: AuthRequest, res) => {
  try {
    await cleanupExpiredDrafts();
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report tidak ditemukan' });

    const editorName = req.user.namaLengkap || req.user.username;
    let actionMsg = 'Mengedit Laporan';
    
    if (req.body.status && req.body.status !== report.status) {
      actionMsg = `Mengubah status menjadi: ${req.body.status}`;
    } else if (req.body.status === 'Draft') {
      actionMsg = 'Memperbarui Draft Laporan (Sementara 24 Jam)';
    } else if (req.body.catatanSpv && req.body.catatanSpv !== report.catatanSpv) {
      actionMsg = 'Menambahkan/Mengubah Catatan SPV';
    } else if (req.body.catatanAsmen && req.body.catatanAsmen !== report.catatanAsmen) {
      actionMsg = 'Menambahkan/Mengubah Catatan Asmen';
    }

    const nextStatus = req.body.status || report.status;
    const now = new Date();
    const updatePayload = {
      ...req.body,
      draftSavedAt: nextStatus === 'Draft' ? now : null,
      draftExpiresAt: nextStatus === 'Draft' ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null
    };

    report.set(updatePayload);

    const history = Array.isArray(report.editHistory) ? report.editHistory : [];
    report.editHistory = [...history, { user: editorName, action: actionMsg, date: now }] as any;

    const updatedReport = await report.save();
    if (updatedReport.kondisiFasilitas && Array.isArray(updatedReport.kondisiFasilitas)) {
      await syncKondisiFasilitasToMonthlyLog(updatedReport._id, updatedReport.tanggal, updatedReport.dinas, updatedReport.kondisiFasilitas, editorName);
    }
    res.status(200).json({ message: 'Report updated successfully', data: updatedReport });
  } catch (error) { res.status(500).json({ message: 'Error updating report', error }); }
});

app.get('/api/reports', verifyToken, async (req, res) => {
  try {
    await cleanupExpiredDrafts();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const total = await Report.countDocuments();
    const reports = await Report.find().select('-kegiatan.dokumentasi -slotImages -finalCollages').sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.status(200).json({ data: reports, currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total });
  } catch (error) { res.status(500).json({ message: 'Error fetching reports', error }); }
});

app.get('/api/reports/:id', verifyToken, async (req, res) => {
  try {
    await cleanupExpiredDrafts();
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.status(200).json(report);
  } catch (error) { res.status(500).json({ message: 'Error fetching report detail', error }); }
});

app.delete('/api/reports/:id', verifyToken, requireRole(['ADMIN', 'SUPERVISOR', 'OFFICE']), async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Error deleting report', error }); }
});

app.use('/api/attendance', verifyToken, attendanceRoutes);

app.post('/api/send-wa', verifyToken, async (req, res) => {
  try {
    const { nomor, pesan } = req.body;
    
    let formattedNumber = nomor;
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }
    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber = `${formattedNumber}@c.us`;
    }

    await waClient.sendMessage(formattedNumber, pesan);
    res.status(200).json({ message: 'Pesan WA berhasil dikirim' });
  } catch (error) {
    console.error('Gagal kirim WA:', error);
    res.status(500).json({ message: 'Gagal mengirim pesan WA' });
  }
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => { initDefaultUsers(); })
  .catch((err) => console.error(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});