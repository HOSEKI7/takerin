import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { healthCheck } from './schema';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

describe('D1 Database & Drizzle ORM (Miniflare)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Ensure clean test state
		await proxy.env.DB.exec('DROP TABLE IF EXISTS health_check;');

		// Apply generated Drizzle migration directly to D1 test database
		const migrationPath = path.resolve('drizzle/0000_lame_zuras.sql');
		const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
		const statements = migrationSql
			.split(';')
			.map((s) => s.trim().replace(/\s+/g, ' '))
			.filter(Boolean);

		for (const stmt of statements) {
			await proxy.env.DB.exec(stmt + ';');
		}
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
