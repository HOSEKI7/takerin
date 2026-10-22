import { formatRupiah } from '#lib/validation/onboarding.js';

export interface AiCategoryAggregate {
	name: string;
	percentage: number;
	allocation: number;
	spent: number;
	spentPercentage: number;
	isSavings: boolean;
	status: 'active' | 'frozen';
}

export interface AiAggregateData {
	totalIncome: number;
	totalSpent: number;
	remaining: number;
	spentPercentage: number;
	categories: AiCategoryAggregate[];
}

export interface AiEnvConfig {
	groqApiKey?: string;
	geminiApiKey?: string;
	fetchFn?: typeof fetch;
}

const SYSTEM_INSTRUCTION = `Kamu adalah asisten analisis keuangan pribadi yang santai, suportif, dan cerdas untuk aplikasi Takerin.
Tugasmu adalah memberikan 1 hingga 2 kalimat frasa ringkas (maksimal 35 kata) dalam Bahasa Indonesia santai (bisa memakai 1-2 emoji yang relevan) yang mengomentari kebiasaan pengeluaran dan tabungan pengguna pada periode bulan yang baru saja selesai.
Aturan penting:
- Jangan sebutkan ID, JSON, atau teknis data.
- Hanya berikan frasa komentarnya secara langsung tanpa tanda kutip pembuka/penutup dan tanpa basa-basi pengantar ("Tentu", "Berikut frasa", dll).
- Jika pengguna sangat hemat atau tabungannya terisi penuh/bagus, beri apresiasi positif (contoh: "Bulan ini kamu hemat banget! Tabunganmu on fire! 🔥").
- Jika ada kategori yang kebablasan/melebihi budget namun tabungan aman, sebutkan secara suportif (contoh: "Kategori Makanan kebablasan nih, tapi tabunganmu aman kok 💪").
- Jika banyak kategori over-budget, beri dorongan semangat yang konstruktif (contoh: "Bulan ini pengeluaran cukup menantang, yuk atur strategi lebih rapi di periode baru! 🎯").`;

/**
 * Formats aggregate financial metrics into a concise prompt for the AI model.
 * Strict privacy: NO individual expense transactions or vendor names are included.
 */
export function formatAggregatePrompt(data: AiAggregateData): string {
	const lines: string[] = [
		'Berikut ringkasan agregat keuangan periode bulan yang telah selesai:',
		`- Pemasukan Bulanan: ${formatRupiah(data.totalIncome)}`,
		`- Total Pengeluaran: ${formatRupiah(data.totalSpent)} (${data.spentPercentage}% dari pemasukan)`,
		`- Sisa Saldo: ${formatRupiah(data.remaining)}`,
		'',
		'Rincian Kategori:'
	];

	for (const cat of data.categories) {
		const savingsLabel = cat.isSavings ? ' (Kategori Tabungan)' : '';
		const frozenLabel = cat.status === 'frozen' ? ' [Dibekukan]' : '';
		lines.push(
			`- ${cat.name}${savingsLabel}${frozenLabel}: Alokasi ${formatRupiah(cat.allocation)} (${cat.percentage}%), Terpakai ${formatRupiah(cat.spent)} (${cat.spentPercentage}%)`
		);
	}

	lines.push(
		'',
		'Berikan 1-2 kalimat frasa ringkas (maksimal 35 kata) mengomentari kebiasaan pengeluaran dan tabungan bulan ini.'
	);

	return lines.join('\n');
}

/**
 * Strips wrapping quotes and whitespace from AI model output.
 */
function cleanAiResponse(raw: string | undefined): string {
	if (!raw) return '';
	return raw.replace(/^["'“”]+|["'“”]+$/g, '').trim();
}

/**
 * Calls Groq API using Llama 3.3 70B model.
 */
export async function callGroq(
	data: AiAggregateData,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<string> {
	const prompt = formatAggregatePrompt(data);

	const response = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: SYSTEM_INSTRUCTION },
				{ role: 'user', content: prompt }
			],
			temperature: 0.7,
			max_tokens: 300
		}),
		signal: AbortSignal.timeout(8000)
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Groq API error (${response.status}): ${errText}`);
	}

	const result = (await response.json()) as {
		choices?: Array<{
			message?: {
				content?: string;
				reasoning_content?: string;
				reasoning?: string;
			};
		}>;
	};

	const message = result.choices?.[0]?.message;
	const rawContent = cleanAiResponse(
		message?.content || message?.reasoning_content || message?.reasoning
	);

	if (!rawContent) {
		throw new Error('Groq returned empty response');
	}

	return rawContent;
}

/**
 * Calls Google Gemini Flash API as fallback.
 */
export async function callGemini(
	data: AiAggregateData,
	apiKey: string,
	fetchFn: typeof fetch = fetch
): Promise<string> {
	const prompt = formatAggregatePrompt(data);
	const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

	const response = await fetchFn(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-goog-api-key': apiKey
		},
		body: JSON.stringify({
			systemInstruction: {
				parts: [{ text: SYSTEM_INSTRUCTION }]
			},
			contents: [
				{
					role: 'user',
					parts: [{ text: prompt }]
				}
			],
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: 200
			}
		}),
		signal: AbortSignal.timeout(8000)
	});

	if (!response.ok) {
		const errText = await response.text();
		throw new Error(`Gemini API error (${response.status}): ${errText}`);
	}

	const result = (await response.json()) as {
		candidates?: Array<{
			content?: {
				parts?: Array<{ text?: string }>;
			};
		}>;
	};

	const rawContent = cleanAiResponse(result.candidates?.[0]?.content?.parts?.[0]?.text);
	if (!rawContent) {
		throw new Error('Gemini returned empty response');
	}

	return rawContent;
}

/**
 * Generates an AI summary phrase based on aggregate financial data.
 * Tries Groq Llama 3.3 70B first, falls back to Gemini Flash if Groq fails.
 */
export async function generateAiSummary(data: AiAggregateData, env: AiEnvConfig): Promise<string> {
	const fetchFn = env.fetchFn ?? fetch;

	// 1. Primary: Groq API (Llama 3.3 70B)
	if (env.groqApiKey) {
		try {
			return await callGroq(data, env.groqApiKey, fetchFn);
		} catch (error) {
			console.warn('[AI Summary] Groq API failed, falling back to Gemini Flash:', error);
		}
	}

	// 2. Fallback: Google Gemini Flash
	if (env.geminiApiKey) {
		try {
			return await callGemini(data, env.geminiApiKey, fetchFn);
		} catch (error) {
			console.warn('[AI Summary] Gemini Flash API failed:', error);
		}
	}

	throw new Error(
		'Layanan AI (Groq & Gemini) tidak dapat dihubungi atau gagal menghasilkan frasa ringkasan.'
	);
}
