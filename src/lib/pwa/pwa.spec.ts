import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isStandalone,
	isIOS,
	isInstallPromptDismissed,
	dismissInstallPrompt,
	resetInstallPromptDismissal,
	DISMISS_STORAGE_KEY
} from './index.js';

describe('PWA Utility Functions', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isStandalone', () => {
		it('returns false when window is undefined (SSR)', () => {
			expect(isStandalone()).toBe(false);
		});

		it('returns true when display-mode is standalone via matchMedia', () => {
			vi.stubGlobal('window', {
				matchMedia: (query: string) => ({
					matches: query.includes('display-mode: standalone')
				}),
				navigator: {}
			});

			expect(isStandalone()).toBe(true);
		});

		it('returns true when navigator.standalone is true (iOS Safari standalone)', () => {
			vi.stubGlobal('window', {
				matchMedia: () => ({ matches: false }),
				navigator: { standalone: true }
			});

			expect(isStandalone()).toBe(true);
		});

		it('returns false in normal browser tab', () => {
			vi.stubGlobal('window', {
				matchMedia: () => ({ matches: false }),
				navigator: { standalone: false }
			});

			expect(isStandalone()).toBe(false);
		});
	});

	describe('isIOS', () => {
		it('returns false when window is undefined (SSR)', () => {
			expect(isIOS()).toBe(false);
		});

		it('returns true for iPhone userAgent', () => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
				maxTouchPoints: 5
			});

			expect(isIOS()).toBe(true);
		});

		it('returns true for iPad userAgent or iPadOS on MacIntel with touch points', () => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
				platform: 'MacIntel',
				maxTouchPoints: 5
			});

			expect(isIOS()).toBe(true);
		});

		it('returns false for Android userAgent', () => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
				platform: 'Linux armv8l',
				maxTouchPoints: 5
			});

			expect(isIOS()).toBe(false);
		});

		it('returns false for Desktop macOS (zero touch points)', () => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
				platform: 'MacIntel',
				maxTouchPoints: 0
			});

			expect(isIOS()).toBe(false);
		});
	});

	describe('Dismissal Tracking', () => {
		it('reads and writes dismissal flag in localStorage', () => {
			const storage = new Map<string, string>();
			vi.stubGlobal('window', {
				localStorage: {
					getItem: (key: string) => storage.get(key) ?? null,
					setItem: (key: string, val: string) => storage.set(key, val),
					removeItem: (key: string) => storage.delete(key)
				}
			});

			expect(isInstallPromptDismissed()).toBe(false);
			dismissInstallPrompt();
			expect(isInstallPromptDismissed()).toBe(true);
			expect(storage.get(DISMISS_STORAGE_KEY)).toBe('true');

			resetInstallPromptDismissal();
			expect(isInstallPromptDismissed()).toBe(false);
			expect(storage.has(DISMISS_STORAGE_KEY)).toBe(false);
		});

		it('handles storage errors gracefully', () => {
			vi.stubGlobal('window', {
				localStorage: {
					getItem: () => {
						throw new Error('Access denied');
					},
					setItem: () => {
						throw new Error('Access denied');
					},
					removeItem: () => {
						throw new Error('Access denied');
					}
				}
			});

			expect(isInstallPromptDismissed()).toBe(false);
			expect(() => dismissInstallPrompt()).not.toThrow();
			expect(() => resetInstallPromptDismissal()).not.toThrow();
		});
	});
});
