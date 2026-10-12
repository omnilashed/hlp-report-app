import express, { Request, Response } from 'express';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Attendance from '../models/Attendance';

const router = express.Router();

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const normalizeMonthName = (bulanInput: any): string => {
  if (!bulanInput) return MONTHS_ID[new Date().getMonth()];
  const str = String(bulanInput).trim();
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return MONTHS_ID[num - 1];
  }
  const found = MONTHS_ID.find(m => m.toLowerCase() === str.toLowerCase());
  return found || str;
};

export const getMonthNumber = (bulanInput: any): number => {
  const name = normalizeMonthName(bulanInput);
  const idx = MONTHS_ID.findIndex(m => m.toLowerCase() === name.toLowerCase());
  return idx !== -1 ? idx + 1 : 10;
};

// Schema Jadwal Dinas Bulanan (Daftar Dinas)
const RosterRowSchema = new Schema({
  userId: { type: String, default: '' },
  namaLengkap: { type: String, required: true },
  nik: { type: String, default: '-' },
  perusahaan: { type: String, default: 'APINDO' },
  urutan: { type: Number, default: 0 },
  days: { type: Schema.Types.Mixed, default: {} } // { "01": "P", "02": "PS", ... }
}, { _id: false });

const MonthlyRosterSchema = new Schema({
  bulan: { type: String, required: true }, // e.g., 'Oktober'
  tahun: { type: String, required: true }, // e.g., '2026'
  unit: { type: String, default: 'ELECTRONIC & IT FACILITY' },
  bandara: { type: String, default: 'HALIM PERDANAKUSUMA' },
  rows: { type: [RosterRowSchema], default: [] },
  archivedRows: { type: [RosterRowSchema], default: [] },
  signedPdfInfo: { type: Schema.Types.Mixed, default: null }
}, { timestamps: true });

MonthlyRosterSchema.index({ bulan: 1, tahun: 1 }, { unique: true });

const MonthlyRoster = mongoose.models.MonthlyRoster || mongoose.model('MonthlyRoster', MonthlyRosterSchema);

// Helper konversi array 31 hari ke objek { "01": "...", "1": "...", ..., "31": "..." }
const arrayToDaysMap = (arr: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  arr.forEach((val, idx) => {
    const dNum = String(idx + 1);
    const dPad = dNum.padStart(2, '0');
    map[dPad] = val;
    map[dNum] = val;
  });
  return map;
};

const normalizeDaysMap = (daysObj: any, fallbackShift = 'L'): Record<string, string> => {
  const map: Record<string, string> = {};
  for (let d = 1; d <= 31; d++) {
    const dNum = String(d);
    const dPad = dNum.padStart(2, '0');
    const val = daysObj?.[dPad] ?? daysObj?.[dNum] ?? fallbackShift;
    map[dPad] = val;
    map[dNum] = val;
  }
  return map;
};

const REGULAR_OCT_2026 = [
  'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L', 'L',
  'P', 'P', 'P', 'P', 'P', 'L'
];

