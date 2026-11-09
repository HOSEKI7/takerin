import { describe, it, expect } from 'vitest';
import { validateFeedbackInput } from './feedback.js';

describe('Feedback Input Validation (Seam 2)', () => {
	it('validates a valid review payload', () => {
		const result = validateFeedbackInput({
			type: 'review',
			rating: 5,
			content: 'Aplikasi yang sangat estetik dan fungsional.',
			currentRoute: '/dashboard',
			deviceInfo: 'Mozilla/5.0...'
		});

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.type).toBe('review');
			expect(result.data.rating).toBe(5);
			expect(result.data.category).toBeNull();
			expect(result.data.content).toBe('Aplikasi yang sangat estetik dan fungsional.');
			expect(result.data.currentRoute).toBe('/dashboard');
			expect(result.data.deviceInfo).toBe('Mozilla/5.0...');
		}
	});

	it('accepts string ratings that parse to valid integers between 1 and 5', () => {
		const result = validateFeedbackInput({
			type: 'review',
			rating: '4',
			content: 'Desainnya tenang dan rapi.'
		});

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.rating).toBe(4);
		}
	});

	it('rejects a review with missing, out-of-range, or non-integer rating', () => {
		const missing = validateFeedbackInput({
			type: 'review',
			content: 'Tanpa rating'
		});
		expect(missing.valid).toBe(false);
		expect(missing.error).toBeDefined();

		const zero = validateFeedbackInput({
			type: 'review',
			rating: 0,
			content: 'Rating nol'
		});
		expect(zero.valid).toBe(false);

		const six = validateFeedbackInput({
			type: 'review',
			rating: 6,
			content: 'Rating enam'
		});
		expect(six.valid).toBe(false);

		const decimal = validateFeedbackInput({
			type: 'review',
			rating: 4.5,
			content: 'Rating desimal'
		});
		expect(decimal.valid).toBe(false);

		const nan = validateFeedbackInput({
			type: 'review',
			rating: 'bintang lima',
			content: 'Rating bukan angka'
		});
		expect(nan.valid).toBe(false);
	});

	it('validates a valid feedback payload with allowed categories', () => {
		const categories = ['bug', 'feature', 'general'] as const;

		for (const cat of categories) {
			const result = validateFeedbackInput({
				type: 'feedback',
				category: cat,
				content: `Ini adalah deskripsi umpan balik untuk kategori ${cat}.`
			});

			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.data.type).toBe('feedback');
				expect(result.data.category).toBe(cat);
				expect(result.data.rating).toBeNull();
			}
		}
	});

	it('rejects feedback with missing or invalid category', () => {
		const missing = validateFeedbackInput({
			type: 'feedback',
			content: 'Tanpa kategori'
		});
		expect(missing.valid).toBe(false);

		const invalid = validateFeedbackInput({
			type: 'feedback',
			category: 'complaint',
			content: 'Kategori tidak valid'
		});
		expect(invalid.valid).toBe(false);
	});

	it('rejects null, non-object, or invalid type payloads', () => {
		expect(validateFeedbackInput(null).valid).toBe(false);
		expect(validateFeedbackInput(undefined).valid).toBe(false);
		expect(validateFeedbackInput('string').valid).toBe(false);
		expect(validateFeedbackInput({ type: 'unknown', content: 'test' }).valid).toBe(false);
	});

	it('rejects empty or whitespace-only content', () => {
		const empty = validateFeedbackInput({
			type: 'review',
			rating: 5,
			content: ''
		});
		expect(empty.valid).toBe(false);

		const whitespace = validateFeedbackInput({
			type: 'review',
			rating: 5,
			content: '   \n   \t  '
		});
		expect(whitespace.valid).toBe(false);
	});

	it('rejects content with fewer than 3 characters after trimming', () => {
		const short = validateFeedbackInput({
			type: 'review',
			rating: 5,
			content: ' ok '
		});
		expect(short.valid).toBe(false);
	});

	it('rejects content longer than 2000 characters', () => {
		const long = validateFeedbackInput({
			type: 'feedback',
			category: 'feature',
			content: 'a'.repeat(2001)
		});
		expect(long.valid).toBe(false);
	});

	it('trims content and sanitizes optional metadata fields', () => {
		const result = validateFeedbackInput({
			type: 'feedback',
			category: 'general',
			content: '   Pertanyaan mengenai backup data.   ',
			currentRoute: '   /settings   ',
			deviceInfo: '   Mac / Chrome   '
		});

		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.content).toBe('Pertanyaan mengenai backup data.');
			expect(result.data.currentRoute).toBe('/settings');
			expect(result.data.deviceInfo).toBe('Mac / Chrome');
		}
	});

	it('returns localized error messages for id and en locales', () => {
		const resId = validateFeedbackInput({ type: 'review', rating: 0, content: 'test' }, 'id');
		expect(resId.valid).toBe(false);
		expect(resId.error).toBe('Skor bintang ulasan harus berupa angka bulat 1 hingga 5.');

		const resEn = validateFeedbackInput({ type: 'review', rating: 0, content: 'test' }, 'en');
		expect(resEn.valid).toBe(false);
		expect(resEn.error).toBe('Star rating must be an integer between 1 and 5.');

		const missingCatId = validateFeedbackInput({ type: 'feedback', content: 'test' }, 'id');
		expect(missingCatId.valid).toBe(false);
		expect(missingCatId.error).toBe(
			'Kategori umpan balik wajib dipilih (kendala sistem, saran fitur, atau umum).'
		);

		const missingCatEn = validateFeedbackInput({ type: 'feedback', content: 'test' }, 'en');
		expect(missingCatEn.valid).toBe(false);
		expect(missingCatEn.error).toBe(
			'Feedback category is required (system bug, feature request, or general).'
		);

		const shortEn = validateFeedbackInput({ type: 'review', rating: 5, content: 'a' }, 'en');
		expect(shortEn.valid).toBe(false);
		expect(shortEn.error).toBe('Content must be at least 3 characters.');
	});
});
