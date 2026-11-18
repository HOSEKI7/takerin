let lockCount = 0;
let originalOverflow = '';

/**
 * Locks the document body scrolling using reference counting.
 * Safe for overlapping, nested, or rapid sequential modal/drawer transitions.
 */
export function lockScroll(): void {
	if (typeof document === 'undefined') return;

	if (lockCount === 0) {
		originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
	lockCount++;
}

/**
 * Decrements the scroll lock counter and restores the original body overflow
 * only when all locks have been released.
 */
export function unlockScroll(): void {
	if (typeof document === 'undefined') return;

	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) {
		document.body.style.overflow = originalOverflow;
		originalOverflow = '';
	}
}

/**
 * Returns current lock count (useful for debugging and testing).
 */
export function getLockCount(): number {
	return lockCount;
}

/**
 * Resets lock state and clears document.body.style.overflow.
 * Intended strictly for test teardowns or emergency resets.
 */
export function _resetScrollLockForTesting(): void {
	lockCount = 0;
	originalOverflow = '';
	if (typeof document !== 'undefined') {
		document.body.style.overflow = '';
	}
}
