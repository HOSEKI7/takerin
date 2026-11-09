import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index.js';
import { user, appFeedback } from './schema.js';
import { createFeedback, getFeedbackById, hasUserSubmittedFeedback } from './feedback.js';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';

describe('Feedback D1 Database Operations (Seam 1)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;
	const testUserId = 'test-user-feedback-1';
	const testUser2Id = 'test-user-feedback-2';

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Clean up tables
		await proxy.env.DB.exec('DROP TABLE IF EXISTS app_feedback;');
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
					.filter((s) => s.length > 0 && !s.startsWith('--'));

				for (const stmt of individualStmts) {
					await proxy.env.DB.exec(`${stmt};`);
				}
			}
		}
	});

	afterAll(async () => {
		await proxy.dispose();
	});

	beforeEach(async () => {
		// Clean up records before each test
		await db.delete(appFeedback);
		await db.delete(user);

		// Seed primary test users
		await db.insert(user).values([
			{
				id: testUserId,
				name: 'Test Feedback User',
				email: 'feedback-tester@example.com',
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: testUser2Id,
				name: 'Test Second User',
				email: 'second-tester@example.com',
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		]);
	});

	it('creates a review entry with rating, content, route, and deviceInfo', async () => {
		const created = await createFeedback(proxy.env.DB, {
			userId: testUserId,
			type: 'review',
			rating: 5,
			content: 'Aplikasi Takerin sangat menenangkan dan mudah digunakan.',
			currentRoute: '/settings',
			deviceInfo: JSON.stringify({ browser: 'Chrome', width: 1440, height: 900 })
		});

		expect(created).toBeDefined();
		expect(created.id).toBeDefined();
		expect(created.userId).toBe(testUserId);
		expect(created.type).toBe('review');
		expect(created.rating).toBe(5);
		expect(created.category).toBeNull();
		expect(created.content).toBe('Aplikasi Takerin sangat menenangkan dan mudah digunakan.');
		expect(created.currentRoute).toBe('/settings');
		expect(created.deviceInfo).toContain('Chrome');
		expect(created.status).toBe('pending');
		expect(created.isFeatured).toBe(false);

		// Verify retrieval from D1 database
		const fromDb = await getFeedbackById(proxy.env.DB, created.id);
		expect(fromDb).not.toBeNull();
		expect(fromDb?.rating).toBe(5);
		expect(fromDb?.type).toBe('review');
	});

	it('creates a feedback entry with valid category and content', async () => {
		const created = await createFeedback(proxy.env.DB, {
			userId: testUserId,
			type: 'feedback',
			category: 'bug',
			content: 'Tombol simpan sedikit lambat saat jaringan offline.',
			currentRoute: '/dashboard'
		});

		expect(created).toBeDefined();
		expect(created.type).toBe('feedback');
		expect(created.category).toBe('bug');
		expect(created.rating).toBeNull();
		expect(created.content).toBe('Tombol simpan sedikit lambat saat jaringan offline.');

		const fromDb = await getFeedbackById(proxy.env.DB, created.id);
		expect(fromDb).not.toBeNull();
		expect(fromDb?.category).toBe('bug');
		expect(fromDb?.rating).toBeNull();
	});

	it('retrieves feedback by ID and returns null for non-existent ID', async () => {
		const created = await createFeedback(proxy.env.DB, {
			userId: testUserId,
			type: 'feedback',
			category: 'feature',
			content: 'Mohon tambahkan grafik tahunan.'
		});

		const found = await getFeedbackById(proxy.env.DB, created.id);
		expect(found).not.toBeNull();
		expect(found?.id).toBe(created.id);
		expect(found?.content).toBe('Mohon tambahkan grafik tahunan.');

		const notFound = await getFeedbackById(proxy.env.DB, 'non-existent-id');
		expect(notFound).toBeNull();
	});

	it('cascades deletion when user is deleted', async () => {
		const created = await createFeedback(proxy.env.DB, {
			userId: testUserId,
			type: 'review',
			rating: 5,
			content: 'User will be deleted'
		});

		const beforeDelete = await getFeedbackById(proxy.env.DB, created.id);
		expect(beforeDelete).not.toBeNull();

		await db.delete(user).where(eq(user.id, testUserId));

		const afterDelete = await getFeedbackById(proxy.env.DB, created.id);
		expect(afterDelete).toBeNull();
	});

	it('checks if a user has previously submitted review or feedback', async () => {
		// Initially neither user has submitted feedback
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUserId)).toBe(false);
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUser2Id)).toBe(false);

		// User 1 submits a review
		await createFeedback(proxy.env.DB, {
			userId: testUserId,
			type: 'review',
			rating: 5,
			content: 'Aplikasi yang luar biasa membantu.'
		});

		// Now User 1 returns true, but User 2 still returns false
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUserId)).toBe(true);
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUser2Id)).toBe(false);

		// User 2 submits a bug feedback
		await createFeedback(proxy.env.DB, {
			userId: testUser2Id,
			type: 'feedback',
			category: 'bug',
			content: 'Laporan bug pertama.'
		});

		// Both now return true
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUserId)).toBe(true);
		expect(await hasUserSubmittedFeedback(proxy.env.DB, testUser2Id)).toBe(true);
	});
});
