import { describe, it, expect } from 'vitest';
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatCurrency,
  toCents,
  fromCents,
} from '@/lib/currency';

describe('Currency and Decimal Precision Arithmetic', () => {
  it('prevents standard IEEE 754 floating point addition errors', () => {
    // In naive JS: 0.1 + 0.2 === 0.30000000000000004
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it('prevents floating point subtraction errors', () => {
    // In naive JS: 1.0 - 0.9 === 0.09999999999999998
    expect(subtractMoney(1.0, 0.9)).toBe(0.1);
  });

  it('multiplies money safely with rounding', () => {
    expect(multiplyMoney(10.55, 3)).toBe(31.65);
  });

  it('formats EGP currency correctly in English and Arabic', () => {
    const formattedEn = formatCurrency(85, 'EGP', 'en');
    expect(formattedEn).toContain('85');
    expect(formattedEn).toContain('EGP');

    const formattedAr = formatCurrency(85, 'EGP', 'ar');
    expect(formattedAr).toContain('ج.م');
  });

  it('handles zero and negative amounts without crashing', () => {
    expect(formatCurrency(0, 'EGP', 'en')).toContain('0');
    expect(formatCurrency(-50, 'EGP', 'en')).toContain('-50');
  });
});
