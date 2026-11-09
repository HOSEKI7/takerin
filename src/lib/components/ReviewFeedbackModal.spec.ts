import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'svelte/server';
import ReviewFeedbackModal from './ReviewFeedbackModal.svelte';
import { setLocale } from '#lib/i18n/index.js';

describe('ReviewFeedbackModal Component (Seam 3)', () => {
	beforeEach(async () => {
		await setLocale('id');
	});

	afterEach(async () => {
		await setLocale('id');
	});

	it('exports ReviewFeedbackModal component', () => {
		expect(ReviewFeedbackModal).toBeDefined();
	});

	it('does not render dialog contents when isOpen is false', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: false }
		});
		expect(html).not.toContain('role="dialog"');
		expect(html).not.toContain('feedback-modal-title');
	});

	it('renders accessible dialog with correct ARIA attributes when isOpen is true', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: true }
		});

		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-labelledby="feedback-modal-title"');
		expect(html).toContain('aria-describedby="feedback-modal-subtitle"');
		expect(html).toContain('id="feedback-modal-title"');
		expect(html).toContain('id="feedback-modal-subtitle"');
	});

	it('renders Segmented Control tabs with role="tablist" and role="tab"', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: true }
		});

		expect(html).toContain('role="tablist"');
		expect(html).toContain('role="tab"');
		expect(html).toContain('id="tab-review"');
		expect(html).toContain('id="tab-feedback"');
	});

	it('defaults to Review mode with star rating selectors and review textarea', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: true }
		});

		// Review tab active
		expect(html).toContain('id="panel-review"');
		expect(html).toContain('role="tabpanel"');
		expect(html).toContain('role="radiogroup"');
		// 5 star buttons with role="radio"
		expect(html).toContain('name="rating"');
		expect(html).toContain('name="type"');
		expect(html).toContain('value="review"');
		expect(html).toContain('Kirim Ulasan');
	});

	it('renders Feedback mode when initialType is "feedback"', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: true, initialType: 'feedback' }
		});

		expect(html).toContain('id="panel-feedback"');
		expect(html).toContain('value="feedback"');
		expect(html).toContain('Kendala Sistem');
		expect(html).toContain('Saran Fitur');
		expect(html).toContain('Umum');
		expect(html).toContain('Kirim Umpan Balik');
	});

	it('renders hidden inputs for context route and device info', () => {
		const { html } = render(ReviewFeedbackModal, {
			props: {
				isOpen: true,
				currentRoute: '/settings',
				deviceInfo: 'TestBrowser'
			}
		});

		expect(html).toContain('name="currentRoute"');
		expect(html).toContain('value="/settings"');
		expect(html).toContain('name="deviceInfo"');
		expect(html).toContain('value="TestBrowser"');
	});

	it('supports bilingual rendering in English when locale is set to "en"', async () => {
		await setLocale('en');

		const { html } = render(ReviewFeedbackModal, {
			props: { isOpen: true }
		});

		expect(html).toContain('Give Review &amp; Feedback');
		expect(html).toContain('Submit Review');
		expect(html).toContain('Experience Rating');
	});
});
