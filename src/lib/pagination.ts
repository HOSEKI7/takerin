export interface PaginationResult {
	page: number;
	totalPages: number;
	offset: number;
	limit: number;
	hasMore: boolean;
}

export interface PaginationOptions {
	pageParam?: string | number | null;
	totalCount: number;
	limit?: number;
}

/**
 * Calculates page number, total pages, offset, and hasMore for bounded pagination.
 * Clamps requested page between 1 and totalPages.
 */
export function calculatePagination(options: PaginationOptions): PaginationResult {
	const limit = Math.max(1, options.limit ?? 15);
	const totalCount = Math.max(0, options.totalCount);
	const totalPages = Math.max(1, Math.ceil(totalCount / limit));

	const rawPage =
		typeof options.pageParam === 'number'
			? options.pageParam
			: parseInt(options.pageParam ?? '1', 10);
	const requestedPage = Number.isFinite(rawPage) ? rawPage : 1;
	const page = Math.min(Math.max(1, requestedPage), totalPages);
	const offset = (page - 1) * limit;
	const hasMore = page < totalPages;

	return {
		page,
		totalPages,
		offset,
		limit,
		hasMore
	};
}
