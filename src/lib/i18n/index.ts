import i18n from 'sveltekit-i18n';

export const SUPPORTED_LOCALES = ['id', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LANGUAGE_STORAGE_KEY = 'takerin_lang';
export const LANGUAGE_COOKIE_KEY = 'takerin_lang';

export const i18nInstance = new i18n({
	loaders: [
		{
			locale: 'id',
			namespace: '',
			loader: async () => (await import('./id.json')).default
		},
		{
			locale: 'en',
			namespace: '',
			loader: async () => (await import('./en.json')).default
		}
	]
});

let currentLocale: Locale = 'id';

export function getLocale(): Locale {
	return (i18nInstance.locale as Locale) || currentLocale;
}

export async function loadLocale(locale: Locale): Promise<void> {
	if (!SUPPORTED_LOCALES.includes(locale)) return;
	await i18nInstance.loadTranslations(locale);
}

export function setLocale(locale: Locale): Promise<void> {
	if (!SUPPORTED_LOCALES.includes(locale)) return Promise.resolve();
	currentLocale = locale;

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

	return i18nInstance.loadTranslations(locale);
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

	currentLocale = selected;
	void setLocale(selected);
	return selected;
}

export function t(key: string, params?: Record<string, unknown>): string {
	return i18nInstance.t(key, params) || key;
}

// In test environment (Node/Vitest), eagerly preload default locale for headless component tests
if (
	typeof window === 'undefined' &&
	typeof process !== 'undefined' &&
	process.env?.NODE_ENV === 'test'
) {
	void loadLocale('id');
}
