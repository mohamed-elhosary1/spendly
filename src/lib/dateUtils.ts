import { LanguageCode } from '@/types';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  isSameDay,
  isSameMonth,
  isToday,
  subDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

export const MONTH_NAMES: { en: string[]; ar: string[] } = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
};

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentYearAndMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 1-12
  };
}

export function formatDateString(
  dateStr: string,
  language: LanguageCode = 'en',
  formatStr: string = 'PP'
): string {
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    if (language === 'ar') {
      const year = d.getFullYear();
      const month = MONTH_NAMES.ar[d.getMonth()];
      const day = d.getDate();
      return `${day} ${month} ${year}`;
    }

    return format(d, formatStr);
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(
  year: number,
  month: number, // 1-12
  language: LanguageCode = 'en'
): string {
  const monthIndex = Math.max(0, Math.min(11, month - 1));
  const monthName = MONTH_NAMES[language]?.[monthIndex] || MONTH_NAMES.en[monthIndex];
  return `${monthName} ${year}`;
}

/**
 * Returns days calculation for a given month.
 * If viewing current month:
 *   elapsed_days = current day of month (e.g. on Oct 29, elapsed = 29)
 *   remaining_days = totalDays - elapsed + 1 (including today)
 * If viewing past month:
 *   elapsed_days = totalDays, remaining_days = 0
 * If viewing future month:
 *   elapsed_days = 0, remaining_days = totalDays
 */
export function getMonthProgress(
  year: number,
  month: number,
  referenceDate?: Date
): {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
} {
  const targetDate = new Date(year, month - 1, 1);
  const totalDays = getDaysInMonth(targetDate);
  const now = referenceDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      isCurrentMonth: false,
      isPastMonth: true,
      isFutureMonth: false,
    };
  }

  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return {
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      isCurrentMonth: false,
      isPastMonth: false,
      isFutureMonth: true,
    };
  }

  // Current month
  const elapsedDays = Math.min(totalDays, Math.max(1, currentDay));
  const remainingDays = Math.max(1, totalDays - elapsedDays + 1);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    isCurrentMonth: true,
    isPastMonth: false,
    isFutureMonth: false,
  };
}

export {
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  isSameDay,
  isSameMonth,
  isToday,
  subDays,
  startOfWeek,
  endOfWeek,
};
