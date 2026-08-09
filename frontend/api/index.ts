import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const reportSchema = new mongoose.Schema({
  fungsi: { type: String, default: 'ELECTRONIC & IT FACILITY' },
  dinas: { type: String, enum: ['PAGI', 'MALAM'], required: true },
  tanggal: { type: String, required: true },
  status: { type: String, default: 'Draft' },
  catatanAsmen: { type: String, default: '' },
  catatan: { type: String, default: '' },
  personil: {
    apindo: [{ nama: String, jabatan: String }],
    omIassNti: [{ nama: String, jabatan: String }]
  },
  kegiatan: [{
    jamMulai: String, jamSelesai: String, uraian: String, hasilKondisi: String, dokumentasi: [String]
  }],
  kondisiFasilitas: [{
    namaFasilitas: String, totalUnit: Number, normal: Number, rusak: Number, keteranganRusak: String
  }]
}, { timestamps: true });

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

app.post('/api/reports', async (req: Request, res: Response) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json({ message: 'Report saved successfully', data: newReport });
  } catch (error) { res.status(500).json({ message: 'Error saving report', error }); }
});

app.put('/api/reports/:id', async (req: Request, res: Response) => {
  try {
    const updatedReport = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Report updated successfully', data: updatedReport });
  } catch (error) { res.status(500).json({ message: 'Error updating report', error }); }
});

app.get('/api/reports', async (req: Request, res: Response) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) { res.status(500).json({ message: 'Error fetching reports', error }); }
});

app.delete('/api/reports/:id', async (req: Request, res: Response) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Error deleting report', error }); }
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB error:', err));

export default app;