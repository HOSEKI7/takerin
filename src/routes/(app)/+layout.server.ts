import type { LayoutServerLoad } from './$types.js';
import { getIncomeSources } from '#lib/server/db/onboarding.js';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const d1 = platform?.env?.DB;
	let incomeSources: Array<{ id: string; name: string; amount: number }> = [];

	if (d1 && locals.user?.id) {
		try {
			const sources = await getIncomeSources(d1, locals.user.id);
			incomeSources = sources.map((s) => ({
				id: s.id,
				name: s.name,
				amount: s.amount
			}));
		} catch (err) {
			console.error('Error fetching income sources in app layout:', err);
		}
	}

	return {
		activePeriod: locals.activePeriod ?? null,
		incomeSources
	};
};
