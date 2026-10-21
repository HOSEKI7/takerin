import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index';
import { user } from './schema';
import {
	saveOnboardingStep1And2,
	getUserSettings,
	getIncomeSources,
	setOnboardingCompleted
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
});
