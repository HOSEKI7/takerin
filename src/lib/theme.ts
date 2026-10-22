export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

export function getThemePreference(): Theme {
	if (typeof window === 'undefined') return 'system';
	try {
		const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
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

export function setTheme(theme: Theme): ResolvedTheme {
	const systemPrefersDark =
		typeof window !== 'undefined' && window.matchMedia
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false;

	const resolved = resolveTheme(theme, systemPrefersDark);

	if (typeof window !== 'undefined') {
		try {
			if (theme === 'system') {
				window.localStorage.removeItem(THEME_STORAGE_KEY);
			} else {
				window.localStorage.setItem(THEME_STORAGE_KEY, theme);
			}
		} catch {
			// Ignore storage access errors
		}
	}

	if (typeof document !== 'undefined' && document.documentElement) {
		if (resolved === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
		document.documentElement.style.colorScheme = resolved;
		if (typeof window.dispatchEvent === 'function') {
			try {
				window.dispatchEvent(
					new CustomEvent('takerin:themechange', { detail: { theme: resolved } })
				);
			} catch {
				// Ignore event dispatch errors in mock environments
			}
		}
	}

	return resolved;
}