// Data existing Oktober 2026 sesuai gambar Daftar Dinas (key huruf besar semua)
const OCT_2026_PRESETS: Record<string, string[]> = {
  'AEP MASHUM NURZAMAN': REGULAR_OCT_2026,
  'RAHMAT D. CAHYO': [
    'PS', 'P', 'L', 'L',
    'PS', 'P', 'L', 'L',
    'PS', 'PS', 'L', 'L',
    'PS', 'P', 'L', 'L',
    'PS', 'PS', 'L', 'L',
    'PS', 'P', 'L', 'L',
    'PS', 'P', 'L', 'L',
    'PS', 'P', 'L'
  ],
  'EKA YULIANI S.': [
    'L', 'L', 'PS', 'P',
    'DL', 'DL', 'DL', 'P',
    'L', 'L', 'PS', 'PS',
    'L', 'L', 'PS', 'PS',
    'L', 'L', 'PS', 'PS',
    'L', 'L', 'PS', 'P',
    'L', 'L', 'PS', 'PS',
    'L', 'L', 'PS'
  ],
  'RIZKO E. NUGRAHA': [
    'L', 'PS', 'P', 'L',
    'L', 'PS', 'PS', 'L',
    'L', 'PS', 'P', 'L',
    'L', 'PS', 'PS', 'L',
    'L', 'PS', 'PS', 'L',
    'L', 'PS', 'PS', 'L',
    'L', 'PS', 'PS', 'L',
    'L', 'PS', 'P'
  ],
  'ISTIANAH RAHMAH DEWI': [
    'P', 'P', 'L', 'L',
    'DL', 'DL', 'DL', 'P', 'P', 'L', 'L',
    'P', 'P', 'P', 'P', 'P', 'L', 'L',
    'P', 'P', 'P', 'P', 'P', 'L', 'L',
    'P', 'P', 'P', 'P', 'P', 'L'
  ],
  'MAULANA HADY C. S.': [
    'P', 'L', 'L', 'PS',
    'P', 'L', 'L', 'PS',
    'P', 'L', 'L', 'PS',
    'P', 'L', 'L', 'CUTI',
    'CUTI', 'L', 'L', 'PS',
    'P', 'L', 'L', 'PS',
    'P', 'L', 'L', 'PS',
    'P', 'L', 'L'
  ],
  'ADELIA PUSPITA': REGULAR_OCT_2026,
  'MAHDI ALHABSYI': [
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L'
  ],
  'RISKI RACHMAD SANTOSO': [
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L'
  ],
  'M. ROIM': [
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L', 'PS',
    'M', 'L', 'L'
  ],
  'AHMAD FANGKY S.': [
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L'
  ],
  'DENNIS SAYYIDINAA R': [
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L'
  ],
  'DENNIS SAYYIDINAA R.': [
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L'
  ],
  'ABDUL KODIR': [
    'L', 'CUTI', 'CUTI', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M'
  ],
  'YUDHA ISMUNANDAR': [
    'L', 'L', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M', 'L', 'L',
    'PS', 'M'
  ],
  'KARUNIAWAN GEOVANI': [
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS', 'M',
    'L', 'L', 'PS'
  ],
  'LUTHFIANDA MUZAKI S': REGULAR_OCT_2026,
  'YOAN HERNANTRA': [
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-', '-',
    'PS', 'M', '-'
  ],
  'FARIZ SOLAHUDIN': [
    'M', '-', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M', '-',
    '-', 'PS', 'M'
  ],
  'MUHAMMAD FACHREZA': [
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS', 'M',
    '-', '-', 'PS'
  ],
  'ZAKY ALHADY': [
    '-', 'PS', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-', 'PS',
    'M', '-', '-'
  ],
  'DESI DWI NUR HARTATI': REGULAR_OCT_2026
};

// Urutan tampilan sesuai gambar Daftar Dinas
const PREFERRED_ORDER: Record<string, string[]> = {
  APINDO: [
    'AEP MASHUM NURZAMAN',
    'RAHMAT D. CAHYO',
    'EKA YULIANI S.',
    'RIZKO E. NUGRAHA',
    'ISTIANAH RAHMAH DEWI',
    'MAULANA HADY C. S.'
  ],
  IASS: [
    'ADELIA PUSPITA',
    'MAHDI ALHABSYI',
    'RISKI RACHMAD SANTOSO',
    'M. ROIM',
    'AHMAD FANGKY S.',
    'DENNIS SAYYIDINAA R',
    'DENNIS SAYYIDINAA R.',
    'ABDUL KODIR',
    'YUDHA ISMUNANDAR',
    'KARUNIAWAN GEOVANI'
  ],
  NTI: [
    'LUTHFIANDA MUZAKI S',
    'YOAN HERNANTRA',
    'FARIZ SOLAHUDIN',
    'MUHAMMAD FACHREZA',
    'ZAKY ALHADY',
    'DESI DWI NUR HARTATI'
  ]
};

const normalizeCompany = (perusahaan?: string): 'APINDO' | 'IASS' | 'NTI' => {
  const p = (perusahaan || '').toUpperCase();
  if (p.includes('IASS')) return 'IASS';
  if (p.includes('NTI')) return 'NTI';
  return 'APINDO';
};

