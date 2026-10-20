import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { healthCheck } from './schema';
import { sql } from 'drizzle-orm';

describe('D1 Database & Drizzle ORM (Miniflare)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Initialize health check table in D1 test database
		await proxy.env.DB.exec(
			'CREATE TABLE IF NOT EXISTS health_check (id TEXT PRIMARY KEY, service TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);'
		);
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	it('executes raw SQL on D1 through Drizzle', async () => {
		const result = await db.run(sql`SELECT 1 as is_alive`);
		expect(result.results[0]).toEqual({ is_alive: 1 });
	});

	it('can insert and db.select() from schema table without error', async () => {
		const testId = 'test-' + Date.now();
		await db.insert(healthCheck).values({
			id: testId,
			service: 'd1-database',
			status: 'healthy',
			createdAt: Date.now()
		});

		const rows = await db.select().from(healthCheck);
		expect(rows.length).toBeGreaterThan(0);
		const found = rows.find((r) => r.id === testId);
		expect(found).toBeDefined();
		expect(found?.status).toBe('healthy');
	});
});
