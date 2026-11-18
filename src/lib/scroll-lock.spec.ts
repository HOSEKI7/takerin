import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	lockScroll,
	unlockScroll,
	getLockCount,
	_resetScrollLockForTesting
} from './scroll-lock.js';

describe('Reference-Counted Scroll Lock Manager', () => {
	let originalDocument: unknown;

	beforeEach(() => {
		originalDocument = globalThis.document;
		// Create a realistic minimal document mock for testing environment
		(globalThis as unknown as { document: { body: { style: { overflow: string } } } }).document = {
			body: {
				style: {
					overflow: ''
				}
			}
		};
		_resetScrollLockForTesting();
	});

	afterEach(() => {
		_resetScrollLockForTesting();
		if (originalDocument === undefined) {
			// @ts-expect-error cleanup mock
			delete globalThis.document;
		} else {
			// @ts-expect-error restore original document
			globalThis.document = originalDocument;
		}
	});

	it('locks scroll and sets body overflow to hidden on first lock', () => {
		expect(getLockCount()).toBe(0);
		expect(document.body.style.overflow).toBe('');

		lockScroll();

		expect(getLockCount()).toBe(1);
		expect(document.body.style.overflow).toBe('hidden');
	});

	it('restores previous body overflow when unlocked', () => {
		document.body.style.overflow = '';
		lockScroll();
		expect(document.body.style.overflow).toBe('hidden');

		unlockScroll();

		expect(getLockCount()).toBe(0);
		expect(document.body.style.overflow).toBe('');
	});

	it('preserves existing non-empty overflow value when unlocked', () => {
		document.body.style.overflow = 'auto';
		lockScroll();
		expect(document.body.style.overflow).toBe('hidden');

		unlockScroll();

		expect(getLockCount()).toBe(0);
		expect(document.body.style.overflow).toBe('auto');
	});

	it('handles overlapping / nested locks correctly without leaving body locked', () => {
		// Scenario: Drawer opens (Lock #1)
		lockScroll();
		expect(getLockCount()).toBe(1);
		expect(document.body.style.overflow).toBe('hidden');

		// While drawer is open, user clicks "Traktir Kopi" -> DonationModal opens (Lock #2)
		lockScroll();
		expect(getLockCount()).toBe(2);
		expect(document.body.style.overflow).toBe('hidden');

		// Drawer closes (Unlock #1)
		unlockScroll();
		expect(getLockCount()).toBe(1);
		// Still locked because DonationModal is still open!
		expect(document.body.style.overflow).toBe('hidden');

		// User closes DonationModal (Unlock #2)
		unlockScroll();
		expect(getLockCount()).toBe(0);
		// Now fully restored to empty!
		expect(document.body.style.overflow).toBe('');
	});

	it('does not allow lock count to go below 0 on excess unlocks', () => {
		expect(getLockCount()).toBe(0);
		unlockScroll();
		unlockScroll();
		expect(getLockCount()).toBe(0);

		// Locking again after excess unlock still works normally
		lockScroll();
		expect(getLockCount()).toBe(1);
		expect(document.body.style.overflow).toBe('hidden');

		unlockScroll();
		expect(getLockCount()).toBe(0);
		expect(document.body.style.overflow).toBe('');
	});

	it('safely no-ops in SSR environments where document is undefined', () => {
		// @ts-expect-error simulate SSR
		delete globalThis.document;

		expect(() => lockScroll()).not.toThrow();
		expect(() => unlockScroll()).not.toThrow();
	});
});
