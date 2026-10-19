# Takerin

**Takerin gajimu, tenangin bulanmu.**

Aplikasi web gratis untuk membagi gaji ke dalam jatah per kategori dan mencatat pengeluaran harian, supaya pengeluaran tidak melebihi pemasukan.

> Catatan penggunaan: bagian yang ditandai `[ ... ]` adalah placeholder. Isi dengan data aslimu sebelum dokumen ini dibagikan.

---

## 1. Ringkasan

| | |
|---|---|
| **Nama produk** | Takerin |
| **Jenis** | Aplikasi web pengelolaan keuangan pribadi |
| **Konsep utama** | Budgeting berbasis persentase (jatah per kategori) |
| **Model akses** | Gratis, dapat digunakan siapa saja secara online |
| **Pendiri / Pengembang** | `[Nama lengkap]` |
| **Status** | `[Dalam pengembangan / Beta / Rilis]` |
| **Website** | `[URL]` |
| **Kontak** | `[Email]` |

---

## 2. Tentang Takerin

Takerin membantu pengguna mengatur gaji dengan cara yang sederhana: **bagi dulu di awal bulan, lalu catat setiap pengeluaran terhadap jatahnya.**

Pengguna memasukkan pemasukan bulanan, menentukan pembagian persentase ke berbagai kategori (misalnya makan, transportasi, tabungan, sedekah), lalu mencatat pengeluaran harian. Takerin menampilkan sisa saldo setiap kategori secara jelas, dan mengingatkan dengan ramah ketika pengeluaran melebihi jatah.

---

## 3. Latar Belakang dan Masalah

Banyak orang mencatat pengeluaran, tetapi tetap merasa gaji habis sebelum akhir bulan. Penyebab umumnya:

- Pengeluaran dicatat **setelah** terjadi, bukan direncanakan di awal.
- Tidak ada batas yang jelas per kategori, sehingga satu pos mudah menyedot pos lain.
- Aplikasi pencatat yang ada sering terlalu rumit atau tidak fleksibel untuk pembagian yang bersifat pribadi.

Takerin dibuat untuk menjawab masalah itu dengan pendekatan yang lebih sederhana: **setiap rupiah mendapat jatah sebelum dipakai.**

> `[Opsional: tambahkan cerita pribadi pendiri, misalnya "Takerin awalnya dibuat untuk mengatur gaji saya sendiri, lalu dibuka untuk umum secara gratis."]`

---

## 4. Arti Nama dan Filosofi

### Arti nama

**Takerin** berasal dari kata **"takar"** (mengukur dengan takaran) ditambah akhiran **"-in"** (bentuk santai dari "-kan"). Artinya kurang lebih **"tolong takarkan"**.

Menakar adalah konsep yang dekat dengan keseharian: menakar beras, menakar bumbu. Setiap hal punya porsi yang pas. Takerin menerapkan prinsip yang sama pada uang.

### Filosofi

> **"Uang yang baik bukan yang banyak, tapi yang punya takaran."**

1. **Setiap rupiah punya tempat.** Gaji dibagi sebelum dipakai.
2. **Batasan itu membebaskan.** Dengan jatah yang jelas, pengguna dapat berbelanja tanpa rasa bersalah selama masih dalam takaran.
3. **Disiplin tanpa menghakimi.** Pengeluaran boleh melebihi jatah, tetapi selalu diingatkan. Takerin mengingatkan, bukan melarang.

---

## 5. Visi dan Misi

### Visi

Menjadi cara paling sederhana bagi setiap orang Indonesia untuk mengatur gajinya, sehingga uang yang dimiliki terasa cukup dan terarah.

### Misi

1. Menyediakan alat pengelolaan keuangan pribadi yang **gratis** dan mudah diakses.
2. Membantu pengguna **membagi pemasukan ke kategori berbasis persentase** yang fleksibel.
3. Memudahkan pencatatan pengeluaran harian dengan **sisa jatah per kategori** yang jelas.
4. Memberi **pengingat yang ramah** saat pengeluaran melebihi jatah.
5. Menjaga **keamanan dan privasi** data pengguna.

