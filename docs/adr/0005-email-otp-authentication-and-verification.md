# Otentikasi dan Verifikasi Berbasis Email OTP Menggantikan Magic Link

Menerapkan kode One-Time Password (OTP) 6 digit via Resend untuk verifikasi pendaftaran akun baru (User & Bootstrap Admin), alur lupa kata sandi, dan penggantian alamat email, menggantikan mekanisme tautan email (*magic link*).

## Konteks & Pertimbangan

Sebelumnya, sistem menggunakan tautan verifikasi email token (*magic link*) untuk registrasi dan lupa kata sandi. Mekanisme tautan URL ini memiliki sejumlah kelemahan:
1. **Pengalaman Pengguna PWA/Mobile Terputus**: Pengguna yang membuka tautan dari aplikasi email eksternal sering kali dialihkan ke *in-app browser* atau tab browser baru yang terisolasi dari sesi aplikasi utama.
2. **Celah Keamanan Admin Bootstrap**: Akun admin pertama yang mendaftar via form registrasi publik sebelumnya langsung di-redirect ke `/admin` tanpa validasi kepemilikan email aktif, memungkinkan risiko perebutan email admin terdaftar.
3. **Friction Login Harian**: Penerapan OTP pada setiap login harian dinilai menurunkan kenyamanan pengguna (*auth fatigue*) dan memboroskan kuota email.

## Keputusan Arsitektur

1. **Verifikasi Registrasi Wajib OTP**:
   * Pendaftaran akun Pengguna baru maupun Admin Pertama (Bootstrap via `ADMIN_EMAILS`) wajib memverifikasi 6-digit OTP sebelum akun aktif dan session diterbitkan.
   * Alur dilakukan secara *multi-step inline* pada halaman `/auth/register` tanpa reload/redirect halaman baru.
   * Sesi otomatis aktif (*autoSignInAfterVerification*) begitu OTP valid; admin diarahkan ke `/admin` dan pengguna ke `/onboarding`.
2. **Kebijakan Login Sehari-hari**:
   * Login harian tetap menggunakan kredensial Email dan Kata Sandi tanpa kewajiban OTP.
   * OTP saat login hanya diberlakukan jika pengguna mengaktifkan fitur *Two-Factor Authentication (2FA)* di pengaturan.
3. **Lupa Kata Sandi Terpadu**:
   * Menggantikan tautan reset password dengan verifikasi 6-digit OTP langsung di `/auth/forgot-password`.
   * Rute `/auth/reset-password` dikonsolidasikan dan dialihkan ke `/auth/forgot-password`.
4. **Ganti Kata Sandi & Ganti Email di Pengaturan**:
   * Ganti kata sandi tetap cukup memvalidasi Kata Sandi Saat Ini dan Kata Sandi Baru tanpa OTP.
   * Ganti email dibuka di Pengaturan dengan syarat konfirmasi Kata Sandi Saat Ini sebelum sistem mengirim 6-digit OTP ke alamat email baru.
5. **Kebijakan Keamanan & Kuota**:
   * Masa berlaku kode OTP ditetapkan selama 5 menit.
   * Cooldown tombol "Kirim Ulang" ditetapkan selama 60 detik untuk mencegah flooding API Resend.
   * Batas maksimal kegagalan input OTP dibatasi 5 kali berturut-turut sebelum kode OTP dinyatakan hangus.
