# Pengelolaan Sumber Pemasukan per Periode Bulan dan Penguncian H-1 Gajian

Penyediaan menu mandiri Pengelolaan Pemasukan (`/(app)/incomes`) dengan pengikatan Sumber Pemasukan per Periode Bulan (`period_id`), mekanisme kloning saat pergantian siklus gajian, dan penguncian mutasi maksimal H-1 Tanggal Gajian.

## Konteks & Pertimbangan

Sebelumnya, tabel `income_source` hanya terikat pada pengguna (`user_id`) tanpa keterikatan pada `period_id`. Pemasukan bulanan hanya dapat disesuaikan pada saat *Onboarding* atau melalui dialog pemblokir *Konfirmasi Pemasukan Bulanan* di awal siklus gajian. Terdapat dua keterbatasan arsitektural:
1. **Tidak Ada Riwayat Rincian Sumber Pemasukan**: Ketika pengguna memperbarui Sumber Pemasukan, tabel lama ditimpa (*overwrite*). Data riwayat periode lampau di `monthly_period` hanya menyimpan angka akumulasi `total_income` tanpa rincian Sumber Pemasukannya (misal: gaji pokok vs bonus).
2. **Ketiadaan Menu Mandiri di Tengah Periode**: Pengguna tidak dapat menyesuaikan pemasukan jika terjadi perubahan di tengah bulan berjalan (seperti pemotongan gaji, tunjangan lembur, atau bonus) di luar dialog pemblokir gajian.
3. **Integritas Anggaran Mendekati Pergantian Siklus**: Mengubah pemasukan tepat pada hari gajian atau setelah periode berakhir akan merusak kalkulasi rasio alokasi dan ringkasan keuangan bulanan yang sudah final.

## Keputusan Arsitektur

1. **Pengikatan Sumber Pemasukan per Periode Bulan (*Per-Period Binding*)**:
   - Menambahkan kolom `period_id: text` pada tabel `income_source` yang mereferensikan `monthly_period.id` dengan relasi `onDelete: 'cascade'`.
   - Mengikuti pola arsitektur yang sama dengan tabel `category`: setiap Periode Bulan memiliki salinan entri Sumber Pemasukan masing-masing.
   - Saat transisi otomatis ke periode baru (`ensureActivePeriod`), seluruh Sumber Pemasukan dari periode aktif lama otomatis dikloning (*cloned*) ke periode baru sebagai nilai awal.
   - Pada saat Onboarding, Sumber Pemasukan awal langsung dikaitkan dengan `activePeriod.id` pertama.

2. **Aturan Batas Waktu Pengubahan Pemasukan (Maksimal H-1 Gajian)**:
   - Pengubahan (tambah, edit, hapus) Sumber Pemasukan hanya diizinkan selama Periode Bulan berstatus aktif dan waktu saat ini berada **sebelum tanggal `endDate` periode** (sebelum 1 hari sebelum Tanggal Gajian aktif berikutnya).
   - Logika validasi batas waktu ini menggunakan aturan yang identik dengan fungsi `validatePayDate`.
   - Saat tanggal `endDate` tiba (hari H-1) hingga hari H gajian, status Sumber Pemasukan berubah menjadi **Terkunci (*Locked*)**.

3. **Status Terkunci & Riwayat Hanya-Lihat (*View-Only*)**:
   - Ketika Periode Bulan telah berakhir (status `completed`) atau telah memasuki batas H-1, antarmuka `/(app)/incomes` menampilkan daftar Sumber Pemasukan dalam mode *read-only* (tombol aksi dinonaktifkan, dilengkapi lencana status "Terkunci" dan pesan penjelasan kontekstual).
   - Halaman detail riwayat bulanan (`/(app)/history/[periodId]`) kini dapat menampilkan rincian Sumber Pemasukan yang bersifat kekal (*immutable*) untuk periode tersebut.

4. **Kalkulasi Proporsional Otomatis**:
   - Setiap mutasi Sumber Pemasukan pada periode aktif yang valid akan langsung memperbarui `monthly_period.total_income`.
   - Nominal alokasi dan saldo pada seluruh Kategori di Dashboard otomatis terskalasi secara proporsional sesuai persentase yang sudah ada tanpa memerlukan perubahan manual pada persentase kategori.

## Konsekuensi & Trade-off

* **Positif**: Detail pemasukan historis tersimpan abadi per bulan, pengguna bebas menyesuaikan penghasilan fleksibel kapan saja sebelum H-1, dan kalkulasi saldo kategori tetap konsisten secara dinamis.
* **Trade-off Database**: Membutuhkan migrasi skema tabel `income_source` untuk menyertakan `period_id` serta penyesuaian query di onboarding, period transition, dan history.
