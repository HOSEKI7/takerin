import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, userSettings, incomeSource, monthlyPeriod, category, expense } from './schema';
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

	it('loads active monthly period with expenses, aggregating category expenses via native SQL GROUP BY and limiting recent expenses to 5 (Issue #37)', async () => {
		const testUserId = 'test-dashboard-expenses-' + Date.now();
		const periodId = 'period-exp-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Tester With Expenses',
			email: `expenses-${Date.now()}@example.com`,
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

		const cat1Id = 'cat-1-exp-' + Date.now();
		const cat2Id = 'cat-2-exp-' + Date.now();

		await db.insert(category).values([
			{
				id: cat1Id,
				userId: testUserId,
				periodId,
				name: 'Kebutuhan',
				percentage: 60,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: cat2Id,
				userId: testUserId,
				periodId,
				name: 'Keinginan',
				percentage: 40,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		// Insert 7 expenses (4 in cat1, 3 in cat2)
		const expensesData = [
			{
				id: 'exp-1-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat1Id,
				name: 'Belanja Mingguan 1',
				amount: 500000,
				date: '2026-10-22',
				createdAt: new Date('2026-10-22T08:00:00Z'),
				updatedAt: new Date('2026-10-22T08:00:00Z')
			},
			{
				id: 'exp-2-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat1Id,
				name: 'Belanja Mingguan 2',
				amount: 600000,
				date: '2026-10-25',
				createdAt: new Date('2026-10-25T08:00:00Z'),
				updatedAt: new Date('2026-10-25T08:00:00Z')
			},
			{
				id: 'exp-3-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat2Id,
				name: 'Nonton Bioskop',
				amount: 150000,
				date: '2026-10-26',
				createdAt: new Date('2026-10-26T14:00:00Z'),
				updatedAt: new Date('2026-10-26T14:00:00Z')
			},
			{
				id: 'exp-4-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat1Id,
				name: 'Listrik & Air',
				amount: 400000,
				date: '2026-10-27',
				createdAt: new Date('2026-10-27T09:00:00Z'),
				updatedAt: new Date('2026-10-27T09:00:00Z')
			},
			{
				id: 'exp-5-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat2Id,
				name: 'Makan Kafe',
				amount: 250000,
				date: '2026-10-28',
				createdAt: new Date('2026-10-28T19:00:00Z'),
				updatedAt: new Date('2026-10-28T19:00:00Z')
			},
			{
				id: 'exp-6-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat2Id,
				name: 'Beli Buku',
				amount: 200000,
				date: '2026-10-29',
				createdAt: new Date('2026-10-29T11:00:00Z'),
				updatedAt: new Date('2026-10-29T11:00:00Z')
			},
			{
				id: 'exp-7-' + Date.now(),
				userId: testUserId,
				periodId,
				categoryId: cat1Id,
				name: 'Wifi Bulanan',
				amount: 350000,
				date: '2026-10-30',
				createdAt: new Date('2026-10-30T10:00:00Z'),
				updatedAt: new Date('2026-10-30T10:00:00Z')
			}
		];

		await db.insert(expense).values(expensesData);

		const data = await getDashboardData(proxy.env.DB, testUserId);

		// Category 1: 500k + 600k + 400k + 350k = 1.850.000, Allocation = 6.000.000, Balance = 4.150.000
		const cat1 = data.categories.find((c) => c.id === cat1Id);
		expect(cat1).toBeDefined();
		expect(cat1?.allocation).toBe(6000000);
		expect(cat1?.spent).toBe(1850000);
		expect(cat1?.balance).toBe(4150000);

		// Category 2: 150k + 250k + 200k = 600.000, Allocation = 4.000.000, Balance = 3.400.000
		const cat2 = data.categories.find((c) => c.id === cat2Id);
		expect(cat2).toBeDefined();
		expect(cat2?.allocation).toBe(4000000);
		expect(cat2?.spent).toBe(600000);
		expect(cat2?.balance).toBe(3400000);

		// Summary: totalIncome 10.000.000, totalSpent 2.450.000, remaining 7.550.000
		expect(data.summary.totalSpent).toBe(2450000);
		expect(data.summary.remaining).toBe(7550000);
		expect(data.summary.spentPercentage).toBe(25);

		// Recent expenses should be limited to 5
		expect(data.recentExpenses).toHaveLength(5);
		// Top recent should be exp-7 (2026-10-30), then exp-6, exp-5, exp-4, exp-3
		expect(data.recentExpenses[0].name).toBe('Wifi Bulanan');
		expect(data.recentExpenses[1].name).toBe('Beli Buku');
		expect(data.recentExpenses[2].name).toBe('Makan Kafe');
		expect(data.recentExpenses[3].name).toBe('Listrik & Air');
		expect(data.recentExpenses[4].name).toBe('Nonton Bioskop');
	});

	it('reuses activePeriod and supports skipRecentExpenses option', async () => {
		const testUserId = 'test-dashboard-cached-' + Date.now();
		const periodId = 'period-cached-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Cached User',
			email: `cached-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: true,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		const periodRecord = {
			id: periodId,
			userId: testUserId,
			startDate: '2026-10-21',
			endDate: '2026-11-20',
			payDay: 21,
			totalIncome: 8000000,
			status: 'active',
			aiSummary: null,
			incomeConfirmedAt: now,
			createdAt: now
		};

		await db.insert(monthlyPeriod).values(periodRecord);

		const dataWithSkip = await getDashboardData(proxy.env.DB, testUserId, periodRecord, {
			skipRecentExpenses: true
		});

		expect(dataWithSkip.period?.id).toBe(periodId);
		expect(dataWithSkip.recentExpenses).toEqual([]);

		const dataNullPeriod = await getDashboardData(proxy.env.DB, testUserId, null);
		expect(dataNullPeriod.period).toBeNull();
		expect(dataNullPeriod.categories).toEqual([]);
		expect(dataNullPeriod.recentExpenses).toEqual([]);
	});
});
