import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Infractions from './Infractions';
import api from '../api';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ROW = {
    id: 5, reference_pv: 'PV-1', matricule: '37013-A-49', date_infraction: '2026-11-18T10:00:00Z',
    contract: 3, client: 9, client_nom: 'TEST Client', status: 'matched', narsa_missing: [], has_signed_contract: false,
};

const renderPage = () => render(<MemoryRouter><Infractions /></MemoryRouter>);
const pdf = (size = 10) => new File([new Uint8Array(size)], 'signe.pdf', { type: 'application/pdf' });

describe('Infractions - contrat signé fourni à la déclaration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.post.mockResolvedValue({ data: {} });
    });

    it('sends the chosen signed contract as multipart when declaring', async () => {
        api.get.mockResolvedValue({ data: { results: [ROW] } });
        renderPage();
        const button = await screen.findByRole('button', { name: /Déclarer sur NARSA/ });
        fireEvent.click(button);
        fireEvent.change(screen.getByTestId('signed-file'), { target: { files: [pdf()] } });
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        const [path, body] = api.post.mock.calls[0];
        expect(path).toBe('infractions/5/queue/');
        expect(body.get('file').name).toBe('signe.pdf');
    });

    it('refuses files over 10 MB without calling the API', async () => {
        api.get.mockResolvedValue({ data: { results: [ROW] } });
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /Déclarer sur NARSA/ }));
        fireEvent.change(screen.getByTestId('signed-file'), { target: { files: [pdf(11 * 1024 * 1024)] } });
        await new Promise((r) => setTimeout(r, 50));
        expect(api.post).not.toHaveBeenCalled();
    });

    it('retries a failed declaration without asking for the file again', async () => {
        api.get.mockResolvedValue({ data: { results: [{ ...ROW, status: 'failed', has_signed_contract: true }] } });
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: /Réessayer/ }));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('infractions/5/queue/', undefined, undefined));
    });
});
