# Layout Navigasi Sidebar dan Isolasi Route Group (app)

Peralihan arsitektur navigasi dari topbar terduplikasi menjadi layout navigasi sidebar bersama melalui SvelteKit route group `(app)` untuk antarmuka Pengguna terproteksi, serta pembaharuan sidebar terisolasi untuk Konsol Administrator.

## Konteks & Pertimbangan

Sebelumnya, antarmuka Pengguna (`/dashboard`, `/categories`, `/expenses`, `/history`, `/settings`) menduplikasi markup topbar di masing-masing file halaman (`+page.svelte`). Hal ini menyebabkan beberapa masalah:
1. **Redundansi Kode & Inkonsistensi**: Logika pergantian tema, status login, dan link navigasi terduplikasi di setiap halaman pengguna.
2. **Keterbatasan Ruang Topbar**: Seiring bertambahnya modul dan fitur pengelolaan anggaran, navigasi horizontal atas (topbar) menjadi padat dan sulit menampung sub-menu atau aksi cepat.
3. **Pengalaman Mobile yang Kurang Rapi**: Topbar di mobile memerlukan overflow scroll horizontal yang kurang ergonomis dibandingkan drawer vertikal.

## Keputusan Arsitektur

1. **Pemisahan Layout Bersama via Route Group `(app)`**:
   - Memindahkan halaman-halaman pengguna terproteksi ke dalam folder route group SvelteKit `src/routes/(app)/` dengan layout bersama `(app)/+layout.svelte`.
   - URL publik aplikasi tidak berubah (tetap `/dashboard`, `/categories`, `/expenses`, dll.).
   - Halaman publik (Landing Page `/`, Blog `/blog/*`, dan Autentikasi `/auth/*`) tetap berada di luar `(app)` dan mempertahankan tata letak aslinya.
2. **Navigasi Sidebar Responsif (Breakpoint `lg` / 1024px)**:
   - **Desktop (`≥ 1024px`)**: Sidebar kiri tetap (*fixed*) berukuran lebar standar ~256px, dilengkapi tombol ciutkan (*collapsible*) ke mode *icon-only* (~72px) yang tersimpan di `localStorage`.
   - **Mobile & Tablet (`< 1024px`)**: Menggunakan *Top Header* tipis dengan tombol hamburger yang membuka *Slide-over Drawer* dari kiri dengan latar redup (*backdrop blur/dim*). Drawer otomatis menutup saat rute berpindah atau saat *backdrop* disentuh.
3. **Isolasi Mutlak Navigasi Administrator**:
   - Selaras dengan ADR 0004, Konsol Administrator (`/admin/*`) menggunakan sidebar tersendiri di `src/routes/admin/+layout.svelte` tanpa tautan pintasan atau peralihan ke tampilan Pengguna biasa.
4. **Header Konten Minimalis & Breadcrumb**:
   - Menghilangkan topbar tebal berlapis di atas konten. Menggantinya dengan *content header* ringan yang memuat judul halaman dan rekam jejak navigasi (*breadcrumb*) otomatis untuk sub-halaman bertingkat (misal: `/expenses/new`, `/history/[periodId]`).
5. **Bahasa Desain (Wise Tokens)**:
   - Menggunakan token desain *Wise*: latar belakang `bg-fog/40` (light) / `bg-dark-surface` (dark), dan item aktif berbentuk *rounded-xl* berlatar `Forest Ink` (`#163300`) dengan teks/ikon `Lime Voltage` (`#9fe870`).
