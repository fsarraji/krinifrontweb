import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FormActions from './FormActions';
import ErrorBanner from './ErrorBanner';
import MoneyInput from './MoneyInput';
import PageHeader from './PageHeader';
import StatusBadge from './StatusBadge';

describe('FormActions', () => {
    it('affiche Annuler, Retour et le bouton principal dans cet ordre', () => {
        render(<FormActions onCancel={() => {}} onBack={() => {}} onSubmit={() => {}} submitLabel="Suivant" />);
        const labels = screen.getAllByRole('button').map((b) => b.textContent.replace('chevron_left', '').trim());
        expect(labels).toEqual(['Annuler', 'Précédent', 'Suivant']);
    });

    it('déclenche onSubmit et onCancel', () => {
        const onSubmit = vi.fn();
        const onCancel = vi.fn();
        render(<FormActions onCancel={onCancel} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('désactive Annuler pendant le chargement', () => {
        render(<FormActions onCancel={() => {}} onSubmit={() => {}} loading />);
        expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    });
});

describe('ErrorBanner', () => {
    it('affiche le message et le bouton Réessayer', () => {
        const onRetry = vi.fn();
        render(<ErrorBanner message="Échec du chargement" onRetry={onRetry} />);
        expect(screen.getByText('Échec du chargement')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
        expect(onRetry).toHaveBeenCalled();
    });

    it("ne rend rien sans message", () => {
        const { container } = render(<ErrorBanner />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe('MoneyInput', () => {
    it('affiche la devise unique comme unité', () => {
        render(<MoneyInput label="Montant" value="12.5" onChange={() => {}} />);
        expect(screen.getByText('MAD')).toBeInTheDocument();
    });
});

describe('PageHeader', () => {
    it('utilise h2 par défaut et h1 avec as="h1"', () => {
        const { rerender } = render(<MemoryRouter><PageHeader title="Liste" /></MemoryRouter>);
        expect(screen.getByRole('heading', { level: 2, name: 'Liste' })).toBeInTheDocument();
        rerender(<MemoryRouter><PageHeader title="Formulaire" as="h1" back /></MemoryRouter>);
        expect(screen.getByRole('heading', { level: 1, name: 'Formulaire' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument();
    });
});

describe('StatusBadge', () => {
    it('affiche le statut de facture EMISE traduit', () => {
        render(<StatusBadge status="EMISE" />);
        expect(screen.getByText('Émise')).toBeInTheDocument();
    });
});
