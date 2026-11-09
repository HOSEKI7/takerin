import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index.js';
import { appFeedback, type AppFeedback } from './schema.js';

export interface CreateFeedbackInput {
	userId: string;
	type: 'review' | 'feedback';
	rating?: number | null;
	category?: 'bug' | 'feature' | 'general' | null;
	content: string;
	currentRoute?: string | null;
	deviceInfo?: string | null;
}

export interface ListFeedbackOptions {
	userId?: string;
	type?: 'review' | 'feedback';
	category?: 'bug' | 'feature' | 'general';
	status?: 'pending' | 'reviewed' | 'resolved';
	limit?: number;
	offset?: number;
}

/**
 * Creates a new feedback or review entry in Cloudflare D1.
 */
export async function createFeedback(
	d1: D1Database,
	input: CreateFeedbackInput
): Promise<AppFeedback> {
	const db = getDb(d1);
	const now = new Date();
	const id = crypto.randomUUID();

	const entry = {
		id,
		userId: input.userId,
		type: input.type,
		rating: input.type === 'review' ? (input.rating ?? null) : null,
		category: input.type === 'feedback' ? (input.category ?? null) : null,
		content: input.content.trim(),
		currentRoute: input.currentRoute ?? null,
		deviceInfo: input.deviceInfo ?? null,
		status: 'pending' as const,
		isFeatured: false,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(appFeedback).values(entry);

	return entry;
}

/**
 * Retrieves a feedback or review entry by primary key ID.
 */
export async function getFeedbackById(d1: D1Database, id: string): Promise<AppFeedback | null> {
	const db = getDb(d1);
	const results = await db.select().from(appFeedback).where(eq(appFeedback.id, id)).limit(1);

	return results[0] ?? null;
}

/**
 * Checks whether an authenticated user has ever submitted any review or feedback.
 */
export async function hasUserSubmittedFeedback(d1: D1Database, userId: string): Promise<boolean> {
	const db = getDb(d1);
	const results = await db
		.select({ id: appFeedback.id })
		.from(appFeedback)
		.where(eq(appFeedback.userId, userId))
		.limit(1);

	return results.length > 0;
}

/**
 * Lists feedback and review entries with optional filters and sorting.
 */
export async function listFeedback(
	d1: D1Database,
	options: ListFeedbackOptions = {}
): Promise<AppFeedback[]> {
	const db = getDb(d1);
	const conditions = [];

	if (options.userId) {
		conditions.push(eq(appFeedback.userId, options.userId));
	}
	if (options.type) {
		conditions.push(eq(appFeedback.type, options.type));
	}
	if (options.category) {
		conditions.push(eq(appFeedback.category, options.category));
	}
	if (options.status) {
		conditions.push(eq(appFeedback.status, options.status));
	}

	const query = db.select().from(appFeedback).orderBy(desc(appFeedback.createdAt));

	if (conditions.length > 0) {
		const combined = conditions.length === 1 ? conditions[0] : and(...conditions);
		return await query.where(combined).limit(options.limit ?? 50);
	}

	return await query.limit(options.limit ?? 50);
}

/**
 * Updates the administrative review status of a feedback entry.
 */
export async function updateFeedbackStatus(
	d1: D1Database,
	id: string,
	status: 'pending' | 'reviewed' | 'resolved'
): Promise<AppFeedback | null> {
	const db = getDb(d1);
	const now = new Date();

	await db.update(appFeedback).set({ status, updatedAt: now }).where(eq(appFeedback.id, id));

	return await getFeedbackById(d1, id);
}

/**
 * Permanently deletes a feedback or review entry.
 */
export async function deleteFeedback(d1: D1Database, id: string): Promise<boolean> {
	const db = getDb(d1);
	const result = await db.delete(appFeedback).where(eq(appFeedback.id, id));
	return result.meta.changes > 0;
}
