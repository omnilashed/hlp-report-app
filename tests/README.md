# Pengujian impor jadwal scan

`roster-import.integration.cjs` menguji unggah dua PDF, periode dokumen, 276 sel referensi yang dibaca manual, penyimpanan MongoDB, pembacaan personil per tanggal/shift, gagal simpan, dan dokumen kosong. Membutuhkan dependensi frontend/backend terpasang dan Chromium dari Puppeteer backend.

Gunakan backend uji dengan `PORT=5001` dan `MONGO_URI` yang menunjuk database uji terpisah. Jalankan Vite pada port 5174 dengan `VITE_API_TARGET=http://127.0.0.1:5001`. Jangan arahkan pengujian ini ke database utama: pengujian menyimpan jadwal Agustus dan September 2026.

Salin PDF contoh ke folder lokal sebagai `agustus.pdf` dan `september.pdf`. PDF sumber tidak disertakan dalam Git. Folder default: `logs/pdf-fixtures`; dapat diubah melalui `HLP_SCAN_FIXTURES`.

Dari root repositori di PowerShell:

```powershell
$env:HLP_TEST_DATABASE_CONFIRMED = '1'
$env:HLP_TEST_URL = 'http://127.0.0.1:5174'
node tests/roster-import.integration.cjs
```

Password pengguna `maulana` dibaca dari `backend/.env` atau `HLP_TEST_PASSWORD`. Hasil pengujian dan screenshot ditulis ke `logs/` (diabaikan Git).
