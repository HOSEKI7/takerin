import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { healthCheck, user, session, categoryTemplate } from './schema';
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
		await proxy.env.DB.exec('DROP TABLE IF EXISTS admin_invitations;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS expense;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS category;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS monthly_period;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS category_template;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS income_source;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS user_settings;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS two_factor;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS verification;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS account;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS session;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS user;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS health_check;');

		// Apply all generated Drizzle migrations directly to D1 test database
		const drizzleDir = path.resolve('drizzle');
		const migrationFiles = fs
			.readdirSync(drizzleDir)
			.filter((file) => file.endsWith('.sql'))
			.sort();

		for (const file of migrationFiles) {
			const migrationSql = fs.readFileSync(path.join(drizzleDir, file), 'utf-8');
			const statements = migrationSql
				.split('--> statement-breakpoint')
				.map((chunk) => chunk.trim())
				.filter(Boolean);

			for (const chunk of statements) {
				const individualStmts = chunk
					.split(';')
					.map((s) => s.trim().replace(/\s+/g, ' '))
					.filter(Boolean);

				for (const stmt of individualStmts) {
					await proxy.env.DB.exec(stmt + ';');
				}
			}
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

	it('supports auth tables (user, session, account, verification) with role', async () => {
		const userId = 'user-test-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: userId,
			name: 'Test User',
			email: `test-${Date.now()}@example.com`,
			emailVerified: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		const users = await db.select().from(user);
		const foundUser = users.find((u) => u.id === userId);
		expect(foundUser).toBeDefined();
		expect(foundUser?.name).toBe('Test User');
		expect(foundUser?.role).toBe('user');

		const sessionId = 'session-' + Date.now();
		await db.insert(session).values({
			id: sessionId,
			token: 'token-' + Date.now(),
			userId: userId,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60),
			createdAt: now,
			updatedAt: now
		});

		const sessions = await db.select().from(session);
		expect(sessions.find((s) => s.id === sessionId)).toBeDefined();
	});

	it('seeds category_template table with 2 presets (50/30/20 and 6 Toples)', async () => {
		const templates = await db.select().from(categoryTemplate);
		expect(templates).toHaveLength(2);

		const names = templates.map((t) => t.name);
		expect(names).toContain('50/30/20');
		expect(names).toContain('6 Toples');

		const preset503020 = templates.find((t) => t.name === '50/30/20');
		expect(preset503020).toBeDefined();
		const parsed503020 = JSON.parse(preset503020!.categories);
		expect(parsed503020).toHaveLength(3);
		expect(
			parsed503020.reduce((acc: number, c: { percentage: number }) => acc + c.percentage, 0)
		).toBe(100);

		const preset6Toples = templates.find((t) => t.name === '6 Toples');
		expect(preset6Toples).toBeDefined();
		const parsed6Toples = JSON.parse(preset6Toples!.categories);
		expect(parsed6Toples).toHaveLength(6);
		expect(
			parsed6Toples.reduce((acc: number, c: { percentage: number }) => acc + c.percentage, 0)
		).toBe(100);
	});
});
