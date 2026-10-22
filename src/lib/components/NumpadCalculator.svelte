<script lang="ts">
	/* eslint-disable no-useless-assignment */
	import { evaluateCalculatorExpression } from '#lib/validation/expense.js';
	import { formatRupiah } from '#lib/validation/onboarding.js';
	import { t } from '#lib/i18n/index.js';

	interface Props {
		expression?: string;
		amount?: number;
		onValueChange?: (value: number) => void;
		class?: string;
	}

	let {
		expression = $bindable(''),
		amount = $bindable(0),
		onValueChange,
		class: className = ''
	}: Props = $props();

	function updateExpression(newExpr: string) {
		expression = newExpr;
		const evalVal = evaluateCalculatorExpression(newExpr);
		amount = evalVal;
		onValueChange?.(evalVal);
	}

	function handleDigit(digit: string) {
		if (expression === '0' && digit !== '000') {
			updateExpression(digit);
		} else {
			updateExpression(expression + digit);
		}
	}

	function handleOperator(op: string) {
		if (!expression) return;
		// If last char is already an operator, replace it
		const lastChar = expression[expression.length - 1];
		if (['+', '-', '*', '/'].includes(lastChar)) {
			updateExpression(expression.slice(0, -1) + op);
		} else {
			updateExpression(expression + op);
		}
	}

	function handleClear() {
		updateExpression('');
	}

	function handleBackspace() {
		if (expression.length > 0) {
			updateExpression(expression.slice(0, -1));
		}
	}

	function handleEvaluate() {
		const evalVal = evaluateCalculatorExpression(expression);
		if (Number.isFinite(evalVal) && expression.trim().length > 0) {
			updateExpression(evalVal.toString());
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		) {
			return;
		}

		if (event.key >= '0' && event.key <= '9') {
			handleDigit(event.key);
		} else if (['+', '-', '*', '/'].includes(event.key)) {
			handleOperator(event.key);
		} else if (event.key === 'Enter' || event.key === '=') {
			event.preventDefault();
			handleEvaluate();
		} else if (event.key === 'Backspace') {
			handleBackspace();
		} else if (event.key === 'Escape' || event.key.toLowerCase() === 'c') {
			handleClear();
		}
	}

	let evaluatedAmount = $derived(evaluateCalculatorExpression(expression));
	const hasOperator = $derived(/[+\-*/]/.test(expression));
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	class="w-full rounded-2xl border border-fog bg-paper p-4 shadow-sm select-none dark:border-dark-border dark:bg-dark-card {className}"
>
	<!-- Amount & Calculator Expression Display -->
	<div
		class="mb-4 rounded-xl border border-fog/80 bg-fog/30 p-4 text-right dark:border-dark-border/60 dark:bg-dark-surface/60"
	>
		<div class="flex items-center justify-between text-xs text-slate dark:text-pebble">
			<span class="font-medium tracking-wide uppercase">Nominal Pengeluaran</span>
			{#if hasOperator}
				<span
					class="rounded bg-lime-voltage/30 px-1.5 py-0.5 text-[11px] font-bold text-forest-ink dark:bg-lime-voltage/20 dark:text-lime-voltage"
				>
					Kalkulator Aktif
				</span>
			{/if}
		</div>

		<!-- Expression row -->
		<div
			class="mt-1 min-h-[1.5rem] font-mono text-sm tracking-wider break-all text-slate dark:text-pebble"
			data-testid="calculator-expression"
		>
			{expression || '0'}
		</div>

		<!-- Evaluated Amount in Large Rupiah Format -->
		<div
			class="mt-1 text-2xl font-black tracking-tight text-forest-ink sm:text-3xl dark:text-paper"
			data-testid="calculator-amount-display"
		>
			{formatRupiah(evaluatedAmount)}
		</div>
	</div>

	<!-- Numpad Grid -->
	<div class="grid grid-cols-4 gap-2">
		<!-- Row 1 -->
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('1')}
		>
			1
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('2')}
		>
			2
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('3')}
		>
			3
		</button>
		<button
			type="button"
			aria-label={t('calculator.add')}
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-linen-mist text-lg font-bold text-forest-ink transition hover:bg-linen-mist/80 active:scale-95 dark:bg-spruce/40 dark:text-lime-voltage dark:hover:bg-spruce/60"
			onclick={() => handleOperator('+')}
		>
			+
		</button>

		<!-- Row 2 -->
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('4')}
		>
			4
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('5')}
		>
			5
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('6')}
		>
			6
		</button>
		<button
			type="button"
			aria-label={t('calculator.subtract')}
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-linen-mist text-lg font-bold text-forest-ink transition hover:bg-linen-mist/80 active:scale-95 dark:bg-spruce/40 dark:text-lime-voltage dark:hover:bg-spruce/60"
			onclick={() => handleOperator('-')}
		>
			−
		</button>

		<!-- Row 3 -->
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('7')}
		>
			7
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('8')}
		>
			8
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('9')}
		>
			9
		</button>
		<button
			type="button"
			aria-label={t('calculator.multiply')}
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-linen-mist text-lg font-bold text-forest-ink transition hover:bg-linen-mist/80 active:scale-95 dark:bg-spruce/40 dark:text-lime-voltage dark:hover:bg-spruce/60"
			onclick={() => handleOperator('*')}
		>
			×
		</button>

		<!-- Row 4 -->
		<button
			type="button"
			aria-label={t('calculator.clear')}
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-alarm-red/30 bg-alarm-red/10 text-sm font-bold text-alarm-red transition hover:bg-alarm-red/20 active:scale-95 dark:border-alarm-red/40 dark:bg-alarm-red/20"
			onclick={handleClear}
		>
			C
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-base font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('0')}
		>
			0
		</button>
		<button
			type="button"
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-fog bg-paper text-xs font-bold text-obsidian transition hover:bg-fog/50 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-paper dark:hover:bg-dark-surface/80"
			onclick={() => handleDigit('000')}
		>
			000
		</button>
		<button
			type="button"
			aria-label={t('calculator.divide')}
			class="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-linen-mist text-lg font-bold text-forest-ink transition hover:bg-linen-mist/80 active:scale-95 dark:bg-spruce/40 dark:text-lime-voltage dark:hover:bg-spruce/60"
			onclick={() => handleOperator('/')}
		>
			÷
		</button>

		<!-- Row 5 (Bottom Action Row) -->
		<button
			type="button"
			aria-label={t('calculator.backspace')}
			class="col-span-2 flex h-11 cursor-pointer items-center justify-center rounded-full border border-fog bg-fog/40 text-sm font-semibold text-charcoal transition hover:bg-fog/80 active:scale-95 dark:border-dark-border dark:bg-dark-surface dark:text-linen-mist"
			onclick={handleBackspace}
		>
			⌫ {t('common.delete')}
		</button>
		<button
			type="button"
			aria-label={t('calculator.evaluate')}
			class="col-span-2 flex h-11 cursor-pointer items-center justify-center rounded-full bg-lime-voltage text-base font-extrabold text-forest-ink transition hover:brightness-95 active:scale-95 dark:bg-lime-voltage dark:text-forest-ink"
			onclick={handleEvaluate}
		>
			= {t('calculator.calculate')}
		</button>
	</div>
</div>
