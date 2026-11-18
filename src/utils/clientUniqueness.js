/**
 * Unicité des champs client côté backend (clients/check-unique/).
 * Utilisé par AddClient, AddClientModal et EditClient.
 */
import api from '../api';
import { tNow } from '../i18n/runtime';

// Getters : le libellé suit la langue au moment de l'affichage.
export const UNIQUE_FIELDS = {
    get cin_passport() { return tNow('u.cin_passeport_2'); },
    get email() { return tNow('u.email_2'); },
    get telephone() { return tNow('u.tlphone_2'); },
    get permis_conduite() { return tNow('u.permis_de_conduire_2'); },
};

export const UNIQUE_MSG = (field) =>
    tNow('u.un_client_de_votre_agence_utilis', { field: UNIQUE_FIELDS[field] });

/**
 * Vérifie l'unicité d'une valeur pour un champ donné.
 * @returns {Promise<boolean>} true si la valeur est disponible (ou si la vérif échoue).
 */
export const checkUnique = async ({ field, value, excludeId = null, endpoint = 'clients/check-unique/' }) => {
    const val = value == null ? '' : String(value).trim();
    if (!val) return true;
    try {
        const params = { field, value: val };
        if (excludeId) params.exclude_id = excludeId;
        const res = await api.get(endpoint, { params });
        return res.data.available !== false;
    } catch {
        return true;
    }
};