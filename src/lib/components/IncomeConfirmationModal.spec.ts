import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'svelte/server';
import IncomeConfirmationModal from './IncomeConfirmationModal.svelte';
import { setLocale } from '#lib/i18n/index.js';

describe('IncomeConfirmationModal Component (Seam 3)', () => {
	const mockSources = [
		{ id: 'src-1', name: 'Gaji Pokok', amount: 10000000 },
		{ id: 'src-2', name: 'Freelance Design', amount: 5000000 }
	];

	beforeEach(async () => {
		await setLocale('id');
	});

	afterEach(async () => {
		await setLocale('id');
	});

	it('exports IncomeConfirmationModal component', () => {
		expect(IncomeConfirmationModal).toBeDefined();
	});

	it('does not render modal dialog contents when isOpen is false', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: false, initialSources: mockSources }
		});
		expect(html).not.toContain('role="alertdialog"');
		expect(html).not.toContain('Selamat Hari Gajian!');
	});

	it('renders accessible alertdialog with correct ARIA attributes when isOpen is true', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		expect(html).toContain('role="alertdialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('aria-labelledby="income-confirmation-title"');
		expect(html).toContain('aria-describedby="income-confirmation-desc"');
		expect(html).toContain('id="income-confirmation-title"');
		expect(html).toContain('id="income-confirmation-desc"');
	});

	it('displays friendly celebratory payday greeting and explanatory subtitle in Indonesian', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		expect(html).toContain('Selamat Hari Gajian! 🎉');
		expect(html).toContain('Periode Bulan Baru');
		expect(html).toContain('Mari verifikasi atau perbarui daftar Sumber Pemasukan Anda');
	});

	it('pre-fills inputs with initial income sources and calculates total monthly income', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		// Pre-filled names and amounts
		expect(html).toContain('value="Gaji Pokok"');
		expect(html).toContain('value="10000000"');
		expect(html).toContain('value="Freelance Design"');
		expect(html).toContain('value="5000000"');

		// Total calculated display (10.000.000 + 5.000.000 = Rp 15.000.000)
		expect(html).toContain('Rp 15.000.000');
		expect(html).toContain('2 Sumber Pemasukan');
	});

	it('provides interactive add button and enables remove button when multi-source', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		expect(html).toContain('Tambah Sumber Pemasukan');
		// When length > 1, delete button is not disabled
		expect(html).toContain('aria-label="Hapus sumber pemasukan Gaji Pokok"');
	});

	it('disables remove button when there is only one income source', () => {
		const singleSource = [{ id: 'src-1', name: 'Gaji Pokok', amount: 8000000 }];
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: singleSource }
		});

		expect(html).toContain('Rp 8.000.000');
		expect(html).toContain('1 Sumber Pemasukan');
		// Disabled delete button when length <= 1
		expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Hapus sumber pemasukan Gaji Pokok"/);
	});

	it('is a non-dismissible blocking gate with no close X button and no dismissible backdrop', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		// Must NOT have a modal close button
		expect(html).not.toContain('aria-label="Tutup');
		expect(html).not.toContain('aria-label="Close');

		// Backdrop overlay is non-interactive presentational backdrop
		expect(html).toContain('data-testid="income-confirmation-backdrop"');
	});

	it('renders submit button with "Konfirmasi & Lanjutkan" and action form target', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources, actionUrl: '?/confirmIncome' }
		});

		expect(html).toContain('action="?/confirmIncome"');
		expect(html).toContain('Konfirmasi &amp; Lanjutkan');
	});

	it('adheres to Wise design system tokens (10px input radius, no gradients, no button shadow, no shadow-xs)', () => {
		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		// Inputs use rounded-[10px] as specified in DESIGN.md
		expect(html).toContain('rounded-[10px]');
		// No gradient in header block
		expect(html).not.toContain('bg-linear-to-b');
		// Primary CTA pill button has no drop shadow
		expect(html).not.toContain('shadow-md');
		// Flat badge, no shadow-xs
		expect(html).not.toContain('shadow-xs');
		// Token text color
		expect(html).not.toContain('dark:text-white');
		expect(html).toContain('dark:text-paper');
	});

	it('supports English translation when locale is en', async () => {
		await setLocale('en');

		const { html } = render(IncomeConfirmationModal, {
			props: { isOpen: true, initialSources: mockSources }
		});

		expect(html).toContain('Happy Payday! 🎉');
		expect(html).toContain('New Monthly Period');
		expect(html).toContain('Please verify or update your Income Sources');
		expect(html).toContain('Confirm &amp; Continue');
		expect(html).toContain('Add Income Source');
		expect(html).toContain('2 Income Sources');
	});
});
