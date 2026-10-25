<p align="center">
  <img src="static/brand/takerin-logo.webp" alt="Takerin Logo" width="128" height="128" />
</p>

<h1 align="center">Takerin</h1>

<p align="center">
  <strong>Takerin gajimu, tenangin bulanmu.</strong>
</p>

<p align="center">
  Aplikasi web modern untuk penganggaran finansial pribadi berbasis persentase dan pencatatan pengeluaran harian yang terarah, terukur, dan transparan.
</p>

<p align="center">
  <a href="https://svelte.dev/"><img src="https://img.shields.io/badge/SvelteKit-5-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="SvelteKit 5" /></a>
  <a href="https://pages.cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-Pages%20%26%20D1-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Pages & D1" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.better-auth.com/"><img src="https://img.shields.io/badge/Auth-Better_Auth-black?style=flat-square" alt="Better Auth" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="MIT License" /></a>
</p>

---

## 📑 Daftar Isi

- [📑 Daftar Isi](#-daftar-isi)
- [💡 Tentang Takerin](#-tentang-takerin)
- [⚖️ Filosofi \& Konsep Inti](#️-filosofi--konsep-inti)
- [✨ Fitur Utama](#-fitur-utama)
  - [🎯 1. Budgeting Berbasis Persentase](#-1-budgeting-berbasis-persentase)
  - [🗓️ 2. Siklus Periode Bulan Dinamis](#️-2-siklus-periode-bulan-dinamis)
  - [💰 3. Multi-Sumber Pemasukan](#-3-multi-sumber-pemasukan)
  - [⚡ 4. Pencatatan Pengeluaran Cepat](#-4-pencatatan-pengeluaran-cepat)
  - [🏦 5. Kategori Tabungan \& Proteksi Kategori Dibekukan (Frozen)](#-5-kategori-tabungan--proteksi-kategori-dibekukan-frozen)
  - [🤖 6. Ringkasan Bulanan \& Evaluasi Cerdas AI](#-6-ringkasan-bulanan--evaluasi-cerdas-ai)
  - [📄 7. Ekspor Laporan Finansial](#-7-ekspor-laporan-finansial)
  - [🛡️ 8. Keamanan \& Autentikasi Modern](#️-8-keamanan--autentikasi-modern)
  - [🛠️ 9. Konsol Administrasi Terpadu](#️-9-konsol-administrasi-terpadu)
  - [📱 10. Akses Cepat \& PWA Ready](#-10-akses-cepat--pwa-ready)
- [🛠️ Tumpukan Teknologi (Tech Stack)](#️-tumpukan-teknologi-tech-stack)
- [🚀 Memulai Cepat (Quick Start)](#-memulai-cepat-quick-start)
  - [Prasyarat](#prasyarat)
  - [Instalasi](#instalasi)
  - [Konfigurasi Lingkungan](#konfigurasi-lingkungan)
  - [Migrasi Basis Data](#migrasi-basis-data)
  - [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [📜 Daftar Perintah (Scripts)](#-daftar-perintah-scripts)
  - [Pengembangan \& Build](#pengembangan--build)
  - [Basis Data](#basis-data)
  - [Pengujian \& Format](#pengujian--format)
- [🌐 Panduan Deployment](#-panduan-deployment)
- [📂 Struktur Proyek](#-struktur-proyek)
- [📄 Kontribusi \& Lisensi](#-kontribusi--lisensi)

---

## 💡 Tentang Takerin

Banyak orang rutin mencatat pengeluaran harian, namun tetap mendapati uang mereka habis sebelum akhir bulan. Hal ini umumnya terjadi karena pengeluaran dicatat **setelah** uang terbelanjakan, tanpa batas alokasi yang jelas di awal.

**Takerin** membalik paradigma tersebut dengan pendekatan perencanaan awal: **bagi dulu di awal periode gajian, lalu catat setiap pengeluaran terhadap jatahnya.** 

Dengan Takerin, setiap rupiah pemasukan bulanan dialokasikan ke dalam takaran persentase kebutuhan (seperti kebutuhan pokok, tabungan, transportasi, hingga hiburan) dengan batas total 100%. Pengguna dapat memantau sisa saldo per pos pengeluaran secara real-time dan mendapatkan pengingat yang ramah saat pengeluaran mendekati atau melampaui batas.

---

## ⚖️ Filosofi & Konsep Inti

> *"Uang yang baik bukan yang banyak, tapi yang punya takaran."*

- **Setiap Rupiah Punya Tempat**: Pemasukan bulanan ditakar sebelum dibelanjakan.
- **Konsistensi 100%**: Total pembagian seluruh kategori aktif harus selalu genap 100%.
- **Batasan yang Membebaskan**: Jatah yang jelas memberikan rasa tenang saat berbelanja tanpa rasa bersalah selama masih berada dalam takaran.
- **Ramah & Edukatif**: Takerin tidak menghalangi atau memblokir pencatatan jika anggaran terlampaui; sistem memberikan pengingat ramah dan wawasan evaluasi yang konstruktif.
- **Siklus Mandiri Berbasis Tanggal Gajian**: Periode anggaran tidak terikat bulan kalender masehi, melainkan dimulai dari **Tanggal Gajian** pengguna (hari ke 1–31) hingga satu hari sebelum gajian berikutnya.

---

## ✨ Fitur Utama

### 🎯 1. Budgeting Berbasis Persentase
- Alokasi pemasukan otomatis berdasarkan persentase yang dapat disesuaikan secara fleksibel.
- Pilihan template kategori bawaan saat onboarding (seperti metode *50/30/20*, *6 Toples*, atau *Kustom*).
- Validasi ketat yang menjamin jumlah seluruh alokasi kategori tepat 100%.

### 🗓️ 2. Siklus Periode Bulan Dinamis
- Dukungan tanggal gajian kustom (hari ke 1–31).
- Penanganan otomatis untuk bulan dengan jumlah hari lebih pendek (misalnya tanggal 31 di bulan Februari).
- Isolasi data per siklus: setiap periode berdiri sendiri tanpa carry-over yang membingungkan.

### 💰 3. Multi-Sumber Pemasukan
- Pencatatan berbagai jenis pendapatan (gaji pokok, freelance, insentif, usaha sampingan).
- Perhitungan total otomatis sebagai basis nominal pengalokasian kategori.

### ⚡ 4. Pencatatan Pengeluaran Cepat
- Tambah, tinjau, dan perbarui pengeluaran harian dengan antarmuka yang bersih dan responsif.
- Indikator sisa saldo dan batas anggaran per kategori yang langsung terbarukan.

### 🏦 5. Kategori Tabungan & Proteksi Kategori Dibekukan (Frozen)
- Flag khusus untuk kategori tabungan/investasi (pengeluaran dianggap bernilai positif).
- Menghapus kategori di tengah periode akan membekukan (*freeze*) kategori tersebut agar riwayat transaksi bulan berjalan tetap utuh hingga akhir periode.

### 🤖 6. Ringkasan Bulanan & Evaluasi Cerdas AI
- Rekapitulasi komprehensif saat siklus periode berakhir.
- Integrasi model kecerdasan buatan (Groq Llama 3.3 / Google Gemini Flash) untuk memberikan ringkasan kebiasaan finansial dan rekomendasi perbaikan.

### 📄 7. Ekspor Laporan Finansial
- Ekspor seluruh rincian transaksi dan ringkasan periode ke dalam format **PDF** dan **CSV** untuk kebutuhan arsip mandiri.

### 🛡️ 8. Keamanan & Autentikasi Modern
- Sistem otentikasi terpercaya menggunakan Better Auth.
- Verifikasi kepemilikan email dan otentikasi dua langkah (2FA) menggunakan One-Time Password (OTP) via Resend.
- Pemisahan peran ketat antara Pengguna (*User*) dan Pengelola (*Admin*).

### 🛠️ 9. Konsol Administrasi Terpadu
- Pengelolaan pengguna dan status akun.
- Pembuatan dan pemeliharaan template kategori publik.
- Sistem undangan administrator baru berbasis token email yang aman.
- Dashboard metrik kesehatan sistem (*system health*).

### 📱 10. Akses Cepat & PWA Ready
- Desain antarmuka mobile-first bernuansa modern.
- PWA manifest dan dukungan mode offline.
- Tampilan mode terang (*light mode*) dan gelap (*dark mode*).

---

## 🛠️ Tumpukan Teknologi (Tech Stack)

| Lapisan | Teknologi | Keterangan |
|---|---|---|
| **Frontend Framework** | [SvelteKit 5](https://kit.svelte.dev/) | Reactivity modern dengan Runes, SSR, dan routing mutakhir |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utilitas CSS modern dan desain token modular |
| **Iconography** | [Hugeicons Svelte](https://hugeicons.com/) | Set ikon modern dan konsisten |
| **Backend & Runtime** | [Cloudflare Pages & Workers](https://pages.cloudflare.com/) | Komputasi serverless berkecepatan tinggi di jaringan edge global |
| **Basis Data** | [Cloudflare D1](https://developers.cloudflare.com/d1/) | Serverless SQLite terdistribusi di edge |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) | Type-safe SQL ORM dan migrasi skema cepat |
| **Autentikasi** | [Better Auth](https://www.better-auth.com/) | Autentikasi modern, pengelolaan sesi, dan flow OTP |
| **Email Service** | [Resend](https://resend.com/) | Pengiriman email transaksional (OTP 2FA, reset sandi, undangan admin) |
| **Layanan AI** | [Groq (Llama 3.3)](https://groq.com/) / [Google Gemini](https://ai.google.dev/) | Inferensi analitik cerdas untuk ringkasan pengeluaran bulanan |
| **Dokumen & Ekspor** | [pdf-lib](https://pdf-lib.js.org/) & CSV Formatter | Generator dokumen laporan langsung di sisi server/client |
| **Testing** | [Vitest](https://vitest.dev/) | Test runner cepat dan terintegrasi untuk pengujian unit |

---

## 🚀 Memulai Cepat (Quick Start)

### Prasyarat

Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `>= 22.0.0`
- **pnpm**: Versi `>= 9.0.0` (disarankan via Corepack)
- Akun Cloudflare (untuk penggunaan Cloudflare D1 / deployment)

### Instalasi

1. Kloning repositori proyek ini:
   ```bash
   git clone https://github.com/HOSEKI7/takerin.git
   cd takerin
   ```

2. Pasang seluruh dependensi proyek:
   ```bash
   pnpm install
   ```

### Konfigurasi Lingkungan

Salin berkas templat lingkungan `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka berkas `.env` dan sesuaikan parameter berikut:

```env
# Kunci Rahasia Better Auth (Minimal 32 karakter acak)
BETTER_AUTH_SECRET="buat-kunci-rahasia-acak-minimal-32-karakter"
BETTER_AUTH_URL="http://localhost:5173"

# Administrator Awal (Email yang otomatis menerima role admin saat login)
ADMIN_EMAILS="admin@takerin.my.id"

# Layanan Email Resend (Kosongkan jika menggunakan mock di mode lokal)
RESEND_API_KEY=""
EMAIL_FROM="Takerin <onboarding@resend.dev>"

# Layanan AI (Opsional untuk fitur ringkasan cerdas)
GROQ_API_KEY=""
GEMINI_API_KEY=""
```

> [!NOTE]
> Jika `RESEND_API_KEY` dikosongkan pada mode pengembangan lokal, sistem email otomatis beralih ke mode mock dan mencetak kode OTP langsung di terminal console.

### Migrasi Basis Data

Jalankan persiapan basis data lokal SQLite (Miniflare D1):

```bash
# Generate file migrasi drizzle
pnpm run db:generate

# Terapkan migrasi ke database lokal D1
pnpm exec wrangler d1 migrations apply takerin-db --local
```

### Menjalankan Aplikasi

Mulai server pengembangan lokal:

```bash
pnpm run dev
```

Buka peramban Anda di [http://localhost:5173](http://localhost:5173) untuk mengakses Takerin.

---

## 📜 Daftar Perintah (Scripts)

### Pengembangan & Build

| Perintah | Deskripsi |
|---|---|
| `pnpm run dev` | Menjalankan server pengembangan Vite lokal |
| `pnpm run build` | Melakukan pengecekan tipe dan mengompilasi aplikasi untuk produksi |
| `pnpm run preview` | Menjalankan pratinjau hasil build lokal menggunakan runtime Cloudflare Pages |
| `pnpm run check` | Memeriksa validasi tipe TypeScript dan komponen Svelte |
| `pnpm run check:watch` | Menjalankan pemeriksaan tipe dalam mode *watch* |

### Basis Data

| Perintah | Deskripsi |
|---|---|
| `pnpm run db:generate` | Membuat berkas migrasi baru dari skema Drizzle |
| `pnpm run db:migrate` | Menerapkan berkas migrasi basis data |
| `pnpm run db:push` | Mendorong perubahan skema secara langsung ke basis data |
| `pnpm run db:studio` | Membuka antarmuka visual Drizzle Studio untuk inspeksi data |

### Pengujian & Format

| Perintah | Deskripsi |
|---|---|
| `pnpm run test` | Menjalankan seluruh pengujian unit menggunakan Vitest |
| `pnpm run test:unit` | Menjalankan Vitest dalam mode interaktif (*watch*) |
| `pnpm run lint` | Memeriksa kepatuhan kode dengan ESLint dan Prettier |
| `pnpm run format` | Memformat seluruh berkas kode sesuai standar Prettier |

---

## 🌐 Panduan Deployment

Aplikasi Takerin dioptimalkan untuk di-deploy pada **Cloudflare Pages** dengan basis data **Cloudflare D1**:

1. Hubungkan repositori GitHub `HOSEKI7/takerin` ke Cloudflare Pages.
2. Pengaturan build di Cloudflare Pages:
   - **Framework preset**: `SvelteKit`
   - **Build command**: `pnpm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
   - **Root directory**: `/`
3. Tambahkan environment variable (`BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, `RESEND_API_KEY`, dll).
4. Kaitkan D1 Database binding dengan nama variable `DB` ke database `takerin-db`.
5. Terapkan migrasi ke database produksi remote:
   ```bash
   pnpm exec wrangler d1 migrations apply takerin-db --remote
   ```
6. Hubungkan domain kustom Anda (misal `takerin.my.id`).

Dokumentasi konfigurasi lengkap tersedia di [docs/deployment.md](docs/deployment.md).

---

## 📂 Struktur Proyek

```text
takerin/
├── docs/                 # Dokumentasi arsitektur (ADR), profil, dan panduan deployment
├── drizzle/              # Berkas migrasi skema SQL D1
├── static/               # Aset statis publik (logo, ikon PWA, maskot brand)
│   ├── brand/            # Logo & wordmark Takerin
│   └── icons/            # Ikon responsif PWA
├── src/
│   ├── lib/              # Modul utilitas bersama, helper logika, dan komponen UI
│   │   ├── components/   # Komponen visual yang dapat digunakan kembali
│   │   ├── server/       # Logika server-only (koneksi DB, auth, email, layanan AI)
│   │   └── types/        # Definisi tipe TypeScript
│   └── routes/           # Routing aplikasi (SvelteKit)
│       ├── (app)/        # Rute utama aplikasi terautentikasi (dashboard, expenses, categories, history, settings)
│       ├── admin/        # Konsol administrasi terisolasi (templates, users, admins, health)
│       ├── api/          # Endpoint API backend (auth, ekspor PDF/CSV, AI summary)
│       ├── auth/         # Alur autentikasi (login, register, OTP 2FA, reset password, admin invite)
│       ├── blog/         # Halaman artikel & edukasi keuangan publik
│       └── onboarding/   # Alur onboarding pertama pengguna baru
├── wrangler.jsonc        # Konfigurasi binding Cloudflare Pages & D1
└── package.json          # Manajemen dependensi dan skrip proyek
```

---

## 📄 Kontribusi & Lisensi

Proyek Takerin didistribusikan di bawah lisensi terbuka [MIT License](LICENSE). Anda bebas menggunakan, memodifikasi, dan mengembangkan kode sumber ini sesuai dengan ketentuan lisensi.

<p align="center">
  Dibuat dengan dedikasi untuk membantu pengelolaan finansial yang lebih tenang dan teratur.
</p>
