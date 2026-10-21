import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user, monthlyPeriod, category } from './schema';
import {
	saveOnboardingStep1And2,
	getUserSettings,
	getIncomeSources,
	setOnboardingCompleted,
	getCategoryTemplates,
	completeOnboarding
} from './onboarding';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

describe('Onboarding D1 Database & Drizzle Operations (Miniflare)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Clean up tables
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

	it('saves pay_day in user_settings and income_sources in D1, then marks onboarding_completed', async () => {
		const testUserId = 'test-onboard-user-' + Date.now();
		const now = new Date();

		// Insert test user
		await db.insert(user).values({
			id: testUserId,
			name: 'Budi Onboard',
			email: `budi-onboard-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		// Save Onboarding Step 1 & 2
		const result = await saveOnboardingStep1And2(proxy.env.DB, testUserId, {
			payDay: 25,
			incomeSources: [
				{ name: 'Gaji Pokok', amount: 9000000 },
				{ name: 'Freelance Design', amount: 3000000 }
			]
		});

		expect(result.success).toBe(true);

		// Verify user_settings in DB
		const settings = await getUserSettings(proxy.env.DB, testUserId);
		expect(settings).toBeDefined();
		expect(settings?.payDay).toBe(25);
		expect(settings?.language).toBe('id');
		expect(settings?.theme).toBe('light');

		// Verify income_sources in DB
		const sources = await getIncomeSources(proxy.env.DB, testUserId);
		expect(sources.length).toBe(2);
		expect(sources.map((s) => s.name)).toEqual(['Gaji Pokok', 'Freelance Design']);
		expect(sources.map((s) => s.amount)).toEqual([9000000, 3000000]);

		// Verify user flag onboardingCompleted is true
		const userRecord = await db.select().from(user).where(eq(user.id, testUserId));
		expect(userRecord[0].onboardingCompleted).toBe(true);
	});

	it('allows updating user_settings and overwriting income_sources on re-submission', async () => {
		const testUserId = 'test-onboard-user-update-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Siti Onboard',
			email: `siti-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		// First submit
		await saveOnboardingStep1And2(proxy.env.DB, testUserId, {
			payDay: 1,
			incomeSources: [{ name: 'Gaji Lama', amount: 5000000 }]
		});

		// Re-submit with new payDay and new income sources
		await saveOnboardingStep1And2(proxy.env.DB, testUserId, {
			payDay: 10,
			incomeSources: [
				{ name: 'Gaji Baru', amount: 7000000 },
				{ name: 'Dividen', amount: 500000 }
			]
		});

		const settings = await getUserSettings(proxy.env.DB, testUserId);
		expect(settings?.payDay).toBe(10);

		const sources = await getIncomeSources(proxy.env.DB, testUserId);
		expect(sources.length).toBe(2);
		expect(sources.map((s) => s.name)).toEqual(['Gaji Baru', 'Dividen']);
		expect(sources.map((s) => s.amount)).toEqual([7000000, 500000]);
	});

	it('supports toggling onboarding_completed directly', async () => {
		const testUserId = 'test-flag-user-' + Date.now();
		const now = new Date();

		await db.insert(user).values({
			id: testUserId,
			name: 'Flag User',
			email: `flag-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		await setOnboardingCompleted(proxy.env.DB, testUserId, true);
		let userRecord = await db.select().from(user).where(eq(user.id, testUserId));
		expect(userRecord[0].onboardingCompleted).toBe(true);

		await setOnboardingCompleted(proxy.env.DB, testUserId, false);
		userRecord = await db.select().from(user).where(eq(user.id, testUserId));
		expect(userRecord[0].onboardingCompleted).toBe(false);
	});

	it('retrieves category templates with parsed categories', async () => {
		const templates = await getCategoryTemplates(proxy.env.DB);
		expect(templates.length).toBeGreaterThanOrEqual(2);

		const template503020 = templates.find((t) => t.name === '50/30/20');
		expect(template503020).toBeDefined();
		expect(template503020?.categories).toHaveLength(3);
		expect(template503020?.categories[0].name).toBe('Kebutuhan');
		expect(template503020?.categories[0].percentage).toBe(50);
		expect(template503020?.categories[2].isSavings).toBe(true);

		const template6Toples = templates.find((t) => t.name === '6 Toples');
		expect(template6Toples).toBeDefined();
		expect(template6Toples?.categories).toHaveLength(6);
	});

	it('completes onboarding: creates monthly_period and active categories, updates user settings and income sources', async () => {
		const testUserId = 'test-complete-onboard-' + Date.now();
		const now = new Date(2026, 9, 21); // 2026-10-21 (Oct 21)

		await db.insert(user).values({
			id: testUserId,
			name: 'Budi Lengkap',
			email: `budi-lengkap-${Date.now()}@example.com`,
			emailVerified: true,
			onboardingCompleted: false,
			role: 'user',
			createdAt: now,
			updatedAt: now
		});

		const result = await completeOnboarding(proxy.env.DB, testUserId, {
			payDay: 25,
			incomeSources: [
				{ name: 'Gaji Utama', amount: 8000000 },
				{ name: 'Side Project', amount: 2000000 }
			],
			categories: [
				{ name: 'Kebutuhan', percentage: 50, isSavings: false },
				{ name: 'Keinginan', percentage: 30, isSavings: false },
				{ name: 'Tabungan & Investasi', percentage: 20, isSavings: true }
			],
			now
		});

		expect(result.success).toBe(true);
		expect(result.periodId).toBeDefined();

		// Check user settings
		const settings = await getUserSettings(proxy.env.DB, testUserId);
		expect(settings?.payDay).toBe(25);

		// Check income sources
		const sources = await getIncomeSources(proxy.env.DB, testUserId);
		expect(sources).toHaveLength(2);

		// Check monthly period
		const periods = await db
			.select()
			.from(monthlyPeriod)
			.where(eq(monthlyPeriod.userId, testUserId));
		expect(periods).toHaveLength(1);
		const period = periods[0];
		expect(period.startDate).toBe('2026-10-21');
		expect(period.endDate).toBe('2026-10-24');
		expect(period.payDay).toBe(25);
		expect(period.totalIncome).toBe(10000000);
		expect(period.status).toBe('active');

		// Check categories created for this period
		const categories = await db.select().from(category).where(eq(category.periodId, period.id));
		expect(categories).toHaveLength(3);
		expect(categories.every((c) => c.status === 'active')).toBe(true);
		expect(categories.every((c) => c.userId === testUserId)).toBe(true);

		const savingsCat = categories.find((c) => c.name === 'Tabungan & Investasi');
		expect(savingsCat?.percentage).toBe(20);
		expect(savingsCat?.isSavings).toBe(true);

		// Check user onboarding_completed flag
		const userRecord = await db.select().from(user).where(eq(user.id, testUserId));
		expect(userRecord[0].onboardingCompleted).toBe(true);
	});
});
