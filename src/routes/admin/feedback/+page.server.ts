import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import {
	getAllFeedbackForAdmin,
	getFeedbackMetrics,
	updateFeedbackStatus,
	deleteFeedback,
	type AdminFeedbackRecord,
	type AdminFeedbackMetrics
} from '#lib/server/db/feedback.js';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (locals.user.role !== 'admin') {
		throw redirect(303, '/dashboard');
	}

	let feedbackList: AdminFeedbackRecord[] = [];
	let metrics: AdminFeedbackMetrics = {
		averageRating: 0,
		totalReviews: 0,
		pendingCount: 0,
		totalFeedback: 0,
		totalAll: 0
	};

	if (platform?.env?.DB) {
		try {
			const [feedbackData, metricsData] = await Promise.all([
				getAllFeedbackForAdmin(platform.env.DB),
				getFeedbackMetrics(platform.env.DB)
			]);
			feedbackList = feedbackData;
			metrics = metricsData;
		} catch (err) {
			console.error('Error fetching admin feedback data:', err);
		}
	}

	return {
		feedbackList,
		metrics
	};
};

export const actions: Actions = {
	updateStatus: async ({ request, locals, platform }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Akses ditolak. Hanya administrator yang diizinkan.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const status = String(formData.get('status') || '').trim();

		if (!id) {
			return fail(400, { error: 'ID entri wajib diisi.' });
		}

		if (status !== 'pending' && status !== 'reviewed' && status !== 'resolved') {
			return fail(400, { error: 'Status tidak valid.' });
		}

		try {
			const updated = await updateFeedbackStatus(platform.env.DB, id, status);
			if (!updated) {
				return fail(404, { error: 'Entri tidak ditemukan.' });
			}
			return { success: true, action: 'updateStatus', message: 'Status berhasil diperbarui.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal memperbarui status.';
			return fail(400, { error: msg });
		}
	},

	deleteFeedback: async ({ request, locals, platform }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Akses ditolak. Hanya administrator yang diizinkan.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database tidak tersedia.' });
		}

		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { error: 'ID entri wajib diisi.' });
		}

		try {
			const deleted = await deleteFeedback(platform.env.DB, id);
			if (!deleted) {
				return fail(404, { error: 'Entri tidak ditemukan atau sudah dihapus.' });
			}
			return { success: true, action: 'deleteFeedback', message: 'Entri berhasil dihapus.' };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Gagal menghapus entri.';
			return fail(400, { error: msg });
		}
	}
};
