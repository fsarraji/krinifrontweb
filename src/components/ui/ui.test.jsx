import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Modal from './Modal';
import Field from './Field';
import { Input } from './Input';
import Table from './Table';
import Button from './Button';

describe('Modal', () => {
    it('ferme avec Échap et verrouille le scroll', () => {
        const onClose = vi.fn();
        const { rerender } = render(
            <Modal isOpen onClose={onClose} title="Titre"><input aria-label="champ" /></Modal>
        );
        expect(document.body.style.overflow).toBe('hidden');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        rerender(<Modal isOpen={false} onClose={onClose} title="Titre" />);
        expect(document.body.style.overflow).toBe('');
    });

    it('expose un dialogue nommé par son titre et met le focus dans le panneau', () => {
        render(<Modal isOpen onClose={() => {}} title="Mon titre"><input aria-label="champ" /></Modal>);
        const dialog = screen.getByRole('dialog', { name: 'Mon titre' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toContainElement(document.activeElement);
    });

    it('piège le focus (Tab depuis le dernier élément revient au premier)', () => {
        render(
            <Modal isOpen onClose={() => {}} title="T" footer={<button type="button">Valider</button>}>
                <input aria-label="champ" />
            </Modal>
        );
        const last = screen.getByText('Valider');
        last.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(screen.getByLabelText('Fermer'));
    });

    it('ferme au clic sur le fond mais pas dans le panneau', () => {
        const onClose = vi.fn();
        const { container } = render(<Modal isOpen onClose={onClose} title="T">contenu</Modal>);
        fireEvent.click(screen.getByText('contenu'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(container.firstChild);
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
        expect(input.getAttribute('aria-describedby')).toMatch(/hint.*error|error.*hint/);
        expect(screen.getByRole('alert')).toHaveTextContent('Obligatoire');
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
