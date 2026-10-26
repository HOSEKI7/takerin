# Optimasi Mesin Pencari AI (AEO/GEO) dan Protokol Berkas Ramah Agen

Penerapan protokol berkas ramah agen (*machine-readable protocols*), kebijakan perayapan AI di `robots.txt`, struktur konten ekstraktif, dan penguatan entitas pengetahuan (*Knowledge Graph*) untuk memaksimalkan visibilitas Takerin di era mesin pencari generatif.

## Konteks & Pertimbangan

Perilaku pencarian informasi pengguna internet telah bergeser secara signifikan dari daftar tautan biru (*blue links*) tradisional menuju mesin pencari berbasis AI (*Google AI Overviews, ChatGPT Search, Perplexity, Claude, Gemini, dan Copilot*).

Pada mesin pencari AI:
1. **Model Tidak Hanya Merangking Halaman, Tetapi Mengutip Jawaban (*Citations*)**: Mesin AI menyeleksi sumber berdasarkan kemudahan mengekstraksi informasi (*extractable structure*), kejelasan definisi, dan ketiadaan ambiguitas harga.
2. **Agen Otonom Membutuhkan Format Teks Terstruktur**: Agen AI yang mengevaluasi atau membandingkan perangkat lunak atas nama pengguna sering mengabaikan aplikasi yang mengaburkan harga di balik JavaScript rumit atau formulir kontak penjualan.
3. **Pencarian Melakukan *Query Fan-Out***: Mesin AI mengeksekusi beberapa kueri turunan secara paralel untuk menjawab satu pertanyaan luas. Jika situs hanya memiliki satu halaman sempit, situs akan terlewatkan dari sintesis jawaban.

## Keputusan Arsitektur

1. **Penerapan Berkas Protokol Mesin-Terbaca (`/llms.txt` & `/pricing.md`)**:
   * Menempatkan `/static/llms.txt` sesuai standar `llmstxt.org` yang memuat ringkasan konsep takaran jatah, fitur utama, dan tautan resmi.
   * Menempatkan `/static/pricing.md` yang menyatakan secara tegas bahwa Takerin 100% gratis selamanya (Rp 0), bebas iklan, dan tanpa dinding berbayar (*no paywall*).
2. **Deklarasi Eksplisit AI Discovery Crawlers di `robots.txt`**:
   * Mengizinkan secara eksplisit bot pencarian AI terkemuka (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Claude-SearchBot`, `meta-webindexer`) untuk mengakses rute publik dan berkas protokol.
3. **Struktur Konten Ekstraktif Berbasis Riset Princeton GEO**:
   * Setiap artikel blog dilengkapi dengan blok jawaban mandiri (*self-contained answer block*) 40–60 kata langsung di bawah subjudul H2.
   * Menyertakan tabel perbandingan dan data persentase konkret yang mudah dikutip secara utuh oleh model bahasa besar.
4. **Konsolidasi Entitas (*Entity & Knowledge Graph*)**:
   * Menyematkan atribut `sameAs` ke repositori sumber terbuka resmi (`https://github.com/HOSEKI7/takerin`) pada skema `Organization`, `WebSite`, dan `SoftwareApplication` untuk memvalidasi konsensus entitas pihak ketiga (*E-E-A-T*).
5. **Kluster Konten *Query Fan-Out***:
   * Memperluas artikel edukasi finansial untuk mencakup kueri nominal konkret (misal: simulasi gaji 3–5 juta) dan kueri komparasi metode (misal: 50/30/20 vs Sistem Takaran Takerin).

## Konsekuensi & Dampak

- **Positif**: Takerin menjadi sumber rujukan terpercaya yang mudah dipahami dan dikutip oleh mesin AI tanpa halusinasi mengenai harga atau fitur.
- **Positif**: Meningkatkan relevansi di Google Search tradisional sekaligus membuka ceruk trafik rujukan dari mesin pencari generatif.
- **Pemeliharaan**: Setiap perubahan fitur atau kebijakan domain wajib diperbarui secara sinkron di `static/llms.txt` dan `static/pricing.md`.
