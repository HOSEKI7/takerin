export type FeedbackType = 'review' | 'feedback';
export type FeedbackCategory = 'bug' | 'feature' | 'general';

export interface ValidatedFeedbackData {
	type: FeedbackType;
	rating: number | null;
	category: FeedbackCategory | null;
	content: string;
	currentRoute?: string | null;
	deviceInfo?: string | null;
}

export type FeedbackValidationResult =
	| { valid: true; data: ValidatedFeedbackData; error?: undefined }
	| { valid: false; data?: undefined; error: string };

const ALLOWED_CATEGORIES: ReadonlySet<string> = new Set(['bug', 'feature', 'general']);

/**
 * Validates review and feedback submissions according to domain rules.
 */
export function validateFeedbackInput(
	input: unknown,
	locale: 'id' | 'en' = 'id'
): FeedbackValidationResult {
	if (!input || typeof input !== 'object') {
		return {
			valid: false,
			error: locale === 'en' ? 'Invalid input data.' : 'Data masukan tidak valid.'
		};
	}

	const raw = input as Record<string, unknown>;

	// Validate type
	if (raw.type !== 'review' && raw.type !== 'feedback') {
		return {
			valid: false,
			error:
				locale === 'en'
					? 'Form type must be "review" or "feedback".'
					: 'Tipe formulir harus berupa "review" atau "feedback".'
		};
	}

	const type = raw.type as FeedbackType;

	// Validate content
	if (typeof raw.content !== 'string') {
		return {
			valid: false,
			error: locale === 'en' ? 'Content is required.' : 'Deskripsi masukan wajib diisi.'
		};
	}

	const content = raw.content.trim();
	if (content.length === 0) {
		return {
			valid: false,
			error: locale === 'en' ? 'Content cannot be empty.' : 'Deskripsi masukan tidak boleh kosong.'
		};
	}
	if (content.length < 3) {
		return {
			valid: false,
			error:
				locale === 'en'
					? 'Content must be at least 3 characters.'
					: 'Deskripsi masukan minimal 3 karakter.'
		};
	}
	if (content.length > 2000) {
		return {
			valid: false,
			error:
				locale === 'en'
					? 'Content cannot exceed 2000 characters.'
					: 'Deskripsi masukan maksimal 2000 karakter.'
		};
	}

	let rating: number | null = null;
	let category: FeedbackCategory | null = null;

	if (type === 'review') {
		// Rating is required (integer 1..5)
		if (raw.rating === undefined || raw.rating === null || raw.rating === '') {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Star rating is required for review (1–5).'
						: 'Skor bintang ulasan wajib dipilih (1–5).'
			};
		}

		const parsedRating = typeof raw.rating === 'number' ? raw.rating : Number(raw.rating);
		if (
			!Number.isInteger(parsedRating) ||
			parsedRating < 1 ||
			parsedRating > 5 ||
			Number.isNaN(parsedRating)
		) {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Star rating must be an integer between 1 and 5.'
						: 'Skor bintang ulasan harus berupa angka bulat 1 hingga 5.'
			};
		}
		rating = parsedRating;
	} else {
		// Feedback: Category is required
		if (typeof raw.category !== 'string' || !ALLOWED_CATEGORIES.has(raw.category)) {
			return {
				valid: false,
				error:
					locale === 'en'
						? 'Feedback category is required (system bug, feature request, or general).'
						: 'Kategori umpan balik wajib dipilih (kendala sistem, saran fitur, atau umum).'
			};
		}
		category = raw.category as FeedbackCategory;
	}

	// Optional metadata fields
	let currentRoute: string | null = null;
	if (typeof raw.currentRoute === 'string') {
		const trimmedRoute = raw.currentRoute.trim();
		if (trimmedRoute.length > 0) {
			currentRoute = trimmedRoute.slice(0, 255);
		}
	}

	let deviceInfo: string | null = null;
	if (typeof raw.deviceInfo === 'string') {
		const trimmedDevice = raw.deviceInfo.trim();
		if (trimmedDevice.length > 0) {
			deviceInfo = trimmedDevice.slice(0, 1000);
		}
	}

	return {
		valid: true,
		data: {
			type,
			rating,
			category,
			content,
			currentRoute,
			deviceInfo
		}
	};
}
