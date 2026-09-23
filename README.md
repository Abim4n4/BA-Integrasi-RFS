# BA Integrasi RFS

> **Sistem Manajemen & Berita Acara Ready For Service (BA-RFS)**  
> **PT. Fajar Mitra Krida Abadi (FMKA)**

Aplikasi terintegrasi untuk penerbitan, validasi, pengesahan tanda tangan digital 3 pihak (ISP, Waspang Famika, dan Mitra Pelaksana), serta export otomatis dokumen Berita Acara RFS ke dalam format **PDF standar A4 presisi 2 lembar**.

---

## 🌟 Fitur Utama

- **Form Input BA-RFS Cerdas & Cepat**: Input otomatis data ISP, lokasi pelanggan, redaman optik (OPM), hasil uji kecepatan (speedtest), evident port uplink/OTB, dan matriks 21 parameter pengujian POC.
- **Tanda Tangan Digital 3 Pihak**: Canvas tanda tangan responsif untuk ISP, Waspang Famika, dan Teknisi/Mitra dengan QR code verifikasi keaslian dokumen.
- **Export PDF Presisi 2 Lembar A4**: Menggunakan jsPDF & html2canvas-pro dengan layout ketat 2 halaman pas (Lembar 1: Berita Acara & TTD resmi; Lembar 2: 21 Evident POC Pengujian).
- **Mode Ramah Pengawas Lapangan (Font Waspang)**: Pilihan ukuran huruf fleksibel (Normal, Besar, Ekstra Besar) untuk kenyamanan waspang senior di lapangan.
- **Dukungan Multi-Platform Deployment**:
  - **Full-stack Express/Node.js** (dengan REST API `/api/*`)
  - **Vercel / Netlify (Static SPA)** dengan autentikasi mandiri (*Client-Resilient Auth*)
  - **Google Apps Script (GAS)** dengan generator kode mandiri (`Code.gs` & `Index.html`).
- **Integrasi Cloud & Google Workspace**:
  - Database riwayat Firebase Firestore & Auth
  - Ekspor / backup ke Google Sheets Spreadsheet & Google Drive
  - Pengiriman Berita Acara langsung via Gmail API.

---

## 🚀 Menjalankan Aplikasi Secara Lokal

1. **Instal dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan server pengembangan**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

3. **Build untuk produksi**:
   ```bash
   npm run build
   ```

---

## 👥 Akun Default

- **Super Admin**: `admin@rfs.telco.id` (Sandi: `admin123`)
- **Senior Field Engineer**: `teknisi@rfs.telco.id` (Sandi: `teknisi123`)
- **Account Executive**: `sales@rfs.telco.id` (Sandi: `sales123`)

---

© PT. Fajar Mitra Krida Abadi. Hak Cipta Dilindungi Undang-Undang.
