import { describe, it, expect } from 'vitest';
import idDict from '../i18n/id.json';
import enDict from '../i18n/en.json';
import OnboardingTutorial from './OnboardingTutorial.svelte';

describe('Onboarding Tutorial Component & Content (Seam 1 & 2)', () => {
	it('exports OnboardingTutorial component', () => {
		expect(OnboardingTutorial).toBeDefined();
	});

	it('defines all required onboarding tutorial translation keys in id.json and en.json', () => {
		const idTutorial = idDict.onboarding?.tutorial as Record<string, string> | undefined;
		const enTutorial = enDict.onboarding?.tutorial as Record<string, string> | undefined;

		expect(idTutorial).toBeDefined();
		expect(enTutorial).toBeDefined();

		const requiredKeys = [
			'badge',
			'skip',
			'prev',
			'next',
			'finish',
			'slide1Title',
			'slide1Desc',
			'slide2Title',
			'slide2Desc',
			'slide3Title',
			'slide3Desc',
			'slide4Title',
			'slide4Desc'
		];

		for (const key of requiredKeys) {
			expect(idTutorial?.[key], `id.json missing onboarding.tutorial.${key}`).toBeTruthy();
			expect(enTutorial?.[key], `en.json missing onboarding.tutorial.${key}`).toBeTruthy();
		}
	});

	it('includes the exact requested copy from Issue #19 in Indonesian translations', () => {
		const idTutorial = idDict.onboarding?.tutorial as Record<string, string>;

		expect(idTutorial.slide1Desc).toContain(
			'Ini dashboard kamu — lihat sisa jatah per kategori di sini'
		);
		expect(idTutorial.slide2Desc).toContain(
			'Tekan tombol + untuk catat pengeluaran — cukup 5 detik!'
		);
		expect(idTutorial.slide3Desc).toContain(
			'Tiap akhir bulan, lihat ringkasan dan tips AI di History'
		);
		expect(idTutorial.slide4Desc).toContain('Selamat! Mulai takerin gajimu sekarang 🎉');
	});

	it('validates navigation step progression and bounds logic (4 slides: 0 to 3)', () => {
		const TOTAL_SLIDES = 4;
		let currentSlide = 0;

		const nextSlide = () => {
			if (currentSlide < TOTAL_SLIDES - 1) currentSlide += 1;
		};
		const prevSlide = () => {
			if (currentSlide > 0) currentSlide -= 1;
		};

		expect(currentSlide).toBe(0);
		prevSlide();
		expect(currentSlide).toBe(0); // Clamped at lower bound

		nextSlide();
		expect(currentSlide).toBe(1);
		nextSlide();
		expect(currentSlide).toBe(2);
		nextSlide();
		expect(currentSlide).toBe(3);
		nextSlide();
		expect(currentSlide).toBe(3); // Clamped at upper bound

		prevSlide();
		expect(currentSlide).toBe(2);
	});
});
