import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

vi.mock('../api', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn() },
    fetchAllPages: vi.fn().mockResolvedValue([]),
    logout: vi.fn(),
}));

const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const tokenFor = (role) => `${b64({ alg: 'none' })}.${b64({ username: 'demo', role, agency_name: 'Agence Démo', exp: 4102444800 })}.x`;

const renderAt = (path, role) => {
    localStorage.setItem('access_token', tokenFor(role));
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Layout><h1>Contenu de page</h1></Layout>
        </MemoryRouter>,
    );
};

describe('Layout (AppShell Astryx)', () => {
    beforeEach(() => {
        window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    });

    it('affiche le contenu et la navigation de l’agence selon le rôle', () => {
        renderAt('/contracts', 'OWNER');
        expect(screen.getByText('Contenu de page')).toBeInTheDocument();
        expect(screen.getAllByText('Contrats').length).toBeGreaterThan(0);
        expect(screen.queryByText('Gestion Agences')).toBeNull(); // réservé au super admin
    });

    it('marque la page courante comme active (sous-pages incluses)', () => {
        renderAt('/vehicles/edit/3', 'OWNER');
        const current = document.querySelector('[aria-current="page"]');
        expect(current).not.toBeNull();
        expect(current).toHaveAttribute('href', '/vehicles');
    });

    it('montre les pages d’administration au super admin', () => {
        renderAt('/dashboard', 'SUPERADMIN');
        expect(screen.getAllByText('Gestion Agences').length).toBeGreaterThan(0);
        expect(screen.queryByText('Véhicules')).toBeNull();
    });
});
