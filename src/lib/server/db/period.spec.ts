import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, userSettings, incomeSource, monthlyPeriod, category, expense } from './schema';
import { ensureActivePeriod } from './period';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';

describe('Period Lifecycle D1 Database Operations (Seam 2)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;
	const testUserId = 'user-period-lifecycle-test';

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Clean up tables
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

		// Apply all generated Drizzle migrations
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

		// Insert base user
		await db.insert(user).values({
			id: testUserId,
			name: 'Period Tester',
			email: 'period-test@takerin.my.id',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			role: 'user',
			twoFactorEnabled: false,
			onboardingCompleted: true
		});
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	beforeEach(async () => {
		// Clear user-specific tables
		await db.delete(expense);
		await db.delete(category);
		await db.delete(monthlyPeriod);
		await db.delete(incomeSource);
		await db.delete(userSettings);
	});

	it('returns existing active period when current date is not expired', async () => {
		const now = new Date('2026-10-21');
		const periodId = 'p1-active';

		await db.insert(userSettings).values({
			id: 'settings-1',
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: now,
			updatedAt: now
		});

		await db.insert(monthlyPeriod).values({
			id: periodId,
			userId: testUserId,
			startDate: '2026-09-25',
			endDate: '2026-10-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active',
			createdAt: new Date('2026-09-25')
		});

		const result = await ensureActivePeriod(proxy.env.DB, testUserId, now);

		expect(result.transitioned).toBe(false);
		expect(result.period?.id).toBe(periodId);
		expect(result.period?.status).toBe('active');
	});

	it('auto-transitions to new period when today is after endDate, snapshotting old period and copying active categories', async () => {
		const oldPeriodId = 'old-period-1';
		const oldDate = new Date('2026-09-25');
		const today = new Date('2026-10-25'); // exactly on pay day, after 2026-10-24

		await db.insert(userSettings).values({
			id: 'settings-1',
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(incomeSource).values([
			{
				id: 'inc-1',
				userId: testUserId,
				name: 'Gaji Pokok',
				amount: 8000000,
				createdAt: oldDate,
				updatedAt: oldDate
			},
			{
				id: 'inc-2',
				userId: testUserId,
				name: 'Freelance',
				amount: 2000000,
				createdAt: oldDate,
				updatedAt: oldDate
			}
		]);

		await db.insert(monthlyPeriod).values({
			id: oldPeriodId,
			userId: testUserId,
			startDate: '2026-09-25',
			endDate: '2026-10-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active',
			createdAt: oldDate
		});

		// Categories in old period: 2 active, 1 frozen
		const activeCat1Id = 'cat-active-1';
		const activeCat2Id = 'cat-active-2';
		const frozenCatId = 'cat-frozen-1';

		await db.insert(category).values([
			{
				id: activeCat1Id,
				userId: testUserId,
				periodId: oldPeriodId,
				name: 'Kebutuhan',
				percentage: 60,
				isSavings: false,
				status: 'active',
				createdAt: oldDate,
				updatedAt: oldDate
			},
			{
				id: activeCat2Id,
				userId: testUserId,
				periodId: oldPeriodId,
				name: 'Tabungan Dana Darurat',
				percentage: 40,
				isSavings: true,
				status: 'active',
				createdAt: oldDate,
				updatedAt: oldDate
			},
			{
				id: frozenCatId,
				userId: testUserId,
				periodId: oldPeriodId,
				name: 'Langganan Gym (Dihapus)',
				percentage: 0,
				isSavings: false,
				status: 'frozen',
				createdAt: oldDate,
				updatedAt: oldDate
			}
		]);

		// Add an expense to old period to test fresh start
		await db.insert(expense).values({
			id: 'exp-old-1',
			userId: testUserId,
			periodId: oldPeriodId,
			categoryId: activeCat1Id,
			name: 'Belanja Bulanan',
			amount: 500000,
			date: '2026-10-01',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		// Perform auto-transition
		const result = await ensureActivePeriod(proxy.env.DB, testUserId, today);

		expect(result.transitioned).toBe(true);
		expect(result.period).not.toBeNull();
		expect(result.period?.id).not.toBe(oldPeriodId);
		expect(result.period?.startDate).toBe('2026-10-25');
		expect(result.period?.endDate).toBe('2026-11-24');
		expect(result.period?.status).toBe('active');
		expect(result.period?.totalIncome).toBe(10000000);

		// Verify old period is completed
		const oldPeriodRows = await db
			.select()
			.from(monthlyPeriod)
			.where(eq(monthlyPeriod.id, oldPeriodId));
		expect(oldPeriodRows[0].status).toBe('completed');

		// Verify new categories: only active categories copied, frozen is omitted
		const newCategories = await db
			.select()
			.from(category)
			.where(eq(category.periodId, result.period!.id));

		expect(newCategories).toHaveLength(2);
		const names = newCategories.map((c) => c.name);
		expect(names).toContain('Kebutuhan');
		expect(names).toContain('Tabungan Dana Darurat');
		expect(names).not.toContain('Langganan Gym (Dihapus)');

		// Verify fresh start: 0 expenses in new period
		const newExpenses = await db
			.select()
			.from(expense)
			.where(eq(expense.periodId, result.period!.id));
		expect(newExpenses).toHaveLength(0);
	});

	it('handles pay day fallback (payDay = 31 in a 30-day month) during transition', async () => {
		const oldPeriodId = 'old-period-31';
		const oldDate = new Date('2026-03-31');
		// April has 30 days. On May 1st, April cycle is expired.
		const today = new Date('2026-05-01');

		await db.insert(userSettings).values({
			id: 'settings-31',
			userId: testUserId,
			payDay: 31,
			language: 'id',
			theme: 'light',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(incomeSource).values({
			id: 'inc-31',
			userId: testUserId,
			name: 'Gaji',
			amount: 5000000,
			createdAt: oldDate,
			updatedAt: oldDate
		});

		// Previous period in March (ends 2026-04-29 because April payDay is 30)
		await db.insert(monthlyPeriod).values({
			id: oldPeriodId,
			userId: testUserId,
			startDate: '2026-03-31',
			endDate: '2026-04-29',
			payDay: 31,
			totalIncome: 5000000,
			status: 'active',
			createdAt: oldDate
		});

		await db.insert(category).values({
			id: 'cat-31-1',
			userId: testUserId,
			periodId: oldPeriodId,
			name: 'Umum',
			percentage: 100,
			isSavings: false,
			status: 'active',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		const result = await ensureActivePeriod(proxy.env.DB, testUserId, today);

		expect(result.transitioned).toBe(true);
		// April has 30 days -> payDay 31 clamps to 2026-04-30
		// Next payDay in May is 31 -> ends 1 day before -> 2026-05-30
		expect(result.period?.startDate).toBe('2026-04-30');
		expect(result.period?.endDate).toBe('2026-05-30');
		expect(result.period?.status).toBe('active');
	});

	it('handles multiple period gaps (user absent > 1 month) by creating the relevant current active period', async () => {
		const oldPeriodId = 'old-period-jan';
		const oldDate = new Date('2026-01-25');
		// User was absent for 3 months, now opens app on May 10, 2026
		const today = new Date('2026-05-10');

		await db.insert(userSettings).values({
			id: 'settings-gap',
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(incomeSource).values({
			id: 'inc-gap',
			userId: testUserId,
			name: 'Gaji',
			amount: 15000000,
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(monthlyPeriod).values({
			id: oldPeriodId,
			userId: testUserId,
			startDate: '2026-01-25',
			endDate: '2026-02-24',
			payDay: 25,
			totalIncome: 15000000,
			status: 'active',
			createdAt: oldDate
		});

		await db.insert(category).values({
			id: 'cat-gap-1',
			userId: testUserId,
			periodId: oldPeriodId,
			name: 'Operational',
			percentage: 100,
			isSavings: false,
			status: 'active',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		const result = await ensureActivePeriod(proxy.env.DB, testUserId, today);

		expect(result.transitioned).toBe(true);
		// On May 10, 2026 with payDay = 25:
		// May 10 < May 25 -> Started on April 25, 2026, ends on May 24, 2026
		expect(result.period?.startDate).toBe('2026-04-25');
		expect(result.period?.endDate).toBe('2026-05-24');
		expect(result.period?.status).toBe('active');

		// Old Jan period is marked completed
		const oldRows = await db.select().from(monthlyPeriod).where(eq(monthlyPeriod.id, oldPeriodId));
		expect(oldRows[0].status).toBe('completed');

		// Categories are properly copied to the new period
		const newCats = await db
			.select()
			.from(category)
			.where(eq(category.periodId, result.period!.id));
		expect(newCats).toHaveLength(1);
		expect(newCats[0].name).toBe('Operational');
	});
});
