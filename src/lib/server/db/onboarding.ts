import { eq } from 'drizzle-orm';
import { getDb } from './index.js';
import * as schema from './schema.js';

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
