import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import I18nProvider from '../i18n/I18nProvider';
import Vehicles from './Vehicles';
import Payments from './Payments';
import Reservations from './Reservations';
import { fetchAllPages } from '../api';

vi.mock('../api', () => ({
    default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
    fetchAllPages: vi.fn(),
}));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./MessageBox', () => ({ messageBox: { confirm: vi.fn(), danger: vi.fn(), ask: vi.fn() } }));

const VEHICLE = {
    id: 1,
    matricule: '79 1146',
    marque_name: 'Dacia',
    modele_name: 'Logan',
    annee: 2022,
    kilometrage: 45000,
    carburant: 'Diesel',
    statut: 'Available',
    prix_par_jour: '300.00',
    is_archived: false,
    is_deleted: false,
};

const renderPage = (lang, ui) => {
    localStorage.setItem('lang', lang);
    return render(
        <MemoryRouter>
            <I18nProvider>{ui}</I18nProvider>
        </MemoryRouter>,
    );
};

describe('Vehicles page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchAllPages.mockResolvedValue([VEHICLE]);
    });

    it('renders the grid view without crashing (Link was not imported)', async () => {
        renderPage('fr', <Vehicles />);
        await screen.findByText('Gestion de Flotte');
        fireEvent.click(screen.getByRole('radio', { name: /Grille/ }));
        expect(await screen.findByText(/Gérer le véhicule/)).toBeInTheDocument();
    });

    it('is translated to Arabic (title, KPI, table headers, status)', async () => {
        renderPage('ar', <Vehicles />);
        expect(await screen.findByText('إدارة الأسطول')).toBeInTheDocument();
        expect(screen.getByText('إجمالي الأسطول')).toBeInTheDocument();
        expect(screen.getByText('السيارة')).toBeInTheDocument();
        expect(screen.getAllByText('متاحة').length).toBeGreaterThan(0);
    });
});

describe('Payments page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchAllPages.mockResolvedValue([
            { id: 5, contract: 12, payment_method: 'Espèce', reference: '', amount: '150.00', payment_date: '2026-11-18T10:00:00Z' },
        ]);
    });

    it('translates the title, columns and payment method in Arabic', async () => {
        renderPage('ar', <Payments />);
        expect(await screen.findByText('المدفوعات')).toBeInTheDocument();
        expect(screen.getByText('العقد المرتبط')).toBeInTheDocument();
        expect(screen.getAllByText('نقداً').length).toBeGreaterThan(0);
    });

    it('keeps French labels and unknown methods untouched by default', async () => {
        fetchAllPages.mockResolvedValue([{ id: 6, contract: 3, payment_method: 'Crypto', amount: '10', payment_date: '2026-11-18T10:00:00Z' }]);
        renderPage('fr', <Payments />);
        expect(await screen.findByText('Paiements')).toBeInTheDocument();
        expect(screen.getAllByText('Crypto').length).toBeGreaterThan(0);
    });
});

describe('Reservations page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchAllPages.mockResolvedValue([]);
    });

    it('translates headings, tabs and empty state in Arabic', async () => {
        renderPage('ar', <Reservations />);
        await waitFor(() => expect(screen.getAllByText('الحجوزات').length).toBeGreaterThan(0));
        expect(screen.getByText('طلبات العملاء')).toBeInTheDocument();
        expect(screen.getByText('حجز جديد')).toBeInTheDocument();
        expect(screen.getByText('لا توجد حجوزات.')).toBeInTheDocument();
    });
});
