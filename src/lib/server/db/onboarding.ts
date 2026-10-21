import { eq } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';
import {
	calculatePeriodDates,
	calculateTotalIncome,
	type CategoryInput
} from '#lib/validation/onboarding.js';

export interface SaveOnboardingInput {
	payDay: number;
	incomeSources: Array<{
		name: string;
		amount: number;
	}>;
	language?: string;
	theme?: string;
}

/**
 * Saves Tanggal Gajian into user_settings and income sources into income_source,
 * then marks user onboarding as completed.
 */
export async function saveOnboardingStep1And2(
	d1: D1Database,
	userId: string,
	data: SaveOnboardingInput
) {
	const db = getDb(d1);
	const now = new Date();

	// 1. Upsert user_settings
	const existingSettings = await db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.limit(1);

	if (existingSettings.length > 0) {
		await db
			.update(schema.userSettings)
			.set({
				payDay: data.payDay,
				updatedAt: now
			})
			.where(eq(schema.userSettings.userId, userId));
	} else {
		await db.insert(schema.userSettings).values({
			id: crypto.randomUUID(),
			userId,
			payDay: data.payDay,
			language: data.language ?? 'id',
			theme: data.theme ?? 'light',
			createdAt: now,
			updatedAt: now
		});
	}

	// 2. Overwrite income_sources: remove existing, insert new
	await db.delete(schema.incomeSource).where(eq(schema.incomeSource.userId, userId));

	if (data.incomeSources.length > 0) {
		const newSources = data.incomeSources.map((source) => ({
			id: crypto.randomUUID(),
			userId,
			name: source.name.trim(),
			amount: Math.round(Number(source.amount)),
			createdAt: now,
			updatedAt: now
		}));

		await db.insert(schema.incomeSource).values(newSources);
	}

	// 3. Mark user onboardingCompleted = true
	await db
		.update(schema.user)
		.set({
			onboardingCompleted: true,
			updatedAt: now
		})
		.where(eq(schema.user.id, userId));

	return { success: true };
}

/**
 * Retrieves user settings for a given user.
 */
export async function getUserSettings(d1: D1Database, userId: string) {
	const db = getDb(d1);
	const results = await db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.limit(1);

	return results[0] ?? null;
}

/**
 * Retrieves all income sources for a given user.
 */
export async function getIncomeSources(d1: D1Database, userId: string) {
	const db = getDb(d1);
	return db.select().from(schema.incomeSource).where(eq(schema.incomeSource.userId, userId));
}

/**
 * Sets the onboardingCompleted status on the user record directly.
 */
export async function setOnboardingCompleted(d1: D1Database, userId: string, completed: boolean) {
	const db = getDb(d1);
	return db
		.update(schema.user)
		.set({
			onboardingCompleted: completed,
			updatedAt: new Date()
		})
		.where(eq(schema.user.id, userId));
}

export interface CategoryTemplateRecord {
	id: string;
	name: string;
	description: string | null;
	categories: Array<{
		name: string;
		percentage: number;
		isSavings: boolean;
	}>;
	isSystem: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface CompleteOnboardingInput {
	payDay: number;
	incomeSources: Array<{
		name: string;
		amount: number;
	}>;
	categories: CategoryInput[];
	language?: string;
	theme?: string;
	now?: Date;
}

/**
 * Retrieves all category templates from the database with categories parsed.
 */
export async function getCategoryTemplates(d1: D1Database): Promise<CategoryTemplateRecord[]> {
	const db = getDb(d1);
	const rows = await db.select().from(schema.categoryTemplate);

	return rows.map((r) => {
		let parsedCategories: Array<{ name: string; percentage: number; isSavings: boolean }> = [];
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
 * Completes the full onboarding flow:
 * 1. Saves user_settings (payDay, language, theme)
 * 2. Saves income_sources
 * 3. Creates the first active monthly_period (start_date = today, end_date = 1 day before next pay date)
 * 4. Creates active categories linked to the monthly_period
 * 5. Sets user.onboardingCompleted = true
 */
export async function completeOnboarding(
	d1: D1Database,
	userId: string,
	data: CompleteOnboardingInput
) {
	const db = getDb(d1);
	const now = data.now ?? new Date();

	// 1. Upsert user_settings
	const existingSettings = await db
		.select()
		.from(schema.userSettings)
		.where(eq(schema.userSettings.userId, userId))
		.limit(1);

	if (existingSettings.length > 0) {
		await db
			.update(schema.userSettings)
			.set({
				payDay: data.payDay,
				updatedAt: now
			})
			.where(eq(schema.userSettings.userId, userId));
	} else {
		await db.insert(schema.userSettings).values({
			id: crypto.randomUUID(),
			userId,
			payDay: data.payDay,
			language: data.language ?? 'id',
			theme: data.theme ?? 'light',
			createdAt: now,
			updatedAt: now
		});
	}

	// 2. Overwrite income_sources: remove existing, insert new
	await db.delete(schema.incomeSource).where(eq(schema.incomeSource.userId, userId));

	if (data.incomeSources.length > 0) {
		const newSources = data.incomeSources.map((source) => ({
			id: crypto.randomUUID(),
			userId,
			name: source.name.trim(),
			amount: Math.round(Number(source.amount)),
			createdAt: now,
			updatedAt: now
		}));

		await db.insert(schema.incomeSource).values(newSources);
	}

	// 3. Compute period dates and total income
	const totalIncome = calculateTotalIncome(data.incomeSources);
	const { startDate, endDate } = calculatePeriodDates(now, data.payDay);
	const periodId = crypto.randomUUID();

	// Insert active monthly_period
	await db.insert(schema.monthlyPeriod).values({
		id: periodId,
		userId,
		startDate,
		endDate,
		payDay: data.payDay,
		totalIncome,
		status: 'active',
		createdAt: now
	});

	// 4. Insert active categories
	if (data.categories.length > 0) {
		const newCategories = data.categories.map((c) => ({
			id: crypto.randomUUID(),
			userId,
			periodId,
			name: c.name.trim(),
			percentage: Number(c.percentage),
			isSavings: Boolean(c.isSavings ?? c.is_savings ?? false),
			status: 'active',
			createdAt: now,
			updatedAt: now
		}));

		await db.insert(schema.category).values(newCategories);
	}

	// 5. Mark user onboardingCompleted = true
	await db
		.update(schema.user)
		.set({
			onboardingCompleted: true,
			updatedAt: now
		})
		.where(eq(schema.user.id, userId));

	return { success: true, periodId };
}