// Urutkan array baris berdasarkan grup perusahaan & urutan Daftar Dinas
function sortRosterRows(rows: any[]) {
  const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
  return [...rows].sort((a: any, b: any) => {
    const ca = normalizeCompany(a.perusahaan || a.instansi);
    const cb = normalizeCompany(b.perusahaan || b.instansi);
    if (compOrder[ca] !== compOrder[cb]) return compOrder[ca] - compOrder[cb];

    const list = PREFERRED_ORDER[ca] || [];
    const nameA = (a.namaLengkap || a.nama || '').toUpperCase().trim();
    const nameB = (b.namaLengkap || b.nama || '').toUpperCase().trim();
    const idxA = list.findIndex(n => n.toUpperCase() === nameA);
    const idxB = list.findIndex(n => n.toUpperCase() === nameB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    if (typeof a.urutan === 'number' && typeof b.urutan === 'number' && a.urutan !== b.urutan) {
      return a.urutan - b.urutan;
    }
    return nameA.localeCompare(nameB);
  }).map((r, i) => ({
    ...r,
    urutan: i + 1
  }));
}

// Ambil semua personil AKTIF dari database User dan urutkan sesuai grup Daftar Dinas
async function getSortedDatabaseUsers() {
  const dbUsers = await User.find({ isDeleted: { $ne: true }, isActive: { $ne: false } })
    .select('_id namaLengkap username nik perusahaan role isActive isDeleted')
    .lean();

  const sortedUsers = [...dbUsers].sort((a: any, b: any) => {
    const compOrder = { APINDO: 1, IASS: 2, NTI: 3 };
    const ca = normalizeCompany(a.perusahaan);
    const cb = normalizeCompany(b.perusahaan);
    if (compOrder[ca] !== compOrder[cb]) return compOrder[ca] - compOrder[cb];

    const list = PREFERRED_ORDER[ca] || [];
    const nameA = (a.namaLengkap || a.username || '').toUpperCase().trim();
    const nameB = (b.namaLengkap || b.username || '').toUpperCase().trim();
    const idxA = list.findIndex(n => n.toUpperCase() === nameA);
    const idxB = list.findIndex(n => n.toUpperCase() === nameB);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return nameA.localeCompare(nameB);
  });

  return sortedUsers;
}

// Bangun jadwal default untuk seorang personil pada bulan & tahun tertentu
function getDefaultDaysForUser(upperName: string, company: 'APINDO' | 'IASS' | 'NTI', bulanName: string, tahunStr: string): Record<string, string> {
  const presetArr = OCT_2026_PRESETS[upperName];
  if (presetArr) {
    return arrayToDaysMap(presetArr);
  }
  const monthNum = getMonthNumber(bulanName);
  const yearNum = parseInt(tahunStr, 10) || 2026;
  const map: Record<string, string> = {};
  for (let d = 1; d <= 31; d++) {
    const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const code = isWeekend ? (company === 'NTI' ? '-' : 'L') : 'P';
    map[String(d).padStart(2, '0')] = code;
    map[String(d)] = code;
  }
  return map;
}

// Format output agar mendukung properti `rows` maupun `entries` di frontend
function formatRosterResponse(rosterDoc: any, sortedUsers: any[]) {
  const rawRows = Array.isArray(rosterDoc?.rows) ? rosterDoc.rows : [];
  const entries = rawRows.map((r: any, idx: number) => {
    const nama = (r.namaLengkap || r.nama || '').trim();
    const instansi = normalizeCompany(r.perusahaan || r.instansi);
    const normalizedDays = normalizeDaysMap(r.days || r.shifts || {}, instansi === 'NTI' ? '-' : 'L');
    return {
      userId: r.userId || '',
      nama,
      namaLengkap: nama,
      nik: r.nik || '-',
      instansi,
      perusahaan: instansi,
      urutan: typeof r.urutan === 'number' && r.urutan > 0 ? r.urutan : idx + 1,
      shifts: normalizedDays,
      days: normalizedDays
    };
  });

  const personnel = sortedUsers.map((u: any, idx: number) => ({
    _id: String(u._id),
    nama: (u.namaLengkap || u.username || '').trim(),
    namaLengkap: (u.namaLengkap || u.username || '').trim(),
    nik: u.nik || '-',
    instansi: normalizeCompany(u.perusahaan),
    perusahaan: normalizeCompany(u.perusahaan),
    isActive: true,
    urutan: idx + 1
  }));

  return {
    _id: rosterDoc?._id,
    bulan: rosterDoc?.bulan,
    tahun: rosterDoc?.tahun,
    unit: rosterDoc?.unit || 'ELECTRONIC & IT FACILITY',
    bandara: rosterDoc?.bandara || 'HALIM PERDANAKUSUMA',
    rows: entries,
    entries,
    personnel,
    signedPdfInfo: rosterDoc?.signedPdfInfo || null
  };
}

// Bangun atau sinkronkan baris Daftar Dinas dengan status AKTIF akun User di database
async function buildOrSyncRoster(bulanInput: any, tahunInput: any) {
  const bulan = normalizeMonthName(bulanInput);
  const tahun = String(tahunInput || '2026').trim();
  const sortedUsers = await getSortedDatabaseUsers();

  // Buat indeks user aktif (berdasarkan _id dan nama lengkap uppercase)
  const activeUserById = new Map<string, any>();
  const activeUserByName = new Map<string, any>();
  sortedUsers.forEach((u: any) => {
    const idStr = String(u._id);
    const upperName = (u.namaLengkap || u.username || '').toUpperCase().trim();
    activeUserById.set(idStr, u);
    if (upperName) activeUserByName.set(upperName, u);
    if (u.username) activeUserByName.set(String(u.username).toUpperCase().trim(), u);
  });

  // Cek apakah ada dokumen dengan nama bulan ('Oktober') atau angka bulan ('10')
  const monthNumStr = String(getMonthNumber(bulan));
  let roster = await MonthlyRoster.findOne({
    bulan: { $in: [bulan, monthNumStr] },
    tahun
  });

  if (!roster) {
    const initialRows = sortedUsers.map((u: any, idx: number) => {
      const fullName = (u.namaLengkap || u.username || '').trim();
      const upperName = fullName.toUpperCase();
      const company = normalizeCompany(u.perusahaan);
      return {
        userId: String(u._id),
        namaLengkap: fullName,
        perusahaan: company,
        urutan: idx + 1,
        days: getDefaultDaysForUser(upperName, company, bulan, tahun)
      };
    });

    roster = await MonthlyRoster.create({
      bulan,
      tahun,
      unit: 'ELECTRONIC & IT FACILITY',
      bandara: 'HALIM PERDANAKUSUMA',
      rows: initialRows,
      archivedRows: []
    });
  } else {
    let changed = false;
    if (roster.bulan !== bulan) {
      roster.bulan = bulan;
      changed = true;
    }

    const rawExistingRows = Array.isArray(roster.rows) ? roster.rows.map((r: any) => (r.toObject ? r.toObject() : { ...r })) : [];
    const archivedRows = Array.isArray(roster.archivedRows) ? roster.archivedRows.map((r: any) => (r.toObject ? r.toObject() : { ...r })) : [];

    // 1. Filter baris yang ada: jika akun personil telah NON-ACTIVE (tidak ada di activeUserById / activeUserByName),
    //    pindahkan ke archivedRows (agar jadwalnya tersimpan jika sewaktu-waktu diaktifkan kembali) dan hapus dari rows aktif!
    const activeRows: any[] = [];
    for (const row of rawExistingRows) {
      const rowUserId = row.userId ? String(row.userId).trim() : '';
      const rowNameUpper = (row.namaLengkap || row.nama || '').toUpperCase().trim();

      const matchedActiveUser =
        (rowUserId && activeUserById.get(rowUserId)) ||
        (rowNameUpper && activeUserByName.get(rowNameUpper));

      if (matchedActiveUser) {
        // Sinkronkan namaLengkap, userId, dan perusahaan dengan data terbaru di User
        const fullName = (matchedActiveUser.namaLengkap || matchedActiveUser.username || '').trim();
        const company = normalizeCompany(matchedActiveUser.perusahaan);
        const uid = String(matchedActiveUser._id);

        if (row.userId !== uid || row.namaLengkap !== fullName || row.perusahaan !== company) {
          row.userId = uid;
          row.namaLengkap = fullName;
          row.perusahaan = company;
          changed = true;
        }
        if (!row.days || Object.keys(row.days).length === 0) {
          row.days = getDefaultDaysForUser(fullName.toUpperCase(), company, bulan, tahun);
          changed = true;
        }
        activeRows.push(row);
      } else {
        // Akun personil ini sudah non-active / dihapus -> arsipkan jadwalnya dan hilangkan dari daftar absensi aktif
        changed = true;
        if (rowNameUpper) {
          const archIdx = archivedRows.findIndex(
            (ar: any) =>
              (rowUserId && ar.userId && String(ar.userId) === rowUserId) ||
              (ar.namaLengkap || ar.nama || '').toUpperCase().trim() === rowNameUpper
          );
          if (archIdx !== -1) {
            archivedRows[archIdx] = { ...row };
          } else {
            archivedRows.push({ ...row });
          }
        }
      }
    }

    // 2. Cek semua personil AKTIF di database:
    //    Jika ada personil baru atau personil yang tadinya non-active lalu ACTIVE kembali, otomatis masukkan ke activeRows!
    for (let i = 0; i < sortedUsers.length; i++) {
      const u = sortedUsers[i];
      const uid = String(u._id);
      const fullName = (u.namaLengkap || u.username || '').trim();
      const upperName = fullName.toUpperCase();
      const company = normalizeCompany(u.perusahaan);

      const existsInActive = activeRows.some(
        (r: any) =>
          (r.userId && String(r.userId) === uid) ||
          (r.namaLengkap || r.nama || '').toUpperCase().trim() === upperName
      );

      if (!existsInActive) {
        // Cek apakah personil ini pernah punya jadwal di archivedRows sebelum dinonaktifkan
        const archIdx = archivedRows.findIndex(
          (ar: any) =>
            (ar.userId && String(ar.userId) === uid) ||
            (ar.namaLengkap || ar.nama || '').toUpperCase().trim() === upperName
        );

        let restoredDays: Record<string, string>;
        if (archIdx !== -1 && archivedRows[archIdx].days && Object.keys(archivedRows[archIdx].days).length > 0) {
          restoredDays = normalizeDaysMap(archivedRows[archIdx].days, company === 'NTI' ? '-' : 'L');
          archivedRows.splice(archIdx, 1);
        } else {
          restoredDays = getDefaultDaysForUser(upperName, company, bulan, tahun);
        }

        activeRows.push({
          userId: uid,
          namaLengkap: fullName,
          perusahaan: company,
          urutan: activeRows.length + 1,
          days: restoredDays
        });
        changed = true;
      }
    }

    if (changed) {
      const finalRows = sortRosterRows(activeRows);
      roster.rows = finalRows;
      roster.archivedRows = archivedRows;
      roster.markModified('rows');
      roster.markModified('archivedRows');
      await roster.save();
    }
  }

  return { roster, sortedUsers };
}

// GET /api/attendance/roster?bulan=10&tahun=2026 (atau bulan=Oktober)
router.get('/roster', async (req: Request, res: Response) => {
  try {
    const bulan = req.query.bulan || 'Oktober';
    const tahun = req.query.tahun || '2026';
    const { roster, sortedUsers } = await buildOrSyncRoster(bulan, tahun);
    res.json(formatRosterResponse(roster, sortedUsers));
  } catch (error: any) {
    console.error('[Roster GET Error]:', error);
    res.status(500).json({ message: 'Gagal mengambil data daftar dinas', error: error?.message });
  }
});

// GET /api/attendance/check-duty — Cek apakah user sedang dinas pada tanggal tertentu
router.get('/check-duty', async (req: Request, res: Response) => {
  try {
    const rawTanggal = req.query.tanggal || req.query.hari;
    const rawBulan = req.query.bulan;
    const rawTahun = req.query.tahun || '2026';
    const rawUser = String(req.query.username || req.query.nama || req.query.namaLengkap || '').trim();

    const now = new Date();
    const dayNum = rawTanggal ? parseInt(String(rawTanggal), 10) : now.getDate();
    const dPad = String(dayNum).padStart(2, '0');
    const bulan = normalizeMonthName(rawBulan || (now.getMonth() + 1));
    const tahun = String(rawTahun || now.getFullYear()).trim();

    const { roster } = await buildOrSyncRoster(bulan, tahun);
    const rows = roster?.rows || [];

    const normKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const searchTarget = normKey(rawUser);

    let matchedRow: any = null;
    if (searchTarget) {
      matchedRow = rows.find((r: any) => {
        const rName = normKey(r.namaLengkap || r.nama || '');
        return rName === searchTarget || rName.includes(searchTarget) || searchTarget.includes(rName);
      });
    }

    if (!matchedRow) {
      // Jika personil tidak ditemukan di baris jadwal aktif bulan ini
      return res.json({
        isOnDuty: false,
        shiftCode: 'L',
        shiftLabel: 'Tidak Terjadwal / Lepas Dinas',
        jamDinas: '-',
        matchedPerson: rawUser || '-',
        tanggal: dPad,
        bulan,
        tahun,
        message: 'Nama Anda tidak ditemukan pada jadwal dinas aktif bulan ini.'
      });
    }

    const shiftCode = String(
      matchedRow.days?.[dPad] ??
      matchedRow.days?.[String(dayNum)] ??
      (matchedRow.perusahaan === 'NTI' ? '-' : 'L')
    ).toUpperCase().trim();

    const SHIFT_MAP: Record<string, { label: string; jam: string; isDuty: boolean }> = {
      'P': { label: 'Masuk Pagi Reguler', jam: '07.30 s/d 16.30', isDuty: true },
      'PS': { label: 'Masuk Pagi Shift', jam: '07.00 s/d 19.00', isDuty: true },
      'M': { label: 'Masuk Malam', jam: '19.00 s/d 07.00', isDuty: true },
      'DL': { label: 'Dinas Luar', jam: 'Tidak Masuk Dinas', isDuty: false },
      'CUTI': { label: 'Mengambil Cuti', jam: 'Cuti Tahunan', isDuty: false },
      'L': { label: 'Libur / Off', jam: 'Lepas Dinas / Libur', isDuty: false },
      '-': { label: 'Libur / Off', jam: 'Lepas Dinas / Libur', isDuty: false }
    };

    const info = SHIFT_MAP[shiftCode] || { label: shiftCode, jam: '-', isDuty: false };

    return res.json({
      isOnDuty: info.isDuty,
      shiftCode,
      shiftLabel: info.label,
      jamDinas: info.jam,
      matchedPerson: matchedRow.namaLengkap,
      perusahaan: matchedRow.perusahaan,
      tanggal: dPad,
      bulan,
      tahun,
      message: info.isDuty
        ? `Anda tercatat dinas hari ini (${shiftCode} - ${info.label})`
        : `Anda tidak masuk dinas hari ini (${shiftCode} - ${info.label})`
    });
  } catch (error: any) {
    console.error('[Check Duty Error]:', error);
    res.status(500).json({ message: 'Gagal mengecek jadwal dinas', error: error?.message });
  }
});

// PUT /api/attendance/roster — simpan perubahan jadwal dinas bulanan (drag & drop / manual edit / import excel / pdf ttd)
router.put('/roster', async (req: Request, res: Response) => {
  try {
    const { bulan: rawBulan, tahun: rawTahun, unit, bandara, rows, entries, signedPdfInfo } = req.body;
    const incomingList = Array.isArray(entries) ? entries : Array.isArray(rows) ? rows : null;

    if (!rawBulan || !rawTahun || !incomingList) {
      return res.status(400).json({ message: 'Bulan, Tahun, dan data baris jadwal wajib diisi!' });
    }

    const bulan = normalizeMonthName(rawBulan);
    const tahun = String(rawTahun).trim();
    const monthNumStr = String(getMonthNumber(bulan));

    // Ambil daftar personil aktif agar akun non-active tidak ikut tersimpan
    const sortedUsers = await getSortedDatabaseUsers();
    const activeUserById = new Map<string, any>();
    const activeUserByName = new Map<string, any>();
    sortedUsers.forEach((u: any) => {
      activeUserById.set(String(u._id), u);
      const upperName = (u.namaLengkap || u.username || '').toUpperCase().trim();
      if (upperName) activeUserByName.set(upperName, u);
      if (u.username) activeUserByName.set(String(u.username).toUpperCase().trim(), u);
    });

    const normalizedRows: any[] = [];
    incomingList.forEach((item: any, idx: number) => {
      const rawName = (item.namaLengkap || item.nama || '').trim();
      const upperName = rawName.toUpperCase();
      const uid = item.userId ? String(item.userId).trim() : '';

      const matchedActive =
        (uid && activeUserById.get(uid)) ||
        (upperName && activeUserByName.get(upperName));

      // Hanya simpan baris yang akun personilnya berstatus ACTIVE
      if (!matchedActive && sortedUsers.length > 0) {
        return;
      }

      const namaLengkap = matchedActive ? (matchedActive.namaLengkap || matchedActive.username || rawName).trim() : rawName;
      const perusahaan = normalizeCompany(matchedActive ? matchedActive.perusahaan : (item.perusahaan || item.instansi));
      const nik = item.nik || matchedActive?.nik || '-';
      const rawDays = item.days || item.shifts || {};

      normalizedRows.push({
        userId: matchedActive ? String(matchedActive._id) : uid,
        namaLengkap,
        nik,
        perusahaan,
        urutan: typeof item.urutan === 'number' ? item.urutan : idx + 1,
        days: normalizeDaysMap(rawDays, perusahaan === 'NTI' ? '-' : 'L')
      });
    });

    // Hapus duplikat nama bulan angka jika pernah tersimpan sebelumnya
    if (monthNumStr !== bulan) {
      await MonthlyRoster.deleteMany({ bulan: monthNumStr, tahun });
    }

    const updateSet: any = {
      bulan,
      tahun,
      unit: unit || 'ELECTRONIC & IT FACILITY',
      bandara: bandara || 'HALIM PERDANAKUSUMA',
      rows: normalizedRows
    };
    if (signedPdfInfo !== undefined) {
      updateSet.signedPdfInfo = signedPdfInfo;
    }

    await MonthlyRoster.findOneAndUpdate(
      { bulan, tahun },
      { $set: updateSet },
      { returnDocument: 'after', upsert: true }
    );

    // Jalankan buildOrSyncRoster untuk memastikan semua user aktif tetap sinkron
    const { roster: syncedRoster, sortedUsers: finalUsers } = await buildOrSyncRoster(bulan, tahun);
    res.json({
      message: 'Jadwal absensi berhasil disimpan!',
      data: formatRosterResponse(syncedRoster, finalUsers)
    });
  } catch (error: any) {
    console.error('[Roster PUT Error]:', error);
    res.status(500).json({ message: 'Gagal menyimpan jadwal absensi', error: error?.message });
  }
});

// POST /api/attendance/roster/add-person — tambah atau aktifkan personil baru langsung dari Management Absensi
router.post('/roster/add-person', async (req: Request, res: Response) => {
  try {
    const { namaLengkap: rawNama, perusahaan: rawComp, bulan: rawBulan, tahun: rawTahun, shifts } = req.body;
    const namaLengkap = String(rawNama || '').trim().toUpperCase();
    if (!namaLengkap) {
      return res.status(400).json({ message: 'Nama lengkap personil wajib diisi!' });
    }

    const perusahaan = normalizeCompany(rawComp);
    const bulan = normalizeMonthName(rawBulan || 'Oktober');
    const tahun = String(rawTahun || '2026').trim();

    // Cek apakah personil sudah ada di database User
    let user = await User.findOne({
      $or: [
        { namaLengkap: { $regex: new RegExp(`^${namaLengkap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { username: { $regex: new RegExp(`^${namaLengkap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });

    if (user) {
      // Jika sudah ada namun non-active / terhapus, aktifkan kembali
      user.isActive = true;
      (user as any).isDeleted = false;
      (user as any).deletedAt = null;
      user.perusahaan = perusahaan;
      if (!user.namaLengkap) user.namaLengkap = namaLengkap;
      await user.save();
    } else {
      // Buat akun personil aktif baru di database User
      const baseUsername = namaLengkap.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || `user${Date.now()}`;
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}${counter++}`;
      }
      const hashedPassword = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || 'ChangeMe123!', 10);
      user = await User.create({
        username: uniqueUsername,
        password: hashedPassword,
        role: 'OFFICE',
        namaLengkap,
        perusahaan,
        isActive: true,
        isDeleted: false
      });
    }

    const { roster } = await buildOrSyncRoster(bulan, tahun);
    if (shifts && typeof shifts === 'object' && Object.keys(shifts).length > 0) {
      const rows = Array.isArray(roster.rows) ? [...roster.rows] : [];
      const idx = rows.findIndex(
        (r: any) =>
          String(r.userId) === String(user!._id) ||
          (r.namaLengkap || '').toUpperCase().trim() === namaLengkap
      );
      if (idx !== -1) {
        rows[idx].days = normalizeDaysMap(shifts, perusahaan === 'NTI' ? '-' : 'L');
        roster.rows = rows;
        roster.markModified('rows');
        await roster.save();
      }
    }

    const sortedUsers = await getSortedDatabaseUsers();
    res.status(201).json({
      message: `Personil ${namaLengkap} berhasil ditambahkan dan disinkronkan!`,
      data: formatRosterResponse(roster, sortedUsers)
    });
  } catch (error: any) {
    console.error('[Roster Add Person Error]:', error);
    res.status(500).json({ message: 'Gagal menambahkan personil baru', error: error?.message });
  }
});

// POST /api/attendance/roster/reset-default — kembalikan jadwal ke jadwal default sesuai gambar & database personil aktif
router.post('/roster/reset-default', async (req: Request, res: Response) => {
  try {
    const rawBulan = req.body?.bulan || 'Oktober';
    const rawTahun = req.body?.tahun || '2026';
    const bulan = normalizeMonthName(rawBulan);
    const tahun = String(rawTahun).trim();
    const monthNumStr = String(getMonthNumber(bulan));

    await MonthlyRoster.deleteMany({ bulan: { $in: [bulan, monthNumStr] }, tahun });
    const { roster, sortedUsers } = await buildOrSyncRoster(bulan, tahun);
    res.json({
      message: 'Jadwal berhasil disinkronkan dengan database personil aktif!',
      data: formatRosterResponse(roster, sortedUsers)
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mereset jadwal absensi', error: error?.message });
  }
});

// GET /api/attendance/roster/by-date
// Mendukung query ?day=5&month=10&year=2026&shift=PAGI maupun ?tanggal=05 Oktober 2026&dinas=PAGI
router.get('/roster/by-date', async (req: Request, res: Response) => {
  try {
    let hariStr = '';
    let bulanStr = '';
    let tahunStr = '';
    let dinas = String(req.query.shift || req.query.dinas || 'PAGI').toUpperCase();

    if (req.query.tanggal) {
      const parts = String(req.query.tanggal).trim().split(/\s+/);
      if (parts.length === 3) {
        [hariStr, bulanStr, tahunStr] = parts;
      }
    } else {
      hariStr = String(req.query.day || '1');
      bulanStr = normalizeMonthName(req.query.month || 'Oktober');
      tahunStr = String(req.query.year || '2026');
    }

    const dayKeyPad = hariStr.padStart(2, '0');
    const dayKeyNum = String(parseInt(hariStr, 10));

    const { roster } = await buildOrSyncRoster(bulanStr, tahunStr);
    const apindo: { nama: string; kode: string; absensi: string }[] = [];
    const osIass: { nama: string; kode: string; absensi: string }[] = [];
    const omNti: { nama: string; kode: string; absensi: string }[] = [];

    for (const row of roster.rows || []) {
      const code = String(row.days?.[dayKeyPad] || row.days?.[dayKeyNum] || '').toUpperCase().trim();
      const isMatchShift = dinas === 'PAGI' ? code === 'P' || code === 'PS' : code === 'M';

      if (isMatchShift) {
        const comp = normalizeCompany(row.perusahaan);
        const fullName = row.namaLengkap || (row as any).nama;
        if (comp === 'APINDO') apindo.push({ nama: fullName, kode: code, absensi: 'H' });
        else if (comp === 'IASS') osIass.push({ nama: fullName, kode: code, absensi: 'H' });
        else if (comp === 'NTI') omNti.push({ nama: fullName, kode: code, absensi: 'H' });
      }
    }

    res.json({
      tanggal: `${dayKeyPad} ${bulanStr} ${tahunStr}`,
      dinas,
      apindo,
      osIass,
      omNti
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Gagal mengambil personil berdinas pada tanggal tersebut', error: error?.message });
  }
});

// Tetap dukung endpoint lama GET / POST /api/attendance untuk kompatibilitas
router.get('/', async (req: Request, res: Response) => {
  try {
    const tanggal = req.query.tanggal as string;
    const dinas = ((req.query.dinas as string | undefined) || 'PAGI') as any;
    const attendance = await Attendance.findOne({ tanggal, dinas });
    if (!attendance) return res.status(404).json({ message: 'Data absensi belum tersedia.' });
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data absensi' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { tanggal, dinas, apindo, osIass, omNti } = req.body;
    const updatedAttendance = await Attendance.findOneAndUpdate(
      { tanggal, dinas },
      { apindo, osIass, omNti },
      { returnDocument: 'after', upsert: true }
    );
    res.status(200).json({ message: 'Absensi disimpan', data: updatedAttendance });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan absensi' });
  }
});

export default router;
