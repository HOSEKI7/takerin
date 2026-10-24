# Takerin

Aplikasi pencatat dan pengatur pengeluaran berdasarkan pemasukan bulanan. Membantu user mengalokasikan gaji ke kategori-kategori budget berbasis persentase, mencatat pengeluaran harian, dan menganalisis kebiasaan finansial tiap bulan.

## Language

**Periode Bulan (Monthly Period)**:
Satu siklus budget yang dimulai dari Tanggal Gajian user hingga satu hari sebelum Tanggal Gajian bulan berikutnya. Setiap Periode Bulan berdiri sendiri — saldo tidak carry-over.
_Avoid_: Bulan kalender, billing cycle

**Tanggal Gajian (Pay Date)**:
Angka hari (1-31) yang menandai awal Periode Bulan baru. Ditentukan user saat onboarding (misal: 25). Jika bulan tidak punya tanggal tersebut (misal: 31 di Februari), fallback ke hari terakhir bulan. Boleh diubah, tapi hanya sebelum 1 hari sebelum Tanggal Gajian aktif — perubahan berlaku mulai Periode berikutnya.
_Avoid_: Start date, cycle date

**Sumber Pemasukan (Income Source)**:
Satu entri pemasukan bernama dengan jumlah nominal. User bisa punya beberapa Sumber Pemasukan (gaji, freelance, side hustle) yang dijumlahkan menjadi Pemasukan Bulanan.
_Avoid_: Salary, gaji (terlalu spesifik — tidak semua pemasukan berasal dari gaji)

**Pemasukan Bulanan (Monthly Income)**:
Total dari semua Sumber Pemasukan. Menjadi basis perhitungan alokasi persentase ke setiap Kategori.
_Avoid_: Total income, budget total

**Kategori (Category)**:
Pos alokasi budget dengan nama dan persentase dari Pemasukan Bulanan. Jumlah persentase semua Kategori aktif harus selalu 100%. Setiap Kategori memiliki flag apakah termasuk Kategori Tabungan atau bukan.
_Avoid_: Pos, envelope, bucket

**Kategori Tabungan (Savings Category)**:
Kategori yang ditandai sebagai tabungan/investasi. Expense di Kategori Tabungan dianggap positif (semakin banyak terpakai = semakin baik, karena artinya uang ditabung/diinvestasi).
_Avoid_: Investment category, saving bucket

**Dibekukan (Frozen)**:
Status Kategori yang dihapus di tengah Periode Bulan. Kategori Frozen tetap terlihat dengan saldo tersisa, tapi tidak bisa menerima Pengeluaran baru. Hilang saat Periode Bulan berakhir. Tercatat di Ringkasan Bulanan.
_Avoid_: Archived, closed, deleted

**Pengeluaran (Expense)**:
Satu entri pencatatan pengeluaran. Field: nama (wajib), nominal (wajib), Kategori (wajib), tanggal (auto-fill hari ini, bisa diubah), catatan (opsional), waktu/jam (opsional).
_Avoid_: Transaksi (terlalu umum — bisa berarti income juga), spending

**Saldo Kategori (Category Balance)**:
Sisa budget per Kategori = alokasi nominal − total Pengeluaran di Kategori tersebut. Bisa negatif (over-budget).
_Avoid_: Remaining budget, leftover

**Ringkasan Bulanan (Monthly Summary)**:
Snapshot data keuangan satu Periode Bulan yang sudah berakhir, termasuk frasa AI yang mengomentari kebiasaan spending user. Di-generate on-demand saat user membuka history, lalu di-cache permanen.
_Avoid_: Report, monthly report, recap

**Template Kategori (Category Template)**:
Preset konfigurasi kategori yang ditawarkan saat Onboarding (misal: 50/30/20, 6 Toples, Custom). Setiap template berisi daftar nama kategori, persentase, dan flag Kategori Tabungan. Bisa di-CRUD oleh admin melalui Admin Panel.
_Avoid_: Budget rule, preset

**Onboarding**:
Alur setup pertama kali setelah register: Set Tanggal Gajian → Input Sumber Pemasukan → Pilih Template Kategori → Customize kategori → Selesai. Termasuk tutorial dasar alur penggunaan app.
_Avoid_: Setup wizard, first-run

**Administrator (Admin)**:
Akun pengelola sistem dengan role `admin`. Ruang lingkupnya terbatas pada Admin Console (`/admin/*`) untuk mengelola template kategori, memantau metrik & kesehatan sistem, dan mengelola pengguna. Administrator tidak memiliki data keuangan pribadi (Periode Bulan, Kategori, atau Pengeluaran).
_Avoid_: Admin pengguna, super user, staff

**Pengguna (User)**:
Akun pemilik anggaran finansial dengan role `user`. Mengelola pemasukan bulanan, kategori, dan pengeluaran harian melalui dashboard utama. Tidak memiliki akses ke Admin Console.
_Avoid_: Member, nasabah, klien

**Undangan Admin (Admin Invitation)**:
Mekanisme pendaftaran akun Administrator baru melalui tautan token berbatas waktu yang dikirimkan ke email tujuan oleh Administrator yang sudah aktif dari Admin Console.
_Avoid_: Referral link, admin signup, kode aktivasi

**Kode Verifikasi (OTP)**:
Kode numerik 6 digit berbatas waktu yang dikirimkan melalui email (Resend) untuk memverifikasi kepemilikan alamat email saat pendaftaran akun, lupa kata sandi, maupun penggantian alamat email akun.
_Avoid_: Kode aktivasi, token rahasia, pin auth

**Admin Bootstrap**:
Mekanisme inisialisasi akun Administrator pertama kali melalui pendaftaran form registrasi publik saat sistem baru dipasang, di mana sistem mendeteksi kesesuaian email terhadap variabel lingkungan `ADMIN_EMAILS` dan mewajibkan verifikasi OTP sebelum hak akses admin aktif.
_Avoid_: Admin default, auto-admin, admin tanpa verifikasi


