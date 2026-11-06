import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import { getIncomeSources } from './onboarding.js';
import type { AiAggregateData, AiExpenseItem } from '#lib/server/ai/summary.js';

export interface PeriodFinancialMetrics {
	totalIncome: number;
	totalSpent: number;
	remaining: number;
	spentPercentage: number;
}

export interface CompletedPeriodListItem extends PeriodFinancialMetrics {
	id: string;
	startDate: string;
	endDate: string;
	payDay: number;
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
	isSavings: boolean;
	status: 'active' | 'frozen';
}

export interface CompletedIncomeSourceDetail {
	id: string;
	name: string;
	amount: number;
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
	summary: PeriodFinancialMetrics;
	categories: CompletedCategoryDetail[];
	incomeSources: CompletedIncomeSourceDetail[];
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

	// Aggregate expenses per period via native SQL GROUP BY
	const periodExpenses = await db
		.select({
			periodId: schema.expense.periodId,
			totalSpent: sql<number>`cast(coalesce(sum(${schema.expense.amount}), 0) as int)`
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), inArray(schema.expense.periodId, periodIds)))
		.groupBy(schema.expense.periodId);

	// Map aggregated spent per period
	const spentByPeriod = new Map<string, number>();
	for (const row of periodExpenses) {
		spentByPeriod.set(row.periodId, row.totalSpent);
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
 * - Aggregate data formatted for AI summary generation
 */
export async function getCompletedPeriodDetail(
	d1: D1Database,
	userId: string,
	periodId: string
): Promise<CompletedPeriodDetail | null> {
	const db = getDb(d1);

	// 1. Fetch completed period (strictly completed)
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

	// 3. Fetch expenses amount grouped by category via native SQL GROUP BY
	const categoryExpenses = await db
		.select({
			categoryId: schema.expense.categoryId,
			totalSpent: sql<number>`cast(coalesce(sum(${schema.expense.amount}), 0) as int)`
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, periodId)))
		.groupBy(schema.expense.categoryId);

	// Group spent by category
	const spentByCat = new Map<string, number>();
	let totalSpent = 0;

	for (const row of categoryExpenses) {
		spentByCat.set(row.categoryId, row.totalSpent);
		totalSpent += row.totalSpent;
	}

	const detailedCategories: CompletedCategoryDetail[] = categories.map((cat) => {
		const allocation = Math.round(period.totalIncome * (cat.percentage / 100));
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

	const summary: PeriodFinancialMetrics = {
		totalIncome: period.totalIncome,
		totalSpent,
		remaining,
		spentPercentage
	};

	// 4. Fetch curated top and recurring expenses for AI context
	const catNameMap = new Map(categories.map((c) => [c.id, c.name]));

	// A. Top recurring expenses (frequency >= 2)
	const recurringRows = await db
		.select({
			name: schema.expense.name,
			categoryId: schema.expense.categoryId,
			totalAmount: sql<number>`cast(coalesce(sum(${schema.expense.amount}), 0) as int)`,
			count: sql<number>`cast(count(${schema.expense.id}) as int)`
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, periodId)))
		.groupBy(schema.expense.name, schema.expense.categoryId)
		.having(sql`count(${schema.expense.id}) >= 2`)
		.orderBy(desc(sql`count(${schema.expense.id})`), desc(sql`sum(${schema.expense.amount})`))
		.limit(5);

	// B. Top 10 nominal expenses
	const topNominalRows = await db
		.select({
			name: schema.expense.name,
			amount: schema.expense.amount,
			categoryId: schema.expense.categoryId
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, periodId)))
		.orderBy(desc(schema.expense.amount))
		.limit(10);

	const topExpenses: AiExpenseItem[] = [];
	const seenNames = new Set<string>();

	for (const row of recurringRows) {
		topExpenses.push({
			name: row.name,
			amount: row.totalAmount,
			categoryName: catNameMap.get(row.categoryId) ?? 'Lainnya',
			count: row.count
		});
		seenNames.add(row.name.toLowerCase().trim());
	}

	for (const row of topNominalRows) {
		if (topExpenses.length >= 15) break;
		const norm = row.name.toLowerCase().trim();
		if (!seenNames.has(norm)) {
			topExpenses.push({
				name: row.name,
				amount: row.amount,
				categoryName: catNameMap.get(row.categoryId) ?? 'Lainnya'
			});
			seenNames.add(norm);
		}
	}

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
		})),
		topExpenses
	};

	// 5. Fetch income sources for this period (scoped to periodId with fallback to legacy)
	const rawSources = await getIncomeSources(d1, userId, periodId);
	const detailedIncomeSources: CompletedIncomeSourceDetail[] = rawSources.map((s) => ({
		id: s.id,
		name: s.name,
		amount: s.amount
	}));

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
		summary,
		categories: detailedCategories,
		incomeSources: detailedIncomeSources,
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
