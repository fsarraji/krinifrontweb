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
