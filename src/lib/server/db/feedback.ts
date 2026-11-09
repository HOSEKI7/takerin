import { eq } from 'drizzle-orm';
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
