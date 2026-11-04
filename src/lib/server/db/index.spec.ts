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
		await proxy.env.DB.exec('DROP TABLE IF EXISTS income_source;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS monthly_period;');
		await proxy.env.DB.exec('DROP TABLE IF EXISTS category_template;');
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

	it('creates composite and column indexes on expense, category, and monthly_period (Issue #37)', async () => {
		const rawExpenseIndexes = await db.run(sql`PRAGMA index_list('expense');`);
		const expenseIndexNames = (rawExpenseIndexes.results as Array<{ name: string }>).map(
			(r) => r.name
		);
		expect(expenseIndexNames).toContain('expense_user_id_period_id_idx');
		expect(expenseIndexNames).toContain('expense_category_id_idx');
		expect(expenseIndexNames).toContain('expense_date_idx');

		const rawCategoryIndexes = await db.run(sql`PRAGMA index_list('category');`);
		const categoryIndexNames = (rawCategoryIndexes.results as Array<{ name: string }>).map(
			(r) => r.name
		);
		expect(categoryIndexNames).toContain('category_user_id_period_id_idx');

		const rawPeriodIndexes = await db.run(sql`PRAGMA index_list('monthly_period');`);
		const periodIndexNames = (rawPeriodIndexes.results as Array<{ name: string }>).map(
			(r) => r.name
		);
		expect(periodIndexNames).toContain('monthly_period_user_id_status_idx');
	});

	it('eliminates table scans using composite indexes for active period and expense lookups (Issue #37)', async () => {
		// Active period lookup by user_id and status
		const periodPlan = await db.run(
			sql`EXPLAIN QUERY PLAN SELECT * FROM monthly_period WHERE user_id = 'test-u1' AND status = 'active'`
		);
		const periodDetails = (periodPlan.results as Array<{ detail: string }>)
			.map((r) => r.detail)
			.join(' ');
		expect(periodDetails).toContain('USING INDEX monthly_period_user_id_status_idx');
		expect(periodDetails).not.toContain('SCAN TABLE monthly_period');

		// Expense lookup by user_id and period_id
		const expensePlan = await db.run(
			sql`EXPLAIN QUERY PLAN SELECT * FROM expense WHERE user_id = 'test-u1' AND period_id = 'test-p1'`
		);
		const expenseDetails = (expensePlan.results as Array<{ detail: string }>)
			.map((r) => r.detail)
			.join(' ');
		expect(expenseDetails).toContain('USING INDEX expense_user_id_period_id_idx');
		expect(expenseDetails).not.toContain('SCAN TABLE expense');
	});
});
