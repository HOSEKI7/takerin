export interface ExpenseInput {
	name: string;
	amount: number;
	categoryId: string;
	date: string;
	time?: string;
	notes?: string;
}

export interface ExpenseValidationResult {
	success: boolean;
	data?: ExpenseInput;
	error?: string;
}

/**
 * Safely evaluates a basic mathematical expression (e.g. "50000+25000") without using `eval()`.
 * Returns rounded integer result.
 */
export function evaluateCalculatorExpression(rawExpression: string): number {
	if (!rawExpression) return 0;

	// Remove all whitespace
	let expr = rawExpression.replace(/\s+/g, '');

	// Strip trailing operator if user ended with an operator like "50000+"
	while (expr.length > 0 && ['+', '-', '*', '/'].includes(expr[expr.length - 1])) {
		expr = expr.slice(0, -1);
	}

	if (!expr) return 0;

	// Tokenize numbers and operators
	const tokens: (number | string)[] = [];
	let currentNum = '';

	for (let i = 0; i < expr.length; i++) {
		const char = expr[i];

		if (['+', '-', '*', '/'].includes(char)) {
			// Support leading negative sign or negative numbers
			if (char === '-' && (i === 0 || ['+', '-', '*', '/'].includes(expr[i - 1]))) {
				currentNum += char;
				continue;
			}

			if (currentNum !== '') {
				const parsed = Number(currentNum);
				if (Number.isNaN(parsed)) return 0;
				tokens.push(parsed);
				currentNum = '';
			}
			tokens.push(char);
		} else if ((char >= '0' && char <= '9') || char === '.') {
			currentNum += char;
		} else {
			// Invalid character
			return 0;
		}
	}

	if (currentNum !== '') {
		const parsed = Number(currentNum);
		if (Number.isNaN(parsed)) return 0;
		tokens.push(parsed);
	}

	if (tokens.length === 0) return 0;

	// Pass 1: Handle multiplication and division (* and /)
	const pass1Tokens: (number | string)[] = [];
	let i = 0;
	while (i < tokens.length) {
		const token = tokens[i];
		if (token === '*' || token === '/') {
			const prev = pass1Tokens.pop();
			const next = tokens[i + 1];

			if (typeof prev !== 'number' || typeof next !== 'number') {
				return 0;
			}

			if (token === '*') {
				pass1Tokens.push(prev * next);
			} else {
				if (next === 0) return 0;
				pass1Tokens.push(prev / next);
			}
			i += 2;
		} else {
			pass1Tokens.push(token);
			i++;
		}
	}

	// Pass 2: Handle addition and subtraction (+ and -)
	let result = pass1Tokens[0];
	if (typeof result !== 'number') return 0;

	let j = 1;
	while (j < pass1Tokens.length) {
		const op = pass1Tokens[j];
		const next = pass1Tokens[j + 1];

		if (typeof next !== 'number') return 0;

		if (op === '+') {
			result += next;
		} else if (op === '-') {
			result -= next;
		}
		j += 2;
	}

	if (!Number.isFinite(result)) return 0;
	return Math.round(result);
}

/**
 * Validates expense creation/update input payload.
 */
export function validateExpenseInput(input: unknown): ExpenseValidationResult {
	if (!input || typeof input !== 'object') {
		return { success: false, error: 'Data pengeluaran tidak valid.' };
	}

	const raw = input as Record<string, unknown>;

	// Validate name
	if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
		return { success: false, error: 'Nama pengeluaran wajib diisi.' };
	}
	const name = raw.name.trim();
	if (name.length > 100) {
		return { success: false, error: 'Nama pengeluaran maksimal 100 karakter.' };
	}

	// Validate amount
	const amount = typeof raw.amount === 'number' ? raw.amount : Number(raw.amount);
	if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
		return { success: false, error: 'Nominal pengeluaran harus lebih besar dari 0.' };
	}

	// Validate categoryId
	if (typeof raw.categoryId !== 'string' || raw.categoryId.trim().length === 0) {
		return { success: false, error: 'Kategori wajib dipilih.' };
	}
	const categoryId = raw.categoryId.trim();

	// Validate date (YYYY-MM-DD)
	if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
		return {
			success: false,
			error: 'Tanggal pengeluaran tidak valid (gunakan format YYYY-MM-DD).'
		};
	}
	const date = raw.date;

	// Optional time (HH:MM or HH:MM:SS)
	let time: string | undefined = undefined;
	if (typeof raw.time === 'string' && raw.time.trim().length > 0) {
		time = raw.time.trim();
	}

	// Optional notes
	let notes: string | undefined = undefined;
	if (typeof raw.notes === 'string' && raw.notes.trim().length > 0) {
		notes = raw.notes.trim();
		if (notes.length > 500) {
			return { success: false, error: 'Catatan maksimal 500 karakter.' };
		}
	}

	return {
		success: true,
		data: {
			name,
			amount,
			categoryId,
			date,
			...(time ? { time } : {}),
			...(notes ? { notes } : {})
		}
	};
}

/**
 * Checks if the expense amount causes the category balance to drop below zero.
 */
export function isOverBudget(amount: number, categoryBalance: number): boolean {
	return categoryBalance - amount < 0;
}
