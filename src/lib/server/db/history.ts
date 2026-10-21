import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import type { AiAggregateData } from '#lib/server/ai/summary.js';

export interface CompletedPeriodListItem {
	id: string;
	startDate: string;
	endDate: string;
	payDay: number;
	totalIncome: number;
	totalSpent: number;
	remaining: number;
	spentPercentage: number;
	aiSummary: string | null;
	createdAt: Date;
}

export interface CompletedCategoryDetail {
	id: string;
	name: string;
	percentage: number;
	allocation: number;
	spent: number;
	balance: number;
	spentPercentage: number;
	remainingPercentage: number;
	isSavings: boolean;
	status: 'active' | 'frozen';
}

export interface CompletedExpenseDetail {
	id: string;
	categoryId: string;
	categoryName: string;
	isSavings: boolean;
	name: string;
	amount: number;
	date: string;
	time: string | null;
	notes: string | null;
	createdAt: Date;
}

export interface CompletedPeriodDetail {
	period: {
		id: string;
		startDate: string;
		endDate: string;
		payDay: number;
		totalIncome: number;
		status: string;
		aiSummary: string | null;
	};
	summary: {
		totalIncome: number;
		totalSpent: number;
		remaining: number;
		spentPercentage: number;
	};
	categories: CompletedCategoryDetail[];
	expenses: CompletedExpenseDetail[];
	aiAggregateData: AiAggregateData;
}

/**
 * Returns all completed monthly periods for the given user, ordered by startDate descending.
 * Aggregates total spent and remaining balance for each completed cycle.
 */
export async function getCompletedPeriods(
	d1: D1Database,
	userId: string
): Promise<CompletedPeriodListItem[]> {
	const db = getDb(d1);

	// Fetch all completed periods for this user
	const periods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(
			and(eq(schema.monthlyPeriod.userId, userId), eq(schema.monthlyPeriod.status, 'completed'))
		)
		.orderBy(desc(schema.monthlyPeriod.startDate), desc(schema.monthlyPeriod.createdAt));

	if (periods.length === 0) {
		return [];
	}

	const periodIds = periods.map((p) => p.id);

	// Fetch all expenses belonging to these periods
	const expenses = await db
		.select({
			periodId: schema.expense.periodId,
			amount: schema.expense.amount
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), inArray(schema.expense.periodId, periodIds)));

	// Sum expenses per period
	const spentByPeriod = new Map<string, number>();
	for (const exp of expenses) {
		const current = spentByPeriod.get(exp.periodId) ?? 0;
		spentByPeriod.set(exp.periodId, current + exp.amount);
	}

	return periods.map((p) => {
		const totalSpent = spentByPeriod.get(p.id) ?? 0;
		const remaining = p.totalIncome - totalSpent;
		const spentPercentage = p.totalIncome > 0 ? Math.round((totalSpent / p.totalIncome) * 100) : 0;

		return {
			id: p.id,
			startDate: p.startDate,
			endDate: p.endDate,
			payDay: p.payDay,
			totalIncome: p.totalIncome,
			totalSpent,
			remaining,
			spentPercentage,
			aiSummary: p.aiSummary,
			createdAt: p.createdAt
		};
	});
}

/**
 * Fetches the complete details of a single completed monthly period:
 * - Period info & summary metrics
 * - All categories for that period (both active and frozen categories)
 * - All expense entries
 * - Aggregate data formatted for AI summary generation
 */
export async function getCompletedPeriodDetail(
	d1: D1Database,
	userId: string,
	periodId: string
): Promise<CompletedPeriodDetail | null> {
	const db = getDb(d1);

	// 1. Fetch completed period
	const periods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(
			and(
				eq(schema.monthlyPeriod.id, periodId),
				eq(schema.monthlyPeriod.userId, userId),
				eq(schema.monthlyPeriod.status, 'completed')
			)
		)
		.limit(1);

	const period = periods[0] ?? null;
	if (!period) {
		return null;
	}

	// 2. Fetch categories (active and frozen)
	const categories = await db
		.select()
		.from(schema.category)
		.where(and(eq(schema.category.userId, userId), eq(schema.category.periodId, periodId)));

	// 3. Fetch expenses with category details
	const expenses = await db
		.select({
			id: schema.expense.id,
			categoryId: schema.expense.categoryId,
			categoryName: schema.category.name,
			isSavings: schema.category.isSavings,
			name: schema.expense.name,
			amount: schema.expense.amount,
			date: schema.expense.date,
			time: schema.expense.time,
			notes: schema.expense.notes,
			createdAt: schema.expense.createdAt
		})
		.from(schema.expense)
		.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, periodId)))
		.orderBy(desc(schema.expense.date), desc(schema.expense.createdAt));

	// Group spent by category
	const spentByCat = new Map<string, number>();
	let totalSpent = 0;

	for (const exp of expenses) {
		const prev = spentByCat.get(exp.categoryId) ?? 0;
		spentByCat.set(exp.categoryId, prev + exp.amount);
		totalSpent += exp.amount;
	}

	const detailedCategories: CompletedCategoryDetail[] = categories.map((cat) => {
		const allocation = Math.round(period.totalIncome * (cat.percentage / 100));
		const spent = spentByCat.get(cat.id) ?? 0;
		const balance = allocation - spent;
		const spentPercentage = allocation > 0 ? Math.round((spent / allocation) * 100) : 0;
		const remainingPercentage =
			allocation > 0 ? Math.max(0, Math.min(100, Math.round((balance / allocation) * 100))) : 0;

		return {
			id: cat.id,
			name: cat.name,
			percentage: cat.percentage,
			allocation,
			spent,
			balance,
			spentPercentage,
			remainingPercentage,
			isSavings: Boolean(cat.isSavings),
			status: cat.status as 'active' | 'frozen'
		};
	});

	const remaining = period.totalIncome - totalSpent;
	const spentPercentage =
		period.totalIncome > 0 ? Math.round((totalSpent / period.totalIncome) * 100) : 0;

	const aiAggregateData: AiAggregateData = {
		totalIncome: period.totalIncome,
		totalSpent,
		remaining,
		spentPercentage,
		categories: detailedCategories.map((c) => ({
			name: c.name,
			percentage: c.percentage,
			allocation: c.allocation,
			spent: c.spent,
			spentPercentage: c.spentPercentage,
			isSavings: c.isSavings,
			status: c.status
		}))
	};

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
		categories: detailedCategories,
		expenses: expenses.map((e) => ({
			...e,
			isSavings: Boolean(e.isSavings)
		})),
		aiAggregateData
	};
}

/**
 * Persists generated AI summary phrase to monthly_period table so subsequent visits do not call AI APIs.
 */
export async function savePeriodAiSummary(
	d1: D1Database,
	periodId: string,
	userId: string,
	aiSummary: string
): Promise<void> {
	const db = getDb(d1);

	await db
		.update(schema.monthlyPeriod)
		.set({ aiSummary })
		.where(and(eq(schema.monthlyPeriod.id, periodId), eq(schema.monthlyPeriod.userId, userId)));
}
