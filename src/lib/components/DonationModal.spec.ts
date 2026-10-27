import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import DonationModal from './DonationModal.svelte';

describe('DonationModal Component', () => {
	it('exports DonationModal component', () => {
		expect(DonationModal).toBeDefined();
	});

	it('does not render modal contents when isOpen is false', () => {
		const { html } = render(DonationModal, {
			props: { isOpen: false }
		});
		expect(html).not.toContain('role="dialog"');
		expect(html).not.toContain('QRIS-Gopay.webp');
	});

	it('renders accessible modal dialog with QRIS image and external buttons when isOpen is true', () => {
		const { html } = render(DonationModal, {
			props: { isOpen: true }
		});

		// Accessible dialog landmarks
		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-labelledby="donation-modal-title"');

		// QRIS Image with contrast wrapper
		expect(html).toContain('donate/QRIS-Gopay.webp');

		// Sociabuzz donation link
		expect(html).toContain('https://sociabuzz.com/hoseki/tribe');
		expect(html).toContain('Donasi via Sociabuzz');
	});

	it('supports custom donation platforms', () => {
		const customPlatforms = [
			{
				id: 'trakteer',
				name: 'Trakteer',
				href: 'https://trakteer.id/takerin',
				label: 'Dukung via Trakteer'
			}
		];

		const { html } = render(DonationModal, {
			props: {
				isOpen: true,
				donationPlatforms: customPlatforms
			}
		});

		expect(html).toContain('https://trakteer.id/takerin');
		expect(html).toContain('Dukung via Trakteer');
	});
});
