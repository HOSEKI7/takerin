export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

interface SetThemeOptions {
	storage?: Storage;
	document?: Document;
	systemPrefersDark?: boolean;
}

export function getThemePreference(customStorage?: Storage): Theme {
	const storage =
		customStorage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
	if (!storage) return 'system';

	try {
		const saved = storage.getItem(THEME_STORAGE_KEY);
		if (saved === 'light' || saved === 'dark') {
			return saved;
		}
	} catch {
		// Ignore storage access errors
	}

	return 'system';
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
	if (theme === 'light') return 'light';
	if (theme === 'dark') return 'dark';
	return systemPrefersDark ? 'dark' : 'light';
}

export function toggleTheme(currentResolved: ResolvedTheme): ResolvedTheme {
	return currentResolved === 'dark' ? 'light' : 'dark';
}

export function setTheme(theme: Theme, options?: SetThemeOptions): ResolvedTheme {
	const storage =
		options?.storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
	const doc = options?.document ?? (typeof document !== 'undefined' ? document : undefined);

	const systemPrefersDark =
		options?.systemPrefersDark ??
		(typeof window !== 'undefined' && window.matchMedia
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false);

	const resolved = resolveTheme(theme, systemPrefersDark);

	if (storage) {
		try {
			if (theme === 'system') {
				storage.removeItem(THEME_STORAGE_KEY);
			} else {
				storage.setItem(THEME_STORAGE_KEY, theme);
			}
		} catch {
			// Ignore storage access errors
		}
	}

	if (doc?.documentElement) {
		if (resolved === 'dark') {
			doc.documentElement.classList.add('dark');
		} else {
			doc.documentElement.classList.remove('dark');
		}
		doc.documentElement.style.colorScheme = resolved;
	}

	return resolved;
}
