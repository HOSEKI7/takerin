import { getDaysInMonth, formatDateISO } from './onboarding.js';

/**
 * Checks if a period has expired.
 * A period is expired if today (in 'YYYY-MM-DD' ISO format) is strictly greater than endDate.
 */
export function isPeriodExpired(endDate: string, today: Date = new Date()): boolean {
	const todayISO = formatDateISO(today);
	return todayISO > endDate;
}

/**
 * Calculates start_date and end_date for the current active monthly period
 * based on user's payDay and a given reference date (today).
 *
 * Rules:
 * 1. If today's day < clamped payDay in today's month:
 *    The cycle started in the previous month on payDay (clamped to that month's days).
 *    The cycle ends on 1 day before payDay in the current month (clamped).
 * 2. If today's day >= clamped payDay in today's month:
 *    The cycle started in the current month on payDay (clamped).
 *    The cycle ends on 1 day before payDay in the next month (clamped).
 */
export function calculateCurrentPeriodDates(
	today: Date,
	payDay: number
): { startDate: string; endDate: string } {
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
	const currentDay = today.getDate();

	const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
	const clampedPayDayCurrent = Math.min(payDay, daysInCurrentMonth);

	let startYear: number;
	let startMonth: number;
	let startDay: number;

	let nextYear: number;
	let nextMonth: number;
	let nextDay: number;

	if (currentDay < clampedPayDayCurrent) {
		// Current cycle started in the previous month
		if (currentMonth === 0) {
			startYear = currentYear - 1;
			startMonth = 11;
		} else {
			startYear = currentYear;
			startMonth = currentMonth - 1;
		}
		const daysInStartMonth = getDaysInMonth(startYear, startMonth);
		startDay = Math.min(payDay, daysInStartMonth);

		// Next pay day is in current month
		nextYear = currentYear;
		nextMonth = currentMonth;
		nextDay = clampedPayDayCurrent;
	} else {
		// Current cycle started in the current month
		startYear = currentYear;
		startMonth = currentMonth;
		startDay = clampedPayDayCurrent;

		// Next pay day is in next month
		if (currentMonth === 11) {
			nextYear = currentYear + 1;
			nextMonth = 0;
		} else {
			nextYear = currentYear;
			nextMonth = currentMonth + 1;
		}
		const daysInNextMonth = getDaysInMonth(nextYear, nextMonth);
		nextDay = Math.min(payDay, daysInNextMonth);
	}

	const startDateObj = new Date(startYear, startMonth, startDay);
	const endDateObj = new Date(nextYear, nextMonth, nextDay - 1);

	return {
		startDate: formatDateISO(startDateObj),
		endDate: formatDateISO(endDateObj)
	};
}