---

## 6. Nilai-nilai

| Nilai | Penerapan dalam produk |
|---|---|
| **Sederhana** | Antarmuka bersih dan input pengeluaran yang cepat |
| **Terukur** | Semua berbasis persentase dan saldo yang jelas |
| **Fleksibel** | Kategori dapat diubah, dengan aturan yang menjaga total tetap 100% |
| **Ramah** | Bahasa santai dan peringatan yang tidak menghakimi |
| **Terpercaya** | Pengelolaan data yang aman dan transparan |

---

## 7. Produk dan Fitur

### 7.1 Pengaturan pemasukan dan jatah kategori

Pengguna memasukkan pemasukan bulanan, lalu membagi pemasukan tersebut ke kategori dengan persentase sendiri. **Total persentase harus selalu 100%.**

**Contoh pembagian dengan gaji Rp5.000.000:**

| Kategori | Persentase | Jatah |
|---|---:|---:|
| Makan dan minum | 30% | Rp1.500.000 |
| Tabungan dan investasi | 35% | Rp1.750.000 |
| Transportasi | 20% | Rp1.000.000 |
| Bebas / belanja | 10% | Rp500.000 |
| Sedekah | 5% | Rp250.000 |
| **Total** | **100%** | **Rp5.000.000** |

### 7.2 Aturan perubahan kategori di tengah bulan

Agar total tetap 100% dan data bulan berjalan tetap konsisten, Takerin menerapkan aturan berikut:

| Aksi | Aturan |
|---|---|
| **Menambah kategori baru** | Jatah kategori lain harus dikurangi terlebih dahulu, karena pembagian sebelumnya sudah 100%. |
| **Menghapus kategori** | Jatahnya harus dialihkan ke kategori lain agar total tetap 100%. Saldo yang sudah terpakai tetap tersimpan sebagai **kategori sementara** hingga bulan berakhir. Kategori tersebut tetap terlihat, tetapi tidak dapat menerima pencatatan pengeluaran baru. |
| **Mengubah nama atau persentase** | Diperbolehkan. |

### 7.3 Pencatatan pengeluaran

Pengguna mencatat pengeluaran secara manual dengan mengisi:

- Nama pengeluaran
- Jumlah pengeluaran
- Kategori

Setiap kategori menampilkan **sisa saldo** berdasarkan pengeluaran yang tercatat.

### 7.4 Peringatan pengeluaran melebihi jatah

Pengeluaran **boleh** melebihi saldo kategori maupun total pemasukan. Pengeluaran tetap dicatat, dan pengguna diingatkan bahwa jatah yang ditetapkan telah terlampaui.

### 7.5 Akun dan pengaturan

| Fitur | Keterangan |
|---|---|
| Autentikasi | Daftar, masuk, dan lupa kata sandi |
| Verifikasi dua langkah | OTP melalui email |
| Pengaturan profil | Kelola data akun |
| Tampilan | Mode terang dan mode gelap |

---

## 8. Cara Kerja

1. **Daftar dan masuk** ke akun Takerin.
2. **Masukkan pemasukan bulanan.**
3. **Bagi pemasukan** ke kategori dengan persentase sendiri (total 100%).
4. **Catat pengeluaran** harian ke kategori yang sesuai.
5. **Pantau sisa jatah** setiap kategori sepanjang bulan.
6. **Sesuaikan** kategori bila kebutuhan berubah, dengan mengikuti aturan perubahan kategori.

---

## 9. Target Pengguna

- Karyawan dan pekerja dengan gaji bulanan tetap
- Mahasiswa atau pelajar dengan uang saku bulanan
- Fresh graduate yang baru belajar mengatur gaji pertama
- Siapa saja yang ingin pengeluaran lebih terkontrol dengan cara yang sederhana

---

## 10. Keunggulan

