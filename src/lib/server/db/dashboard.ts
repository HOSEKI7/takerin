import { eq, and, desc } from 'drizzle-orm';
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
export async function getDashboardData(d1: D1Database, userId: string): Promise<DashboardData> {
	const db = getDb(d1);

	// 1. Ensure up-to-date active monthly period (auto-transitions if expired)
	const { period: activePeriod } = await ensureActivePeriod(d1, userId);

	if (!activePeriod) {
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
		.where(and(eq(schema.category.userId, userId), eq(schema.category.periodId, activePeriod.id)));

	// 3. Fetch all expenses for this active period
	const expenses = await db
		.select({
			id: schema.expense.id,
			categoryId: schema.expense.categoryId,
			categoryName: schema.category.name,
			isSavings: schema.category.isSavings,
			name: schema.expense.name,
			amount: schema.expense.amount,
			date: schema.expense.date,
			createdAt: schema.expense.createdAt
		})
		.from(schema.expense)
		.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, activePeriod.id)))
		.orderBy(desc(schema.expense.date), desc(schema.expense.createdAt));

	// Group spent by category
	const spentByCat = new Map<string, number>();
	let totalSpent = 0;

	for (const exp of expenses) {
		const prev = spentByCat.get(exp.categoryId) ?? 0;
		spentByCat.set(exp.categoryId, prev + exp.amount);
		totalSpent += exp.amount;
	}

	// Calculate category allocations and remaining balances
	const dashboardCategories: DashboardCategory[] = categories.map((cat) => {
		const allocation = Math.round(activePeriod.totalIncome * (cat.percentage / 100));
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

	const summary = calculateDashboardSummary(activePeriod.totalIncome, totalSpent);

	// Top 5 recent expenses
	const recentExpenses: DashboardExpenseItem[] = expenses.slice(0, 5).map((exp) => ({
		id: exp.id,
		name: exp.name,
		amount: exp.amount,
		categoryName: exp.categoryName,
		isSavings: Boolean(exp.isSavings),
		date: exp.date
	}));

	return {
		period: {
			id: activePeriod.id,
			startDate: activePeriod.startDate,
			endDate: activePeriod.endDate,
			payDay: activePeriod.payDay,
			totalIncome: activePeriod.totalIncome,
			status: activePeriod.status
		},
		summary,
		categories: dashboardCategories,
		recentExpenses
	};
}
