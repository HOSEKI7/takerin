import { sql, eq, desc, gte, or } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import {
	validateTemplateInput,
	type CreateTemplateInput,
	type CategoryTemplateInputItem
} from '#lib/validation/admin.js';
import type { CategoryTemplateRecord } from './onboarding.js';

export interface AdminAnalyticsData {
	totalUsers: number;
	dau: number;
	totalExpenses: number;
	topCategories: Array<{ name: string; count: number }>;
}

export interface AdminUserRecord {
	id: string;
	name: string;
	email: string;
	role: string;
	emailVerified: boolean;
	onboardingCompleted: boolean;
	createdAt: Date;
	lastActiveAt: Date;
}

export interface TableBreakdown {
	user: number;
	session: number;
	monthlyPeriod: number;
	category: number;
	expense: number;
	incomeSource: number;
	categoryTemplate: number;
	userSettings: number;
	healthCheck: number;
	[key: string]: number;
}

export interface SystemHealthData {
	totalD1RowsEstimate: number;
	tableBreakdown: TableBreakdown;
	aiCallsCount: number;
	resendUsageLink: string;
	databaseStatus: 'healthy' | 'degraded';
	databaseLatencyMs: number;
}

/**
 * Returns platform analytics for the admin dashboard.
 */
export async function getAdminAnalytics(
	d1: D1Database,
	now: Date = new Date()
): Promise<AdminAnalyticsData> {
	const db = getDb(d1);

	// 1. Total Registered Users
	const userCountRes = await db.select({ count: sql<number>`count(*)` }).from(schema.user);
	const totalUsers = Number(userCountRes[0]?.count ?? 0);

	// 2. Total Expenses Recorded
	const expenseCountRes = await db.select({ count: sql<number>`count(*)` }).from(schema.expense);
	const totalExpenses = Number(expenseCountRes[0]?.count ?? 0);

	// 3. DAU (Daily Active Users in the last 24 hours)
	const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// Collect active user IDs from sessions & user record update
	const activeSessions = await db
		.select({ userId: schema.session.userId })
		.from(schema.session)
		.where(
			or(
				gte(schema.session.updatedAt, twentyFourHoursAgo),
				gte(schema.session.createdAt, twentyFourHoursAgo)
			)
		);

	const activeUsers = await db
		.select({ id: schema.user.id })
		.from(schema.user)
		.where(
			or(
				gte(schema.user.updatedAt, twentyFourHoursAgo),
				gte(schema.user.createdAt, twentyFourHoursAgo)
			)
		);

	const activeIdSet = new Set<string>();
	for (const s of activeSessions) {
		activeIdSet.add(s.userId);
	}
	for (const u of activeUsers) {
		activeIdSet.add(u.id);
	}
	const dau = activeIdSet.size;

	// 4. Top 10 Most Popular Categories by Name Frequency
	const topCatRows = await db
		.select({
			name: sql<string>`lower(trim(${schema.category.name}))`,
			count: sql<number>`count(*)`
		})
		.from(schema.category)
		.groupBy(sql`lower(trim(${schema.category.name}))`)
		.orderBy(sql`count(*) desc`)
		.limit(10);

	const topCategories = topCatRows.map((r) => ({
		name: String(r.name),
		count: Number(r.count)
	}));

	return {
		totalUsers,
		dau,
		totalExpenses,
		topCategories
	};
}

/**
 * Returns all registered users with email, registration date, and last active date.
 * STRICT PRIVACY: Omits all financial, income, and expense data.
 */