| Keunggulan | Penjelasan |
|---|---|
| **Pembagian di awal** | Pengguna merencanakan jatah sebelum membelanjakan, bukan hanya mencatat setelahnya. |
| **Total selalu 100%** | Aturan perubahan kategori menjaga pembagian tetap konsisten. |
| **Peringatan yang ramah** | Pengeluaran melebihi jatah tetap dapat dicatat, disertai pengingat yang tidak menghakimi. |
| **Fokus pada satu hal** | Pembagian jatah dan pencatatan, tanpa fitur berlebihan. |
| **Gratis** | Dapat digunakan siapa saja tanpa biaya. |

---

## 11. Keamanan dan Privasi

Takerin menyimpan data keuangan pribadi, sehingga keamanan menjadi prioritas.

- Akses melalui akun pribadi dengan autentikasi.
- Verifikasi dua langkah melalui OTP email.
- `[Tambahkan hanya yang benar-benar diterapkan, misalnya: enkripsi kata sandi, koneksi HTTPS, kebijakan privasi, dan kebijakan penghapusan data.]`

---

## 12. Model Bisnis

Takerin **gratis** untuk semua pengguna.

`[Isi bila ada rencana keberlanjutan, misalnya donasi, fitur premium opsional, atau tetap sebagai proyek terbuka. Hapus bagian ini bila belum ada rencana.]`

---

## 13. Identitas Brand

| Elemen | Arahan |
|---|---|
| **Tagline** | Takerin gajimu, tenangin bulanmu. |
| **Gaya bahasa** | Santai, singkat, dan ramah |
| **Warna utama** | Hijau (tenang, terkait uang), dengan aksen kuning atau oranye untuk peringatan |
| **Logo** | Huruf **T** yang terbagi menjadi segmen (menyerupai diagram persentase), atau sendok takar yang disederhanakan |
| **Tampilan** | Mendukung mode terang dan gelap |

**Contoh gaya pesan di aplikasi:**

- Peringatan: *"Jatah Makan sudah lewat Rp50.000. Mau dicatat tetap?"*
- Keberhasilan: *"Tercatat. Sisa jatah Transportasi Rp320.000."*

---

## 14. Teknologi

`[Isi tech stack yang sebenarnya, misalnya frontend, backend, database, dan hosting.]`

---

## 15. Status dan Rencana Pengembangan

**Sudah dirancang:**

- Pengaturan pemasukan dan jatah kategori berbasis persentase
- Aturan perubahan kategori di tengah bulan
- Pencatatan pengeluaran dan peringatan melebihi jatah
- Autentikasi, OTP email, pengaturan profil, dan mode terang/gelap

**Rencana berikutnya:** `[Isi sesuai rencana nyata]`

---

## 16. Pertanyaan Umum

**Mengapa dinamakan Takerin?**
Dari kata "takar". Inti aplikasinya adalah membagi gaji ke dalam takaran per kategori. "Takerin" berarti "tolong takarkan", sehingga terasa seperti teman yang membantu mengatur uang.

**Apa bedanya dengan aplikasi pencatat keuangan lain?**
Banyak aplikasi hanya mencatat pengeluaran setelah terjadi. Takerin dimulai dari pembagian gaji di awal bulan, lalu setiap pengeluaran dicatat terhadap jatah kategorinya.

**Apakah pengeluaran boleh melebihi jatah?**
Boleh. Pengeluaran tetap dicatat dan pengguna diingatkan bahwa jatah telah terlampaui.

**Bagaimana jika ingin menambah atau menghapus kategori di tengah bulan?**
Menambah kategori mengharuskan jatah kategori lain dikurangi lebih dulu. Menghapus kategori mengharuskan jatahnya dialihkan, dan saldo terpakainya tetap tersimpan sebagai kategori sementara hingga bulan berakhir.

**Apakah Takerin berbayar?**
Tidak. Takerin gratis digunakan.

---

## 17. Kontak

| | |
|---|---|
| **Pengembang** | `[Nama]` |
| **Email** | `[Email]` |
| **Website** | `[URL]` |
| **GitHub** | `[URL repositori / profil]` |
| **LinkedIn** | `[URL]` |
| **Instagram** | `[Username]` |

---

*Takerin. Setiap rupiah punya jatah.*
