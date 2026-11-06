# Kontekstualisasi Analisis AI Ringkasan Bulanan Berbasis Entri Pengeluaran Terkurasi

Peningkatan persona dan kedalaman Catatan AI pada Ringkasan Bulanan (`/(app)/history/[periodId]`) dengan menyertakan data kurasi pos Pengeluaran (nominal dominan dan transaksi berulang), perluasan kapasitas keluaran dwibahasa, serta persona yang asyik, sedikit sarkas santai, namun tetap bijak dan solutif.

## Konteks & Pertimbangan

Sebelumnya, pembentukan prompt AI pada `generateAiSummary` hanya menerima data agregat tingkat Kategori (`AiAggregateData`) dengan kebijakan privasi ketat yang melarang pengiriman entri Pengeluaran individual. Terdapat beberapa batasan:
1. **Analisis AI Cenderung Generik**: AI hanya mengetahui status over-budget atau under-budget per Kategori tanpa mengetahui pola spesifik di balik angka tersebut (misal: apakah over-budget karena belanja online impulsif, langganan berulang, atau pengeluaran esensial besar).
2. **Keluaran Terlalu Singkat**: Frasa dibatasi maksimal 1–2 kalimat (maksimal 35 kata) sehingga kurang memberikan ruang untuk narasi yang menarik dan saran keuangan yang solutif.
3. **Kebutuhan Persona yang Lebih Hidup**: Pengguna menginginkan gaya bahasa yang asyik, sedikit sarkas/menggelitik (*playful teasing*), namun tetap bijak dan konstruktif.

## Keputusan Arsitektur

1. **Kurasi Entri Pengeluaran Signifikan (Filter Nominal & Frekuensi)**:
   - Alih-alih mengirim seluruh daftar Pengeluaran mentah (yang berisiko memboroskan token context window dan memicu timeout di edge runtime), sistem melakukan kurasi terarah:
     - Mengambil hingga 10 Pengeluaran dengan nominal tertinggi dalam Periode Bulan tersebut.
     - Mengidentifikasi nama Pengeluaran yang muncul berulang ($\ge 2$ kali) beserta total akumulasinya untuk mendeteksi "kebocoran halus".
     - Membatasi total sampel Pengeluaran maksimal 15 entri terkurasi di bawah Kategori terkait.

2. **Sanitasi Data Ketat (Field Scope)**:
   - Hanya menyertakan nama pengeluaran (`name`), nominal (`amount`), dan kategori terkait (`categoryName`).
   - Field catatan personal (`note`), waktu/jam (`time`), dan ID internal pengguna dieksklusikan sepenuhnya demi menjaga privasi dan efisiensi payload.

3. **Format Dwibahasa & Kapasitas Token yang Diperluas**:
   - Mempertahankan struktur JSON dwibahasa yang kompatibel (*backward-compatible*):
     ```json
     {
       "id": "2-4 kalimat dalam Bahasa Indonesia santai, ada sentuhan sarkas ringan, tapi bijak",
       "en": "2-4 sentences in casual English, witty and playful, yet financially wise"
     }
     ```
   - Menaikkan batas panjang respon menjadi 2–4 kalimat (~60–80 kata per bahasa).
   - Menyesuaikan parameter model: `max_tokens: 500` dan `temperature: 0.8` untuk kreativitas gaya bahasa tanpa halusinasi struktur JSON.

4. **Karakter Caching Permanen (Tanpa Tombol Regenerate)**:
   - Mempertahankan sifat Ringkasan Bulanan sebagai cap historis yang permanen: di-generate satu kali secara *on-demand* saat pengguna pertama kali membuka riwayat periode yang sudah selesai, lalu disimpan di kolom `monthly_period.ai_summary`.
   - Meniadakan fitur regenerasi berulang guna mencegah pemborosan kuota API gratis dan menjaga integritas snapshot keuangan.

## Konsekuensi & Trade-off

* **Positif**: Catatan AI menjadi sangat kontekstual, relevan, menghibur (*witty*), dan memberikan nasihat finansial yang tepat sasaran tanpa mengubah skema tabel database.
* **Trade-off Privasi**: Mengirimkan nama entri barang/jasa ke penyedia layanan AI (Groq / Google), yang dimitigasi dengan sanitasi ketat (tanpa field `note` personal dan tanpa identitas pengguna).
