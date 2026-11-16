/**
 * Unicité des champs client côté backend (clients/check-unique/).
 * Utilisé par AddClient, AddClientModal et EditClient.
 */
import api from '../api';

export const UNIQUE_FIELDS = {
    cin_passport: 'CIN/passeport',
    email: 'email',
    telephone: 'téléphone',
    permis_conduite: 'permis de conduire',
};

export const UNIQUE_MSG = (field) =>
    `Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.`;

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