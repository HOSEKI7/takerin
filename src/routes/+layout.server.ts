import type { LayoutServerLoad } from './$types.js';
import { getDb } from '#lib/server/db/index.js';
import * as schema from '#lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { LANGUAGE_COOKIE_KEY, type Locale } from '#lib/i18n/index.js';

export const load: LayoutServerLoad = async ({ locals, platform, cookies }) => {
	const rawCookie = cookies?.get?.(LANGUAGE_COOKIE_KEY);
	if (rawCookie === 'id' || rawCookie === 'en') {
		return {
			user: locals?.user ?? null,
			language: rawCookie as Locale
		};
	}

	let language: Locale = 'id';
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
				language = settings[0].language as Locale;
				cookies?.set?.(LANGUAGE_COOKIE_KEY, language, {
					path: '/',
					maxAge: 60 * 60 * 24 * 365,
					sameSite: 'lax',
					httpOnly: false
				});
			}
		} catch {
			// fallback to cookie or default 'id'
		}
	}

	return {
		user: locals?.user ?? null,
		language
	};
};
