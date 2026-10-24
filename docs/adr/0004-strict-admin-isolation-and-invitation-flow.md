# Pemisahan Mutlak Peran Admin dan Alur Undangan Admin

Pemisahan mutlak peran Administrator dari fungsionalitas Pengguna biasa, serta penetapan alur pembuatan Admin melalui Bootstrap Env dan Undangan Email (Admin Invitation).

## Konteks & Pertimbangan

Sebelumnya, pengguna yang mendaftar menggunakan email yang terdaftar di `ADMIN_EMAILS` otomatis mendapatkan role `admin`, namun tetap dipaksa menyelesaikan alur Onboarding pengguna biasa (mengisi tanggal gajian, pemasukan, dan alokasi kategori). Akun admin juga dapat mengakses seluruh rute pengguna (`/dashboard`, `/expenses`, `/categories`, `/history`), yang mengakibatkan:
1. **Pencemaran Data Agregasi**: Data dummy/pribadi admin ikut terhitung dalam metrik analitik aplikasi (total pengguna, pengeluaran rata-rata, dsb.).
2. **Pengalaman Pengguna yang Ambigu**: Admin diarahkan ke alur pencatatan keuangan pribadi alih-alih konsol manajemen sistem.

## Keputusan Arsitektur

1. **Pemisahan Rute Mutlak (Strict Route Guarding)**:
   * Akun dengan peran `admin` dilarang mengakses rute pengguna (`/dashboard`, `/expenses`, `/categories`, `/history`, `/onboarding`). Setiap percobaan akses akan dialihkan (*redirect 303*) ke `/admin`.
   * Akun dengan peran `user` dilarang mengakses rute Admin Console (`/admin/*`).
   * Bypass Onboarding: Akun dengan peran `admin` dikecualikan dari alur Onboarding pengguna dan otomatis dianggap selesai (*completed*).
2. **Pembersihan Antarmuka**:
   * Menghilangkan tautan pintasan "Ke Aplikasi" dari Admin Console dan tautan "Admin Panel" dari dashboard pengguna.
3. **Alur Pembuatan Admin**:
   * **Admin Pertama (Bootstrap)**: Dibuat melalui pendaftaran form registrasi publik saat database kosong/awal, di mana sistem mendeteksi kecocokan email terhadap variabel lingkungan `ADMIN_EMAILS`.
   * **Admin Selanjutnya (Admin Invitation)**: Dibuat melalui fitur Undangan di Admin Console. Administrator yang aktif memasukkan email tujuan, sistem menerbitkan token berbatas waktu dan mengirimkan tautan undangan. Calon admin menyelesaikan aktivasi dengan mengisi nama dan password baru.
