import { describe, it, expect } from 'vitest';
import { clearSession, getClaims, hasSession, homePathFor, setTokens } from './session';

const fakeJwt = (claims) => {
    const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${enc({ alg: 'HS256' })}.${enc(claims)}.sig`;
};

describe('session', () => {
    it('hasSession est faux sans tokens', () => {
        expect(hasSession()).toBe(false);
    });

    it('lit les claims du JWT', () => {
        setTokens({ access: fakeJwt({ role: 'OWNER', username: 'bob' }), refresh: 'r' });
        expect(getClaims()).toMatchObject({ role: 'OWNER', username: 'bob' });
        expect(hasSession()).toBe(true);
    });

    it('un token illisible n\'ouvre pas de session', () => {
        setTokens({ access: 'not-a-jwt', refresh: 'r' });
        expect(getClaims()).toBeNull();
        expect(hasSession()).toBe(false);
    });

    it('clearSession efface les tokens mais garde la préférence de sidebar', () => {
        setTokens({ access: fakeJwt({ role: 'OWNER' }), refresh: 'r' });
        localStorage.setItem('sidebar_collapsed', 'true');
        clearSession();
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('sidebar_collapsed')).toBe('true');
    });
});

describe('homePathFor', () => {
    it('envoie le client vers son espace et le personnel vers le tableau de bord', () => {
        expect(homePathFor('CLIENT')).toBe('/espace-client');
        expect(homePathFor('OWNER')).toBe('/dashboard');
        expect(homePathFor(undefined)).toBe('/dashboard');
    });
});
