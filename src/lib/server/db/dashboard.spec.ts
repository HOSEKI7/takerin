import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, userSettings, incomeSource, monthlyPeriod, category } from './schema';
import { getDashboardData, calculateDashboardSummary } from './dashboard';
import fs from 'node:fs';
import path from 'node:path';

describe('Dashboard D1 Operations & Calculations (Miniflare)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;

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
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	it('returns empty dashboard state when user has no active monthly period', async () => {
		const testUserId = 'test-dashboard-empty-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'User No Period',
			email: `empty-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		const data = await getDashboardData(proxy.env.DB, testUserId);
		expect(data.period).toBeNull();
		expect(data.categories).toEqual([]);
		expect(data.recentExpenses).toEqual([]);
		expect(data.summary).toEqual({
			totalIncome: 0,
			totalSpent: 0,
			remaining: 0,
			spentPercentage: 0,
			isWarning80: false
		});
	});

	it('loads active monthly period and calculates category allocations, balances, and empty state correctly', async () => {
		const testUserId = 'test-dashboard-active-' + Date.now();
		const periodId = 'period-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Budi Finansial',
			email: `budi-dashboard-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: true,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		await db.insert(monthlyPeriod).values({
			id: periodId,
			userId: testUserId,
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			payDay: 21,
			totalIncome: 10000000,
			status: 'active',
			createdAt: now
		});

		await db.insert(category).values([
			{
				id: 'cat-1-' + Date.now(),
				userId: testUserId,
				periodId,
				name: 'Kebutuhan Pokok',
				percentage: 50,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'cat-2-' + Date.now(),
				userId: testUserId,
				periodId,
				name: 'Keinginan & Hiburan',
				percentage: 30,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'cat-3-' + Date.now(),
				userId: testUserId,
				periodId,
				name: 'Tabungan Masa Depan',
				percentage: 20,
				isSavings: true,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		const data = await getDashboardData(proxy.env.DB, testUserId);

		expect(data.period).toBeDefined();
		expect(data.period?.id).toBe(periodId);
		expect(data.period?.totalIncome).toBe(10000000);
		expect(data.period?.payDay).toBe(21);

		// Summary Card check
		expect(data.summary.totalIncome).toBe(10000000);
		expect(data.summary.totalSpent).toBe(0);
		expect(data.summary.remaining).toBe(10000000);
		expect(data.summary.spentPercentage).toBe(0);
		expect(data.summary.isWarning80).toBe(false);

		// Category Breakdown check
		expect(data.categories).toHaveLength(3);

		const kebutuhan = data.categories.find((c) => c.name === 'Kebutuhan Pokok');
		expect(kebutuhan).toBeDefined();
		expect(kebutuhan?.percentage).toBe(50);
		expect(kebutuhan?.allocation).toBe(5000000);
		expect(kebutuhan?.spent).toBe(0);
		expect(kebutuhan?.balance).toBe(5000000);
		expect(kebutuhan?.remainingPercentage).toBe(100);
		expect(kebutuhan?.isSavings).toBe(false);

		const tabungan = data.categories.find((c) => c.name === 'Tabungan Masa Depan');
		expect(tabungan).toBeDefined();
		expect(tabungan?.percentage).toBe(20);
		expect(tabungan?.allocation).toBe(2000000);
		expect(tabungan?.spent).toBe(0);
		expect(tabungan?.balance).toBe(2000000);
		expect(tabungan?.remainingPercentage).toBe(100);
		expect(tabungan?.isSavings).toBe(true);

		// Placeholder for recent expenses
		expect(data.recentExpenses).toEqual([]);
	});

	it('correctly calculates summary and triggers isWarning80 when spent > 80%', () => {
		const summaryNormal = calculateDashboardSummary(10000000, 7900000);
		expect(summaryNormal.spentPercentage).toBe(79);
		expect(summaryNormal.isWarning80).toBe(false);
		expect(summaryNormal.remaining).toBe(2100000);

		const summaryWarningExact80 = calculateDashboardSummary(10000000, 8000000);
		expect(summaryWarningExact80.spentPercentage).toBe(80);
		expect(summaryWarningExact80.isWarning80).toBe(false); // > 80%

		const summaryWarningOver80 = calculateDashboardSummary(10000000, 8000001);
		expect(summaryWarningOver80.spentPercentage).toBe(80);
		expect(summaryWarningOver80.isWarning80).toBe(true); // > 80%

		const summaryWarningHigh = calculateDashboardSummary(10000000, 9500000);
		expect(summaryWarningHigh.spentPercentage).toBe(95);
		expect(summaryWarningHigh.isWarning80).toBe(true);
		expect(summaryWarningHigh.remaining).toBe(500000);

		const summaryOverBudget = calculateDashboardSummary(10000000, 12000000);
		expect(summaryOverBudget.spentPercentage).toBe(120);
		expect(summaryOverBudget.isWarning80).toBe(true);
		expect(summaryOverBudget.remaining).toBe(-2000000);

		const summaryZeroIncome = calculateDashboardSummary(0, 0);
		expect(summaryZeroIncome.spentPercentage).toBe(0);
		expect(summaryZeroIncome.isWarning80).toBe(false);
		expect(summaryZeroIncome.remaining).toBe(0);
	});

	it('auto-transitions expired period when getDashboardData is called', async () => {
		const testUserId = 'test-dashboard-expired-' + Date.now();
		const oldPeriodId = 'period-expired-' + Date.now();
		const oldDate = new Date('2026-07-25');

		await db.insert(user).values({
			id: testUserId,
			name: 'Expired Tester',
			email: `expired-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: true,
			role: 'user',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(userSettings).values({
			id: 'settings-' + Date.now(),
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(incomeSource).values({
			id: 'inc-' + Date.now(),
			userId: testUserId,
			name: 'Gaji',
			amount: 10000000,
			createdAt: oldDate,
			updatedAt: oldDate
		});

		// Expired period: July 25 - Aug 24
		await db.insert(monthlyPeriod).values({
			id: oldPeriodId,
			userId: testUserId,
			startDate: '2026-07-25',
			endDate: '2026-08-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active',
			createdAt: oldDate
		});

		const oldCatId = 'cat-exp-' + Date.now();
		await db.insert(category).values({
			id: oldCatId,
			userId: testUserId,
			periodId: oldPeriodId,
			name: 'Kebutuhan',
			percentage: 100,
			isSavings: false,
			status: 'active',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		const data = await getDashboardData(proxy.env.DB, testUserId);

		expect(data.period).not.toBeNull();
		expect(data.period?.id).not.toBe(oldPeriodId);
		expect(data.period?.status).toBe('active');
		expect(data.categories).toHaveLength(1);
		expect(data.categories[0].name).toBe('Kebutuhan');
		expect(data.categories[0].spent).toBe(0);
		expect(data.categories[0].balance).toBe(10000000);
	});
});
