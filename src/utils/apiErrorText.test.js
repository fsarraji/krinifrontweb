import { describe, expect, it } from 'vitest';
import { apiErrorText, errorTextFromData, fieldErrors } from './apiErrorText';

const axiosError = (data, status = 400) => ({ response: { status, data } });

describe('apiErrorText', () => {
    it('reads {detail}', () => {
        expect(apiErrorText(axiosError({ detail: 'Ce véhicule a une location en cours.' }))).toBe(
            'Ce véhicule a une location en cours.',
        );
    });

    it('reads a bare list (ValidationError raised outside a serializer)', () => {
        expect(apiErrorText(axiosError(["Ce véhicule vient d'être réservé."]))).toBe("Ce véhicule vient d'être réservé.");
    });

    it('labels field errors', () => {
        expect(apiErrorText(axiosError({ amount: ['Le montant dépasse le reste à payer (100).'] }))).toBe(
            'Montant : Le montant dépasse le reste à payer (100).',
        );
    });

    it('reads non_field_errors without a label', () => {
        expect(apiErrorText(axiosError({ non_field_errors: ['Dates invalides.'] }))).toBe('Dates invalides.');
    });

    it('joins several messages', () => {
        expect(apiErrorText(axiosError({ matricule: ['Déjà utilisé.'], client: ['Requis.'] }))).toBe(
            'Matricule : Déjà utilisé. Client : Requis.',
        );
    });

    it('falls back on HTML error pages and empty bodies', () => {
        expect(errorTextFromData('<html>500</html>', 'Erreur')).toBe('Erreur');
        expect(errorTextFromData({}, 'Erreur')).toBe('Erreur');
        expect(errorTextFromData(null, 'Erreur')).toBe('Erreur');
    });

    it('reports a network failure when there is no response', () => {
        expect(apiErrorText({ request: {} }, 'x')).toMatch(/contacter le serveur/);
        expect(apiErrorText(new Error('boom'), 'Echec')).toBe('Echec');
    });
});

describe('fieldErrors', () => {
    it('returns per-field messages and ignores detail', () => {
        expect(fieldErrors(axiosError({ amount: ['Trop élevé.'], detail: 'x' }))).toEqual({ amount: 'Trop élevé.' });
    });

    it('returns {} for non-object bodies', () => {
        expect(fieldErrors(axiosError(['a']))).toEqual({});
        expect(fieldErrors({})).toEqual({});
    });
});
