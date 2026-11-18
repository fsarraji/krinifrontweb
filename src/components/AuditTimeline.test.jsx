import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuditTimeline from './AuditTimeline';
import api from '../api';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

describe('AuditTimeline', () => {
    beforeEach(() => vi.clearAllMocks());

    it('requests the history of the given object', async () => {
        api.get.mockResolvedValue({ data: [] });
        render(<AuditTimeline model="contract" id="42" />);
        await screen.findByText(/Aucun historique enregistré/);
        expect(api.get).toHaveBeenCalledWith('audit/', { params: { model: 'contract', id: '42' } });
    });

    it('shows who changed what, with old and new values', async () => {
        api.get.mockResolvedValue({
            data: [
                {
                    id: 2,
                    date: '2026-11-18T10:00:00Z',
                    type: 'updated',
                    user: 'acherifi',
                    changes: [{ field: 'prix_par_jour', old: '250.00', new: '350.00' }],
                },
                { id: 1, date: '2026-11-17T09:00:00Z', type: 'created', user: null, changes: [] },
            ],
        });
        render(<AuditTimeline model="vehicle" id="7" />);
        expect(await screen.findByText('Modification')).toBeInTheDocument();
        expect(screen.getByText(/acherifi/)).toBeInTheDocument();
        expect(screen.getByText('prix_par_jour')).toBeInTheDocument();
        expect(screen.getByText(/250.00 → 350.00/)).toBeInTheDocument();
        expect(screen.getByText('Création')).toBeInTheDocument();
        expect(screen.getByText(/système/)).toBeInTheDocument();
    });

    it('shows the server error message', async () => {
        api.get.mockRejectedValue({ response: { status: 403, data: { detail: 'Accès refusé.' } } });
        render(<AuditTimeline model="client" id="1" />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé.');
    });
});
