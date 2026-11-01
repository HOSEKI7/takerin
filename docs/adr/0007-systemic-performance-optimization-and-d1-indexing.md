# Optimalisasi Performa Sistemik dan Indeksasi Database D1

Optimalisasi performa terpadu mencakup indeksasi database Cloudflare D1, agregasi native SQL, deduplikasi lifecycle request di SvelteKit hooks, pemecahan bundle kamus i18n dinamis, self-hosting font WOFF2 lokal, dan penegakan batasan form input native.

## Konteks & Pertimbangan

Hasil audit menyeluruh terhadap performa aplikasi Takerin menemukan beberapa bottleneck utama:
1. **Database D1**: Ketiadaan indeks pada foreign key tabel `expense`, `category`, dan `monthly_period` memicu pemindaian tabel penuh (*Full Table Scan*). Penjumlahan pengeluaran per kategori dilakukan di memori Cloudflare Worker dengan menarik seluruh baris pengeluaran tanpa agregasi database.
2. **Backend & Hooks**: Pemanggilan ganda `ensureActivePeriod` pada setiap navigasi terproteksi serta query redundan ke `user_settings` untuk preferensi bahasa.
3. **Frontend Bundle**: Kamus bahasa `id.json` dan `en.json` diimpor bersamaan secara statis (113 kB), dan barrel file `src/lib/index.ts` membocorkan konten markdown blog ke bundle utama.
4. **Font Eksternal**: Penggunaan Google Fonts eksternal menambah latensi jaringan yang memblokir rendering pertama (FCP/LCP).
5. **Form Limits**: Ketiadaan atribut batasan native HTML (`maxlength`) pada form input memicu pengiriman payload berlebih ke server.

## Keputusan Arsitektur

1. **Indeksasi dan Agregasi Database D1**:
   * Menambahkan migration indeks komposit SQLite/D1 pada `expense(user_id, period_id)`, `expense(category_id)`, `expense(date)`, `category(user_id, period_id)`, dan `monthly_period(user_id, status)`.
   * Mengubah penghitungan total pengeluaran per kategori dari in-memory JavaScript loop menjadi query native SQL agregasi (`GROUP BY category_id`).
   * Menerapkan batas muat data pengeluaran (20 entri) dengan tombol interaktif "Muat Lebih Banyak" (*Load More*).
2. **Deduplikasi Lifecycle SvelteKit**:
   * Menyimpan objek periode aktif ke dalam `event.locals.activePeriod` saat divalidasi di `hooks.server.ts`, menghindari query ulang di loader route.
   * Melewati query database preferensi bahasa jika cookie `takerin_lang` sudah valid.
   * Menghilangkan fetch ganda di Service Worker untuk rute `/dashboard`.
3. **Dynamic Code-Splitting i18n & Pemisahan Barrel File**:
   * Mengubah pemuatan kamus bahasa i18n menjadi dinamis per locale aktif, sehingga pengguna hanya mengunduh kamus bahasa yang sedang digunakan.
   * Memisahkan utilitas blog markdown dari barrel file root `src/lib/index.ts` ke modul terisolasi `#lib/blog`.
4. **Self-Hosting Font WOFF2**:
   * Mengganti Google Fonts CDN dengan paket lokal `@fontsource-variable/inter` dan `@fontsource-variable/manrope`.
   * Mengatur `data-sveltekit-preload-data="tap"` pada `<body>`.
5. **Penegakan Batasan Input Form**:
   * Menyematkan atribut native HTML (`maxlength="100"` pada nama, `maxlength="500"` pada catatan, `inputmode="numeric"`) disertai indikator kuota karakter halus.

## Konsekuensi & Trade-off

* **Positif**: Latensi TTFB dan query D1 terpangkas signifikan, ukuran initial JavaScript bundle menyusut hingga ~45%, font tidak lagi memblokir rendering, dan konsumsi memori Cloudflare Worker turun drastis.
* **Tanggung Jawab Pemeliharaan**: Perubahan schema indeks D1 memerlukan eksekusi migrasi remote ke database produksi oleh pengguna secara terencana melalui `wrangler d1 migrations apply`.
