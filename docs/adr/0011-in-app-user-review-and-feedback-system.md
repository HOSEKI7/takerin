# Sistem Ulasan & Umpan Balik Pengguna Terintegrasi

Penerapan sistem pengumpulan ulasan kepuasan (skor bintang 1–5 dan deskripsi pengalaman) serta umpan balik pengguna (laporan kendala dan usulan fitur) langsung di dalam aplikasi menggunakan penyimpanan internal Cloudflare D1, dialog modal dwimode (*Segmented Control*), pemicu otomatis berbasis ambang batas 5 pengeluaran, serta konsol manajemen di Admin Panel.

## Konteks & Pertimbangan

Aplikasi Takerin berada pada fase pengembangan aktif dan membutuhkan umpan balik langsung dari pengguna nyata untuk menemukan kendala teknis (*bug*) serta memvalidasi ide pengembangan fitur. Terdapat beberapa pertimbangan desain:
1. **Pemisahan Tujuan**: Terdapat perbedaan mendasar antara *Ulasan (Review)* yang bertujuan mengukur tingkat kepuasan holistik (rating bintang + narasi pengalaman) yang kelak diproyeksikan sebagai materi pembuktian sosial (*social proof/marketing*), dengan *Umpan Balik (Feedback)* yang berorientasi pada pelaporan kendala teknis atau saran fitur terarah.
2. **Kualitas Responden**: Formulir tidak boleh muncul secara acak kepada pengguna yang belum benar-benar mencoba aplikasi. Diperlukan ambang batas aktivitas nyata agar masukan yang masuk berkualitas.
3. **Privasi & Kemandirian Layanan**: Menggunakan widget pihak ketiga (seperti Canny, Google Forms, atau Typeform) berpotensi membebani kuota gratis, menambah skrip pelacak eksternal, dan merusak keselarasan antarmuka minimalis Takerin.

## Keputusan Arsitektur

1. **Penyimpanan Internal Cloudflare D1 (`app_feedback`)**:
   - Seluruh entri ulasan dan umpan balik disimpan dalam tabel terdedikasi di Cloudflare D1 dengan relasi ke `user.id`.
   - Menampung atribut inti: `type` (`review` | `feedback`), `rating` (1–5 bintang, khusus review), `category` (`bug` | `feature` | `general`, khusus feedback), `content`, `current_route`, `device_info` (peramban dan resolusi), status penanganan (`pending` | `reviewed` | `resolved`), serta penanda masa depan `is_featured` / `is_public` (default `false`) untuk persiapan *social proof* promosi di landing page.

2. **Antarmuka Dwimode (*Segmented Control* di Modal)**:
   - Satu komponen dialog modal terintegrasi yang menyediakan *Segmented Control* di bagian atas:
     - **Tab Ulasan (Review)**: Pilihan bintang 1–5 + textarea pengalaman.
     - **Tab Umpan Balik (Feedback)**: Pilihan kategori (*Laporan Kendala*, *Saran Peningkatan*, *Umum*) + textarea penjelasan masalah/saran.
   - Menghindari fragmentasi UI dengan menggabungkan kedua kebutuhan dalam satu wadah yang konsisten dengan desain sistem `DESIGN.md`.

3. **Logika Pemicu Otomatis (Ambang Batas 5 Pengeluaran)**:
   - Dialog muncul otomatis tepat setelah pengguna berhasil mencatat pengeluaran ke-5 pada Periode Bulan aktif.
   - Disediakan checkbox *"Jangan tampilkan lagi untuk sesi ini"* yang mencatat status penundaan pada `sessionStorage`.
   - Setelah pengguna berhasil mengirimkan ulasan atau umpan balik satu kali, pemicu otomatis dinonaktifkan secara permanen bagi akun tersebut.

4. **Titik Akses Mandiri (*On-Demand*) di Pengaturan (`/settings`)**:
   - Disediakan tombol aksi mandiri di halaman Pengaturan agar pengguna yang menutup pop-up otomatis atau ingin mengirimkan masukan baru di lain waktu tetap memiliki akses kapan saja.

5. **Konsol Manajemen di Admin Panel (`/admin/feedback`)**:
   - Disediakan halaman khusus pada Admin Console untuk meninjau data masuk dengan metrik agregat (rata-rata rating, total umpan balik pending), tabel filterisasi, dialog detail data teknis diagnostik, pembaruan status penanganan, serta opsi penghapusan entri spam.

## Konsekuensi & Trade-off

* **Positif**: Privasi data terjaga sepenuhnya, UI selaras 100% dengan tema aplikasi, pengalaman pengguna terkurasi (hanya pengguna aktif yang diminta ulasan), serta data ulasan siap dipakai untuk kebutuhan landing page di masa depan tanpa migrasi database.
* **Trade-off Batasan Media**: Unggah berkas gambar/screenshot ditunda (*out-of-scope*) pada rilis awal ini untuk menghindari ketergantungan storage objek Cloudflare R2 dan menjaga skema D1 tetap ramping.
