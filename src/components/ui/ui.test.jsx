import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Modal from './Modal';
import Field from './Field';
import { Input } from './Input';
import Table from './Table';
import Button from './Button';

describe('Modal (Dialog Astryx)', () => {
    // Échap, piège de focus et clic sur le fond sont gérés par <dialog> natif (non émulé par jsdom).
    it('affiche un dialogue nommé par son titre, avec contenu et pied de page', () => {
        render(
            <Modal isOpen onClose={() => {}} title="Mon titre" subtitle="Sous-titre" footer={<button type="button">Valider</button>}>
                <input aria-label="champ" />
            </Modal>
        );
        const dialog = screen.getByRole('dialog', { name: /Mon titre/ });
        expect(dialog).toContainElement(screen.getByLabelText('champ'));
        expect(dialog).toContainElement(screen.getByText('Valider'));
        expect(screen.getByText('Sous-titre')).toBeInTheDocument();
    });

    it("n'expose aucun dialogue quand il est fermé", () => {
        render(<Modal isOpen={false} onClose={() => {}} title="Caché">contenu</Modal>);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('appelle onClose depuis le bouton de fermeture', () => {
        const onClose = vi.fn();
        render(<Modal isOpen onClose={onClose} title="T">contenu</Modal>);
        fireEvent.click(screen.getByRole('button', { name: /fermer|close/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('Field', () => {
    it('relie label, erreur et contrôle', () => {
        render(
            <Field label="Nom" required error="Obligatoire" hint="Aide">
                <Input />
            </Field>
        );
        const input = screen.getByLabelText(/Nom/);
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAttribute('aria-required', 'true');
        // Astryx relie l'aide et l'erreur au champ via aria-describedby (identifiants générés)
        const described = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        expect(described.length).toBeGreaterThan(0);
        expect(document.body).toHaveTextContent('Aide');
        expect(document.body).toHaveTextContent('Obligatoire');
    });
});

describe('Table', () => {
    const columns = [
        { key: 'name', label: 'Nom', sortable: true },
        { key: 'amount', label: 'Montant', sortable: true, align: 'right' },
    ];
    const rows = [
        { id: 1, name: 'Beta', amount: 10 },
        { id: 2, name: 'Alpha', amount: 200 },
        { id: 3, name: 'Gamma', amount: 5 },
    ];
    const order = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent);

    it('trie en numérique puis inverse puis réinitialise', () => {
        render(<Table columns={columns} rows={rows} />);
        fireEvent.click(screen.getByRole('button', { name: /Montant/ }));
        expect(order()).toEqual(['Gamma5', 'Beta10', 'Alpha200']);
        fireEvent.click(screen.getByRole('button', { name: /Montant/ }));
        expect(order()).toEqual(['Alpha200', 'Beta10', 'Gamma5']);
        fireEvent.click(screen.getByRole('button', { name: /Montant/ }));
        expect(order()).toEqual(['Beta10', 'Alpha200', 'Gamma5']);
    });

    it('affiche l\'état vide', () => {
        render(<Table columns={columns} rows={[]} emptyTitle="Rien ici" />);
        expect(screen.getByText('Rien ici')).toBeInTheDocument();
    });
});

describe('Button', () => {
    it('est désactivé pendant le chargement', () => {
        render(<Button loading>Envoyer</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
