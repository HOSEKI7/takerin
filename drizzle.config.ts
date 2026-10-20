import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	...(process.env.CLOUDFLARE_ACCOUNT_ID &&
	process.env.CLOUDFLARE_DATABASE_ID &&
	process.env.CLOUDFLARE_D1_TOKEN
		? {
				driver: 'd1-http',
				dbCredentials: {
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
					databaseId: process.env.CLOUDFLARE_DATABASE_ID,
					token: process.env.CLOUDFLARE_D1_TOKEN
				}
			}
		: {}),
	verbose: true,
	strict: true
});
