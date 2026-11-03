import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';

export interface ExpenseItem {
	id: string;
	userId: string;
	periodId: string;
	categoryId: string;
	categoryName: string;
	isSavings: boolean;
	name: string;
	amount: number;
	date: string;
	time: string | null;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CategoryItem {
	id: string;
	name: string;
	percentage: number;
	isSavings: boolean;
	status: string;
}

export interface CreateExpenseParams {
	userId: string;
	periodId: string;
	categoryId: string;
	name: string;
	amount: number;
	date: string;
	time?: string;
	notes?: string;
}

export interface UpdateExpenseParams {
	id: string;
	userId: string;
	categoryId: string;
	name: string;
	amount: number;
	date: string;
	time?: string;
	notes?: string;
}

/**
 * Returns categories for the active monthly period.
 * By default, filters out frozen categories so they cannot receive new expenses.
 */
export async function getActivePeriodCategories(
	d1: D1Database,
	params: { userId: string; periodId: string; includeFrozen?: boolean }
): Promise<CategoryItem[]> {
	const db = getDb(d1);

	const conditions = [
		eq(schema.category.userId, params.userId),
		eq(schema.category.periodId, params.periodId)
	];

	if (!params.includeFrozen) {
		conditions.push(eq(schema.category.status, 'active'));
	}

	const rows = await db
		.select({
			id: schema.category.id,
			name: schema.category.name,
			percentage: schema.category.percentage,
			isSavings: schema.category.isSavings,
			status: schema.category.status
		})
		.from(schema.category)
		.where(and(...conditions));

	return rows.map((r) => ({
		...r,
		isSavings: Boolean(r.isSavings)
	}));
}

/**
 * Inserts a new expense record in D1.
 */
export async function createExpense(
	d1: D1Database,
	params: CreateExpenseParams
): Promise<{ id: string; success: boolean }> {
	const db = getDb(d1);
	const now = new Date();
	const id = 'exp-' + crypto.randomUUID();

	await db.insert(schema.expense).values({
		id,
		userId: params.userId,
		periodId: params.periodId,
		categoryId: params.categoryId,
		name: params.name,
		amount: params.amount,
		date: params.date,
		time: params.time ?? null,
		notes: params.notes ?? null,
		createdAt: now,
		updatedAt: now
	});

	return { id, success: true };
}

export interface GetExpensesParams {
	userId: string;
	periodId: string;
	categoryId?: string;
	limit?: number;
	offset?: number;
}

/**
 * Fetches expenses in the monthly period, optionally filtered by category.
 */
export async function getExpenses(
	d1: D1Database,
	params: GetExpensesParams
): Promise<ExpenseItem[]> {
	const db = getDb(d1);

	const conditions = [
		eq(schema.expense.userId, params.userId),
		eq(schema.expense.periodId, params.periodId)
	];

	if (params.categoryId && params.categoryId.trim().length > 0) {
		conditions.push(eq(schema.expense.categoryId, params.categoryId.trim()));
	}

	let query = db
		.select({
			id: schema.expense.id,
			userId: schema.expense.userId,
			periodId: schema.expense.periodId,
			categoryId: schema.expense.categoryId,
			categoryName: schema.category.name,
			isSavings: schema.category.isSavings,
			name: schema.expense.name,
			amount: schema.expense.amount,
			date: schema.expense.date,
			time: schema.expense.time,
			notes: schema.expense.notes,
			createdAt: schema.expense.createdAt,
			updatedAt: schema.expense.updatedAt
		})
		.from(schema.expense)
		.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
		.where(and(...conditions))
		.orderBy(desc(schema.expense.date), desc(schema.expense.createdAt));

	if (params.limit !== undefined && params.limit > 0) {
		query = query.limit(params.limit) as typeof query;
	}

	if (params.offset !== undefined && params.offset > 0) {
		query = query.offset(params.offset) as typeof query;
	}

	const rows = await query;

	return rows.map((r) => ({
		...r,
		isSavings: Boolean(r.isSavings)
	}));
}

/**
 * Returns total count of expenses matching criteria.
 */
export async function countExpenses(
	d1: D1Database,
	params: { userId: string; periodId: string; categoryId?: string }
): Promise<number> {
	const db = getDb(d1);

	const conditions = [
		eq(schema.expense.userId, params.userId),
		eq(schema.expense.periodId, params.periodId)
	];

	if (params.categoryId && params.categoryId.trim().length > 0) {
		conditions.push(eq(schema.expense.categoryId, params.categoryId.trim()));
	}

	const rows = await db
		.select({
			count: sql<number>`cast(count(${schema.expense.id}) as int)`
		})
		.from(schema.expense)
		.where(and(...conditions));

	return rows[0]?.count ?? 0;
}

/**
 * Fetches a single expense by id ensuring user ownership.
 */
export async function getExpenseById(
	d1: D1Database,
	params: { id: string; userId: string }
): Promise<ExpenseItem | null> {
	const db = getDb(d1);

	const rows = await db
		.select({
			id: schema.expense.id,
			userId: schema.expense.userId,
			periodId: schema.expense.periodId,
			categoryId: schema.expense.categoryId,
			categoryName: schema.category.name,
			isSavings: schema.category.isSavings,
			name: schema.expense.name,
			amount: schema.expense.amount,
			date: schema.expense.date,
			time: schema.expense.time,
			notes: schema.expense.notes,
			createdAt: schema.expense.createdAt,
			updatedAt: schema.expense.updatedAt
		})
		.from(schema.expense)
		.innerJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
		.where(and(eq(schema.expense.id, params.id), eq(schema.expense.userId, params.userId)))
		.limit(1);

	if (rows.length === 0) return null;

	const r = rows[0];
	return {
		...r,
		isSavings: Boolean(r.isSavings)
	};
}

/**
 * Updates an existing expense.
 */
export async function updateExpense(
	d1: D1Database,
	params: UpdateExpenseParams
): Promise<{ success: boolean }> {
	const db = getDb(d1);
	const now = new Date();

	await db
		.update(schema.expense)
		.set({
			name: params.name,
			amount: params.amount,
			categoryId: params.categoryId,
			date: params.date,
			time: params.time ?? null,
			notes: params.notes ?? null,
			updatedAt: now
		})
		.where(and(eq(schema.expense.id, params.id), eq(schema.expense.userId, params.userId)));

	return { success: true };
}

/**
 * Deletes an existing expense.
 */
export async function deleteExpense(
	d1: D1Database,
	params: { id: string; userId: string }
): Promise<{ success: boolean }> {
	const db = getDb(d1);

	await db
		.delete(schema.expense)
		.where(and(eq(schema.expense.id, params.id), eq(schema.expense.userId, params.userId)));

	return { success: true };
}
