import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index.js';
import { user, session, monthlyPeriod, category, expense, healthCheck } from './schema.js';
import {
	getAdminAnalytics,
	getAdminUsers,
	getAdminTemplates,
	createCategoryTemplate,
	updateCategoryTemplate,
	deleteCategoryTemplate,
	getSystemHealth
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
});
