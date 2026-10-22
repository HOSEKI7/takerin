export const DISMISS_STORAGE_KEY = 'takerin:pwa-install-dismissed';

export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
	prompt(): Promise<void>;
}

/**
 * Checks whether the app is currently launched in standalone display mode (installed PWA)
 */
export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;

	const isStandaloneMedia =
		window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
	const nav = (window.navigator || (typeof navigator !== 'undefined' ? navigator : {})) as {
		standalone?: boolean;
	};
	const isIOSStandalone = Boolean(nav?.standalone);

	return Boolean(isStandaloneMedia || isIOSStandalone);
}

/**
 * Checks if current device is running iOS (iPhone/iPad/iPod or iPadOS on MacIntel)
 */
export function isIOS(): boolean {
	if (typeof window === 'undefined') return false;

	const nav = (window.navigator || (typeof navigator !== 'undefined' ? navigator : undefined)) as
		| {
				userAgent?: string;
				platform?: string;
				maxTouchPoints?: number;
		  }
		| undefined;

	if (!nav) return false;

	const userAgent = nav.userAgent || '';
	const isDirectIOS = /iPad|iPhone|iPod/.test(userAgent);
	const isIPadOS = nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1;

	return isDirectIOS || isIPadOS;
}

/**
 * Checks if user previously dismissed the install prompt
 */
export function isInstallPromptDismissed(): boolean {
	if (typeof window === 'undefined') return false;

	try {
		return window.localStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/**
 * Records that the user dismissed the install banner
 */
export function dismissInstallPrompt(): void {
	if (typeof window === 'undefined') return;

	try {
		window.localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
	} catch {
		// Ignore storage quota/permission errors
	}
}

/**
 * Resets dismissal status so install prompt can appear again
 */
export function resetInstallPromptDismissal(): void {
	if (typeof window === 'undefined') return;

	try {
		window.localStorage.removeItem(DISMISS_STORAGE_KEY);
	} catch {
		// Ignore storage quota/permission errors
	}
}
