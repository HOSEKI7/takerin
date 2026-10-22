import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import type { CsvExpenseItem } from '#lib/validation/settings.js';

export interface UserProfileAndSettings {
	user: {
		id: string;
		name: string;
		email: string;
		role: string;
		emailVerified: boolean;
		twoFactorEnabled: boolean;
	};
	settings: {
		payDay: number;
		language: string;
		theme: string;
	};
	activePeriod: {
		id: string;
		startDate: string;
		endDate: string;
		payDay: number;
	} | null;
}

/**
 * Retrieves the user profile, user_settings, and currently active monthly period.
 */
export async function getUserSettingsWithProfile(
	d1: D1Database,
	userId: string
): Promise<UserProfileAndSettings | null> {
	const db = getDb(d1);

	// 1. Fetch user
	const users = await db
		.select({
			id: schema.user.id,
			name: schema.user.name,
			email: schema.user.email,
			role: schema.user.role,
			emailVerified: schema.user.emailVerified,
			twoFactorEnabled: schema.user.twoFactorEnabled
		})
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.limit(1);

	const userRow = users[0] ?? null;
	if (!userRow) {
		return null;
	}

	// 2. Fetch user settings
	const settingsList = await db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.limit(1);

	const settingsRow = settingsList[0] ?? {
		payDay: 25,
		language: 'id',
		theme: 'light'
	};

	// 3. Fetch active monthly period
	const activePeriods = await db
		.select({
			id: schema.monthlyPeriod.id,
			startDate: schema.monthlyPeriod.startDate,
			endDate: schema.monthlyPeriod.endDate,
			payDay: schema.monthlyPeriod.payDay
		})
		.from(schema.monthlyPeriod)
		.where(and(eq(schema.monthlyPeriod.userId, userId), eq(schema.monthlyPeriod.status, 'active')))
		.orderBy(desc(schema.monthlyPeriod.createdAt))
		.limit(1);

	return {
		user: userRow,
		settings: {
			payDay: settingsRow.payDay,
			language: settingsRow.language,
			theme: settingsRow.theme
		},
		activePeriod: activePeriods[0] ?? null
	};
}

/**
 * Updates user profile (e.g. display name).
 */
export async function updateUserProfile(
	d1: D1Database,
	userId: string,
	data: { name: string }
): Promise<void> {
	const db = getDb(d1);

	await db
		.update(schema.user)
		.set({
			name: data.name,
			updatedAt: new Date()
		})
		.where(eq(schema.user.id, userId));
}

/**
 * Updates user settings (payDay, language, theme).
 */
export async function updateUserSettings(
	d1: D1Database,
	userId: string,
	data: { payDay?: number; language?: string; theme?: string }
): Promise<void> {
	const db = getDb(d1);
	const now = new Date();

	const updatePayload: Partial<typeof schema.userSettings.$inferInsert> = {
		updatedAt: now
	};

	if (data.payDay !== undefined) updatePayload.payDay = data.payDay;
	if (data.language !== undefined) updatePayload.language = data.language;
	if (data.theme !== undefined) updatePayload.theme = data.theme;

	await db
		.update(schema.userSettings)
		.set(updatePayload)
		.where(eq(schema.userSettings.userId, userId));
}

/**
 * Fetches all expenses for a user across all periods, ordered by date descending,
 * joined with category and period dates for CSV export.
 */
export async function getAllUserExpensesForExport(
	d1: D1Database,
	userId: string
): Promise<CsvExpenseItem[]> {
	const db = getDb(d1);

	const rows = await db
		.select({
			date: schema.expense.date,
			time: schema.expense.time,
			name: schema.expense.name,
			amount: schema.expense.amount,
			notes: schema.expense.notes,
			categoryName: schema.category.name,
			periodStartDate: schema.monthlyPeriod.startDate,
			periodEndDate: schema.monthlyPeriod.endDate
		})
		.from(schema.expense)
		.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
		.innerJoin(schema.monthlyPeriod, eq(schema.expense.periodId, schema.monthlyPeriod.id))
		.where(eq(schema.expense.userId, userId))
		.orderBy(desc(schema.expense.date), desc(schema.expense.createdAt));

	return rows.map((r) => ({
		date: r.date,
		time: r.time,
		name: r.name,
		categoryName: r.categoryName,
		amount: r.amount,
		notes: r.notes,
		periodRange: `${r.periodStartDate} s/d ${r.periodEndDate}`
	}));
}

