import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index.js';
import { user, monthlyPeriod, category } from './schema.js';
import {
	createExpense,
	getExpenses,
	getExpenseById,
	updateExpense,
	deleteExpense,
	getActivePeriodCategories
} from './expense.js';
import { getDashboardData } from './dashboard.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Expense D1 Database & Domain Operations (Seam 2)', () => {
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

	it('creates an expense and verifies it can be retrieved and filters out frozen categories for input', async () => {
		const testUserId = 'test-exp-user-' + Date.now();
		const periodId = 'period-exp-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Tester Expense',
			email: `tester-${Date.now()}@example.com`,
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

		const catActiveId = 'cat-active-' + Date.now();
		const catFrozenId = 'cat-frozen-' + Date.now();

		await db.insert(category).values([
			{
				id: catActiveId,
				userId: testUserId,
				periodId,
				name: 'Makan & Minum',
				percentage: 50,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: catFrozenId,
				userId: testUserId,
				periodId,
				name: 'Hobi Lama',
				percentage: 10,
				isSavings: false,
				status: 'frozen',
				createdAt: now,
				updatedAt: now
			}
		]);

		// Verify frozen categories are excluded for input selection
		const selectableCategories = await getActivePeriodCategories(proxy.env.DB, {
			userId: testUserId,
			periodId
		});
		expect(selectableCategories).toHaveLength(1);
		expect(selectableCategories[0].id).toBe(catActiveId);
		expect(selectableCategories[0].name).toBe('Makan & Minum');

		// Create expense
		const result = await createExpense(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: catActiveId,
			name: 'Nasi Goreng Spesial',
			amount: 35000,
			date: '2026-10-21',
			time: '19:30',
			notes: 'Makan malam'
		});

		expect(result.success).toBe(true);
		expect(result.id).toBeDefined();

		// Fetch expense by ID
		const fetched = await getExpenseById(proxy.env.DB, {
			id: result.id,
			userId: testUserId
		});
		expect(fetched).not.toBeNull();
		expect(fetched?.name).toBe('Nasi Goreng Spesial');
		expect(fetched?.amount).toBe(35000);
		expect(fetched?.categoryId).toBe(catActiveId);
		expect(fetched?.categoryName).toBe('Makan & Minum');
		expect(fetched?.time).toBe('19:30');
		expect(fetched?.notes).toBe('Makan malam');

		// Check Dashboard reflection
		const dashboard = await getDashboardData(proxy.env.DB, testUserId);
		expect(dashboard.summary.totalSpent).toBe(35000);
		expect(dashboard.summary.remaining).toBe(10000000 - 35000);

		const makanCat = dashboard.categories.find((c) => c.id === catActiveId);
		expect(makanCat).toBeDefined();
		expect(makanCat?.spent).toBe(35000);
		expect(makanCat?.balance).toBe(5000000 - 35000);

		// Recent expenses should show this new expense
		expect(dashboard.recentExpenses).toHaveLength(1);
		expect(dashboard.recentExpenses[0].name).toBe('Nasi Goreng Spesial');
		expect(dashboard.recentExpenses[0].amount).toBe(35000);
	});

	it('updates and deletes an expense, properly recalculating category balances', async () => {
		const testUserId = 'test-exp-crud-' + Date.now();
		const periodId = 'period-crud-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Tester CRUD',
			email: `tester-crud-${Date.now()}@example.com`,
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
			totalIncome: 5000000,
			status: 'active',
			createdAt: now
		});

		const catId = 'cat-crud-' + Date.now();
		await db.insert(category).values({
			id: catId,
			userId: testUserId,
			periodId,
			name: 'Transportasi',
			percentage: 30,
			isSavings: false,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		// 1. Create
		const exp1 = await createExpense(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: catId,
			name: 'Bensin Motor',
			amount: 50000,
			date: '2026-10-21'
		});

		// 2. Update
		const updateRes = await updateExpense(proxy.env.DB, {
			id: exp1.id,
			userId: testUserId,
			categoryId: catId,
			name: 'Bensin Mobil Pertamax',
			amount: 150000,
			date: '2026-10-21',
			notes: 'Full tank'
		});
		expect(updateRes.success).toBe(true);

		const updated = await getExpenseById(proxy.env.DB, {
			id: exp1.id,
			userId: testUserId
		});
		expect(updated?.name).toBe('Bensin Mobil Pertamax');
		expect(updated?.amount).toBe(150000);
		expect(updated?.notes).toBe('Full tank');

		// Check dashboard after update
		let dashboard = await getDashboardData(proxy.env.DB, testUserId);
		expect(dashboard.summary.totalSpent).toBe(150000);

		// 3. Delete
		const deleteRes = await deleteExpense(proxy.env.DB, {
			id: exp1.id,
			userId: testUserId
		});
		expect(deleteRes.success).toBe(true);

		// Check that it's deleted
		const deleted = await getExpenseById(proxy.env.DB, {
			id: exp1.id,
			userId: testUserId
		});
		expect(deleted).toBeNull();

		// Check dashboard after delete
		dashboard = await getDashboardData(proxy.env.DB, testUserId);
		expect(dashboard.summary.totalSpent).toBe(0);
		expect(dashboard.recentExpenses).toHaveLength(0);
	});

	it('supports filtering expenses by category in the active period', async () => {
		const testUserId = 'test-exp-filter-' + Date.now();
		const periodId = 'period-filter-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Tester Filter',
			email: `tester-filter-${Date.now()}@example.com`,
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

		const cat1 = 'cat-1-' + Date.now();
		const cat2 = 'cat-2-' + Date.now();

		await db.insert(category).values([
			{
				id: cat1,
				userId: testUserId,
				periodId,
				name: 'Makan',
				percentage: 50,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: cat2,
				userId: testUserId,
				periodId,
				name: 'Tabungan Emas',
				percentage: 50,
				isSavings: true,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		await createExpense(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: cat1,
			name: 'Sarapan',
			amount: 20000,
			date: '2026-10-21'
		});

		await createExpense(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: cat2,
			name: 'Beli Emas 1 gram',
			amount: 1400000,
			date: '2026-10-22'
		});

		// All expenses
		const all = await getExpenses(proxy.env.DB, { userId: testUserId, periodId });
		expect(all).toHaveLength(2);

		// Filter cat1
		const filteredCat1 = await getExpenses(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: cat1
		});
		expect(filteredCat1).toHaveLength(1);
		expect(filteredCat1[0].name).toBe('Sarapan');

		// Filter cat2
		const filteredCat2 = await getExpenses(proxy.env.DB, {
			userId: testUserId,
			periodId,
			categoryId: cat2
		});
		expect(filteredCat2).toHaveLength(1);
		expect(filteredCat2[0].name).toBe('Beli Emas 1 gram');
		expect(filteredCat2[0].isSavings).toBe(true);
	});
});
