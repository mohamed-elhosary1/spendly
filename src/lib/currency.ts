import { CurrencyCode, LanguageCode } from '@/types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, { en: string; ar: string; symbol: string }> = {
  EGP: { en: 'EGP', ar: 'ج.م', symbol: 'E£' },
  USD: { en: 'USD', ar: 'دولار', symbol: '$' },
  EUR: { en: 'EUR', ar: 'يورو', symbol: '€' },
  SAR: { en: 'SAR', ar: 'ر.س', symbol: '﷼' },
  AED: { en: 'AED', ar: 'د.إ', symbol: 'د.إ' },
  GBP: { en: 'GBP', ar: 'جنيه إسترليني', symbol: '£' },
};

/**
 * Normalizes Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) and Arabic decimal separators
 * to standard Western numbers.
 */
export function normalizeArabicNumbers(input: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let normalized = input;
  for (let i = 0; i < 10; i++) {
    normalized = normalized
      .replace(new RegExp(arabicDigits[i], 'g'), i.toString())
      .replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }

  // Replace Arabic comma / decimal separator '،' or '٫' with '.'
  normalized = normalized.replace(/[،٫]/g, '.');
  return normalized;
}

/**
 * Decimal-safe arithmetic helpers to avoid IEEE 754 floating point issues.
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function addMoney(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyMoney(a: number, factor: number): number {
  return fromCents(Math.round(toCents(a) * factor));
}

/**
 * Formats a monetary amount according to selected language and currency.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'EGP',
  language: LanguageCode = 'en',
  options: { showDecimals?: boolean; compact?: boolean } = {}
): string {
  const { showDecimals = true, compact = false } = options;
  const safeAmount = isNaN(amount) ? 0 : amount;

  const currencyMeta = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.EGP;
  const label = language === 'ar' ? currencyMeta.ar : currencyMeta.en;

  const formattedNum = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: showDecimals ? (safeAmount % 1 === 0 ? 0 : 2) : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(safeAmount);

  if (language === 'ar') {
    return `${formattedNum} ${label}`;
  }
  return `${formattedNum} ${label}`;
}

/**
 * Simple number formatter without currency label
 */
export function formatNumber(
  val: number,
  language: LanguageCode = 'en',
  options: { decimals?: number } = {}
): string {
  const { decimals = 2 } = options;
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: val % 1 === 0 ? 0 : decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}
