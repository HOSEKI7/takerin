import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';

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

	// 1. Fetch active monthly period
	const activePeriods = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(and(eq(schema.monthlyPeriod.userId, userId), eq(schema.monthlyPeriod.status, 'active')))
		.orderBy(desc(schema.monthlyPeriod.createdAt))
		.limit(1);

	const activePeriod = activePeriods[0] ?? null;

	if (!activePeriod) {
		return {
			period: null,
			summary: calculateDashboardSummary(0, 0),
			categories: [],
			recentExpenses: []
		};
	}

	// 2. Fetch categories belonging to this active period
	const categories = await db
		.select()
		.from(schema.category)
		.where(
			and(
				eq(schema.category.userId, userId),
				eq(schema.category.periodId, activePeriod.id),
				eq(schema.category.status, 'active')
			)
		);

	// Total spent across period (placeholder until expense table is integrated in #9)
	const totalSpent = 0;

	// Calculate category allocations and remaining balances
	const dashboardCategories: DashboardCategory[] = categories.map((cat) => {
		const allocation = Math.round(activePeriod.totalIncome * (cat.percentage / 100));
		const spent = 0; // Will be populated from expenses in ticket #9
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
		recentExpenses: []
	};
}
