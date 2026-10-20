# Better Auth over Clerk / Supabase Auth

Memilih Better Auth dengan Drizzle ORM adapter (SQLite provider di Cloudflare D1) dibandingkan solusi hosted auth seperti Clerk atau Supabase Auth.

## Konteks & Pertimbangan

1. **Kedaulatan Data (Data Ownership)**: Seluruh tabel pengguna (`user`, `session`, `account`, `verification`) berada langsung di database Cloudflare D1 milik aplikasi Takerin tanpa persistensi pihak ketiga.
2. **Kinerja Latensi Edge**: Validasi session dan query otentikasi berjalan langsung di edge via D1 binding tanpa latensi HTTP external handshake ke third-party provider auth.
3. **Dukungan First-Party SvelteKit & TypeScript**: Better Auth memiliki integrasi first-party SvelteKit (`better-auth/svelte-kit`, `better-auth/svelte`), automatic cookie handling, dan type safety penuh.
4. **Biaya & Vendor Lock-in**: Solusi gratis selamanya tanpa batasan MAU (Monthly Active Users) berbayar seperti pada Clerk tier gratis.
