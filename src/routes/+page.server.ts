import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { env } from 'cloudflare:workers';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform, locals }) => {
	let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
	const d1 = platform?.env?.DB ?? env?.DB;

	if (d1) {
		try {
			const db = getDb(d1);
			await db.run(sql`SELECT 1`);
			dbStatus = 'connected';
		} catch (error) {
			console.error('D1 connection error:', error);
			dbStatus = 'error';
		}
	}

	return {
		title: 'Takerin',
		message: 'Atur dan catat pengeluaran berdasarkan pemasukan.',
		dbStatus,
		user: locals.user ?? null
	};
};
