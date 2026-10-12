# Menjalankan HLP Report App di Windows

1. Pastikan service MongoDB berjalan.
2. Klik dua kali `start-local.cmd`.
3. Buka http://localhost:5173.

HTTPS aktif secara default untuk proyek. Komputer pengembangan ini memakai `VITE_DEV_HTTPS=false` di `frontend/.env` (tidak ikut Git) sehingga alamat lokalnya HTTP. Pada PC yang diakses HP, gunakan HTTPS; jangan salin pengecualian HTTP lokal. Sertifikat harus dipercaya browser HP dan cocok dengan alamat server yang digunakan. HTTPS bawaan plugin Vite memakai sertifikat self-signed, sehingga kepercayaan sertifikat tetap perlu dikonfigurasi. Untuk hosting build produksi, HTTPS dikonfigurasi pada web server/reverse proxy.

## Login lokal

Username admin bawaan: `maulana`.
Password awal ada pada `DEFAULT_USER_PASSWORD` di `backend/.env`.
Database lokal: `hlp_logbook`, pada `127.0.0.1:27017`.
Data laporan produksi tidak disertakan dalam repositori.

## Log dan konfigurasi

- Backend: `logs/backend.log` dan `logs/backend.error.log`.
- Frontend: `logs/frontend.log` dan `logs/frontend.error.log`.
- Konfigurasi dan rahasia lokal: `backend/.env` (diabaikan Git).
- QR untuk menghubungkan WhatsApp muncul di log backend. WhatsApp belum dihubungkan.
- Hasil audit npm: `logs/frontend-audit.json` dan `logs/backend-audit.json`.

## Pemeriksaan

Frontend: `npm run build` dan `npm run lint` di folder frontend.
Backend: `npx tsc --noEmit` di folder backend.
Lint memiliki peringatan bawaan. Dependensi memiliki temuan audit yang perlu ditangani terpisah sebelum penggunaan produksi.

Setelah instalasi Git dan Node.js, buka ulang terminal lama agar PATH terbaru terbaca.

## Impor PDF/scan jadwal

Buka Management Absensi dan lepaskan PDF atau gambar scan ke area impor. Pembacaan dilakukan lokal di browser. Periode tujuan diambil dari judul dokumen; tampilan berpindah ke periode tersebut setelah penyimpanan berhasil. Nama/NIK dicocokkan dengan akun aktif. Sel yang belum terbaca dan personil yang tidak ditemukan ditampilkan pada rincian impor; nilai jadwal sebelumnya dipertahankan untuk bagian tersebut.

Gunakan scan seluruh halaman dengan garis tabel, nama/NIK, kode shift dan judul bulan/tahun yang jelas. Maksimal 30 MB dan 10 halaman dengan satu periode. Tanda tangan tidak diverifikasi otomatis; dokumen asli dapat dilihat melalui pratinjau. Impor tidak mengubah riwayat kehadiran atau laporan yang sudah diisi; penarikan personil di form absensi menggunakan jadwal yang baru disimpan.

Aset OCR disiapkan oleh `npm run prepare:ocr` di frontend (juga berjalan sebelum dev/build). Setelah menyalin proyek ke komputer lain, jalankan `npm ci` pada frontend dan backend.
