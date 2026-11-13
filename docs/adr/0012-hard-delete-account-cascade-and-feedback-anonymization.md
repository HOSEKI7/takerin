# Kebijakan Penghapusan Akun Total (Hard Delete) & Anonimisasi Ulasan

Penerapan penghapusan data pengguna permanen (*Hard Delete Total*) untuk seluruh entitas keuangan pribadi dan kredensial autentikasi di Cloudflare D1, pembersihan sesi multi-varian cookie Better Auth, anonimisasi entri ulasan dan umpan balik, serta perbaikan urutan kaskade relasional basis data untuk mencegah kegagalan *foreign key constraint* (Internal Error 500).

## Konteks & Masalah

Fitur penghapusan akun pada halaman Pengaturan (`POST /settings?/deleteAccount`) sebelumnya mengalami kegagalan *Internal Server Error (500)* di lingkungan produksi (`takerin.my.id`). Melalui investigasi mendalam, ditemukan beberapa akar masalah:
1. **Pelanggaran Batasan Kunci Asing (*Foreign Key Order Violation*)**:
   Eksekusi kaskade pada fungsi `deleteUserData` mengeksekusi penghapusan `monthly_period` sebelum `income_source`. Mengingat `income_source.period_id` memiliki dependensi kunci asing ke `monthly_period(id)`, SQLite pada Cloudflare D1 menolak eksekusi *batch* karena anak (*child*) belum terhapus.
2. **Kunci Asing Tak Terkaskade pada `admin_invitations`**:
   Tabel `admin_invitations` memiliki relasi `invited_by REFERENCES user(id)` tanpa `ON DELETE CASCADE`. Jika akun pengguna yang dihapus pernah mengundang administrator, operasi `DELETE FROM user WHERE id = ?` ditolak oleh D1.
3. **Residu Token Verifikasi**:
   Tabel `verification` yang menampung token verifikasi OTP (dengan kolom `identifier = user.email`) tidak dibersihkan saat akun dihapus, menyisakan residu saat pengguna mendaftar kembali di kemudian hari.
4. **Pembersihan Cookie Sesi Parsial**:
   Lingkungan produksi HTTPS Better Auth memanfaatkan prefiks cookie aman `__Secure-better-auth.session_token`. Pembersihan sebelumnya hanya menghapus `better-auth.session_token`, sehingga sesi lokal peramban berpotensi tertinggal.
5. **Ketiadaan Penanganan Eksepsi Terstruktur**:
   Aksi form `deleteAccount` tidak membungkus pemanggilan database dalam blok *try-catch*, sehingga error tingkat database langsung diteruskan sebagai respons 500 mentah tanpa pesan ramah pengguna.

## Keputusan Arsitektur

1. **Prinsip Hard Delete Total (*Right to be Forgotten*)**:
   - Seluruh data identitas pengguna (`user`), kredensial autentikasi (`account`, `session`, `two_factor`), preferensi sistem (`user_settings`), dan seluruh riwayat keuangan (`monthly_period`, `category`, `expense`, `income_source`) dihapus permanen dari basis data Cloudflare D1.
   - Tidak menerapkan *Soft Delete* atau *Deaktivasi Akun* guna menjamin privasi absolut data keuangan pengguna, menghemat alokasi penyimpanan D1, serta menjaga kesederhanaan kueri aplikasi tanpa perlu menambahkan filter `WHERE deleted_at IS NULL` di seluruh basis kode.
   - Jika pengguna di masa mendatang masuk kembali menggunakan alamat email yang sama, sistem memperlakukannya sebagai pendaftar baru (*fresh registration*) yang melalui verifikasi OTP dan alur *onboarding* dari awal.

2. **Anonimisasi Ulasan & Umpan Balik (`app_feedback`)**:
   - Ulasan rating dan laporan kendala yang pernah dikirimkan pengguna tidak dimusnahkan agar wawasan pengembangan produk dan metrik kepuasan tetap terjaga.
   - Tautan kepemilikan diputus dengan memperbarui `user_id` pada tabel `app_feedback` ke pengguna penampung anonim (`takerin_anonymous_user`), sehingga identitas asli pengguna terhapus total tanpa merusak integritas relasional maupun tampilan konsol admin.

3. **Urutan Kaskade Relasional Anak-ke-Induk (*Strict Child-to-Parent Order*)**:
   Pernyataan SQL dalam transaksi *batch* D1 disusun dengan urutan hierarki yang aman:
   1. `app_feedback`: Lepaskan tautan (`UPDATE app_feedback SET user_id = ? WHERE user_id = ?`).
   2. `expense`: Hapus entri pengeluaran (`DELETE FROM expense WHERE user_id = ?`).
   3. `income_source`: Hapus entri sumber pemasukan (`DELETE FROM income_source WHERE user_id = ?`).
   4. `category`: Hapus kategori pengeluaran (`DELETE FROM category WHERE user_id = ?`).
   5. `monthly_period`: Hapus periode bulanan (`DELETE FROM monthly_period WHERE user_id = ?`).
   6. `user_settings`: Hapus pengaturan pengguna (`DELETE FROM user_settings WHERE user_id = ?`).
   7. `two_factor`: Hapus konfigurasi 2FA (`DELETE FROM two_factor WHERE user_id = ?`).
   8. `session`: Hapus seluruh sesi aktif (`DELETE FROM session WHERE user_id = ?`).
   9. `account`: Hapus data penyedia auth (`DELETE FROM account WHERE user_id = ?`).
   10. `admin_invitations`: Bersihkan undangan yang dibuat pengguna (`DELETE FROM admin_invitations WHERE invited_by = ?`).
   11. `verification`: Bersihkan token OTP yang terikat dengan email (`DELETE FROM verification WHERE identifier = ?`).
   12. `user`: Hapus baris pengguna (`DELETE FROM user WHERE id = ?`).

4. **Pembersihan Sesi Multi-Varian & Pengalihan Halaman**:
   - Aksi server menghapus kedua varian cookie: `better-auth.session_token` dan `__Secure-better-auth.session_token` dengan parameter `{ path: '/' }`.
   - Pengguna dialihkan dengan kode status 303 ke halaman utama (`/?deleted=true`), di mana antarmuka menyajikan spanduk pemberitahuan dwibahasa bahwa akun telah berhasil dihapus.
   - Seluruh operasi database dibungkus dalam blok `try ... catch` dengan respons kegagalan yang ramah pengguna.

## Konsekuensi & Trade-off

* **Positif**:
  - Menghilangkan penyebab *Internal Server Error (500)* secara definitif melalui kepatuhan ketat terhadap batasan kunci asing SQLite D1.
  - Menjamin kepatuhan privasi finansial maksimal (*GDPR / UU PDP*) tanpa ada jejak data keuangan tertinggal.
  - Mempertahankan integritas data analitik ulasan produk tanpa melanggar privasi pengguna yang dihapus.
* **Trade-off**:
  - Tindakan ini bersifat *irreversible* (tidak dapat dipulihkan). Risiko ketidaksengajaan dimitigasi dengan mewajibkan pengetikan teks konfirmasi huruf kapital (`"HAPUS AKUN SAYA"` atau `"DELETE MY ACCOUNT"`).
