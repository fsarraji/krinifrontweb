import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContractPhotos from './ContractPhotos';
import api from '../api';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('./Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./MessageBox', () => ({ messageBox: { ask: vi.fn().mockResolvedValue(true) } }));
// Pas de canvas dans jsdom : on renvoie le fichier tel quel
vi.mock('../utils/imageUtils', () => ({ optimizeImageFile: vi.fn(async (file) => file) }));

const PHOTO = { id: 3, kind: 'DEPART', image: 'https://cdn.example.com/p.jpg', caption: '' };

const pickFile = (file) => {
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
};

describe('ContractPhotos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: { results: [PHOTO] } });
    });

    it('lists photos of the contract', async () => {
        render(<ContractPhotos contractId="12" />);
        const img = await screen.findByRole('img');
        expect(img).toHaveAttribute('src', PHOTO.image);
        expect(api.get).toHaveBeenCalledWith('contract-photos/', { params: { contract: '12' } });
    });

    it('uploads the chosen image as multipart with contract and kind', async () => {
        api.post.mockResolvedValue({ data: {} });
        render(<ContractPhotos contractId="12" />);
        await screen.findByRole('img');
        pickFile(new File([new Uint8Array(10)], 'avant.jpg', { type: 'image/jpeg' }));
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        const [path, form] = api.post.mock.calls[0];
        expect(path).toBe('contract-photos/');
        expect(form).toBeInstanceOf(FormData);
        expect(form.get('contract')).toBe('12');
        expect(form.get('kind')).toBe('DEPART');
        expect(form.get('image')).toBeInstanceOf(File);
    });

    it('rejects non-image files without calling the API', async () => {
        render(<ContractPhotos contractId="12" />);
        await screen.findByRole('img');
        pickFile(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
        await new Promise((r) => setTimeout(r, 20));
        expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects images larger than 10 MB', async () => {
        render(<ContractPhotos contractId="12" />);
        await screen.findByRole('img');
        const big = new File([new Uint8Array(1)], 'big.jpg', { type: 'image/jpeg' });
        Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
        pickFile(big);
        await new Promise((r) => setTimeout(r, 20));
        expect(api.post).not.toHaveBeenCalled();
    });

    it('deletes a photo after confirmation and removes it from the list', async () => {
        api.delete.mockResolvedValue({});
        render(<ContractPhotos contractId="12" />);
        fireEvent.click(await screen.findByLabelText(/Supprimer la photo/));
        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('contract-photos/3/'));
        await waitFor(() => expect(screen.queryByRole('img')).toBeNull());
    });

    it('is read-only when locked', async () => {
        render(<ContractPhotos contractId="12" locked />);
        await screen.findByRole('img');
        expect(screen.queryByLabelText('Choisir une photo')).toBeNull();
        expect(screen.queryByLabelText(/Supprimer la photo/)).toBeNull();
    });
});
