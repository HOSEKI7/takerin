import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { appFeedback, user, type AppFeedback } from './schema.js';

/**
 * Threshold count of recorded expenses in active monthly period that triggers automated review prompt.
 */
export const FEEDBACK_PROMPT_EXPENSE_THRESHOLD = 5;

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

/**
 * Checks if a user has previously submitted any feedback or review.
 */
export async function hasUserSubmittedFeedback(d1: D1Database, userId: string): Promise<boolean> {
	const db = getDb(d1);
	const results = await db
		.select({
			count: sql<number>`cast(count(${appFeedback.id}) as int)`
		})
		.from(appFeedback)
		.where(eq(appFeedback.userId, userId));

	return (results[0]?.count ?? 0) > 0;
}

export interface AdminFeedbackRecord {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	userImage: string | null;
	type: 'review' | 'feedback';
	rating: number | null;
	category: 'bug' | 'feature' | 'general' | null;
	content: string;
	currentRoute: string | null;
	deviceInfo: string | null;
	status: 'pending' | 'reviewed' | 'resolved';
	isFeatured: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminFeedbackMetrics {
	averageRating: number;
	totalReviews: number;
	pendingCount: number;
	totalFeedback: number;
	totalAll: number;
}

/**
 * Retrieves all feedback entries joined with user identity for the admin console.
 */
export async function getAllFeedbackForAdmin(d1: D1Database): Promise<AdminFeedbackRecord[]> {
	const db = getDb(d1);
	const results = await db
		.select({
			id: appFeedback.id,
			userId: appFeedback.userId,
			userName: user.name,
			userEmail: user.email,
			userImage: user.image,
			type: appFeedback.type,
			rating: appFeedback.rating,
			category: appFeedback.category,
			content: appFeedback.content,
			currentRoute: appFeedback.currentRoute,
			deviceInfo: appFeedback.deviceInfo,
			status: appFeedback.status,
			isFeatured: appFeedback.isFeatured,
			createdAt: appFeedback.createdAt,
			updatedAt: appFeedback.updatedAt
		})
		.from(appFeedback)
		.innerJoin(user, eq(appFeedback.userId, user.id))
		.orderBy(desc(appFeedback.createdAt));

	return results;
}

/**
 * Computes summary metrics for reviews and feedback for the admin console cards.
 */
export async function getFeedbackMetrics(d1: D1Database): Promise<AdminFeedbackMetrics> {
	const db = getDb(d1);

	const stats = await db
		.select({
			totalReviews: sql<number>`cast(count(case when ${appFeedback.type} = 'review' then 1 end) as int)`,
			totalFeedback: sql<number>`cast(count(case when ${appFeedback.type} = 'feedback' then 1 end) as int)`,
			pendingCount: sql<number>`cast(count(case when ${appFeedback.status} = 'pending' then 1 end) as int)`,
			totalAll: sql<number>`cast(count(${appFeedback.id}) as int)`,
			averageRating: sql<
				number | null
			>`avg(case when ${appFeedback.type} = 'review' and ${appFeedback.rating} is not null then ${appFeedback.rating} end)`
		})
		.from(appFeedback);

	const rawAvg = stats[0]?.averageRating != null ? Number(stats[0].averageRating) : 0;
	const averageRating = rawAvg > 0 ? Number(rawAvg.toFixed(1)) : 0;

	return {
		averageRating,
		totalReviews: Number(stats[0]?.totalReviews ?? 0),
		pendingCount: Number(stats[0]?.pendingCount ?? 0),
		totalFeedback: Number(stats[0]?.totalFeedback ?? 0),
		totalAll: Number(stats[0]?.totalAll ?? 0)
	};
}

/**
 * Updates the handling status of a feedback or review entry.
 */
export async function updateFeedbackStatus(
	d1: D1Database,
	id: string,
	status: 'pending' | 'reviewed' | 'resolved'
): Promise<AppFeedback | null> {
	const db = getDb(d1);
	const now = new Date();

	const updated = await db
		.update(appFeedback)
		.set({
			status,
			updatedAt: now
		})
		.where(eq(appFeedback.id, id))
		.returning();

	return updated[0] ?? null;
}

/**
 * Moderation: Deletes an entry (e.g. spam) from Cloudflare D1.
 */
export async function deleteFeedback(d1: D1Database, id: string): Promise<boolean> {
	const db = getDb(d1);
	const deleted = await db
		.delete(appFeedback)
		.where(eq(appFeedback.id, id))
		.returning({ id: appFeedback.id });

	return deleted.length > 0;
}
