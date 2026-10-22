import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAiSummary, formatAggregatePrompt, type AiAggregateData } from './summary.js';

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

	it('formats prompt containing ONLY aggregate metrics, without individual expense items', () => {
		const prompt = formatAggregatePrompt(sampleData);

		expect(prompt).toContain('10.000.000');
		expect(prompt).toContain('6.500.000');
		expect(prompt).toContain('3.500.000');
		expect(prompt).toContain('Kebutuhan');
		expect(prompt).toContain('Tabungan Masa Depan');
		expect(prompt).toContain('Hobi Lama');
		expect(prompt).toContain('Dibekukan');

		// Sensitive / non-aggregate transaction items should NOT exist
		expect(prompt).not.toContain('Kopi Kenangan');
		expect(prompt).not.toContain('Indomaret');
		expect(prompt).not.toContain('Gojek');
	});

	it('successfully calls Groq API when Groq key is present', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							content: 'Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥'
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

		expect(result).toBe('Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥');
		expect(mockFetch).toHaveBeenCalledTimes(1);

		const [url, options] = mockFetch.mock.calls[0];
		expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
		expect(options.headers['Authorization']).toBe('Bearer gsk_mock_test');
		const body = JSON.parse(options.body);
		expect(body.model).toBe('llama-3.3-70b-versatile');
	});

	it('falls back to Gemini Flash API when Groq fails', async () => {
		const mockFetch = vi
			.fn()
			// First call (Groq) fails with 500
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: async () => 'Groq Rate limit or server error'
			})
			// Second call (Gemini Flash) succeeds
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					candidates: [
						{
							content: {
								parts: [
									{
										text: 'Kategori Kebutuhan aman dan tabunganmu on fire! 💪'
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

		expect(result).toBe('Kategori Kebutuhan aman dan tabunganmu on fire! 💪');
		expect(mockFetch).toHaveBeenCalledTimes(2);

		const [geminiUrl, geminiOptions] = mockFetch.mock.calls[1];
		expect(geminiUrl).toContain('generativelanguage.googleapis.com');
		expect(geminiUrl).toContain('gemini-1.5-flash');
		expect(geminiOptions.headers['x-goog-api-key']).toBe('gemini_mock_test');
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
