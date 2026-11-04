import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import { isPeriodExpired, calculateCurrentPeriodDates } from '#lib/validation/period.js';
import { calculateTotalIncome, type IncomeSourceInput } from '#lib/validation/onboarding.js';

export type { IncomeSourceInput };

export interface EnsureActivePeriodResult {
	period: typeof schema.monthlyPeriod.$inferSelect | null;
	transitioned: boolean;
}

/**
 * Ensures that the user has an up-to-date active monthly period.
 * If the currently active period's endDate has passed relative to `now`,
 * this function auto-transitions to the current cycle:
 * 1. Snapshots previous period status to 'completed'.
 * 2. Copies all active categories (omitting frozen categories).
 * 3. Persists income sources to recalculate total_income.
 * 4. Calculates new period start & end dates (accounting for payDay fallback and gap periods).
 * 5. Fresh start: new period has 0 expenses.
 * All DB modifications are executed atomically in a D1 batch.
 */
export async function ensureActivePeriod(
	d1: D1Database,
	userId: string,
	now: Date = new Date()
): Promise<EnsureActivePeriodResult> {
	const db = getDb(d1);

	// 1. Fetch current active period
	const activePeriods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(and(eq(schema.monthlyPeriod.userId, userId), eq(schema.monthlyPeriod.status, 'active')))
		.orderBy(desc(schema.monthlyPeriod.createdAt))
		.limit(1);

	const activePeriod = activePeriods[0] ?? null;

	if (!activePeriod) {
		return { period: null, transitioned: false };
	}

	// 2. Check if active period is expired
	if (!isPeriodExpired(activePeriod.endDate, now)) {
		return { period: activePeriod, transitioned: false };
	}

	// 3. Period is expired: perform auto-transition!
	// Retrieve userSettings to obtain latest payDay
	const settingsList = await db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.limit(1);

	const payDay = settingsList[0]?.payDay ?? activePeriod.payDay;

	// Calculate new period dates
	const { startDate, endDate } = calculateCurrentPeriodDates(now, payDay);

	// Fetch active categories from the old period (omit frozen ones)
	const activeCategories = await db
		.select()
		.from(schema.category)
		.where(
			and(eq(schema.category.periodId, activePeriod.id), eq(schema.category.status, 'active'))
		);

	// Fetch income sources from old active period to clone to new period
	let incomeSources = await db
		.select()
		.from(schema.incomeSource)
		.where(
			and(
				eq(schema.incomeSource.userId, userId),
				eq(schema.incomeSource.periodId, activePeriod.id)
			)
		);

	// Fallback for legacy records without periodId
	if (incomeSources.length === 0) {
		incomeSources = await db
			.select()
			.from(schema.incomeSource)
			.where(
				and(
					eq(schema.incomeSource.userId, userId),
					isNull(schema.incomeSource.periodId)
				)
			);
	}

	const totalIncome =
		incomeSources.length > 0 ? calculateTotalIncome(incomeSources) : activePeriod.totalIncome;

	const newPeriodId = crypto.randomUUID();
	const newPeriodRecord: typeof schema.monthlyPeriod.$inferSelect = {
		id: newPeriodId,
		userId,
		startDate,
		endDate,
		payDay,
		totalIncome,
		status: 'active',
		aiSummary: null,
		incomeConfirmedAt: null,
		createdAt: now
	};

	// Prepare atomic batch statements
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const batchStatements: any[] = [];

	// Update old period to 'completed'
	batchStatements.push(
		db
			.update(schema.monthlyPeriod)
			.set({ status: 'completed' })
			.where(eq(schema.monthlyPeriod.id, activePeriod.id))
	);

	// Insert new active monthly period
	batchStatements.push(db.insert(schema.monthlyPeriod).values(newPeriodRecord));

	// Clone active categories to the new period
	if (activeCategories.length > 0) {
		const newCategories = activeCategories.map((c) => ({
			id: crypto.randomUUID(),
			userId,
			periodId: newPeriodId,
			name: c.name,
			percentage: c.percentage,
			isSavings: c.isSavings,
			status: 'active',
			createdAt: now,
			updatedAt: now
		}));

		batchStatements.push(db.insert(schema.category).values(newCategories));
	}

	// Clone income sources to the new period
	if (incomeSources.length > 0) {
		const newIncomeSources = incomeSources.map((s) => ({
			id: crypto.randomUUID(),
			userId,
			periodId: newPeriodId,
			name: s.name,
			amount: s.amount,
			createdAt: now,
			updatedAt: now
		}));

		batchStatements.push(db.insert(schema.incomeSource).values(newIncomeSources));
	}

	await db.batch(batchStatements as [(typeof batchStatements)[0], ...typeof batchStatements]);

	return {
		period: newPeriodRecord,
		transitioned: true
	};
}

