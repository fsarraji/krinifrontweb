import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContractFees from './ContractFees';
import api from '../api';
import { setTokens } from '../utils/session';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./MessageBox', () => ({ messageBox: { ask: vi.fn().mockResolvedValue(true) } }));

const jwt = (claims) => {
    const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '');
    return `${enc({ alg: 'x' })}.${enc(claims)}.s`;
};

const FEE = { id: 7, kind: 'RETARD', kind_label: 'Retard de restitution', amount: '150.00', description: '', date: '2026-11-18' };

describe('ContractFees', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { results: [FEE] } });
    });

    it('lists the fees of the contract and requests them by contract id', async () => {
        render(<ContractFees contractId="12" />);
        expect((await screen.findAllByText('Retard de restitution')).length).toBeGreaterThan(0);
        expect(api.get).toHaveBeenCalledWith('contract-fees/', { params: { contract: '12' } });
    });

    it('rejects a zero amount without calling the API', async () => {
        render(<ContractFees contractId="12" />);
        await screen.findAllByText('Retard de restitution');
        fireEvent.change(screen.getByPlaceholderText('Ex : 150'), { target: { value: '0' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Ajouter' }).closest('form'));
        expect(await screen.findByText('Le montant doit être supérieur à zéro.')).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('posts a new fee and notifies the parent so balances are refreshed', async () => {
        api.post.mockResolvedValue({ data: {} });
        const onChanged = vi.fn();
        render(<ContractFees contractId="12" onChanged={onChanged} />);
        await screen.findAllByText('Retard de restitution');
        const amount = screen.getByPlaceholderText('Ex : 150');
        fireEvent.change(amount, { target: { value: '75.5' } });
        fireEvent.blur(amount); // NumberInput Astryx valide la saisie au blur / Entrée
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        expect(api.post.mock.calls[0][1]).toMatchObject({ contract: 12, kind: 'RETARD', amount: '75.50' });
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('shows the server amount error under the field', async () => {
        api.post.mockRejectedValue({ response: { status: 400, data: { amount: ['Le montant doit être supérieur à zéro.'] } } });
        render(<ContractFees contractId="12" />);
        await screen.findAllByText('Retard de restitution');
        const amount = screen.getByPlaceholderText('Ex : 150');
        fireEvent.change(amount, { target: { value: '10' } });
        fireEvent.blur(amount);
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
        expect(await screen.findByText('Le montant doit être supérieur à zéro.')).toBeInTheDocument();
    });

    it('hides the delete button for non-owners and shows it for the owner', async () => {
        const { unmount } = render(<ContractFees contractId="12" />);
        await screen.findAllByText('Retard de restitution');
        expect(screen.queryByLabelText(/Supprimer le frais/)).toBeNull();
        unmount();

        setTokens({ access: jwt({ role: 'OWNER' }), refresh: 'r' });
        render(<ContractFees contractId="12" />);
        expect(await screen.findByLabelText(/Supprimer le frais/)).toBeInTheDocument();
    });

    it('hides the add form when the contract is locked (cancelled)', async () => {
        render(<ContractFees contractId="12" locked />);
        await screen.findAllByText('Retard de restitution');
        expect(screen.queryByPlaceholderText('Ex : 150')).toBeNull();
    });
});
