import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import api from './api';
import { setTokens } from './utils/session';

describe('api : rafraîchissement du token sur 401', () => {
    beforeEach(() => {
        setTokens({ access: 'old', refresh: 'ref' });
    });

    it('rafraîchit une seule fois puis rejoue la requête', async () => {
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new', refresh: 'ref2' } });
        let calls = 0;
        api.defaults.adapter = async (config) => {
            calls += 1;
            if (config.headers.Authorization === 'Bearer old') {
                const err = new Error('401');
                err.config = config;
                err.response = { status: 401, data: {}, config };
                throw err;
            }
            return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
        };

        const [a, b] = await Promise.all([api.get('x/'), api.get('y/')]);
        expect(a.data.ok).toBe(true);
        expect(b.data.ok).toBe(true);
        expect(post).toHaveBeenCalledTimes(1); // un seul refresh pour deux 401 simultanés
        expect(localStorage.getItem('access_token')).toBe('new');
        expect(localStorage.getItem('refresh_token')).toBe('ref2');
        expect(calls).toBe(4);
        post.mockRestore();
    });
});

describe('fetchAllPages : suit les pages via des chemins relatifs', () => {
    it("n'appelle jamais l'URL absolue `next` renvoyée par DRF", async () => {
        const { fetchAllPages } = await import('./api');
        const urls = [];
        api.defaults.adapter = async (config) => {
            urls.push(config.url);
            const page2 = config.url.includes('page=2');
            const results = page2 ? [{ id: 3 }] : [{ id: 1 }, { id: 2 }];
            const data = { count: 3, previous: null, next: page2 ? null : 'https://kriniback.onrender.com/api/contracts/?page=2', results };
            return { data, status: 200, statusText: 'OK', headers: {}, config };
        };
        const all = await fetchAllPages('contracts/');
        expect(all.map((c) => c.id)).toEqual([1, 2, 3]);
        expect(urls).toEqual(['contracts/', 'contracts/?page=2']);
    });
});

describe('api : langue envoyée au serveur', () => {
    it("ajoute l'en-tête Accept-Language selon la langue choisie", async () => {
        const seen = [];
        api.defaults.adapter = async (config) => {
            seen.push(config.headers['Accept-Language']);
            return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
        };
        localStorage.removeItem('lang');
        await api.get('x/');
        localStorage.setItem('lang', 'ar');
        await api.get('x/');
        localStorage.removeItem('lang');
        expect(seen).toEqual(['fr', 'ar']);
    });
});
