import type { LayoutServerLoad } from './$types.js';
import { getIncomeSources } from '#lib/server/db/onboarding.js';
import { confirmIncomeAction } from '#lib/server/actions/confirm-income.js';
import { hasUserSubmittedFeedback } from '#lib/server/db/feedback.js';
import { countExpenses } from '#lib/server/db/expense.js';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const d1 = platform?.env?.DB;
	let incomeSources: Array<{ id: string; name: string; amount: number }> = [];
	let shouldPromptFeedback = false;
	let hasSubmittedFeedback = false;

	if (d1 && locals.user?.id) {
		try {
			const sources = await getIncomeSources(d1, locals.user.id, locals.activePeriod?.id);
			incomeSources = sources.map((s) => ({
				id: s.id,
				name: s.name,
				amount: s.amount
			}));
		} catch (err) {
			console.error('Error fetching income sources in app layout:', err);
		}

		if (locals.activePeriod?.id) {
			try {
				hasSubmittedFeedback = await hasUserSubmittedFeedback(d1, locals.user.id);
				if (!hasSubmittedFeedback) {
					const expenseCount = await countExpenses(d1, {
						userId: locals.user.id,
						periodId: locals.activePeriod.id
					});
					shouldPromptFeedback = expenseCount >= 5;
				}
			} catch (err) {
				console.error('Error evaluating feedback trigger in app layout:', err);
			}
		}
	}

	return {
		activePeriod: locals.activePeriod ?? null,
		incomeConfirmedAt: locals.activePeriod?.incomeConfirmedAt ?? null,
		incomeSources,
		shouldPromptFeedback,
		hasSubmittedFeedback
	};
};

/**
 * Monthly income confirmation action handler.
 * Named with leading underscore to conform with SvelteKit's layout server exports rules.
 */
export const _confirmIncome = confirmIncomeAction;