export async function getAdminUsers(d1: D1Database): Promise<AdminUserRecord[]> {
	const db = getDb(d1);

	// Get users
	const users = await db
		.select({
			id: schema.user.id,
			name: schema.user.name,
			email: schema.user.email,
			role: schema.user.role,
			emailVerified: schema.user.emailVerified,
			onboardingCompleted: schema.user.onboardingCompleted,
			createdAt: schema.user.createdAt,
			updatedAt: schema.user.updatedAt
		})
		.from(schema.user)
		.orderBy(desc(schema.user.createdAt));

	// Get latest session update per user
	const sessionDates = await db
		.select({
			userId: schema.session.userId,
			maxUpdated: sql<number>`max(${schema.session.updatedAt})`,
			maxCreated: sql<number>`max(${schema.session.createdAt})`
		})
		.from(schema.session)
		.groupBy(schema.session.userId);

	const lastSessionMap = new Map<string, Date>();
	for (const s of sessionDates) {
		const updatedMs = Number(s.maxUpdated ?? 0);
		const createdMs = Number(s.maxCreated ?? 0);
		const latestMs = Math.max(updatedMs, createdMs);
		if (latestMs > 0) {
			lastSessionMap.set(s.userId, new Date(latestMs));
		}
	}

	return users.map((u) => {
		const sessionDate = lastSessionMap.get(u.id);
		let lastActiveAt = u.updatedAt ?? u.createdAt;
		if (sessionDate && sessionDate.getTime() > lastActiveAt.getTime()) {
			lastActiveAt = sessionDate;
		}

		return {
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role,
			emailVerified: u.emailVerified,
			onboardingCompleted: u.onboardingCompleted,
			createdAt: u.createdAt,
			lastActiveAt
		};
	});
}

/**
 * Parses and returns all category templates.
 */
export async function getAdminTemplates(d1: D1Database): Promise<CategoryTemplateRecord[]> {
	const db = getDb(d1);
	const rows = await db
		.select()
		.from(schema.categoryTemplate)
		.orderBy(desc(schema.categoryTemplate.isSystem), schema.categoryTemplate.name);

	return rows.map((r) => {
		let parsedCategories: CategoryTemplateInputItem[] = [];
		try {
			const parsed = JSON.parse(r.categories);
			if (Array.isArray(parsed)) {
				parsedCategories = parsed.map((c) => ({
					name: String(c.name || ''),
					percentage: Number(c.percentage || 0),
					isSavings: Boolean(c.isSavings ?? c.is_savings ?? false)
				}));
			}
		} catch (e) {
			console.error(`Failed to parse template categories for template ${r.id}:`, e);
		}

		return {
			id: r.id,
			name: r.name,
			description: r.description,
			categories: parsedCategories,
			isSystem: r.isSystem,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt
		};
	});
}

/**
 * Creates a new category template (admin-created, isSystem = false).
 */
