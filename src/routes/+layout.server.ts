import type { LayoutServerLoad } from './$types.js';
import { getDb } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import type { Locale } from '#lib/i18n/index.js';

export const load: LayoutServerLoad = async ({ locals, platform, cookies }) => {
	const rawCookie = cookies?.get?.('takerin_lang');
	let language: Locale = rawCookie === 'en' ? 'en' : 'id';

	const d1 = platform?.env?.DB;
	if (locals?.user && d1) {
		try {
			const db = getDb(d1);
			const settings = await db
				.select({ language: schema.userSettings.language })
				.from(schema.userSettings)
				.where(eq(schema.userSettings.userId, locals.user.id))
				.limit(1);

			if (settings[0]?.language === 'id' || settings[0]?.language === 'en') {
				language = settings[0].language;
			}
		} catch {
			// fallback to cookie or 'id'
		}
	}

	return {
		user: locals.user ?? null,
		language
	};
};
