import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import { ensureActivePeriod } from './period.js';

export interface DashboardCategory {
	id: string;
	name: string;
	percentage: number;
	allocation: number;
	spent: number;
	balance: number;
	spentPercentage: number;
	remainingPercentage: number;
	isSavings: boolean;
	status: string;
}

export interface DashboardSummary {
	totalIncome: number;
	totalSpent: number;
	remaining: number;
	spentPercentage: number;
	isWarning80: boolean;
}

export interface DashboardExpenseItem {
	id: string;
	name: string;
	amount: number;
	categoryName: string;
	isSavings: boolean;
	date: string;
}

export interface DashboardPeriod {
	id: string;
	startDate: string;
	endDate: string;
	payDay: number;
	totalIncome: number;
	status: string;
}

export interface DashboardData {
	period: DashboardPeriod | null;
	summary: DashboardSummary;
	categories: DashboardCategory[];
	recentExpenses: DashboardExpenseItem[];
}

/**
 * Calculates high-level summary metrics for the active period.
 */
export function calculateDashboardSummary(
	totalIncome: number,
	totalSpent: number
): DashboardSummary {
	const safeIncome = Math.max(0, totalIncome);
	const safeSpent = Math.max(0, totalSpent);
	const remaining = safeIncome - safeSpent;
	const spentPercentage = safeIncome > 0 ? Math.round((safeSpent / safeIncome) * 100) : 0;
	const isWarning80 = safeIncome > 0 && safeSpent / safeIncome > 0.8;

	return {
		totalIncome: safeIncome,
		totalSpent: safeSpent,
		remaining,
		spentPercentage,
		isWarning80
	};
}

/**
 * Loads the active monthly period, category breakdowns, and dashboard summary
 * directly from D1 for the authenticated user.
 */
export async function getDashboardData(
	d1: D1Database,
	userId: string,
	activePeriod?: schema.MonthlyPeriod | null,
	options?: { skipRecentExpenses?: boolean }
): Promise<DashboardData> {
	const db = getDb(d1);

	// 1. Ensure up-to-date active monthly period (auto-transitions if expired)
	const currentPeriod =
		activePeriod !== undefined ? activePeriod : (await ensureActivePeriod(d1, userId)).period;

	if (!currentPeriod) {
		return {
			period: null,
			summary: calculateDashboardSummary(0, 0),
			categories: [],
			recentExpenses: []
		};
	}

	// 2. Fetch categories belonging to this active period (active and frozen, frozen shown for remaining balance)
	const categories = await db
		.select()
		.from(schema.category)
		.where(and(eq(schema.category.userId, userId), eq(schema.category.periodId, currentPeriod.id)));

	// 3. Fetch aggregated category expenses directly via native SQL GROUP BY
	const categoryExpenses = await db
		.select({
			categoryId: schema.expense.categoryId,
			totalSpent: sql<number>`cast(coalesce(sum(${schema.expense.amount}), 0) as int)`
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, currentPeriod.id)))
		.groupBy(schema.expense.categoryId);

	const spentByCat = new Map<string, number>();
	let totalSpent = 0;

	for (const row of categoryExpenses) {
		spentByCat.set(row.categoryId, row.totalSpent);
		totalSpent += row.totalSpent;
	}

	// 4. Calculate category allocations and remaining balances
	const dashboardCategories: DashboardCategory[] = categories.map((cat) => {
		const allocation = Math.round(currentPeriod.totalIncome * (cat.percentage / 100));
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
			status: cat.status
		};
	});

	const summary = calculateDashboardSummary(currentPeriod.totalIncome, totalSpent);

	// 5. Fetch top 5 recent expenses using SQL limit (unless skipRecentExpenses requested)
	const recentExpenses: DashboardExpenseItem[] = options?.skipRecentExpenses
		? []
		: (
				await db
					.select({
						id: schema.expense.id,
						name: schema.expense.name,
						amount: schema.expense.amount,
						categoryName: schema.category.name,
						isSavings: schema.category.isSavings,
						date: schema.expense.date
					})
					.from(schema.expense)
					.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
					.where(
						and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, currentPeriod.id))
					)
					.orderBy(desc(schema.expense.date), desc(schema.expense.createdAt))
					.limit(5)
			).map((exp) => ({
				id: exp.id,
				name: exp.name,
				amount: exp.amount,
				categoryName: exp.categoryName,
				isSavings: Boolean(exp.isSavings),
				date: exp.date
			}));

	return {
		period: {
			id: currentPeriod.id,
			startDate: currentPeriod.startDate,
			endDate: currentPeriod.endDate,
			payDay: currentPeriod.payDay,
			totalIncome: currentPeriod.totalIncome,
			status: currentPeriod.status
		},
		summary,
		categories: dashboardCategories,
		recentExpenses
	};
}