export async function createCategoryTemplate(
	d1: D1Database,
	input: CreateTemplateInput
): Promise<CategoryTemplateRecord> {
	const validation = validateTemplateInput(input);
	if (!validation.isValid || !validation.sanitizedData) {
		const firstError = Object.values(validation.errors)[0] || 'Validasi template gagal.';
		throw new Error(firstError);
	}

	const db = getDb(d1);
	const now = new Date();
	const newId = `tpl_${crypto.randomUUID()}`;

	const record = {
		id: newId,
		name: validation.sanitizedData.name,
		description: validation.sanitizedData.description ?? null,
		categories: JSON.stringify(validation.sanitizedData.categories),
		isSystem: false,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(schema.categoryTemplate).values(record);

	return {
		id: newId,
		name: record.name,
		description: record.description,
		categories: validation.sanitizedData.categories,
		isSystem: false,
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Updates an existing category template.
 */
export async function updateCategoryTemplate(
	d1: D1Database,
	id: string,
	input: CreateTemplateInput
): Promise<CategoryTemplateRecord> {
	const validation = validateTemplateInput(input);
	if (!validation.isValid || !validation.sanitizedData) {
		const firstError = Object.values(validation.errors)[0] || 'Validasi template gagal.';
		throw new Error(firstError);
	}

	const db = getDb(d1);
	const existing = await db
		.select()
		.from(schema.categoryTemplate)
		.where(eq(schema.categoryTemplate.id, id))
		.limit(1);

	if (existing.length === 0) {
		throw new Error('Template tidak ditemukan.');
	}

	if (existing[0].isSystem) {
		throw new Error('Template sistem bawaan tidak dapat diubah.');
	}

	const now = new Date();
	const description = validation.sanitizedData.description ?? null;

	await db
		.update(schema.categoryTemplate)
		.set({
			name: validation.sanitizedData.name,
			description,
			categories: JSON.stringify(validation.sanitizedData.categories),
			updatedAt: now
		})
		.where(eq(schema.categoryTemplate.id, id));

	return {
		id,
		name: validation.sanitizedData.name,
		description,
		categories: validation.sanitizedData.categories,
		isSystem: existing[0].isSystem,
		createdAt: existing[0].createdAt,
		updatedAt: now
	};
}

/**
 * Deletes a category template.
 * Throws an error if attempting to delete a system preset (`isSystem = true`).
 */
export async function deleteCategoryTemplate(
	d1: D1Database,
	id: string
): Promise<{ success: boolean }> {
	const db = getDb(d1);
	const existing = await db
		.select()
		.from(schema.categoryTemplate)
		.where(eq(schema.categoryTemplate.id, id))
		.limit(1);

	if (existing.length === 0) {
		throw new Error('Template tidak ditemukan.');
	}

	if (existing[0].isSystem) {
		throw new Error('Template bawaan sistem tidak dapat dihapus.');
	}

	await db.delete(schema.categoryTemplate).where(eq(schema.categoryTemplate.id, id));

	return { success: true };
}

/**
 * Gathers system health metrics:
 * 1. D1 row counts across all tables.
 * 2. Total estimated D1 rows.
 * 3. AI call counts (from monthly_period and health_check).
 * 4. Resend dashboard link.
 * 5. Database ping latency.
 */
export async function getSystemHealth(d1: D1Database): Promise<SystemHealthData> {
	const db = getDb(d1);
	const startPing = Date.now();

	// Ping & count queries
	const [
		userCount,
		sessionCount,
		periodCount,
		categoryCount,
		expenseCount,
		incomeCount,
		templateCount,
		settingsCount,
		healthCheckCount
	] = await Promise.all([
		db.select({ count: sql<number>`count(*)` }).from(schema.user),
		db.select({ count: sql<number>`count(*)` }).from(schema.session),
		db.select({ count: sql<number>`count(*)` }).from(schema.monthlyPeriod),
		db.select({ count: sql<number>`count(*)` }).from(schema.category),
		db.select({ count: sql<number>`count(*)` }).from(schema.expense),
		db.select({ count: sql<number>`count(*)` }).from(schema.incomeSource),
		db.select({ count: sql<number>`count(*)` }).from(schema.categoryTemplate),
		db.select({ count: sql<number>`count(*)` }).from(schema.userSettings),
		db.select({ count: sql<number>`count(*)` }).from(schema.healthCheck)
	]);

	const databaseLatencyMs = Date.now() - startPing;

	const tableBreakdown: TableBreakdown = {
		user: Number(userCount[0]?.count ?? 0),
		session: Number(sessionCount[0]?.count ?? 0),
		monthlyPeriod: Number(periodCount[0]?.count ?? 0),
		category: Number(categoryCount[0]?.count ?? 0),
		expense: Number(expenseCount[0]?.count ?? 0),
		incomeSource: Number(incomeCount[0]?.count ?? 0),
		categoryTemplate: Number(templateCount[0]?.count ?? 0),
		userSettings: Number(settingsCount[0]?.count ?? 0),
		healthCheck: Number(healthCheckCount[0]?.count ?? 0)
	};

	const totalD1RowsEstimate = Object.values(tableBreakdown).reduce((acc, curr) => acc + curr, 0);

	// Count AI calls: periods with generated AI summary + any logged health checks for AI
	const aiSummariesCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.monthlyPeriod)
		.where(sql`${schema.monthlyPeriod.aiSummary} IS NOT NULL`);

	const aiHealthLogsCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.healthCheck)
		.where(sql`${schema.healthCheck.service} in ('groq', 'gemini')`);

	const aiCallsCount =
		Number(aiSummariesCount[0]?.count ?? 0) + Number(aiHealthLogsCount[0]?.count ?? 0);

	return {
		totalD1RowsEstimate,
		tableBreakdown,
		aiCallsCount,
		resendUsageLink: 'https://resend.com/emails',
		databaseStatus: 'healthy',
		databaseLatencyMs
	};
}
