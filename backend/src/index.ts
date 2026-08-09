import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// 👇 BATAS MEMORI DINAIIKAN JADI 200MB AGAR KOLASE AMAN 👇
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
// 👆 =================================================== 👆

const reportSchema = new mongoose.Schema({
  fungsi: { type: String, default: 'ELECTRONIC & IT FACILITY' },
  dinas: { type: String, enum: ['PAGI', 'MALAM'], required: true },
  tanggal: { type: String, required: true },
  
  status: { type: String, default: 'Draft' },
  catatanAsmen: { type: String, default: '' },
  
  personil: {
    apindo: [{ nama: String, jabatan: String }],
    omIassNti: [{ nama: String, jabatan: String }]
  },

  kegiatan: [{
    jamMulai: String,
    jamSelesai: String,
    uraian: String,
    hasilKondisi: String,
    dokumentasi: [String]
  }],

  performaFasilitas: [{
    namaFasilitas: String,
    persentase: Number
  }],

  kondisiFasilitas: [{
    namaFasilitas: String,
    totalUnit: Number,
    normal: Number,
    rusak: Number,
    keteranganRusak: String
  }],

  catatan: String
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

app.post('/api/reports', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json({ message: 'Report saved successfully', data: newReport });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ message: 'Error saving report', error });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const updatedReport = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Report updated successfully', data: updatedReport });
  } catch (error) {
    res.status(500).json({ message: 'Error updating report', error });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting report', error });
  }
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});