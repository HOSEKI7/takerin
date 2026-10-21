import { json, type RequestHandler } from '@sveltejs/kit';
import { getRuntimeEnv } from '#lib/server/env.js';
import { getCompletedPeriodDetail, savePeriodAiSummary } from '#lib/server/db/history.js';
import { generateAiSummary } from '#lib/server/ai/summary.js';

export const POST: RequestHandler = async ({ locals, platform, params }) => {
	if (!locals.user) {
		return json({ error: 'Tidak terotentikasi' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database tidak tersedia' }, { status: 500 });
	}

	const periodId = params.periodId;
	if (!periodId) {
		return json({ error: 'Parameter periodId tidak valid' }, { status: 400 });
	}

	const detail = await getCompletedPeriodDetail(platform.env.DB, locals.user.id, periodId);

	if (!detail) {
		return json({ error: 'Periode Bulan tidak ditemukan' }, { status: 404 });
	}

	// If already generated & cached, return immediately
	if (detail.period.aiSummary) {
		return json({
			aiSummary: detail.period.aiSummary,
			cached: true
		});
	}

	const groqApiKey = getRuntimeEnv('GROQ_API_KEY', platform?.env);
	const geminiApiKey = getRuntimeEnv('GEMINI_API_KEY', platform?.env);

	try {
		const aiSummary = await generateAiSummary(detail.aiAggregateData, {
			groqApiKey,
			geminiApiKey
		});

		await savePeriodAiSummary(platform.env.DB, periodId, locals.user.id, aiSummary);

		return json({
			aiSummary,
			cached: false
		});
	} catch (err) {
		console.error('[AI Summary Generation Error]:', err);
		return json({ error: 'Gagal membuat frasa analisis AI.' }, { status: 502 });
	}
};
