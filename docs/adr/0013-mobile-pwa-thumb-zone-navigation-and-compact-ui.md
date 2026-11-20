# 0013: Arsitektur UI/UX Mobile PWA Ramah Ibu Jari dan Antarmuka Kompak

Keputusan arsitektur untuk merombak antarmuka mobile (< 1024px) PWA Takerin dengan adopsi *Bottom Navigation Bar*, gestur *Edge-Swipe*, paginasi terikat URL pada daftar Pengeluaran, baris transaksi mikro (*compact list rows*), slider alokasi lebar-penuh dengan tombol mikro stepper, serta dasbor finansial terfokus.

## Konteks & Pertimbangan

Sebelumnya (ADR 0005), tata letak mobile mengandalkan tombol hamburger di pojok kiri atas dan *slide-over drawer*. Berdasarkan audit antarmuka dan kebutuhan pengguna harian pada perangkat bergerak (PWA), ditemukan beberapa titik friksi ergonomis:
1. **Friksi Ergonomi Jangkauan Ibu Jari (*Thumb Zone*):** Tombol hamburger di kiri atas berada di area paling sulit dijangkau saat memegang ponsel dengan tangan kanan (*Ow Zone*). Akses ke rute harian (*Dashboard*, *Pengeluaran*, *Kategori*, *Riwayat*) membutuhkan minimal 2 ketukan.
2. **Pemborosan Ruang Layar Vertikal (*Stacked Header*):** Penumpukan `MobileNav` (56px) dan `ContentHeader` breadcrumb (48px) memotong lebih dari 100px tinggi layar sebelum konten dimulai. Di layar ponsel, breadcrumb tidak banyak dimanfaatkan.
3. **Scroll Tak Terhingga (*Infinite Scroll Fatigue*):** Mekanisme *"Muat Lebih Banyak"* membuat daftar Pengeluaran membengkak tanpa batas, mempersulit navigasi dan memperlambat rendering DOM saat transaksi bertambah banyak.
4. **Slider Alokasi Terlalu Sempit:** Slider alokasi persentase Kategori berukuran sempit (`w-28` / 112px), sehingga setiap 1% hanya mendapat lebar ~1.1px. Hal ini membuat sentuhan jari pengguna sering meleset dan sulit presisi.
5. **Kepadatan Kartu & Redundansi Dasbor:** Kartu Pengeluaran dan Kategori terlalu tinggi (> 110px), dan Dasbor menduplikasi pengaturan Keamanan 2FA yang sebenarnya sudah tersedia di Pengaturan Akun (`/settings`).

## Keputusan Arsitektur

### 1. Navigasi Mobile Ramah Ibu Jari (Bottom Navigation Bar & Edge-Swipe)
- **Bottom Navigation Bar Tetap (`fixed bottom-0`):** Menyediakan 4 tab rute primer:
  1. `/(app)/dashboard` (Dasbor)
  2. `/(app)/expenses` (Pengeluaran)
  3. Tombol menonjol tengah: `/(app)/expenses/new` ((+) Catat Pengeluaran Cepat)
  4. `/(app)/categories` (Kategori)
  5. `/(app)/history` (Riwayat Periode)
- **Dukungan Safe Area PWA:** Bilah navigasi bawah mengadopsi `padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem)` untuk mencegah tombol terpotong *home bar* iOS/Android.
- **Gestur Usap Tepi (*Edge-Swipe*) & Menu Sekunder:** Usapan dari tepi kiri layar membuka *Drawer* samping yang memuat menu sekunder: Sumber Pemasukan (`/incomes`), Pengaturan Akun (`/settings`), Dukungan Kopi Trax, Ganti Tema, dan Keluar. Drawer juga tetap dapat diakses dengan mengetuk avatar pengguna di bilah atas kanan.

### 2. Penyatuan Bilah Atas & Eliminasi Breadcrumb Mobile
- Di bawah breakpoint `lg` (`< 1024px`), komponen `ContentHeader` (breadcrumb) disembunyikan (`hidden lg:block`).
- Bilah atas mobile dirampingkan (tinggi ~50px) dengan logo merek di kiri, dan toggle tema + avatar pengguna di kanan.

### 3. Paginasi Terikat URL untuk Daftar Pengeluaran
- Menggantikan tombol *"Muat Lebih Banyak"* dengan kontrol paginasi ringkas: `[ < Sebelumnya ]`, label `[ Halaman X dari Y ]`, dan `[ Berikutnya > ]`.
- Default ukuran halaman: **15 Pengeluaran per halaman**.
- Sinkronisasi URL dua arah: nomor halaman disimpan dalam query parameter `?page=X`. Mengganti filter kategori otomatis mereset halaman ke `1`.

### 4. Baris Pengeluaran Mikro (*Compact List Rows*)
- Mengubah kartu transaksi vertikal tinggi menjadi baris ramping setinggi ~56–64px dengan tata letak 2 baris:
  - Baris atas: Nama Pengeluaran (kiri, bold) & Nominal Rupiah (kanan, bold).
  - Baris bawah: Badge Kategori & Tanggal/Jam (kiri) & Tombol Hapus Cepat (kanan).
- Mengetuk baris membuka formulir pengubahan transaksi (`/expenses/[id]/edit`).

### 5. Slider Alokasi Lebar-Penuh dengan Tombol Mikro Stepper
- Slider alokasi Kategori dibuat memanjang penuh (`w-full`) di layar mobile dengan area sentuh yang tebal.
- Dilengkapi tombol mikro stepper `[-]` dan `[+]` dengan kelipatan **1% per ketukan** untuk penyesuaian presisi tinggi tanpa jari meleset.
- Indikator nominal Rupiah alokasi ditampilkan secara langsung di atas track slider.

### 6. Dasbor Finansial Terfokus
- Mengganti grid 4 kotak ringkasan periode dengan satu kartu fokus (*Hero Balance Card*) yang menonjolkan Sisa Anggaran periode aktif.
- Menampilkan maksimal 4 Kategori dengan alokasi/pengeluaran terbesar, dilengkapi tombol toggle ekspansi di tempat (*"Tampilkan Semua Kategori"*) agar halaman tidak melar ke bawah.
- Menghapus modul duplikat Keamanan 2FA dari Dasbor; konfigurasi 2FA dipusatkan seutuhnya di Pengaturan Akun (`/settings`).

## Konsekuensi & Trade-off

- **Positif:** Mengurangi gerakan tangan drastis (90% aksi berada di jangkauan ibu jari kanan), menghemat ~150px ruang vertikal atas dan tengah, navigasi antarhalaman terasa seperti aplikasi native, dan mencegah lag performa DOM pada daftar transaksi panjang.
- **Trade-off:** Bottom bar mengambil ~64px ruang vertikal di bagian bawah layar (diimbangi dengan penambahan padding bawah kontainer konten `pb-20`), dan pengguna yang ingin melihat transaksi ke-16 ke atas harus mengetuk tombol halaman berikutnya alih-alih sekadar *scroll* terus-menerus.
