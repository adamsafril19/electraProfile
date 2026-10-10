# Electra Profile - Platform Rental Mobil Listrik (EV) Mandiri

Platform digital rental mobil listrik (EV) independen skala rintisan berfokus pada pasar retail/wisatawan (B2C), mengadopsi standar kepercayaan INDORENT dengan transparansi tarif harian dan sistem **WhatsApp-First Booking**.

---

## 🏗️ Tech Stack
* **Frontend**: React Native (Universal Web & Mobile via **Expo SDK 51+**, Expo Router v3)
* **Backend**: Node.js & Express.js REST API (TypeScript, Zod, Helmet, Rate Limiter)
* **Database**: PostgreSQL 15+ (Relational Architecture & ACID Compliance)

---

## 📁 Struktur Monorepo

```text
electraProfile/
├── PRD-Rental-EV-Mandiri.md    # Dokumen Spesifikasi Produk Lengkap (PRD)
├── package.json                # Root Workspaces Configuration
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # Environment & DB Config
│   │   ├── controllers/        # Fleet, Inquiry, SoC Controllers
│   │   ├── data/               # Seed Mock Fleet Data
│   │   ├── middlewares/        # Rate Limiting & Error Handler
│   │   ├── routes/             # REST Endpoints (/fleet, /inquiries, /soc)
│   │   ├── services/           # WhatsApp URL Builder & Business Logic
│   │   ├── types/              # TypeScript Types
│   │   ├── validators/         # Zod Request Validators
│   │   ├── app.ts              # Express App setup
│   │   └── server.ts           # Server Listener (Port 5000)
│   ├── tsconfig.json
│   └── package.json
└── frontend/                   # React Native (Expo) Universal Web
    ├── app/                    # Expo Router File-Based Routing
    │   ├── _layout.tsx         # Root Layout (Navbar & Footer)
    │   ├── index.tsx           # Landing Page (5-10s Rule & Quick Widget)
    │   ├── armada/
    │   │   ├── index.tsx       # Katalog Armada Lengkap & Filter
    │   │   └── [slug].tsx      # Detail Spesifikasi Teknis EV & Sticky Price
    │   ├── panduan-ev.tsx      # Edukasi Home Charging, Colokan, & SPKLU
    │   ├── syarat-ketentuan.tsx# Verifikasi Dokumen, Deposit, & Aturan SoC
    │   └── bantuan-darurat.tsx # 24/7 Roadside Assistance & Replacement Car
    ├── components/             # Reusable UI (VehicleCard, TrustBadges, WhatsAppModal)
    ├── constants/              # Color Tokens & Offline Fleet Fallback
    ├── services/               # API Client & WhatsApp Linking Service
    ├── types/                  # TypeScript Interfaces
    ├── app.json                # Expo Configuration
    └── package.json
```

---

## 🚀 Panduan Menjalankan Proyek

### 1. Menjalankan Backend API
```bash
cd backend
npm install
npm run dev
```
Backend akan berjalan di `http://localhost:5000`:
* `GET  /api/v1/health` : Status kesehatan API
* `GET  /api/v1/fleet` : Data seluruh armada aktif
* `GET  /api/v1/fleet/:slug` : Detail spesifikasi mobil
* `POST /api/v1/inquiries` : Pencatatan reservasi + generator URL WhatsApp
* `POST /api/v1/soc/handover` : Pencatatan serah terima level baterai
* `POST /api/v1/soc/return` : Verifikasi baterai kembali & kalkulasi penalti

### 2. Menjalankan Frontend (Web / Mobile)
```bash
cd frontend
npm install
npm run web
```
Aplikasi web akan terbuka otomatis di browser Anda (port `8081`).

---

## 🛠️ Panel Admin

Buka `http://localhost:8081/admin` (navigasi di sidebar):

| Menu | Fungsi |
| :--- | :--- |
| **Ringkasan** | Angka kunci operasional, hal yang perlu ditindak, keuangan bulan berjalan |
| **Pesanan** | Konfirmasi/batalkan, tugaskan driver, catat pembayaran, serah terima & pengembalian (SoC) |
| **Jadwal** | Kalender bulanan + timeline per unit/driver, deteksi bentrok, ekspor `.ics` & tombol Google Calendar |
| **Armada** | Tampil/sembunyi di situs, status unit, tarif & deposit |
| **Driver** | Data driver, cuti, penugasan; penugasan yang bentrok ditolak otomatis |
| **Keuangan** | Pemasukan, pengeluaran, piutang, deposit, buku kas (tanda "Live", segar tiap 10 dtk), ekspor CSV |
| **Live Chat** | Inbox percakapan dengan pengunjung situs (widget chat di pojok kanan bawah situs) |

Kredensial diatur di `backend/.env` (tidak masuk git):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<password-kuat>
ADMIN_TOKEN_SECRET=<string-acak-panjang>   # opsional; tanpa ini sesi berakhir tiap server restart
```

* Tanpa `ADMIN_PASSWORD`: di development password acak dibuat tiap start dan dicetak di log; di production login admin **dinonaktifkan**.
* `/api/v1/admin/*` dan `/api/v1/soc/*` wajib token (`Authorization: Bearer ...`); login dibatasi 10 percobaan / 15 menit per IP.
* **Penyimpanan data:** tanpa PostgreSQL, reservasi, driver, pembayaran, pengeluaran, chat, dan perubahan armada disimpan di `backend/data/store.json` (tidak masuk git, ditulis atomik). Cocok untuk satu server; **bukan pengganti database untuk produksi** (belum ada model Prisma untuk driver/keuangan/chat).
* **Google Calendar:** ekspor `.ics` lalu impor di Google Calendar, atau tombol "Tambah ke Google Calendar" per reservasi. Sinkronisasi otomatis dua arah butuh kredensial Google API dan belum diaktifkan.
* **Real-time:** memakai polling (keuangan 10 dtk, chat 3 dtk, badge sidebar 10 dtk), bukan WebSocket.
* **Data demo (untuk mengecek tampilan dengan data):** `npm --prefix backend run dev:demo` membuat data contoh statis (17 reservasi di semua status, 5 driver, 27 pembayaran, 19 pengeluaran, 4 chat, 1 unit dalam perawatan, 1 bentrok jadwal, 1 unit terlambat kembali) dan menjalankan backend dengannya. Dibuat ulang tiap dijalankan, tanggalnya relatif terhadap hari ini, dan disimpan di `backend/data/demo-store.json` sehingga data asli (`store.json`) tidak tersentuh. Kembali ke data asli dengan `npm --prefix backend run dev`.
* **Pintasan:** `Ctrl + K` membuka pencarian cepat (reservasi, pelanggan, driver, unit, halaman, aksi cepat).
* Aturan jadwal: satu reservasi menempati hari `[mulai, selesai)`, jadi unit yang kembali tanggal X bisa disewa lagi mulai tanggal X.

---

## 🔋 Kebijakan Baterai (SoC) & Jaminan
1. **Penyerahan Unit**: Baterai minimal 80% – 100% dan charger portable bawaan.
2. **Pengembalian Unit**: Baterai minimal 20% – 30% (mencegah kerusakan sel baterai).
3. **Garansi Pengganti**: Jika terjadi malfungsi teknis murni, unit pengganti dikirim dalam 60–90 menit.
