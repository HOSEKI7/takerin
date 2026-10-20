# Cloudflare D1 over Neon / Turso

Memilih Cloudflare D1 sebagai database utama Takerin dengan Drizzle ORM dibandingkan Neon atau Turso. D1 menyediakan native binding langsung ke Workers/Pages tanpa koneksi HTTP/TCP eksternal, latensi query sub-5ms di edge, kuota free tier yang memadai (5M reads/hari, 100K writes/hari, 5 GB storage), dan menyatukan seluruh infrastruktur dalam satu dashboard ekosistem Cloudflare.
