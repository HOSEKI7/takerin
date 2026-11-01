import type { LayoutLoad } from './$types.js';
import { loadLocale, type Locale } from '#lib/i18n/index.js';

export const load: LayoutLoad = async ({ data }) => {
	const lang = (data?.language as Locale) || 'id';
	await loadLocale(lang);
	return data;
};
