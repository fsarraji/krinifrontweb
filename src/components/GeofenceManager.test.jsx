import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeofenceManager from './GeofenceManager';
import api from '../api';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./MessageBox', () => ({ messageBox: { ask: vi.fn().mockResolvedValue(true) } }));

const ZONE = { id: 4, name: 'Casablanca', latitude: 33.5731, longitude: -7.5898, radius_m: 30000, is_active: true };

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('GeofenceManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation(async (path) => {
            if (path === 'geofences/status/') return { data: { zones: 1, outside: [] } };
            return { data: [ZONE] };
        });
    });

    it('lists zones with their radius in km', async () => {
        render(<GeofenceManager canEdit />);
        expect(await screen.findByText('Casablanca')).toBeInTheDocument();
        expect(screen.getByText(/rayon 30\.0 km/)).toBeInTheDocument();
    });

    it('validates the form locally without calling the API', async () => {
        render(<GeofenceManager canEdit />);
        await screen.findByText('Casablanca');
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter la zone' }));
        expect((await screen.findAllByText('Le nom est obligatoire.')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Latitude entre -90 et 90.').length).toBeGreaterThan(0);
        expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects out-of-range coordinates', async () => {
        render(<GeofenceManager canEdit />);
        await screen.findByText('Casablanca');
        fill('Nom', 'Test');
        fill('Latitude', '95');
        fill('Longitude', '-200');
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter la zone' }));
        expect((await screen.findAllByText('Latitude entre -90 et 90.')).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Longitude entre -180 et 180.').length).toBeGreaterThan(0);
        expect(api.post).not.toHaveBeenCalled();
    });

    it('posts a zone converting the radius from km to meters', async () => {
        api.post.mockResolvedValue({ data: {} });
        render(<GeofenceManager canEdit />);
        await screen.findByText('Casablanca');
        fill('Nom', 'Rabat');
        fill('Latitude', '34.0209');
        fill('Longitude', '-6.8416');
        fill('Rayon (km)', '12.5');
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter la zone' }));
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        expect(api.post).toHaveBeenCalledWith('geofences/', {
            name: 'Rabat',
            latitude: 34.0209,
            longitude: -6.8416,
            radius_m: 12500,
            is_active: true,
        });
    });

    it('does not submit the parent form when pressing Enter in a field', async () => {
        api.post.mockResolvedValue({ data: {} });
        const onSubmit = vi.fn((e) => e.preventDefault());
        render(<form onSubmit={onSubmit}><GeofenceManager canEdit /></form>);
        await screen.findByText('Casablanca');
        fill('Nom', 'Fès');
        fill('Latitude', '34.03');
        fill('Longitude', '-5');
        fireEvent.keyDown(screen.getByLabelText('Nom'), { key: 'Enter' });
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('is read-only for non-owners', async () => {
        render(<GeofenceManager canEdit={false} />);
        await screen.findByText('Casablanca');
        expect(screen.queryByRole('button', { name: 'Ajouter la zone' })).toBeNull();
        expect(screen.queryByLabelText(/Supprimer la zone/)).toBeNull();
        expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('reports vehicles outside the zones on demand', async () => {
        api.get.mockImplementation(async (path) => {
            if (path === 'geofences/status/') {
                return {
                    data: {
                        zones: 1,
                        outside: [{ contract_id: 9, matricule: '79 1146', client: 'Aya Benali', nearest_zone: 'Casablanca', distance_outside_m: 56000 }],
                    },
                };
            }
            return { data: [ZONE] };
        });
        render(<GeofenceManager canEdit />);
        await screen.findByText('Casablanca');
        fireEvent.click(screen.getByRole('button', { name: /Vérifier maintenant/ }));
        expect(await screen.findByText(/79 1146/)).toBeInTheDocument();
        expect(screen.getByText(/à 56.0 km de la zone/)).toBeInTheDocument();
    });

    it('deletes a zone after confirmation', async () => {
        api.delete.mockResolvedValue({});
        render(<GeofenceManager canEdit />);
        fireEvent.click(await screen.findByLabelText('Supprimer la zone Casablanca'));
        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('geofences/4/'));
    });
});