export interface ConfirmPeriodIncomeResult {
	success: boolean;
	totalIncome: number;
	incomeConfirmedAt: Date;
}

/**
 * Confirms or updates income sources for an active monthly period atomically.
 * 1. Validates that incomeSources contains at least 1 valid item (non-empty name, amount > 0).
 * 2. Purges user's old income_source records and inserts the updated ones.
 * 3. Updates monthly_period.total_income with the sum of updated sources.
 * 4. Stamps monthly_period.income_confirmed_at = now.
 * Executed atomically in a single D1 batch.
 */
export async function confirmPeriodIncome(
	d1: D1Database,
	userId: string,
	periodId: string,
	incomeSources: IncomeSourceInput[],
	now: Date = new Date()
): Promise<ConfirmPeriodIncomeResult> {
	if (!incomeSources || !Array.isArray(incomeSources) || incomeSources.length === 0) {
		throw new Error('Minimal harus memiliki satu Sumber Pemasukan.');
	}

	for (const source of incomeSources) {
		const name = source?.name?.trim();
		const amount = Math.round(Number(source?.amount));
		if (!name) {
			throw new Error('Nama Sumber Pemasukan tidak boleh kosong.');
		}
		if (isNaN(amount) || amount <= 0) {
			throw new Error('Nominal Sumber Pemasukan harus lebih besar dari 0.');
		}
	}

	const db = getDb(d1);

	// Verify period exists, is active, and belongs to user
	const periods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(
			and(
				eq(schema.monthlyPeriod.id, periodId),
				eq(schema.monthlyPeriod.userId, userId),
				eq(schema.monthlyPeriod.status, 'active')
			)
		)
		.limit(1);

	if (periods.length === 0) {
		throw new Error('Periode Bulan tidak ditemukan atau tidak aktif.');
	}

	const totalIncome = calculateTotalIncome(incomeSources);

	const newSources = incomeSources.map((source) => ({
		id: crypto.randomUUID(),
		userId,
		periodId,
		name: source.name.trim(),
		amount: Math.round(Number(source.amount)),
		createdAt: now,
		updatedAt: now
	}));

	// Prepare atomic batch statements
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const batchStatements: any[] = [];

	// 1. Delete old income sources scoped to this active period
	batchStatements.push(
		db
			.delete(schema.incomeSource)
			.where(
				and(
					eq(schema.incomeSource.userId, userId),
					eq(schema.incomeSource.periodId, periodId)
				)
			)
	);

	// 2. Insert new income sources
	batchStatements.push(db.insert(schema.incomeSource).values(newSources));

	// 3. Update monthly period total income & income_confirmed_at
	batchStatements.push(
		db
			.update(schema.monthlyPeriod)
			.set({
				totalIncome,
				incomeConfirmedAt: now
			})
			.where(
				and(
					eq(schema.monthlyPeriod.id, periodId),
					eq(schema.monthlyPeriod.userId, userId),
					eq(schema.monthlyPeriod.status, 'active')
				)
			)
	);

	await db.batch(batchStatements as [(typeof batchStatements)[0], ...typeof batchStatements]);

	return {
		success: true,
		totalIncome,
		incomeConfirmedAt: now
	};
}

/**
 * Fetches all income sources belonging to a specific monthly period.
 */
export async function getPeriodIncomeSources(
	d1: D1Database,
	userId: string,
	periodId: string
) {
	const db = getDb(d1);
	return db
		.select()
		.from(schema.incomeSource)
		.where(
			and(
				eq(schema.incomeSource.userId, userId),
				eq(schema.incomeSource.periodId, periodId)
			)
		);
}
