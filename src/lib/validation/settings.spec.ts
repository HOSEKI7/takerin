import { describe, it, expect } from 'vitest';
import {
	validateDisplayName,
	validatePayDate,
	validateLanguage,
	validateTheme,
	validateChangeEmailRequest,
	validateChangeEmailOtp,
	formatExpensesCsv,
	type CsvExpenseItem
} from './settings.js';

describe('Settings Validation & Formatting (Seam 1)', () => {
	describe('validateDisplayName', () => {
		it('accepts valid display names', () => {
			const res = validateDisplayName('Budi Santoso');
			expect(res.valid).toBe(true);
			expect(res.name).toBe('Budi Santoso');
		});

		it('trims whitespace', () => {
			const res = validateDisplayName('   Dewi Lestari   ');
			expect(res.valid).toBe(true);
			expect(res.name).toBe('Dewi Lestari');
		});

		it('rejects empty or whitespace-only names', () => {
			expect(validateDisplayName('').valid).toBe(false);
			expect(validateDisplayName('   ').valid).toBe(false);
			expect(validateDisplayName(null).valid).toBe(false);
		});

		it('rejects names that are too short or too long', () => {
			expect(validateDisplayName('A').valid).toBe(false);
			expect(validateDisplayName('A'.repeat(101)).valid).toBe(false);
		});
	});

	describe('validatePayDate', () => {
		const activePeriodEndDate = '2026-10-24'; // active pay date is 25th, period ends 24th

		it('accepts valid pay day when today is strictly before activePeriodEndDate (Option A)', () => {
			// Today is Oct 20 (before Oct 24)
			const today = new Date('2026-10-20');
			const res = validatePayDate(28, 25, activePeriodEndDate, today);
			expect(res.valid).toBe(true);
			expect(res.payDay).toBe(28);
		});

		it('accepts valid pay day when today is Oct 23 (H-2, strictly before Oct 24)', () => {
			const today = new Date('2026-10-23');
			const res = validatePayDate(1, 25, activePeriodEndDate, today);
			expect(res.valid).toBe(true);
			expect(res.payDay).toBe(1);
		});

		it('rejects pay day change on activePeriodEndDate (H-1, Oct 24) under Option A', () => {
			const today = new Date('2026-10-24');
			const res = validatePayDate(28, 25, activePeriodEndDate, today);
			expect(res.valid).toBe(false);
			expect(res.error).toMatch(/sebelum 1 hari sebelum/i);
		});

		it('rejects pay day change after activePeriodEndDate (Oct 25 or later)', () => {
			const today = new Date('2026-10-25');
			const res = validatePayDate(28, 25, activePeriodEndDate, today);
			expect(res.valid).toBe(false);
		});

		it('rejects invalid pay day numbers (< 1 or > 31 or non-integer)', () => {
			const today = new Date('2026-10-20');
			expect(validatePayDate(0, 25, activePeriodEndDate, today).valid).toBe(false);
			expect(validatePayDate(32, 25, activePeriodEndDate, today).valid).toBe(false);
			expect(validatePayDate('invalid', 25, activePeriodEndDate, today).valid).toBe(false);
			expect(validatePayDate(15.5, 25, activePeriodEndDate, today).valid).toBe(false);
		});
	});

	describe('validateLanguage', () => {
		it('accepts id and en', () => {
			expect(validateLanguage('id')).toEqual({ valid: true, language: 'id' });
			expect(validateLanguage('en')).toEqual({ valid: true, language: 'en' });
		});

		it('rejects unsupported languages', () => {
			expect(validateLanguage('fr').valid).toBe(false);
			expect(validateLanguage('').valid).toBe(false);
			expect(validateLanguage(null).valid).toBe(false);
		});
	});

	describe('validateTheme', () => {
		it('accepts light and dark', () => {
			expect(validateTheme('light')).toEqual({ valid: true, theme: 'light' });
			expect(validateTheme('dark')).toEqual({ valid: true, theme: 'dark' });
		});

		it('rejects unsupported themes', () => {
			expect(validateTheme('system').valid).toBe(false);
			expect(validateTheme('sepia').valid).toBe(false);
		});
	});

	describe('validateChangeEmailRequest (Issue #35)', () => {
		const currentEmail = 'user@example.com';

		it('accepts valid password and distinct new email', () => {
			const res = validateChangeEmailRequest({
				currentPassword: 'secretpassword123',
				newEmail: 'newuser@example.com',
				currentEmail
			});
			expect(res.valid).toBe(true);
			expect(res.error).toBeUndefined();
		});

		it('rejects empty or missing current password', () => {
			const res1 = validateChangeEmailRequest({
				currentPassword: '',
				newEmail: 'new@example.com',
				currentEmail
			});
			expect(res1.valid).toBe(false);
			expect(res1.error).toMatch(/kata sandi saat ini/i);

			const res2 = validateChangeEmailRequest({
				newEmail: 'new@example.com',
				currentEmail
			});
			expect(res2.valid).toBe(false);
		});

		it('rejects invalid new email format', () => {
			const res = validateChangeEmailRequest({
				currentPassword: 'secretpassword123',
				newEmail: 'invalid-email',
				currentEmail
			});
			expect(res.valid).toBe(false);
			expect(res.error).toMatch(/tidak valid/i);
		});

		it('rejects new email identical to current email', () => {
			const res = validateChangeEmailRequest({
				currentPassword: 'secretpassword123',
				newEmail: 'USER@EXAMPLE.COM',
				currentEmail
			});
			expect(res.valid).toBe(false);
			expect(res.error).toMatch(/tidak boleh sama/i);
		});
	});

	describe('validateChangeEmailOtp (Issue #35)', () => {
		it('accepts valid 6-digit numeric OTP', () => {
			expect(validateChangeEmailOtp('123456').valid).toBe(true);
			expect(validateChangeEmailOtp('000000').valid).toBe(true);
		});

		it('rejects empty, non-digit, or wrong length OTP', () => {
			expect(validateChangeEmailOtp('').valid).toBe(false);
			expect(validateChangeEmailOtp('12345').valid).toBe(false);
			expect(validateChangeEmailOtp('1234567').valid).toBe(false);
			expect(validateChangeEmailOtp('12345a').valid).toBe(false);
			expect(validateChangeEmailOtp(null).valid).toBe(false);
		});
	});

	describe('formatExpensesCsv', () => {
		it('formats expenses into valid RFC 4180 CSV with UTF-8 BOM', () => {
			const items: CsvExpenseItem[] = [
				{
					date: '2026-10-20',
					time: '14:30',
					name: 'Makan Siang "Enak"',
					categoryName: 'Makanan & Minuman',
					amount: 45000,
					notes: 'Beli nasi Padang, lauk rendang',
					periodRange: '2026-09-25 s/d 2026-10-24'
				},
				{
					date: '2026-10-21',
					time: null,
					name: 'Kopi Susu',
					categoryName: 'Ngopi',
					amount: 20000,
					notes: null,
					periodRange: '2026-09-25 s/d 2026-10-24'
				}
			];

			const csv = formatExpensesCsv(items);

			// Starts with UTF-8 BOM
			expect(csv.startsWith('\uFEFF')).toBe(true);

			// Header line
			expect(csv).toContain(
				'Tanggal,Waktu,Nama Pengeluaran,Kategori,Nominal,Catatan,Periode Bulan'
			);

			// Check escaping of quotes
			expect(csv).toContain('"Makan Siang ""Enak"""');
			expect(csv).toContain('"Beli nasi Padang, lauk rendang"');
			expect(csv).toContain('45000');
			expect(csv).toContain('20000');
		});

		it('handles empty expenses list cleanly', () => {
			const csv = formatExpensesCsv([]);
			expect(csv.startsWith('\uFEFF')).toBe(true);
			expect(csv).toBe(
				'\uFEFFTanggal,Waktu,Nama Pengeluaran,Kategori,Nominal,Catatan,Periode Bulan'
			);
		});

		it('formats English headers when locale is en', () => {
			const items: CsvExpenseItem[] = [
				{
					date: '2026-10-20',
					time: '14:30',
					name: 'Lunch',
					categoryName: 'Food',
					amount: 45000,
					notes: 'Padang rice',
					periodRange: '2026-09-25 to 2026-10-24'
				}
			];
			const csv = formatExpensesCsv(items, 'en');
			expect(csv).toContain('Date,Time,Expense Name,Category,Amount,Notes,Monthly Period');
			expect(csv).toContain('2026-10-20,14:30,Lunch,Food,45000,Padang rice,2026-09-25 to 2026-10-24');
		});
	});
});
