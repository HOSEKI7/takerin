import { describe, it, expect } from 'vitest';
import { isPeriodExpired, calculateCurrentPeriodDates } from './period.js';

describe('Period Date & Lifecycle Calculations', () => {
	describe('isPeriodExpired', () => {
		it('returns false when today is before or on endDate', () => {
			const endDate = '2026-10-24';
			expect(isPeriodExpired(endDate, new Date('2026-10-20'))).toBe(false);
			expect(isPeriodExpired(endDate, new Date('2026-10-24'))).toBe(false);
		});

		it('returns true when today is strictly after endDate', () => {
			const endDate = '2026-10-24';
			expect(isPeriodExpired(endDate, new Date('2026-10-25'))).toBe(true);
			expect(isPeriodExpired(endDate, new Date('2026-11-01'))).toBe(true);
		});
	});

	describe('calculateCurrentPeriodDates', () => {
		it('calculates current period when today is before payDay in the month', () => {
			// Today is Oct 21, payDay is 25 -> cycle started in Sept 25, ends Oct 24
			const today = new Date('2026-10-21');
			const payDay = 25;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-09-25');
			expect(endDate).toBe('2026-10-24');
		});

		it('calculates current period when today is exactly on payDay', () => {
			// Today is Oct 25, payDay is 25 -> cycle started Oct 25, ends Nov 24
			const today = new Date('2026-10-25');
			const payDay = 25;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-10-25');
			expect(endDate).toBe('2026-11-24');
		});

		it('calculates current period when today is after payDay in the month', () => {
			// Today is Oct 28, payDay is 25 -> cycle started Oct 25, ends Nov 24
			const today = new Date('2026-10-28');
			const payDay = 25;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-10-25');
			expect(endDate).toBe('2026-11-24');
		});

		it('handles payDay fallback when month has 30 days and payDay is 31', () => {
			// Today is May 15, payDay is 31.
			// Current cycle started in April (30 days) -> clamped to 2026-04-30
			// Next payDay in May (31 days) -> 2026-05-31 -> ends 1 day before -> 2026-05-30
			const today = new Date('2026-05-15');
			const payDay = 31;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-04-30');
			expect(endDate).toBe('2026-05-30');
		});

		it('handles payDay fallback when previous month is February (28 days)', () => {
			// 2026 is non-leap year (Feb has 28 days).
			// Today is March 5, payDay is 31.
			// Previous month is Feb -> clamped to 2026-02-28
			// Next payDay is March 31 -> ends 1 day before -> 2026-03-30
			const today = new Date('2026-03-05');
			const payDay = 31;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-02-28');
			expect(endDate).toBe('2026-03-30');
		});

		it('handles payDay fallback when previous month is February in a leap year (29 days)', () => {
			// 2024 is a leap year (Feb has 29 days).
			// Today is March 5, 2024, payDay is 31.
			const today = new Date('2024-03-05');
			const payDay = 31;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2024-02-29');
			expect(endDate).toBe('2024-03-30');
		});

		it('handles year rollover when today is in January before payDay', () => {
			// Today is Jan 10, 2026, payDay is 25.
			// Started in Dec 2025 -> 2025-12-25
			// Ends 1 day before Jan 25, 2026 -> 2026-01-24
			const today = new Date('2026-01-10');
			const payDay = 25;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2025-12-25');
			expect(endDate).toBe('2026-01-24');
		});

		it('handles year rollover when today is in December on/after payDay', () => {
			// Today is Dec 25, 2026, payDay is 25.
			// Started Dec 25, 2026 -> 2026-12-25
			// Ends 1 day before Jan 25, 2027 -> 2027-01-24
			const today = new Date('2026-12-25');
			const payDay = 25;
			const { startDate, endDate } = calculateCurrentPeriodDates(today, payDay);

			expect(startDate).toBe('2026-12-25');
			expect(endDate).toBe('2027-01-24');
		});
	});
});
