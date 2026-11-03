# Modal Pemblokir Konfirmasi Pemasukan Bulanan Pasca Tanggal Gajian

Penerapan dialog modal pemblokir (*blocking gate*) pada tata letak aplikasi setiap kali memasuki siklus Periode Bulan baru untuk memverifikasi atau memperbarui daftar Sumber Pemasukan pengguna sebelum pencatatan transaksi dimulai.

## Konteks & Pertimbangan

Sebelumnya, transisi ke Periode Bulan baru terjadi secara otomatis di latar belakang (*silent auto-rollover*) melalui fungsi `ensureActivePeriod` setiap kali tanggal saat ini melewati batas akhir periode. Walaupun alur ini mulus, terdapat masalah struktural dalam perencanaan keuangan pengguna:
1. **Fluktuasi Pemasukan Nyata**: Pemasukan bulanan pengguna sering kali berubah akibat penyesuaian gaji, bonus berkala, insentif, atau pendapatan pekerjaan sampingan (*freelance*).
2. **Keterlambatan Penyesuaian Anggaran**: Jika periode baru otomatis menggunakan total pemasukan lama tanpa konfirmasi, pengguna cenderung lupa memperbarui nominal pemasukan di awal siklus, sehingga alokasi persentase ke Kategori-Kategori budget menjadi tidak akurat sejak hari pertama gajian.
3. **Ketidakhadiran Jangka Panjang (*Gap Periods*)**: Pengguna yang tidak membuka aplikasi selama beberapa bulan membutuhkan titik awal yang bersih untuk periode berjalan saat mereka kembali masuk.

## Keputusan Arsitektur

1. **Pelacakan Status Konfirmasi Periode**:
   * Menambahkan kolom pelacak `income_confirmed_at: integer` (timestamp UTC) pada tabel `monthly_period`.
   * Pada saat pengguna menyelesaikan alur Onboarding, periode pertama langsung ditandai terkonfirmasi (`income_confirmed_at = now`) untuk mencegah popup ganda saat pertama kali masuk dashboard.
   * Setiap kali `ensureActivePeriod` membentuk periode baru karena pergantian siklus gajian (atau saat pengguna kembali login setelah berbulan-bulan absen), periode baru dibuat dengan status `income_confirmed_at = null`.

2. **Modal Pemblokir Tingkat Tata Letak (*Blocking Gate*)**:
   * Komponen dialog ditempatkan pada level tata letak global (`src/routes/(app)/+layout.svelte`) yang memantau status `locals.activePeriod.incomeConfirmedAt`.
   * Bersifat memblokir penuh (*mandatory blocking modal*): tidak menyediakan tombol silang (X), tidak dapat ditutup melalui klik backdrop, dan tidak dapat dibatalkan via tombol ESC. Pengguna wajib menyelesaikan konfirmasi untuk mengakses rute aplikasi internal.
   * Menyajikan ucapan bertema hari gajian dengan teks dwibahasa (*bilingual i18n 100% key parity*).
   * Nilai form input Sumber Pemasukan langsung terisi nilai awal (*pre-filled*) dari data periode sebelumnya dengan aksi tunggal *"Konfirmasi & Lanjutkan"*, meminimalkan friksi menjadi satu klik jika nominal tidak berubah.

3. **Operasi Batch Mutasi Atomik**:
   * Konfirmasi pemasukan mengeksekusi batch database atomik di Cloudflare D1: memperbarui tabel master `income_source`, memperbarui `monthly_period.total_income`, dan mencatat `monthly_period.income_confirmed_at`.
   * Nominal alokasi tiap Kategori dihitung otomatis berdasarkan persentase yang sudah ada terhadap total pemasukan baru tanpa membebani modal dengan konfigurasi kategori.

## Konsekuensi & Trade-off

* **Positif**: Menjamin integritas data anggaran pengguna selalu sinkron dengan kondisi pemasukan riil di setiap awal siklus gajian. Friksi diminimalkan melalui pre-filled input dan aksi satu klik.
* **Trade-off Antarmuka**: Mengharuskan pengguna mengambil keputusan interaksi sebelum dapat melihat dashboard atau mencatat pengeluaran di hari gajian.
