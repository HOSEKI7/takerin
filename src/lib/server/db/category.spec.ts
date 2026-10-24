import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, userSettings, incomeSource, monthlyPeriod, category, expense } from './schema';
import { getManageCategoriesData, updateCategoriesMidPeriod } from './category';
import fs from 'node:fs';
import path from 'node:path';

describe('Category Management D1 Database Operations (Seam 2)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Clean up tables
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

	it('retrieves categories with allocations, spent, balance and statuses', async () => {
		const testUserId = 'user-cat-' + Date.now();
		const periodId = 'period-cat-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Cat Manager Tester',
			email: `cat-${Date.now()}@example.com`,
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

		const cat1Id = 'cat-1-' + Date.now();
		const cat2Id = 'cat-2-' + Date.now();

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
				name: 'Tabungan',
				percentage: 40,
				isSavings: true,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		await db.insert(expense).values({
			id: 'exp-1-' + Date.now(),
			userId: testUserId,
			periodId,
			categoryId: cat1Id,
			name: 'Beras & Sayur',
			amount: 500000,
			date: '2026-10-21',
			createdAt: now,
			updatedAt: now
		});

		const data = await getManageCategoriesData(proxy.env.DB, testUserId);
		expect(data.period).toBeDefined();
		expect(data.period?.id).toBe(periodId);
		expect(data.activeCategories).toHaveLength(2);
		expect(data.frozenCategories).toHaveLength(0);

		const c1 = data.activeCategories.find((c) => c.id === cat1Id);
		expect(c1).toBeDefined();
		expect(c1?.allocation).toBe(6000000);
		expect(c1?.spent).toBe(500000);
		expect(c1?.balance).toBe(5500000);
		expect(c1?.isSavings).toBe(false);

		const c2 = data.activeCategories.find((c) => c.id === cat2Id);
		expect(c2?.allocation).toBe(4000000);
		expect(c2?.spent).toBe(0);
		expect(c2?.balance).toBe(4000000);
		expect(c2?.isSavings).toBe(true);
	});

	it('successfully updates categories mid-period: renames, updates percentages, toggles savings, adds new category, and freezes deleted category', async () => {
		const testUserId = 'user-mid-update-' + Date.now();
		const periodId = 'period-mid-update-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Mid Period User',
			email: `mid-${Date.now()}@example.com`,
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

		const catA = 'cat-a-' + Date.now();
		const catB = 'cat-b-' + Date.now();
		const catC = 'cat-c-' + Date.now();

		await db.insert(category).values([
			{
				id: catA,
				userId: testUserId,
				periodId,
				name: 'Kebutuhan Harian',
				percentage: 50,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: catB,
				userId: testUserId,
				periodId,
				name: 'Hobi Lama',
				percentage: 30,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: catC,
				userId: testUserId,
				periodId,
				name: 'Dana Darurat',
				percentage: 20,
				isSavings: true,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		// We will:
		// 1. Rename catA to "Kebutuhan Pokok & Makan" and update pct to 50%
		// 2. Freeze catB (Hobi Lama) and redistribute its 30%
		// 3. Update catC to 30% and toggle isSavings to true
		// 4. Add a new category "Investasi Saham" with 20% and isSavings = true
		// Total active: 50 + 30 + 20 = 100%

		const result = await updateCategoriesMidPeriod(proxy.env.DB, {
			userId: testUserId,
			periodId,
			activeCategories: [
				{
					id: catA,
					name: 'Kebutuhan Pokok & Makan',
					percentage: 50,
					isSavings: false
				},
				{
					id: catC,
					name: 'Dana Darurat',
					percentage: 30,
					isSavings: true
				},
				{
					name: 'Investasi Saham',
					percentage: 20,
					isSavings: true
				}
			],
			freezeCategoryIds: [catB]
		});

		expect(result.success).toBe(true);

		// Verify state via getManageCategoriesData
		const updatedData = await getManageCategoriesData(proxy.env.DB, testUserId);
		expect(updatedData.activeCategories).toHaveLength(3);
		expect(updatedData.frozenCategories).toHaveLength(1);

		// catA renamed
		const renewedCatA = updatedData.activeCategories.find((c) => c.id === catA);
		expect(renewedCatA?.name).toBe('Kebutuhan Pokok & Makan');
		expect(renewedCatA?.percentage).toBe(50);
		expect(renewedCatA?.allocation).toBe(5000000);

		// catC updated percentage
		const renewedCatC = updatedData.activeCategories.find((c) => c.id === catC);
		expect(renewedCatC?.percentage).toBe(30);
		expect(renewedCatC?.allocation).toBe(3000000);
		expect(renewedCatC?.isSavings).toBe(true);

		// new category inserted
		const newCat = updatedData.activeCategories.find((c) => c.name === 'Investasi Saham');
		expect(newCat).toBeDefined();
		expect(newCat?.percentage).toBe(20);
		expect(newCat?.allocation).toBe(2000000);
		expect(newCat?.isSavings).toBe(true);

		// catB frozen
		const frozenCatB = updatedData.frozenCategories.find((c) => c.id === catB);
		expect(frozenCatB).toBeDefined();
		expect(frozenCatB?.status).toBe('frozen');
		expect(frozenCatB?.name).toBe('Hobi Lama');
		expect(frozenCatB?.percentage).toBe(30);
		expect(frozenCatB?.allocation).toBe(3000000);
	});

	it('rejects mid-period updates when active categories do not sum to 100%', async () => {
		const testUserId = 'user-err-' + Date.now();
		const periodId = 'period-err-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Error Tester',
			email: `err-${Date.now()}@example.com`,
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

		await expect(
			updateCategoriesMidPeriod(proxy.env.DB, {
				userId: testUserId,
				periodId,
				activeCategories: [
					{ name: 'Kebutuhan', percentage: 70, isSavings: false },
					{ name: 'Keinginan', percentage: 20, isSavings: false }
				]
			})
		).rejects.toThrow('Total persentase harus tepat 100%');
	});

	it('auto-transitions expired period when getManageCategoriesData is called', async () => {
		const testUserId = 'user-cat-expired-' + Date.now();
		const oldPeriodId = 'period-cat-expired-' + Date.now();
		const oldDate = new Date('2026-08-25');

		await db.insert(user).values({
			id: testUserId,
			name: 'Expired Cat Tester',
			email: `cat-exp-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: true,
			role: 'user',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(userSettings).values({
			id: 'settings-cat-' + Date.now(),
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: oldDate,
			updatedAt: oldDate
		});

		await db.insert(incomeSource).values({
			id: 'inc-cat-' + Date.now(),
			userId: testUserId,
			name: 'Gaji',
			amount: 5000000,
			createdAt: oldDate,
			updatedAt: oldDate
		});

		// Expired period
		await db.insert(monthlyPeriod).values({
			id: oldPeriodId,
			userId: testUserId,
			startDate: '2026-08-25',
			endDate: '2026-09-24',
			payDay: 25,
			totalIncome: 5000000,
			status: 'active',
			createdAt: oldDate
		});

		await db.insert(category).values([
			{
				id: 'cat-active-' + Date.now(),
				userId: testUserId,
				periodId: oldPeriodId,
				name: 'Living',
				percentage: 100,
				isSavings: false,
				status: 'active',
				createdAt: oldDate,
				updatedAt: oldDate
			},
			{
				id: 'cat-frozen-' + Date.now(),
				userId: testUserId,
				periodId: oldPeriodId,
				name: 'Old Gym',
				percentage: 0,
				isSavings: false,
				status: 'frozen',
				createdAt: oldDate,
				updatedAt: oldDate
			}
		]);

		const data = await getManageCategoriesData(proxy.env.DB, testUserId);

		expect(data.period).not.toBeNull();
		expect(data.period?.id).not.toBe(oldPeriodId);
		expect(data.period?.status).toBe('active');
		expect(data.activeCategories).toHaveLength(1);
		expect(data.activeCategories[0].name).toBe('Living');
		// Frozen category was NOT carried over to the new period
		expect(data.frozenCategories).toHaveLength(0);
	});
});
