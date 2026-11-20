import { describe, it, expect } from 'vitest';
import { calculatePagination } from './pagination.js';

describe('calculatePagination utility', () => {
	it('calculates page 1 with defaults when pageParam is null or undefined', () => {
		const res = calculatePagination({ totalCount: 35 });
		expect(res.page).toBe(1);
		expect(res.totalPages).toBe(3);
		expect(res.offset).toBe(0);
		expect(res.limit).toBe(15);
		expect(res.hasMore).toBe(true);
	});

	it('computes offset and page for valid pageParam', () => {
		const res = calculatePagination({ pageParam: '2', totalCount: 35, limit: 15 });
		expect(res.page).toBe(2);
		expect(res.totalPages).toBe(3);
		expect(res.offset).toBe(15);
		expect(res.hasMore).toBe(true);
	});

	it('clamps page to 1 when pageParam is negative or non-numeric', () => {
		const resNegative = calculatePagination({ pageParam: '-5', totalCount: 20 });
		expect(resNegative.page).toBe(1);
		expect(resNegative.offset).toBe(0);

		const resInvalid = calculatePagination({ pageParam: 'invalid', totalCount: 20 });
		expect(resInvalid.page).toBe(1);
		expect(resInvalid.offset).toBe(0);
	});

	it('clamps page to totalPages when pageParam exceeds totalPages', () => {
		const res = calculatePagination({ pageParam: '10', totalCount: 30, limit: 15 });
		expect(res.page).toBe(2);
		expect(res.totalPages).toBe(2);
		expect(res.offset).toBe(15);
		expect(res.hasMore).toBe(false);
	});

	it('handles zero totalCount gracefully with totalPages 1', () => {
		const res = calculatePagination({ totalCount: 0 });
		expect(res.page).toBe(1);
		expect(res.totalPages).toBe(1);
		expect(res.offset).toBe(0);
		expect(res.hasMore).toBe(false);
	});
});
