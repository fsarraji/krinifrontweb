import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatMoney, formatNumber } from './formatters';

// toLocaleString varie sur les espaces insecables : on les normalise.
const norm = (s) => s.replace(new RegExp('[\u00A0\u202F]', 'g'), ' ');

describe('formatters', () => {
    it('formatMoney : 2 décimales et devise unique', () => {
        expect(norm(formatMoney(1200))).toBe('1 200,00 MAD');
        expect(norm(formatMoney('99.5'))).toBe('99,50 MAD');
        expect(formatMoney(null)).toBe('—');
        expect(formatMoney('abc')).toBe('—');
    });

    it('formatNumber', () => {
        expect(norm(formatNumber(1234567))).toBe('1 234 567');
        expect(formatNumber(undefined)).toBe('—');
    });

    it('formatDate : pas de décalage de fuseau pour YYYY-MM-DD', () => {
        expect(formatDate('2026-03-05')).toBe('05/03/2026');
        expect(formatDate('')).toBe('—');
        expect(formatDate('pas une date')).toBe('—');
    });

    it('formatDateTime', () => {
        expect(norm(formatDateTime('2026-03-05T14:30:00'))).toMatch(/05\/03\/2026,? 14:30/);
    });
});
