import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SupportMascot from './SupportMascot.svelte';

describe('SupportMascot Component', () => {
	it('exports SupportMascot component', () => {
		expect(SupportMascot).toBeDefined();
	});

	it('renders floating mascot container with accessible aside landmark and dismiss button', () => {
		const { html } = render(SupportMascot);

		// Semantic aside container with accessible Indonesian label
		expect(html).toContain('<aside');
		expect(html).toContain('aria-label="Dukungan Pengembang Takerin"');

		// Small dismiss button ('x')
		expect(html).toContain('aria-label="Tutup maskot dukungan"');

		// Interactive mascot trigger button
		expect(html).toContain('aria-label="Buka popup donasi sukarela untuk pengembang"');
		expect(html).toContain('aria-haspopup="dialog"');
		expect(html).toContain('aria-expanded="false"');

		// Default SSR idle mascot image
		expect(html).toContain('mascot/mascot-idle1.webp');
		expect(html).toContain('alt="Maskot Dukungan Pengembang"');
	});

	it('renders speech bubble tooltip with friendly support copy', () => {
		const { html } = render(SupportMascot);

		expect(html).toContain('role="tooltip"');
		expect(html).toContain('Traktir kopi developer ☕');
	});

	it('supports custom donation platforms and class overrides', () => {
		const customPlatforms = [
			{
				id: 'custom-platform',
				name: 'Custom Donasi',
				href: 'https://example.com/donate',
				label: 'Donasi Khusus'
			}
		];

		const { html } = render(SupportMascot, {
			props: {
				class: 'custom-floating-class',
				donationPlatforms: customPlatforms
			}
		});

		expect(html).toContain('custom-floating-class');
	});

	it('contains high-contrast styling tokens harmonized with Takerin theme', () => {
		const { html } = render(SupportMascot);

		// Verified Wise/Takerin color token usage
		expect(html).toContain('bg-forest-ink');
		expect(html).toContain('text-lime-voltage');
	});
});
