import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, monthlyPeriod, category, expense } from './schema';
import { getCompletedPeriods, getCompletedPeriodDetail, savePeriodAiSummary } from './history';
import fs from 'node:fs';
import path from 'node:path';

describe('History D1 Database Operations (Seam 2)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;
	const testUserId = 'user-history-test';
	const otherUserId = 'other-user-history-test';

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
					await proxy.env.DB.exec(`${stmt};`);
				}
			}
		}
	});

	afterAll(async () => {
		await proxy?.dispose();
	});

	beforeEach(async () => {
		await proxy.env.DB.exec('DELETE FROM expense;');
		await proxy.env.DB.exec('DELETE FROM category;');
		await proxy.env.DB.exec('DELETE FROM monthly_period;');
		await proxy.env.DB.exec('DELETE FROM user;');

		const now = new Date();
		await db.insert(user).values([
			{
				id: testUserId,
				name: 'History Tester',
				email: 'history@test.com',
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
				role: 'user',
				onboardingCompleted: true
			},
			{
				id: otherUserId,
				name: 'Other Tester',
				email: 'other@test.com',
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
				role: 'user',
				onboardingCompleted: true
			}
		]);
	});

	it('returns only completed periods ordered by date descending with correct income, spent, and remaining', async () => {
		const now = new Date();

		// Insert completed period 1 (older)
		await db.insert(monthlyPeriod).values({
			id: 'period-old',
			userId: testUserId,
			startDate: '2026-01-25',
			endDate: '2026-02-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'completed',
			aiSummary: 'Summary period lama',
			createdAt: new Date('2026-01-25T00:00:00Z')
		});

		// Insert completed period 2 (newer)
		await db.insert(monthlyPeriod).values({
			id: 'period-new',
			userId: testUserId,
			startDate: '2026-02-25',
			endDate: '2026-03-24',
			payDay: 25,
			totalIncome: 12000000,
			status: 'completed',
			aiSummary: null,
			createdAt: new Date('2026-02-25T00:00:00Z')
		});

		// Insert active period (should NOT be returned in history)
		await db.insert(monthlyPeriod).values({
			id: 'period-active',
			userId: testUserId,
			startDate: '2026-03-25',
			endDate: '2026-04-24',
			payDay: 25,
			totalIncome: 12000000,
			status: 'active',
			aiSummary: null,
			createdAt: new Date('2026-03-25T00:00:00Z')
		});

		// Insert categories and expenses for period-new
		await db.insert(category).values({
			id: 'cat-new-1',
			userId: testUserId,
			periodId: 'period-new',
			name: 'Kebutuhan',
			percentage: 50,
			isSavings: false,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		await db.insert(expense).values({
			id: 'exp-new-1',
			userId: testUserId,
			periodId: 'period-new',
			categoryId: 'cat-new-1',
			name: 'Belanja Bulanan',
			amount: 4000000,
			date: '2026-03-01',
			createdAt: now,
			updatedAt: now
		});

		const historyList = await getCompletedPeriods(proxy.env.DB, testUserId);

		expect(historyList).toHaveLength(2);
		// Descending order: period-new (Feb-Mar) then period-old (Jan-Feb)
		expect(historyList[0].id).toBe('period-new');
		expect(historyList[0].totalIncome).toBe(12000000);
		expect(historyList[0].totalSpent).toBe(4000000);
		expect(historyList[0].remaining).toBe(8000000);
		expect(historyList[0].spentPercentage).toBe(33);

		expect(historyList[1].id).toBe('period-old');
		expect(historyList[1].totalIncome).toBe(10000000);
		expect(historyList[1].totalSpent).toBe(0);
		expect(historyList[1].remaining).toBe(10000000);
	});

	it('does not return completed periods belonging to another user (user isolation)', async () => {
		await db.insert(monthlyPeriod).values({
			id: 'period-other',
			userId: otherUserId,
			startDate: '2026-01-25',
			endDate: '2026-02-24',
			payDay: 25,
			totalIncome: 5000000,
			status: 'completed',
			aiSummary: null,
			createdAt: new Date('2026-01-25T00:00:00Z')
		});

		const historyList = await getCompletedPeriods(proxy.env.DB, testUserId);
		expect(historyList).toHaveLength(0);
	});

	it('fetches detailed period info including active and frozen categories', async () => {
		const now = new Date();

		await db.insert(monthlyPeriod).values({
			id: 'period-detail-1',
			userId: testUserId,
			startDate: '2026-01-25',
			endDate: '2026-02-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'completed',
			aiSummary: null,
			createdAt: now
		});

		// Active Category
		await db.insert(category).values({
			id: 'cat-active',
			userId: testUserId,
			periodId: 'period-detail-1',
			name: 'Makanan',
			percentage: 40,
			isSavings: false,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		// Frozen Category
		await db.insert(category).values({
			id: 'cat-frozen',
			userId: testUserId,
			periodId: 'period-detail-1',
			name: 'Gym',
			percentage: 10,
			isSavings: false,
			status: 'frozen',
			createdAt: now,
			updatedAt: now
		});

		// Savings Category
		await db.insert(category).values({
			id: 'cat-savings',
			userId: testUserId,
			periodId: 'period-detail-1',
			name: 'Dana Darurat',
			percentage: 50,
			isSavings: true,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		// Expenses
		await db.insert(expense).values([
			{
				id: 'exp-1',
				userId: testUserId,
				periodId: 'period-detail-1',
				categoryId: 'cat-active',
				name: 'Restoran',
				amount: 1500000,
				date: '2026-02-01',
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'exp-2',
				userId: testUserId,
				periodId: 'period-detail-1',
				categoryId: 'cat-frozen',
				name: 'Langganan Gym awal bulan',
				amount: 500000,
				date: '2026-01-28',
				createdAt: now,
				updatedAt: now
			}
		]);

		const detail = await getCompletedPeriodDetail(proxy.env.DB, testUserId, 'period-detail-1');

		expect(detail).not.toBeNull();
		expect(detail?.period.id).toBe('period-detail-1');
		expect(detail?.summary.totalIncome).toBe(10000000);
		expect(detail?.summary.totalSpent).toBe(2000000);
		expect(detail?.summary.remaining).toBe(8000000);

		// Check categories breakdown (active and frozen must both be present)
		expect(detail?.categories).toHaveLength(3);
		const frozenCat = detail?.categories.find((c) => c.name === 'Gym');
		expect(frozenCat).toBeDefined();
		expect(frozenCat?.status).toBe('frozen');
		expect(frozenCat?.spent).toBe(500000);
		expect(frozenCat?.allocation).toBe(1000000);
		expect(frozenCat?.balance).toBe(500000);

		// Check aggregate data formatted for AI
		expect(detail?.aiAggregateData.categories).toHaveLength(3);
		expect(detail?.aiAggregateData.totalIncome).toBe(10000000);
		expect(detail?.aiAggregateData.totalSpent).toBe(2000000);
	});

	it('returns null if period is not found or belongs to another user', async () => {
		const detail = await getCompletedPeriodDetail(proxy.env.DB, testUserId, 'non-existent-id');
		expect(detail).toBeNull();
	});

	it('returns null if period is active (only completed periods can be viewed in history)', async () => {
		const now = new Date();
		await db.insert(monthlyPeriod).values({
			id: 'period-active-test',
			userId: testUserId,
			startDate: '2026-03-25',
			endDate: '2026-04-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active',
			aiSummary: null,
			createdAt: now
		});

		const detail = await getCompletedPeriodDetail(proxy.env.DB, testUserId, 'period-active-test');
		expect(detail).toBeNull();
	});

	it('saves and caches AI summary phrase into monthly_period record', async () => {
		const now = new Date();

		await db.insert(monthlyPeriod).values({
			id: 'period-to-cache',
			userId: testUserId,
			startDate: '2026-01-25',
			endDate: '2026-02-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'completed',
			aiSummary: null,
			createdAt: now
		});

		await savePeriodAiSummary(
			proxy.env.DB,
			'period-to-cache',
			testUserId,
			'Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥'
		);

		const updatedDetail = await getCompletedPeriodDetail(
			proxy.env.DB,
			testUserId,
			'period-to-cache'
		);

		expect(updatedDetail?.period.aiSummary).toBe(
			'Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥'
		);
	});
});
