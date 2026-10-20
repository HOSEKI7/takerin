import type { PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { env } from 'cloudflare:workers';
import { sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';

	if (env?.DB) {
		try {
			const db = getDb(env.DB);
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
		dbStatus
	};
};
