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

## 🔋 Kebijakan Baterai (SoC) & Jaminan
1. **Penyerahan Unit**: Baterai minimal 80% – 100% dan charger portable bawaan.
2. **Pengembalian Unit**: Baterai minimal 20% – 30% (mencegah kerusakan sel baterai).
3. **Garansi Pengganti**: Jika terjadi malfungsi teknis murni, unit pengganti dikirim dalam 60–90 menit.
