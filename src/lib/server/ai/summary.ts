import { formatRupiah } from '#lib/validation/onboarding.js';

export interface AiExpenseItem {
	name: string;
	amount: number;
	categoryName?: string;
	count?: number;
}

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
	topExpenses?: AiExpenseItem[];
}

export interface AiEnvConfig {
	groqApiKey?: string;
	geminiApiKey?: string;
	groqModel?: string;
	geminiModel?: string;
	fetchFn?: typeof fetch;
}

const SYSTEM_INSTRUCTION = `Kamu adalah asisten analisis keuangan pribadi yang santai, asyik, sedikit sarkas (playful financial bestie), namun tetap bijak dan suportif untuk aplikasi Takerin.
Tugasmu adalah memberikan 2 hingga 4 kalimat frasa ringkas (panjang sekitar 50 hingga 80 kata per bahasa) yang mengomentari kebiasaan pengeluaran dan capaian tabungan pengguna pada periode bulan yang baru saja selesai dalam DUA bahasa sekaligus: Bahasa Indonesia dan English.
Format keluaran HARUS berupa objek JSON valid dengan struktur persis seperti ini:
{
  "id": "2-4 kalimat dalam Bahasa Indonesia santai & asyik (sedikit sarkas lucu menyinggung pengeluaran spesifik jika relevan, lalu apresiasi tabungan & saran bijak, 1-2 emoji)",
  "en": "2-4 sentences in casual English (witty & playful teasing on top expenses, appreciative of savings, ending with wise advice, 1-2 emojis)"
}

Aturan penting:
- Output HANYA berupa JSON murni, tanpa markdown formatting (tanpa codeblock \`\`\`json), tanpa pengantar ("Tentu", "Here is"), dan tanpa penutup.
- Jangan sebutkan ID internal database.
- Bicaralah seperti sahabat akrab yang blak-blakan tapi peduli (playful financial bestie).
- Jika ada daftar pengeluaran dominan atau berulang (misal: jajan kopi, belanja online, makan di luar), singgung namanya secara jenaka/sarkas santai jika relevan untuk mengilustrasikan kebiasaan belanja pengguna.
- Selalu beri apresiasi tinggi jika Kategori Tabungan terisi penuh (100%) atau pengguna berhasil hemat.
- Jika ada kategori yang over-budget, beri teguran santai yang lucu namun jangan sampai merendahkan atau membuat putus asa.
- Wajib tutup dengan 1 saran atau nasihat finansial yang bijak dan taktis untuk periode berikutnya.
- Pastikan paritas makna antara 'id' dan 'en' selaras secara alami.`;

/**
 * Formats aggregate financial metrics into a prompt for the AI model.
 * Includes curated top/recurring expense items with strict field sanitization (names & amounts only, no personal notes).
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

	if (data.topExpenses && data.topExpenses.length > 0) {
		lines.push('', 'Daftar Pengeluaran Dominan & Berulang Bulan Ini:');
		for (const exp of data.topExpenses) {
			const catLabel = exp.categoryName ? ` [${exp.categoryName}]` : '';
			const recurringLabel = exp.count && exp.count > 1 ? ` (muncul ${exp.count}x)` : '';
			lines.push(`- ${exp.name}${catLabel}: Total ${formatRupiah(exp.amount)}${recurringLabel}`);
		}
	}

	lines.push(
		'',
		'Berikan ringkasan 2-4 kalimat (sekitar 50-80 kata per bahasa) dengan gaya asyik, sedikit sarkas santai pada pengeluaran dominan, apresiatif pada tabungan, dan ditutup saran bijak dalam format JSON {"id": "...", "en": "..."}.'
	);

	return lines.join('\n');
}

/**
 * Cleans and parses AI response to ensure strict bilingual JSON structure: {"id": "...", "en": "..."}.
 */
