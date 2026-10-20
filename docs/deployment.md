# Panduan Deployment Cloudflare Pages & Custom Domain takerin.my.id

Dokumen ini menjelaskan konfigurasi deployment otomatis untuk aplikasi Takerin pada Cloudflare Pages dan pengaturan domain kustom `takerin.my.id`.

## 1. Cloudflare Pages Setup

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Pilih repository `HOSEKI7/takerin` dan branch `main`.
3. Konfigurasi build settings:
   - **Framework preset**: `SvelteKit` (atau None)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
   - **Root directory**: `/`
4. Tambahkan Environment Variable di **Settings** > **Environment variables**:
   - `NODE_VERSION`: `22`
   - `PNPM_VERSION`: `11.25.0` (atau biarkan default corepack)
5. Hubungkan D1 Database Binding:
   - Buka **Settings** > **Functions** > **D1 database bindings**.
   - Tambahkan binding:
     - **Variable name**: `DB`
     - **D1 database**: `takerin-db` (pastikan database `takerin-db` sudah dibuat di Cloudflare D1)

## 2. Pengaturan Custom Domain (`takerin.my.id`)

1. Pada project Pages di Cloudflare Dashboard, buka tab **Custom domains**.
2. Klik **Set up a custom domain**.
3. Masukkan `takerin.my.id`.
4. Jika domain dikelola di Cloudflare DNS yang sama:
   - Cloudflare akan otomatis mengonfigurasi DNS record CNAME pointing ke Pages deployment dan mengaktifkan SSL/TLS certificate.
5. Verifikasi domain aktif dan statusnya **Active**.

## 3. Database D1 Migrations

Untuk menerapkan migrasi database:

- **Lokal (Miniflare)**:
  ```bash
  pnpm run db:generate
  pnpm exec wrangler d1 migrations apply takerin-db --local
  ```

- **Production (Remote)**:
  ```bash
  pnpm exec wrangler d1 migrations apply takerin-db --remote
  ```
