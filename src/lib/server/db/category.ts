import { eq, and } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import { ensureActivePeriod } from './period.js';
import {
	validateCategoryManagementInput,
	type ManagedCategoryInput
} from '#lib/validation/category.js';

export interface CategoryManagementItem {
	id: string;
	name: string;
	percentage: number;
	allocation: number;
	spent: number;
	balance: number;
	isSavings: boolean;
	status: string;
}

export interface ManageCategoriesData {
	period: {
		id: string;
		startDate: string;
		endDate: string;
		payDay: number;
		totalIncome: number;
		status: string;
	} | null;
	activeCategories: CategoryManagementItem[];
	frozenCategories: CategoryManagementItem[];
}

export interface UpdateCategoriesMidPeriodParams {
	userId: string;
	periodId: string;
	activeCategories: ManagedCategoryInput[];
	freezeCategoryIds?: string[];
	frozenCategoryRenames?: Array<{ id: string; name: string }>;
}

/**
 * Retrieves category management data for the active monthly period.
 * Returns active and frozen categories with calculated allocations and balances.
 */
export async function getManageCategoriesData(
	d1: D1Database,
	userId: string
): Promise<ManageCategoriesData> {
	const db = getDb(d1);

	// 1. Ensure up-to-date active monthly period (auto-transitions if expired)
	const { period: activePeriod } = await ensureActivePeriod(d1, userId);

	if (!activePeriod) {
		return {
			period: null,
			activeCategories: [],
			frozenCategories: []
		};
	}

	// 2. Fetch all categories for this active period
	const categories = await db
		.select()
		.from(schema.category)
		.where(and(eq(schema.category.userId, userId), eq(schema.category.periodId, activePeriod.id)));

	// 3. Fetch all expenses for this period to calculate spent and balance
	const expenses = await db
		.select({
			categoryId: schema.expense.categoryId,
			amount: schema.expense.amount
		})
		.from(schema.expense)
		.where(and(eq(schema.expense.userId, userId), eq(schema.expense.periodId, activePeriod.id)));

	const spentByCat = new Map<string, number>();
	for (const exp of expenses) {
		const prev = spentByCat.get(exp.categoryId) ?? 0;
		spentByCat.set(exp.categoryId, prev + exp.amount);
	}

	const activeCategories: CategoryManagementItem[] = [];
	const frozenCategories: CategoryManagementItem[] = [];

	for (const cat of categories) {
		const allocation = Math.round(activePeriod.totalIncome * (cat.percentage / 100));
		const spent = spentByCat.get(cat.id) ?? 0;
		const balance = allocation - spent;

		const item: CategoryManagementItem = {
			id: cat.id,
			name: cat.name,
			percentage: cat.percentage,
			allocation,
			spent,
			balance,
			isSavings: Boolean(cat.isSavings),
			status: cat.status
		};

		if (cat.status === 'frozen') {
			frozenCategories.push(item);
		} else {
			activeCategories.push(item);
		}
	}

	return {
		period: {
			id: activePeriod.id,
			startDate: activePeriod.startDate,
			endDate: activePeriod.endDate,
			payDay: activePeriod.payDay,
			totalIncome: activePeriod.totalIncome,
			status: activePeriod.status
		},
		activeCategories,
		frozenCategories
	};
}

/**
 * Updates categories mid-period atomically:
 * - Validates input (sum === 100%, valid names, valid percentages)
 * - Updates existing active categories
 * - Inserts newly added active categories
 * - Freezes requested categories (sets status: 'frozen' and percentage: 0)
 */
export async function updateCategoriesMidPeriod(
	d1: D1Database,
	params: UpdateCategoriesMidPeriodParams
): Promise<{ success: boolean }> {
	const db = getDb(d1);
	const now = new Date();

	// 1. Validate active categories input
	const validation = validateCategoryManagementInput(params.activeCategories);
	if (!validation.success || !validation.data) {
		throw new Error(validation.error || 'Validasi kategori gagal.');
	}

	// 2. Verify active monthly period belongs to user
	const periodRows = await db
		.select()
		.from(schema.monthlyPeriod)
		.where(
			and(
				eq(schema.monthlyPeriod.id, params.periodId),
				eq(schema.monthlyPeriod.userId, params.userId),
				eq(schema.monthlyPeriod.status, 'active')
			)
		)
		.limit(1);

	if (periodRows.length === 0) {
		throw new Error('Periode Bulan tidak ditemukan atau tidak aktif.');
	}

	// 3. Prepare atomic batch statements
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const batchStatements: any[] = [];

	// A. Freeze requested categories (preserves percentage for historical allocation & remaining balance)
	if (params.freezeCategoryIds && params.freezeCategoryIds.length > 0) {
		for (const freezeId of params.freezeCategoryIds) {
			batchStatements.push(
				db
					.update(schema.category)
					.set({
						status: 'frozen',
						updatedAt: now
					})
					.where(
						and(
							eq(schema.category.id, freezeId),
							eq(schema.category.userId, params.userId),
							eq(schema.category.periodId, params.periodId)
						)
					)
			);
		}
	}

	// B. Rename frozen categories if requested
	if (params.frozenCategoryRenames && params.frozenCategoryRenames.length > 0) {
		for (const rename of params.frozenCategoryRenames) {
			const trimmed = rename.name.trim();
			if (trimmed.length > 0) {
				batchStatements.push(
					db
						.update(schema.category)
						.set({
							name: trimmed,
							updatedAt: now
						})
						.where(
							and(
								eq(schema.category.id, rename.id),
								eq(schema.category.userId, params.userId),
								eq(schema.category.periodId, params.periodId)
							)
						)
				);
			}
		}
	}

	// B. Update existing active categories or insert new active categories
	for (const cat of validation.data) {
		const isExisting = cat.id && !cat.id.startsWith('new-');
		if (isExisting && cat.id) {
			batchStatements.push(
				db
					.update(schema.category)
					.set({
						name: cat.name,
						percentage: cat.percentage,
						isSavings: cat.isSavings,
						status: 'active',
						updatedAt: now
					})
					.where(
						and(
							eq(schema.category.id, cat.id),
							eq(schema.category.userId, params.userId),
							eq(schema.category.periodId, params.periodId)
						)
					)
			);
		} else {
			const newId = crypto.randomUUID();
			batchStatements.push(
				db.insert(schema.category).values({
					id: newId,
					userId: params.userId,
					periodId: params.periodId,
					name: cat.name,
					percentage: cat.percentage,
					isSavings: cat.isSavings,
					status: 'active',
					createdAt: now,
					updatedAt: now
				})
			);
		}
	}

	if (batchStatements.length > 0) {
		await db.batch(batchStatements as [(typeof batchStatements)[0], ...typeof batchStatements]);
	}

	return { success: true };
}
