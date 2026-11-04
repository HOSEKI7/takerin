import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { getDb } from './index.js';
import { user, monthlyPeriod, incomeSource, category, expense, userSettings } from './schema.js';
import {
	getPeriodIncomeSources,
	confirmPeriodIncome,
	ensureActivePeriod
} from './period.js';
import { getIncomeSources } from './onboarding.js';
import { getCompletedPeriodDetail } from './history.js';
import fs from 'node:fs';
import path from 'node:path';
import { eq, and } from 'drizzle-orm';

describe('Per-Period Income Source D1 Database Operations (Seam 1)', () => {
	let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
	let db: ReturnType<typeof getDb>;
	const testUserId = 'user-income-seam1-test';

	beforeAll(async () => {
		proxy = await getPlatformProxy<Env>();
		db = getDb(proxy.env.DB);

		// Clean up tables in correct dependency order
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
					if (stmt.length > 0) {
						await proxy.env.DB.exec(stmt + ';');
					}
				}
			}
		}

		// Insert base user
		await db.insert(user).values({
			id: testUserId,
			name: 'Income Tester',
			email: 'income-tester@takerin.my.id',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			role: 'user',
			twoFactorEnabled: false,
			onboardingCompleted: true
		});
	});

	afterAll(async () => {
		if (proxy) {
			await proxy.dispose();
		}
	});

	beforeEach(async () => {
		await db.delete(expense);
		await db.delete(category);
		await db.delete(incomeSource);
		await db.delete(monthlyPeriod);
		await db.delete(userSettings);
	});

	it('persists income sources with period_id and retrieves via getPeriodIncomeSources', async () => {
		const periodId = 'p-income-test-1';
		const now = new Date();

		await db.insert(monthlyPeriod).values({
			id: periodId,
			userId: testUserId,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			payDay: 1,
			totalIncome: 12000000,
			status: 'active',
			createdAt: now
		});

		await db.insert(incomeSource).values([
			{
				id: 'inc-1',
				userId: testUserId,
				periodId,
				name: 'Gaji Pokok',
				amount: 10000000,
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'inc-2',
				userId: testUserId,
				periodId,
				name: 'Tunjangan',
				amount: 2000000,
				createdAt: now,
				updatedAt: now
			}
		]);

		const sources = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodId);
		expect(sources).toHaveLength(2);
		expect(sources.map((s) => s.name)).toEqual(['Gaji Pokok', 'Tunjangan']);
		expect(sources.map((s) => s.amount)).toEqual([10000000, 2000000]);
		expect(sources.every((s) => s.periodId === periodId)).toBe(true);
	});

	it('isolates income sources across multiple periods for the same user', async () => {
		const periodA = 'p-income-a';
		const periodB = 'p-income-b';
		const now = new Date();

		// Period A (completed past period)
		await db.insert(monthlyPeriod).values({
			id: periodA,
			userId: testUserId,
			startDate: '2026-08-01',
			endDate: '2026-08-31',
			payDay: 1,
			totalIncome: 8000000,
			status: 'completed',
			createdAt: now
		});

		// Period B (active current period)
		await db.insert(monthlyPeriod).values({
			id: periodB,
			userId: testUserId,
			startDate: '2026-09-01',
			endDate: '2026-09-30',
			payDay: 1,
			totalIncome: 15000000,
			status: 'active',
			createdAt: now
		});

		// Insert sources for Period A
		await db.insert(incomeSource).values({
			id: 'inc-a-1',
			userId: testUserId,
			periodId: periodA,
			name: 'Gaji Lama',
			amount: 8000000,
			createdAt: now,
			updatedAt: now
		});

		// Insert sources for Period B
		await db.insert(incomeSource).values([
			{
				id: 'inc-b-1',
				userId: testUserId,
				periodId: periodB,
				name: 'Gaji Baru',
				amount: 10000000,
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'inc-b-2',
				userId: testUserId,
				periodId: periodB,
				name: 'Bonus Tahunan',
				amount: 5000000,
				createdAt: now,
				updatedAt: now
			}
		]);

		// Verify Period A has 1 source
		const sourcesA = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodA);
		expect(sourcesA).toHaveLength(1);
		expect(sourcesA[0].name).toBe('Gaji Lama');

		// Verify Period B has 2 sources
		const sourcesB = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodB);
		expect(sourcesB).toHaveLength(2);
		expect(sourcesB.map((s) => s.name)).toEqual(['Gaji Baru', 'Bonus Tahunan']);

		// Mutate Period B using confirmPeriodIncome
		const mutateDate = new Date();
		await confirmPeriodIncome(
			proxy.env.DB,
			testUserId,
			periodB,
			[{ name: 'Gaji Pokok Revisi', amount: 11000000 }],
			mutateDate
		);

		// Period A must remain completely unaffected (immutable)
		const sourcesAAfter = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodA);
		expect(sourcesAAfter).toHaveLength(1);
		expect(sourcesAAfter[0].name).toBe('Gaji Lama');
		expect(sourcesAAfter[0].amount).toBe(8000000);

		// Period B must reflect the updated source and updated totalIncome
		const sourcesBAfter = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodB);
		expect(sourcesBAfter).toHaveLength(1);
		expect(sourcesBAfter[0].name).toBe('Gaji Pokok Revisi');
		expect(sourcesBAfter[0].amount).toBe(11000000);

		const updatedPeriodB = await db
			.select()
			.from(monthlyPeriod)
			.where(eq(monthlyPeriod.id, periodB));
		expect(updatedPeriodB[0].totalIncome).toBe(11000000);
	});

	it('cascades deletion of income sources when monthly_period is deleted', async () => {
		const periodId = 'p-income-cascade';
		const now = new Date();

		await db.insert(monthlyPeriod).values({
			id: periodId,
			userId: testUserId,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			payDay: 1,
			totalIncome: 5000000,
			status: 'active',
			createdAt: now
		});

		await db.insert(incomeSource).values({
			id: 'inc-casc-1',
			userId: testUserId,
			periodId,
			name: 'Part Time',
			amount: 5000000,
			createdAt: now,
			updatedAt: now
		});

		// Verify inserted
		const before = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodId);
		expect(before).toHaveLength(1);

		// Delete monthly period
		await db.delete(monthlyPeriod).where(eq(monthlyPeriod.id, periodId));

		// Verify income sources for that period are deleted via CASCADE
		const after = await getPeriodIncomeSources(proxy.env.DB, testUserId, periodId);
		expect(after).toHaveLength(0);
	});

	it('falls back to legacy records without periodId, but never leaks records from other periods', async () => {
		const periodA = 'p-legacy-test-a';
		const periodEmpty = 'p-legacy-test-empty';
		const now = new Date();

		await db.insert(monthlyPeriod).values([
			{
				id: periodA,
				userId: testUserId,
				startDate: '2026-08-01',
				endDate: '2026-08-31',
				payDay: 1,
				totalIncome: 10000000,
				status: 'completed',
				createdAt: now
			},
			{
				id: periodEmpty,
				userId: testUserId,
				startDate: '2026-09-01',
				endDate: '2026-09-30',
				payDay: 1,
				totalIncome: 0,
				status: 'active',
				createdAt: now
			}
		]);

		// Insert 1 source explicitly bound to periodA
		await db.insert(incomeSource).values({
			id: 'inc-p-a',
			userId: testUserId,
			periodId: periodA,
			name: 'Gaji Period A',
			amount: 10000000,
			createdAt: now,
			updatedAt: now
		});

		// Querying periodEmpty when no legacy records exist must return empty (NOT leak periodA's records)
		const emptySources = await getIncomeSources(proxy.env.DB, testUserId, periodEmpty);
		expect(emptySources).toHaveLength(0);

		// Now insert a true legacy record with periodId = null
		await db.insert(incomeSource).values({
			id: 'inc-legacy-null',
			userId: testUserId,
			periodId: null,
			name: 'Gaji Legacy Null',
			amount: 6500000,
			createdAt: now,
			updatedAt: now
		});

		// Now querying periodEmpty should fall back to legacy record with periodId = null
		const fallbackSources = await getIncomeSources(proxy.env.DB, testUserId, periodEmpty);
		expect(fallbackSources).toHaveLength(1);
		expect(fallbackSources[0].name).toBe('Gaji Legacy Null');
		expect(fallbackSources[0].amount).toBe(6500000);
	});

	it('verifies the integrated end-to-end income lifecycle (Seam 4: active mutations, category scaling, period rollover cloning, and past period immutability)', async () => {
		const now = new Date('2026-10-15T12:00:00Z');
		const periodId = 'p-lifecycle-october';

		// 1. User settings with payDay 1
		await db.insert(userSettings).values({
			id: 'settings-lifecycle-test',
			userId: testUserId,
			payDay: 1,
			language: 'id',
			theme: 'light',
			createdAt: now,
			updatedAt: now
		});

		// 2. Active October monthly period with initial totalIncome 10.000.000
		await db.insert(monthlyPeriod).values({
			id: periodId,
			userId: testUserId,
			startDate: '2026-10-01',
			endDate: '2026-10-31',
			payDay: 1,
			totalIncome: 10000000,
			status: 'active',
			incomeConfirmedAt: now,
			createdAt: now
		});

		// 3. Initial income source: Gaji Pokok 10.000.000
		await db.insert(incomeSource).values({
			id: 'inc-oct-1',
			userId: testUserId,
			periodId,
			name: 'Gaji Pokok',
			amount: 10000000,
			createdAt: now,
			updatedAt: now
		});

		// 4. Two active categories: Kebutuhan (50%) and Tabungan (50%)
		await db.insert(category).values([
			{
				id: 'cat-oct-kebutuhan',
				userId: testUserId,
				periodId,
				name: 'Kebutuhan',
				percentage: 50,
				isSavings: false,
				status: 'active',
				createdAt: now,
				updatedAt: now
			},
			{
				id: 'cat-oct-tabungan',
				userId: testUserId,
				periodId,
				name: 'Tabungan',
				percentage: 50,
				isSavings: true,
				status: 'active',
				createdAt: now,
				updatedAt: now
			}
		]);

		// 5. Expense in Kebutuhan: 2.000.000
		await db.insert(expense).values({
			id: 'exp-oct-1',
			userId: testUserId,
			periodId,
			categoryId: 'cat-oct-kebutuhan',
			name: 'Belanja Bulanan',
			amount: 2000000,
			date: '2026-10-10',
			createdAt: now,
			updatedAt: now
		});

		// 6. User mutates and saves income via confirmPeriodIncome:
		// Gaji Pokok becomes 15.000.000 + Bonus Kinerja 5.000.000 = Total 20.000.000
		const mutationResult = await confirmPeriodIncome(
			proxy.env.DB,
			testUserId,
			periodId,
			[
				{ name: 'Gaji Pokok', amount: 15000000 },
				{ name: 'Bonus Kinerja', amount: 5000000 }
			]
		);

		expect(mutationResult.success).toBe(true);
		expect(mutationResult.totalIncome).toBe(20000000);

		// Check that period totalIncome is updated in database
		const updatedPeriod = (
			await db
				.select()
				.from(monthlyPeriod)
				.where(eq(monthlyPeriod.id, periodId))
		)[0];
		expect(updatedPeriod.totalIncome).toBe(20000000);

		// Dynamic Category Scaling check:
		// When calculating category allocation based on the updated period totalIncome:
		// 50% of 20.000.000 = 10.000.000. Remaining balance = 10.000.000 - 2.000.000 = 8.000.000.
		const scaledAllocation = Math.round(updatedPeriod.totalIncome * (50 / 100));
		expect(scaledAllocation).toBe(10000000);
		const scaledBalance = scaledAllocation - 2000000;
		expect(scaledBalance).toBe(8000000);

		// 7. Transition to Next Period:
		// Advance date to 2026-11-02 (past endDate 2026-10-31)
		const transitionTime = new Date('2026-11-02T08:00:00Z');
		const transitionResult = await ensureActivePeriod(proxy.env.DB, testUserId, transitionTime);

		expect(transitionResult.transitioned).toBe(true);
		expect(transitionResult.period).not.toBeNull();
		const nextPeriod = transitionResult.period!;
		expect(nextPeriod.status).toBe('active');
		expect(nextPeriod.startDate).toBe('2026-11-01');
		expect(nextPeriod.totalIncome).toBe(20000000);

		// Verify that income sources were cloned into the new period
		const clonedSources = await getPeriodIncomeSources(proxy.env.DB, testUserId, nextPeriod.id);
		expect(clonedSources).toHaveLength(2);
		expect(clonedSources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Gaji Pokok', amount: 15000000, periodId: nextPeriod.id }),
				expect.objectContaining({ name: 'Bonus Kinerja', amount: 5000000, periodId: nextPeriod.id })
			])
		);

		// 8. Verify Past Period Immutability & Detail Query via getCompletedPeriodDetail:
		const pastDetail = await getCompletedPeriodDetail(proxy.env.DB, testUserId, periodId);
		expect(pastDetail).not.toBeNull();
		expect(pastDetail?.period.id).toBe(periodId);
		expect(pastDetail?.period.status).toBe('completed');
		expect(pastDetail?.summary.totalIncome).toBe(20000000);
		expect(pastDetail?.summary.totalSpent).toBe(2000000);
		expect(pastDetail?.summary.remaining).toBe(18000000);
		expect(pastDetail?.incomeSources).toHaveLength(2);
		expect(pastDetail?.incomeSources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'Gaji Pokok', amount: 15000000 }),
				expect.objectContaining({ name: 'Bonus Kinerja', amount: 5000000 })
			])
		);

		// 9. Mutate New Period Income Sources (to ensure zero cross-period leakage):
		await confirmPeriodIncome(
			proxy.env.DB,
			testUserId,
			nextPeriod.id,
			[{ name: 'Gaji Baru November', amount: 30000000 }]
		);

		// 10. Re-verify Past Period Detail remains 100% intact and unchanged
		const pastDetailAfterNovMutation = await getCompletedPeriodDetail(proxy.env.DB, testUserId, periodId);
		expect(pastDetailAfterNovMutation).not.toBeNull();
		expect(pastDetailAfterNovMutation?.summary.totalIncome).toBe(20000000);
		const pastSources = pastDetailAfterNovMutation!.incomeSources;
		expect(pastSources).toHaveLength(2);
		expect(pastSources[0].amount + pastSources[1].amount).toBe(20000000);
	});
});
