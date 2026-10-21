import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import { isPeriodExpired, calculateCurrentPeriodDates } from '#lib/validation/period.js';
import { calculateTotalIncome } from '#lib/validation/onboarding.js';

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

	// Fetch income sources to compute total_income for new period
	const incomeSources = await db
		.select()
		.from(schema.incomeSource)
		.where(eq(schema.incomeSource.userId, userId));

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

	await db.batch(batchStatements as [(typeof batchStatements)[0], ...typeof batchStatements]);

	return {
		period: newPeriodRecord,
		transitioned: true
	};
}
