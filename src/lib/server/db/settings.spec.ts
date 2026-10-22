import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, userSettings, monthlyPeriod, category, expense, session, account } from './schema';
import {
	getUserSettingsWithProfile,
	updateUserProfile,
	updateUserSettings,
	getAllUserExpensesForExport,
	deleteUserData
} from './settings';
import fs from 'node:fs';
import path from 'node:path';

describe('Settings D1 Database Operations (Seam 2)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;
	const testUserId = 'user-settings-test';

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
					.filter((s) => s.length > 0 && !s.startsWith('--'));

				for (const stmt of individualStmts) {
					await proxy.env.DB.exec(`${stmt};`);
				}
			}
		}
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	beforeEach(async () => {
		await proxy.env.DB.exec('DELETE FROM expense;');
		await proxy.env.DB.exec('DELETE FROM category;');
		await proxy.env.DB.exec('DELETE FROM monthly_period;');
		await proxy.env.DB.exec('DELETE FROM income_source;');
		await proxy.env.DB.exec('DELETE FROM user_settings;');
		await proxy.env.DB.exec('DELETE FROM two_factor;');
		await proxy.env.DB.exec('DELETE FROM session;');
		await proxy.env.DB.exec('DELETE FROM account;');
		await proxy.env.DB.exec('DELETE FROM user;');

		// Seed test user
		await db.insert(user).values({
			id: testUserId,
			name: 'Budi Santoso',
			email: 'budi@example.com',
			emailVerified: true,
			role: 'user',
			twoFactorEnabled: false,
			onboardingCompleted: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Seed user settings
		await db.insert(userSettings).values({
			id: 'settings-' + testUserId,
			userId: testUserId,
			payDay: 25,
			language: 'id',
			theme: 'light',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Seed active monthly period
		await db.insert(monthlyPeriod).values({
			id: 'period-active-1',
			userId: testUserId,
			startDate: '2026-09-25',
			endDate: '2026-10-24',
			payDay: 25,
			totalIncome: 10000000,
			status: 'active',
			createdAt: new Date()
		});

		// Seed category
		await db.insert(category).values({
			id: 'cat-makan-1',
			userId: testUserId,
			periodId: 'period-active-1',
			name: 'Makanan & Minuman',
			percentage: 30,
			isSavings: false,
			status: 'active',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Seed expense
		await db.insert(expense).values({
			id: 'exp-1',
			userId: testUserId,
			periodId: 'period-active-1',
			categoryId: 'cat-makan-1',
			name: 'Sate Padang',
			amount: 35000,
			date: '2026-10-10',
			time: '19:30',
			notes: 'Makan malam',
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	it('fetches user settings with profile and active period', async () => {
		const res = await getUserSettingsWithProfile(proxy.env.DB, testUserId);
		expect(res).not.toBeNull();
		expect(res?.user.id).toBe(testUserId);
		expect(res?.user.name).toBe('Budi Santoso');
		expect(res?.user.email).toBe('budi@example.com');
		expect(res?.settings.payDay).toBe(25);
		expect(res?.settings.language).toBe('id');
		expect(res?.settings.theme).toBe('light');
		expect(res?.activePeriod?.startDate).toBe('2026-09-25');
		expect(res?.activePeriod?.endDate).toBe('2026-10-24');
	});

	it('updates user profile display name', async () => {
		await updateUserProfile(proxy.env.DB, testUserId, { name: 'Budi Hartono' });
		const res = await getUserSettingsWithProfile(proxy.env.DB, testUserId);
		expect(res?.user.name).toBe('Budi Hartono');
	});

	it('updates user settings (payDay, language, theme)', async () => {
		await updateUserSettings(proxy.env.DB, testUserId, {
			payDay: 1,
			language: 'en',
			theme: 'dark'
		});

		const res = await getUserSettingsWithProfile(proxy.env.DB, testUserId);
		expect(res?.settings.payDay).toBe(1);
		expect(res?.settings.language).toBe('en');
		expect(res?.settings.theme).toBe('dark');
	});

	it('fetches all user expenses for CSV export with category and period range', async () => {
		const exportItems = await getAllUserExpensesForExport(proxy.env.DB, testUserId);
		expect(exportItems.length).toBe(1);
		expect(exportItems[0]).toEqual({
			date: '2026-10-10',
			time: '19:30',
			name: 'Sate Padang',
			categoryName: 'Makanan & Minuman',
			amount: 35000,
			notes: 'Makan malam',
			periodRange: '2026-09-25 s/d 2026-10-24'
		});
	});

	it('deletes all user data from D1 on account deletion', async () => {
		// Add some extra session and account rows to verify full cleanup
		await db.insert(session).values({
			id: 'sess-1',
			userId: testUserId,
			token: 'token-1',
			expiresAt: new Date(Date.now() + 100000),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await db.insert(account).values({
			id: 'acc-1',
			userId: testUserId,
			providerId: 'credential',
			accountId: testUserId,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await deleteUserData(proxy.env.DB, testUserId);

		// Verify user row is gone
		const profile = await getUserSettingsWithProfile(proxy.env.DB, testUserId);
		expect(profile).toBeNull();

		// Verify expenses are gone
		const expenses = await getAllUserExpensesForExport(proxy.env.DB, testUserId);
		expect(expenses.length).toBe(0);
	});
});
