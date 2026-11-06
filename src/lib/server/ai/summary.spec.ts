import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	generateAiSummary,
	formatAggregatePrompt,
	cleanAndParseAiSummary,
	type AiAggregateData
} from './summary.js';

describe('AI Summary Generator (Seam 1)', () => {
	const sampleData: AiAggregateData = {
		totalIncome: 10000000,
		totalSpent: 6500000,
		remaining: 3500000,
		spentPercentage: 65,
		categories: [
			{
				name: 'Kebutuhan',
				percentage: 50,
				allocation: 5000000,
				spent: 4500000,
				spentPercentage: 90,
				isSavings: false,
				status: 'active'
			},
			{
				name: 'Tabungan Masa Depan',
				percentage: 20,
				allocation: 2000000,
				spent: 2000000,
				spentPercentage: 100,
				isSavings: true,
				status: 'active'
			},
			{
				name: 'Hobi Lama',
				percentage: 10,
				allocation: 1000000,
				spent: 500000,
				spentPercentage: 50,
				isSavings: false,
				status: 'frozen'
			}
		]
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('formats prompt containing aggregate metrics and curated top/recurring expense items', () => {
		const dataWithExpenses: AiAggregateData = {
			...sampleData,
			topExpenses: [
				{
					name: 'Kopi Kenangan',
					amount: 250000,
					categoryName: 'Kebutuhan',
					count: 10
				},
				{
					name: 'Sepatu Lari',
					amount: 1200000,
					categoryName: 'Hobi Lama'
				}
			]
		};

		const prompt = formatAggregatePrompt(dataWithExpenses);

		expect(prompt).toContain('10.000.000');
		expect(prompt).toContain('6.500.000');
		expect(prompt).toContain('3.500.000');
		expect(prompt).toContain('Kebutuhan');
		expect(prompt).toContain('Tabungan Masa Depan');
		expect(prompt).toContain('Hobi Lama');
		expect(prompt).toContain('Dibekukan');

		// Curated top/recurring expense items should be included
		expect(prompt).toContain('Kopi Kenangan');
		expect(prompt).toContain('250.000');
		expect(prompt).toContain('muncul 10x');
		expect(prompt).toContain('Sepatu Lari');
		expect(prompt).toContain('1.200.000');
	});

	it('formats prompt cleanly when topExpenses is empty or undefined', () => {
		const prompt = formatAggregatePrompt(sampleData);
		expect(prompt).toContain('10.000.000');
		expect(prompt).not.toContain('Daftar Pengeluaran Dominan');
	});

	it('successfully calls Groq API when Groq key is present and returns bilingual json', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify({
								id: 'Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥',
								en: 'You were so frugal this month! Your savings are on fire! 🔥'
							})
						}
					}
				]
			})
		});

		const result = await generateAiSummary(sampleData, {
			groqApiKey: 'gsk_mock_test',
			geminiApiKey: 'gemini_mock_test',
			fetchFn: mockFetch as unknown as typeof fetch
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe('Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥');
		expect(parsed.en).toBe('You were so frugal this month! Your savings are on fire! 🔥');
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
		expect(options.headers['Authorization']).toBe('Bearer gsk_mock_test');
		const body = JSON.parse(options.body);
		expect(body.model).toBe('qwen/qwen3.8-27b');
		expect(body.temperature).toBe(0.8);
		expect(body.max_tokens).toBe(500);
	});

	it('tries secondary Groq model if primary Groq model fails', async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: async () => 'Model not found'
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: JSON.stringify({
									id: 'Bulan ini hemat banget! 🔥',
									en: 'Very frugal this month! 🔥'
								})
							}
						}
					]
				})
			});

		const result = await generateAiSummary(sampleData, {
			groqApiKey: 'gsk_mock_test',
			fetchFn: mockFetch as unknown as typeof fetch
		});

		expect(mockFetch).toHaveBeenCalledTimes(2);
		const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
		const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
		expect(firstCallBody.model).toBe('qwen/qwen3.8-27b');
		expect(secondCallBody.model).toBe('openai/gpt-oss-20b');
		const parsed = JSON.parse(result);
		expect(parsed.id).toBe('Bulan ini hemat banget! 🔥');
	});

	it('respects groqModel override if specified', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: JSON.stringify({
								id: 'Hemat! 🔥',
								en: 'Frugal! 🔥'
							})
						}
					}
				]
			})
		});

		await generateAiSummary(sampleData, {
			groqApiKey: 'gsk_mock_test',
			groqModel: 'custom-groq-model',
			fetchFn: mockFetch as unknown as typeof fetch
		});

		const body = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(body.model).toBe('custom-groq-model');
	});

	it('falls back to Gemini Flash API when all Groq models fail', async () => {
		const mockFetch = vi
			.fn()
			// Groq model 1 fails
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: async () => 'Groq model 1 not found'
			})
			// Groq model 2 fails
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => 'Groq model 2 error'
			})
			// Gemini Flash succeeds
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: JSON.stringify({
											id: 'Kategori Kebutuhan aman dan tabunganmu on fire! 💪',
											en: 'Needs are safe and your savings are on fire! 💪'
										})
									}
								]
							}
						}
					]
				})
			});

		const result = await generateAiSummary(sampleData, {
			groqApiKey: 'gsk_mock_test',
			geminiApiKey: 'gemini_mock_test',
			fetchFn: mockFetch as unknown as typeof fetch
		});

		const parsed = JSON.parse(result);
		expect(parsed.id).toBe('Kategori Kebutuhan aman dan tabunganmu on fire! 💪');
		expect(parsed.en).toBe('Needs are safe and your savings are on fire! 💪');
		expect(mockFetch).toHaveBeenCalledTimes(3);

		const [geminiUrl, geminiOptions] = mockFetch.mock.calls[2];
		expect(geminiUrl).toContain('generativelanguage.googleapis.com');
		expect(geminiUrl).toContain('gemini-flash-latest');
		expect(geminiOptions.headers['x-goog-api-key']).toBe('gemini_mock_test');
	});

	it('respects geminiModel override if specified', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				candidates: [
					{
						content: {
							parts: [
								{
									text: JSON.stringify({
										id: 'Bagus! 👍',
										en: 'Good! 👍'
									})
								}
							]
						}
					}
				]
			})
		});

		await generateAiSummary(sampleData, {
			geminiApiKey: 'gemini_mock_test',
			geminiModel: 'custom-gemini-model',
			fetchFn: mockFetch as unknown as typeof fetch
		});

		const [geminiUrl] = mockFetch.mock.calls[0];
		expect(geminiUrl).toContain('custom-gemini-model');
	});

	it('safely handles markdown codeblocks and plain text fallbacks', () => {
		const codeBlock = '```json\n{"id": "Bagus!", "en": "Great!"}\n```';
		const parsedCodeBlock = JSON.parse(cleanAndParseAiSummary(codeBlock));
		expect(parsedCodeBlock.id).toBe('Bagus!');
		expect(parsedCodeBlock.en).toBe('Great!');

		const plainText = 'Pengeluaran bulan ini cukup rapi!';
		const parsedPlain = JSON.parse(cleanAndParseAiSummary(plainText));
		expect(parsedPlain.id).toBe('Pengeluaran bulan ini cukup rapi!');
		expect(parsedPlain.en).toBe('Pengeluaran bulan ini cukup rapi!');
	});

	it('throws error when both Groq and Gemini fail', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			text: async () => 'Internal server error'
		});

		await expect(
			generateAiSummary(sampleData, {
				groqApiKey: 'gsk_invalid',
				geminiApiKey: 'gemini_invalid',
				fetchFn: mockFetch as unknown as typeof fetch
			})
		).rejects.toThrow(/tidak dapat dihubungi/);
	});
});
