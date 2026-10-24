import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { eq } from 'drizzle-orm';
import { getDb } from './index.js';
import {
	user,
	session,
	monthlyPeriod,
	category,
	expense,
	incomeSource,
	userSettings,
	healthCheck
} from './schema.js';
import {
	getAdminAnalytics,
	getAdminUsers,
	getAdminTemplates,
	createCategoryTemplate,
	updateCategoryTemplate,
	deleteCategoryTemplate,
	getSystemHealth,
	purgeAdminBudgetData
} from './admin.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin D1 Database Operations (Seam 2)', () => {
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

		// Apply migrations
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
					if (stmt.length > 0) {
						await proxy.env.DB.exec(stmt + ';');
					}
				}
			}
		}
	});

	afterAll(async () => {
		await proxy?.dispose();
	});

	beforeEach(async () => {
		// Clean mutable data between tests while preserving system templates
		await proxy.env.DB.exec('DELETE FROM expense;');
		await proxy.env.DB.exec('DELETE FROM category;');
		await proxy.env.DB.exec('DELETE FROM monthly_period;');
		await proxy.env.DB.exec('DELETE FROM session;');
		await proxy.env.DB.exec('DELETE FROM user;');
		await proxy.env.DB.exec('DELETE FROM health_check;');
		await proxy.env.DB.exec('DELETE FROM category_template WHERE is_system = 0;');
	});

	describe('getAdminAnalytics', () => {
		it('calculates total users, DAU, total expenses, and top categories accurately', async () => {
			const now = new Date('2026-10-22T12:00:00Z');
			const twoDaysAgo = new Date('2026-10-20T12:00:00Z');

			// Insert 2 users: 1 active today, 1 inactive
			await db.insert(user).values([
				{
					id: 'u1',
					name: 'User Satu',
					email: 'u1@example.com',
					role: 'user',
					emailVerified: true,
					onboardingCompleted: true,
					createdAt: twoDaysAgo,
					updatedAt: now
				},
				{
					id: 'u2',
					name: 'User Dua',
					email: 'u2@example.com',
					role: 'user',
					emailVerified: true,
					onboardingCompleted: true,
					createdAt: twoDaysAgo,
					updatedAt: twoDaysAgo
				}
			]);

			// Session for u1 updated recently
			await db.insert(session).values({
				id: 's1',
				userId: 'u1',
				token: 'tok-1',
				createdAt: twoDaysAgo,
				updatedAt: now,
				expiresAt: new Date(now.getTime() + 86400000)
			});

			// Setup period & categories
			await db.insert(monthlyPeriod).values({
				id: 'p1',
				userId: 'u1',
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				payDay: 25,
				totalIncome: 10000000,
				status: 'active',
				createdAt: twoDaysAgo
			});

			await db.insert(category).values([
				{
					id: 'c1',
					userId: 'u1',
					periodId: 'p1',
					name: 'Makanan',
					percentage: 40,
					isSavings: false,
					status: 'active',
					createdAt: twoDaysAgo,
					updatedAt: twoDaysAgo
				},
				{
					id: 'c2',
					userId: 'u1',
					periodId: 'p1',
					name: 'makanan', // Same category name in different casing
					percentage: 30,
					isSavings: false,
					status: 'active',
					createdAt: twoDaysAgo,
					updatedAt: twoDaysAgo
				},
				{
					id: 'c3',
					userId: 'u1',
					periodId: 'p1',
					name: 'Transportasi',
					percentage: 30,
					isSavings: false,
					status: 'active',
					createdAt: twoDaysAgo,
					updatedAt: twoDaysAgo
				}
			]);

			// Insert expenses
			await db.insert(expense).values([
				{
					id: 'e1',
					userId: 'u1',
					periodId: 'p1',
					categoryId: 'c1',
					name: 'Makan Siang',
					amount: 25000,
					date: '2026-10-22',
					createdAt: now,
					updatedAt: now
				},
				{
					id: 'e2',
					userId: 'u1',
					periodId: 'p1',
					categoryId: 'c3',
					name: 'Bensin',
					amount: 50000,
					date: '2026-10-22',
					createdAt: now,
					updatedAt: now
				}
			]);

			const analytics = await getAdminAnalytics(proxy.env.DB, now);

			expect(analytics.totalUsers).toBe(2);
			expect(analytics.dau).toBe(1); // Only u1 was active within 24 hours
			expect(analytics.totalExpenses).toBe(2);
			expect(analytics.totalExpenseAmount).toBe(75000);
			expect(analytics.topCategories).toEqual([
				{ name: 'makanan', count: 2 },
				{ name: 'transportasi', count: 1 }
			]);
		});
	});

	describe('getAdminUsers', () => {
		it('returns all users with registration date and lastActive, with NO financial data', async () => {
			const now = new Date('2026-10-22T10:00:00Z');
			const regDate = new Date('2026-10-01T08:00:00Z');

			await db.insert(user).values({
				id: 'u_admin_view',
				name: 'Test Privacy User',
				email: 'privacy@example.com',
				role: 'user',
				emailVerified: true,
				onboardingCompleted: true,
				createdAt: regDate,
				updatedAt: now
			});

			await db.insert(session).values({
				id: 's_admin_view',
				userId: 'u_admin_view',
				token: 'tok-priv',
				createdAt: regDate,
				updatedAt: now,
				expiresAt: new Date(now.getTime() + 86400000)
			});

			const users = await getAdminUsers(proxy.env.DB);
			expect(users).toHaveLength(1);
			const u = users[0];
			expect(u.id).toBe('u_admin_view');
			expect(u.email).toBe('privacy@example.com');
			expect(u.name).toBe('Test Privacy User');
			expect(u.role).toBe('user');
			expect(u.onboardingCompleted).toBe(true);
			expect(u.createdAt).toBeDefined();
			expect(u.lastActiveAt).toBeDefined();

			// STRICT PRIVACY CHECK: Ensure no sensitive financial fields exist
			expect(u).not.toHaveProperty('expenses');
			expect(u).not.toHaveProperty('totalIncome');
			expect(u).not.toHaveProperty('amount');
			expect(u).not.toHaveProperty('balance');
		});
	});

	describe('Template CRUD Operations', () => {
		it('reads templates including system presets', async () => {
			const templates = await getAdminTemplates(proxy.env.DB);
			expect(templates.length).toBeGreaterThanOrEqual(2);
			const tpl50 = templates.find((t) => t.name === '50/30/20');
			expect(tpl50).toBeDefined();
			expect(tpl50?.isSystem).toBe(true);
			expect(tpl50?.categories).toHaveLength(3);
		});

		it('creates, updates, and deletes an admin template', async () => {
			// 1. Create
			const created = await createCategoryTemplate(proxy.env.DB, {
				name: '80/20 Minimalis',
				description: '80% biaya hidup, 20% tabungan masa depan',
				categories: [
					{ name: 'Kebutuhan & Keinginan', percentage: 80, isSavings: false },
					{ name: 'Tabungan Bebas', percentage: 20, isSavings: true }
				]
			});

			expect(created.id).toBeDefined();
			expect(created.name).toBe('80/20 Minimalis');
			expect(created.isSystem).toBe(false);
			expect(created.categories).toHaveLength(2);

			// 2. Read
			const allAfterCreate = await getAdminTemplates(proxy.env.DB);
			const found = allAfterCreate.find((t) => t.id === created.id);
			expect(found).toBeDefined();
			expect(found?.name).toBe('80/20 Minimalis');

			// 3. Update
			const updated = await updateCategoryTemplate(proxy.env.DB, created.id, {
				name: '80/20 Super Minimalis',
				description: 'Deskripsi diperbarui',
				categories: [
					{ name: 'Biaya Hidup', percentage: 70, isSavings: false },
					{ name: 'Investasi', percentage: 30, isSavings: true }
				]
			});

			expect(updated.name).toBe('80/20 Super Minimalis');
			expect(updated.categories[0].name).toBe('Biaya Hidup');
			expect(updated.categories[0].percentage).toBe(70);

			// 4. Delete
			const deleteResult = await deleteCategoryTemplate(proxy.env.DB, created.id);
			expect(deleteResult.success).toBe(true);

			const allAfterDelete = await getAdminTemplates(proxy.env.DB);
			expect(allAfterDelete.some((t) => t.id === created.id)).toBe(false);
		});

		it('prevents deletion and update of system preset templates', async () => {
			const templates = await getAdminTemplates(proxy.env.DB);
			const systemTemplate = templates.find((t) => t.isSystem);
			expect(systemTemplate).toBeDefined();

			await expect(deleteCategoryTemplate(proxy.env.DB, systemTemplate!.id)).rejects.toThrow(
				'Template bawaan sistem tidak dapat dihapus.'
			);

			await expect(
				updateCategoryTemplate(proxy.env.DB, systemTemplate!.id, {
					name: 'Diubah',
					categories: [{ name: 'Kebutuhan', percentage: 100, isSavings: false }]
				})
			).rejects.toThrow('Template sistem bawaan tidak dapat diubah.');
		});
	});

	describe('getSystemHealth', () => {
		it('returns estimated D1 rows, AI call counts, and Resend link', async () => {
			// Insert health check ping
			await db.insert(healthCheck).values({
				id: 'hc-1',
				service: 'groq',
				status: 'success',
				createdAt: Date.now()
			});

			const health = await getSystemHealth(proxy.env.DB);

			expect(health.totalD1RowsEstimate).toBeGreaterThanOrEqual(1);
			expect(health.tableBreakdown).toBeDefined();
			expect(health.tableBreakdown.user).toBe(0);
			expect(health.tableBreakdown.healthCheck).toBe(1);
			expect(health.aiCallsCount).toBeGreaterThanOrEqual(1);
			expect(health.resendUsageLink).toContain('https://resend.com');
			expect(health.databaseStatus).toBe('healthy');
		});
	});

	describe('purgeAdminBudgetData', () => {
		it('purges budget data (period, category, expense, incomeSource, userSettings) for all admin accounts without touching regular users', async () => {
			const now = new Date();

			// 1. Seed admin user
			const adminId = 'admin-purge-all';
			await db.insert(user).values({
				id: adminId,
				name: 'Purge Admin',
				email: 'purge-admin@example.com',
				role: 'admin',
				createdAt: now,
				updatedAt: now,
				onboardingCompleted: true
			});

			// 2. Seed regular user
			const regularId = 'user-keep-data';
			await db.insert(user).values({
				id: regularId,
				name: 'Keep User',
				email: 'keep-user@example.com',
				role: 'user',
				createdAt: now,
				updatedAt: now,
				onboardingCompleted: true
			});

			// 3. Seed budget data for admin
			await db.insert(userSettings).values({
				id: 's-admin',
				userId: adminId,
				payDay: 25,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(incomeSource).values({
				id: 'inc-admin',
				userId: adminId,
				name: 'Gaji Admin',
				amount: 10000000,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(monthlyPeriod).values({
				id: 'period-admin',
				userId: adminId,
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				payDay: 25,
				totalIncome: 10000000,
				createdAt: now
			});
			await db.insert(category).values({
				id: 'cat-admin',
				userId: adminId,
				periodId: 'period-admin',
				name: 'Admin Cat',
				percentage: 50,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(expense).values({
				id: 'exp-admin',
				userId: adminId,
				periodId: 'period-admin',
				categoryId: 'cat-admin',
				name: 'Admin Expense',
				amount: 50000,
				date: '2026-10-10',
				createdAt: now,
				updatedAt: now
			});

			// 4. Seed budget data for regular user
			await db.insert(userSettings).values({
				id: 's-user',
				userId: regularId,
				payDay: 25,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(incomeSource).values({
				id: 'inc-user',
				userId: regularId,
				name: 'Gaji User',
				amount: 5000000,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(monthlyPeriod).values({
				id: 'period-user',
				userId: regularId,
				startDate: '2026-10-01',
				endDate: '2026-10-31',
				payDay: 25,
				totalIncome: 5000000,
				createdAt: now
			});
			await db.insert(category).values({
				id: 'cat-user',
				userId: regularId,
				periodId: 'period-user',
				name: 'User Cat',
				percentage: 50,
				createdAt: now,
				updatedAt: now
			});
			await db.insert(expense).values({
				id: 'exp-user',
				userId: regularId,
				periodId: 'period-user',
				categoryId: 'cat-user',
				name: 'User Expense',
				amount: 25000,
				date: '2026-10-10',
				createdAt: now,
				updatedAt: now
			});

			// 5. Purge admin data
			const result = await purgeAdminBudgetData(proxy.env.DB);
			expect(result.success).toBe(true);
			expect(result.purgedAdminsCount).toBeGreaterThanOrEqual(1);

			// 6. Assert admin budget records are purged
			const adminExpenses = await db.select().from(expense).where(eq(expense.userId, adminId));
			const adminCategories = await db.select().from(category).where(eq(category.userId, adminId));
			const adminPeriods = await db
				.select()
				.from(monthlyPeriod)
				.where(eq(monthlyPeriod.userId, adminId));
			const adminIncomes = await db
				.select()
				.from(incomeSource)
				.where(eq(incomeSource.userId, adminId));
			const adminSettings = await db
				.select()
				.from(userSettings)
				.where(eq(userSettings.userId, adminId));

			expect(adminExpenses).toHaveLength(0);
			expect(adminCategories).toHaveLength(0);
			expect(adminPeriods).toHaveLength(0);
			expect(adminIncomes).toHaveLength(0);
			expect(adminSettings).toHaveLength(0);

			// 7. Assert regular user budget records are untouched
			const userExpenses = await db.select().from(expense).where(eq(expense.userId, regularId));
			const userCategories = await db.select().from(category).where(eq(category.userId, regularId));
			const userPeriods = await db
				.select()
				.from(monthlyPeriod)
				.where(eq(monthlyPeriod.userId, regularId));
			const userIncomes = await db
				.select()
				.from(incomeSource)
				.where(eq(incomeSource.userId, regularId));
			const userSettingsRows = await db
				.select()
				.from(userSettings)
				.where(eq(userSettings.userId, regularId));

			expect(userExpenses).toHaveLength(1);
			expect(userCategories).toHaveLength(1);
			expect(userPeriods).toHaveLength(1);
			expect(userIncomes).toHaveLength(1);
			expect(userSettingsRows).toHaveLength(1);
		});
	});
});
