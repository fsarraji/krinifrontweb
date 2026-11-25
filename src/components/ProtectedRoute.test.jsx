import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { setTokens } from '../utils/session';

// Le vrai Layout charge toute l'UI : on le remplace par un simple conteneur.
vi.mock('./Layout', () => ({ default: ({ children }) => <div data-testid="layout">{children}</div> }));

const jwt = (claims) => {
    const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '');
    return `${enc({ alg: 'x' })}.${enc(claims)}.s`;
};

const renderAt = (path, roles) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/login" element={<p>login page</p>} />
                <Route path="/espace-client" element={<p>client home</p>} />
                <Route path="/dashboard" element={<p>dashboard page</p>} />
                <Route element={<ProtectedRoute roles={roles} />}>
                    <Route path="/secret" element={<p>secret page</p>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

describe('ProtectedRoute', () => {
    it('redirige vers /login sans session', () => {
        renderAt('/secret');
        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('laisse passer un OWNER', () => {
        setTokens({ access: jwt({ role: 'OWNER' }), refresh: 'r' });
        renderAt('/secret');
        expect(screen.getByText('secret page')).toBeInTheDocument();
    });

    it('renvoie un compte CLIENT vers son espace, sans accès au personnel', () => {
        setTokens({ access: jwt({ role: 'CLIENT' }), refresh: 'r' });
        renderAt('/secret');
        expect(screen.getByText('client home')).toBeInTheDocument();
    });

    it('renvoie un OWNER hors d\'une route SUPERADMIN vers le dashboard', () => {
        setTokens({ access: jwt({ role: 'OWNER' }), refresh: 'r' });
        renderAt('/secret', ['SUPERADMIN']);
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
    });
});
