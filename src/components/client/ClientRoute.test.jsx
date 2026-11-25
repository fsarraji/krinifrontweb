import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClientRoute from './ClientRoute';
import { setTokens } from '../../utils/session';

// La vraie enveloppe charge la navigation et la langue : on la remplace par un conteneur neutre.
vi.mock('./ClientLayout', () => ({ default: ({ children }) => <div data-testid="client-layout">{children}</div> }));

const jwt = (claims) => {
    const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '');
    return `${enc({ alg: 'x' })}.${enc(claims)}.s`;
};

const renderAt = (path) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/login" element={<p>login page</p>} />
                <Route path="/dashboard" element={<p>dashboard page</p>} />
                <Route path="/espace-client" element={<ClientRoute />}>
                    <Route index element={<p>client home</p>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

describe('ClientRoute', () => {
    it('renvoie vers la connexion sans session', () => {
        renderAt('/espace-client');
        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('laisse passer un compte CLIENT dans son enveloppe', () => {
        setTokens({ access: jwt({ role: 'CLIENT' }), refresh: 'r' });
        renderAt('/espace-client');
        expect(screen.getByTestId('client-layout')).toBeInTheDocument();
        expect(screen.getByText('client home')).toBeInTheDocument();
    });

    it('renvoie le personnel vers son tableau de bord', () => {
        setTokens({ access: jwt({ role: 'OWNER' }), refresh: 'r' });
        renderAt('/espace-client');
        expect(screen.getByText('dashboard page')).toBeInTheDocument();
    });
});
