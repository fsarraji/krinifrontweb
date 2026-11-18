import { describe, expect, it } from 'vitest';
import { apiPathFromUrl } from './pagination';

describe('apiPathFromUrl', () => {
    it('turns an absolute DRF next URL into a path relative to the API root', () => {
        expect(apiPathFromUrl('https://kriniback.onrender.com/api/contracts/?page=2')).toBe('contracts/?page=2');
    });

    it('also handles http:// URLs (reverse proxy) and several query params', () => {
        expect(apiPathFromUrl('http://kriniback.onrender.com/api/clients/?page=3&page_size=20')).toBe('clients/?page=3&page_size=20');
    });

    it('handles a path-only URL and nested resources', () => {
        expect(apiPathFromUrl('/api/vehicles/12/price-quote/?start=2026-01-01')).toBe('vehicles/12/price-quote/?start=2026-01-01');
    });

    it('leaves URLs without an /api/ segment, and empty values, untouched', () => {
        expect(apiPathFromUrl('https://example.com/other/?page=2')).toBe('https://example.com/other/?page=2');
        expect(apiPathFromUrl(null)).toBeNull();
        expect(apiPathFromUrl('')).toBe('');
    });
});