export function cleanAndParseAiSummary(raw: string | undefined): string {
	if (!raw) return '';
	let cleaned = raw.trim();

	// Strip markdown code block wrappers if any
	if (cleaned.startsWith('```')) {
		cleaned = cleaned
			.replace(/^```(?:json)?\s*/i, '')
			.replace(/\s*```$/, '')
			.trim();
	}

	// Try extracting JSON substring if surrounded by prose
	const firstBrace = cleaned.indexOf('{');
	const lastBrace = cleaned.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
		const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
		try {
			const parsed = JSON.parse(jsonCandidate);
			if (parsed && typeof parsed === 'object') {
				const idText = typeof parsed.id === 'string' ? parsed.id.trim() : '';
				const enText = typeof parsed.en === 'string' ? parsed.en.trim() : '';
				if (idText || enText) {
					return JSON.stringify({
						id: idText || enText,
						en: enText || idText
					});
				}
			}
		} catch {
			// fallback to plain text below
		}
	}

	const plainText = cleaned.replace(/^["'“”]+|["'“”]+$/g, '').trim();
	return JSON.stringify({
		id: plainText,
		en: plainText
	});
}

export const DEFAULT_GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
export const DEFAULT_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

/**
 * Calls Groq API using modern chat models (e.g. Qwen 3.8 27B / GPT OSS 20B).
 */
export async function callGroq(
	data: AiAggregateData,
	apiKey: string,
	fetchFn: typeof fetch = fetch,
	modelOverride?: string
): Promise<string> {
	const prompt = formatAggregatePrompt(data);
	const modelsToTry = modelOverride ? [modelOverride, ...DEFAULT_GROQ_MODELS] : DEFAULT_GROQ_MODELS;
	const uniqueModels = [...new Set(modelsToTry)];

	let lastError: Error | null = null;
	for (const model of uniqueModels) {
		try {
			const response = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: SYSTEM_INSTRUCTION },
						{ role: 'user', content: prompt }
					],
					temperature: 0.8,
					max_tokens: 500
				}),
				signal: AbortSignal.timeout(8000)
			});

			if (!response.ok) {
				const errText = await response.text();
				throw new Error(`Groq API error (${response.status}) [${model}]: ${errText}`);
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
			const text = message?.content || message?.reasoning_content || message?.reasoning;
			if (!text) {
				throw new Error(`Groq returned empty response for ${model}`);
			}

			return cleanAndParseAiSummary(text);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			console.warn(`[AI Summary] Groq model ${model} failed:`, lastError.message);
		}
	}

	throw lastError ?? new Error('Semua model Groq gagal dieksekusi.');
}

/**
 * Calls Google Gemini Flash API as fallback using latest supported flash models.
 */
export async function callGemini(
	data: AiAggregateData,
	apiKey: string,
	fetchFn: typeof fetch = fetch,
	modelOverride?: string
): Promise<string> {
	const prompt = formatAggregatePrompt(data);
	const modelsToTry = modelOverride
		? [modelOverride, ...DEFAULT_GEMINI_MODELS]
		: DEFAULT_GEMINI_MODELS;
	const uniqueModels = [...new Set(modelsToTry)];

	let lastError: Error | null = null;
	for (const model of uniqueModels) {
		try {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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
						temperature: 0.8,
						maxOutputTokens: 500
					}
				}),
				signal: AbortSignal.timeout(8000)
			});

			if (!response.ok) {
				const errText = await response.text();
				throw new Error(`Gemini API error (${response.status}) [${model}]: ${errText}`);
			}

			const result = (await response.json()) as {
				candidates?: Array<{
					content?: {
						parts?: Array<{ text?: string }>;
					};
				}>;
			};

			const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!text) {
				throw new Error(`Gemini returned empty response for ${model}`);
			}

			return cleanAndParseAiSummary(text);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			console.warn(`[AI Summary] Gemini model ${model} failed:`, lastError.message);
		}
	}

	throw lastError ?? new Error('Semua model Gemini gagal dieksekusi.');
}

/**
 * Generates an AI summary phrase based on aggregate financial data.
 * Tries Groq first, falls back to Gemini Flash if Groq fails.
 */
export async function generateAiSummary(data: AiAggregateData, env: AiEnvConfig): Promise<string> {
	const fetchFn = env.fetchFn ?? fetch;

	// 1. Primary: Groq API
	if (env.groqApiKey) {
		try {
			return await callGroq(data, env.groqApiKey, fetchFn, env.groqModel);
		} catch (error) {
			console.warn('[AI Summary] Groq API failed, falling back to Gemini Flash:', error);
		}
	}

	// 2. Fallback: Google Gemini Flash
	if (env.geminiApiKey) {
		try {
			return await callGemini(data, env.geminiApiKey, fetchFn, env.geminiModel);
		} catch (error) {
			console.warn('[AI Summary] Gemini Flash API failed:', error);
		}
	}

	throw new Error(
		'Layanan AI (Groq & Gemini) tidak dapat dihubungi atau gagal menghasilkan frasa ringkasan.'
	);
}
