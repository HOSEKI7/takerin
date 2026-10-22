import i18n from 'sveltekit-i18n';
import idTranslations from './id.json';
import enTranslations from './en.json';

export const SUPPORTED_LOCALES = ['id', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LANGUAGE_STORAGE_KEY = 'takerin_lang';
export const LANGUAGE_COOKIE_KEY = 'takerin_lang';

export const i18nInstance = new i18n({
	translations: {
		id: idTranslations,
		en: enTranslations
	},
	fallbackLocale: 'id',
	initLocale: 'id'
});

let currentLocale: Locale = 'id';

export function getLocale(): Locale {
	return (i18nInstance.locale as Locale) || currentLocale;
}

export function setLocale(locale: Locale): void {
	if (!SUPPORTED_LOCALES.includes(locale)) return;
	currentLocale = locale;
	void i18nInstance.setLocale(locale);

	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
			document.cookie = `${LANGUAGE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
		} catch {
			// ignore storage access errors
		}

		if (typeof window.dispatchEvent === 'function') {
			try {
				window.dispatchEvent(new CustomEvent('takerin:langchange', { detail: { locale } }));
			} catch {
				// ignore
			}
		}
	}
}

export function initI18n(initialLocale?: string): Locale {
	let selected: Locale = 'id';

	if (initialLocale && SUPPORTED_LOCALES.includes(initialLocale as Locale)) {
		selected = initialLocale as Locale;
	} else if (typeof window !== 'undefined') {
		try {
			const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
			if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
				selected = saved as Locale;
			}
		} catch {
			// ignore
		}
	}

	setLocale(selected);
	return selected;
}

export function t(key: string, params?: Record<string, unknown>): string {
	return i18nInstance.t(key, params);
}