/**
 * Permanently deletes all data belonging to the user from Cloudflare D1.
 * Executed as an atomic batch.
 */
export async function deleteUserData(d1: D1Database, userId: string): Promise<void> {
	const batchStatements = [
		d1.prepare('DELETE FROM expense WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM category WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM monthly_period WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM income_source WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM user_settings WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM two_factor WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM session WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM account WHERE user_id = ?').bind(userId),
		d1.prepare('DELETE FROM user WHERE id = ?').bind(userId)
	];

	await d1.batch(batchStatements);
}

/**
 * Returns all monthly periods (active and completed) for user selection in export.
 */
export async function getAllUserPeriodsForExportSelection(
	d1: D1Database,
	userId: string
): Promise<
	Array<{
		id: string;
		startDate: string;
		endDate: string;
		payDay: number;
		status: string;
	}>
> {
	const db = getDb(d1);

	return db
		.select({
			id: schema.monthlyPeriod.id,
			startDate: schema.monthlyPeriod.startDate,
			endDate: schema.monthlyPeriod.endDate,
			payDay: schema.monthlyPeriod.payDay,
			status: schema.monthlyPeriod.status
		})
		.from(schema.monthlyPeriod)
		.where(eq(schema.monthlyPeriod.userId, userId))
		.orderBy(desc(schema.monthlyPeriod.startDate), desc(schema.monthlyPeriod.createdAt));
}

import type { CompletedPeriodDetail } from '#lib/server/db/history.js';

/**
 * Fetches the detail of any user period (active or completed) formatted for PDF generation.
 */
export async function getPeriodDetailForExport(
	d1: D1Database,
	userId: string,
	periodId: string
): Promise<CompletedPeriodDetail | null> {
	const db = getDb(d1);

	// 1. Fetch period
	const periods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(and(eq(schema.monthlyPeriod.id, periodId), eq(schema.monthlyPeriod.userId, userId)))
		.limit(1);

	const period = periods[0] ?? null;
	if (!period) return null;

	// 2. Fetch categories
	const categories = await db
		.select()
		.from(schema.category)
		.where(and(eq(schema.category.userId, userId), eq(schema.category.periodId, periodId)));

	// 3. Fetch expenses
	const expenses = await db
		.select({
			categoryId: schema.expense.categoryId,
			amount: schema.expense.amount
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, periodId)));

	const spentByCat = new Map<string, number>();
	let totalSpent = 0;
	for (const exp of expenses) {
		const current = spentByCat.get(exp.categoryId) ?? 0;
		spentByCat.set(exp.categoryId, current + exp.amount);
		totalSpent += exp.amount;
	}

	const categoryDetails = categories.map((cat) => {
		const allocation = Math.round((period.totalIncome * cat.percentage) / 100);
		const spent = spentByCat.get(cat.id) ?? 0;
		const balance = allocation - spent;
		const spentPercentage = allocation > 0 ? Math.round((spent / allocation) * 100) : 0;

		return {
			id: cat.id,
			name: cat.name,
			percentage: cat.percentage,
			allocation,
			spent,
			balance,
			spentPercentage,
			isSavings: Boolean(cat.isSavings),
			status: cat.status as 'active' | 'frozen'
		};
	});

	const remaining = period.totalIncome - totalSpent;
	const spentPercentage =
		period.totalIncome > 0 ? Math.round((totalSpent / period.totalIncome) * 100) : 0;

	return {
		period: {
			id: period.id,
			startDate: period.startDate,
			endDate: period.endDate,
			payDay: period.payDay,
			totalIncome: period.totalIncome,
			status: period.status,
			aiSummary: period.aiSummary
		},
		summary: {
			totalIncome: period.totalIncome,
			totalSpent,
			remaining,
			spentPercentage
		},
		categories: categoryDetails,
		aiAggregateData: {
			totalIncome: period.totalIncome,
			totalSpent,
			remaining,
			spentPercentage,
			categories: categoryDetails
		}
	};
}
