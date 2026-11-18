/**
 * Transforme une erreur axios (ou un corps de réponse DRF) en message lisible.
 *
 * Formes gérées : texte brut, liste de messages (ValidationError levée hors
 * serializer), { detail }, { non_field_errors: [...] }, { champ: ["msg"] } et
 * objets imbriqués. Retourne `fallback` si rien d'exploitable n'est trouvé
 * (ou une page HTML d'erreur serveur).
 */
const FIELD_LABELS = {
    amount: 'Montant',
    contract: 'Contrat',
    payment_method: 'Mode de paiement',
    reference: 'Référence',
    date_retour_prevue: 'Date de retour',
    date_sortie: 'Date de départ',
    vehicle: 'Véhicule',
    client: 'Client',
    km_retour: 'Kilométrage de retour',
    matricule: 'Matricule',
    permis_conduite: 'Permis de conduire',
    cin_passport: 'CIN / Passeport',
};

const collect = (value, label, out) => {
    if (value == null) return;
    if (typeof value === 'string') {
        const text = value.trim();
        if (text) out.push(label ? `${label} : ${text}` : text);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((v) => collect(v, label, out));
        return;
    }
    if (typeof value === 'object') {
        Object.entries(value).forEach(([key, v]) => {
            if (key === 'detail' || key === 'message' || key === 'non_field_errors') {
                collect(v, label, out);
            } else {
                collect(v, FIELD_LABELS[key] || key, out);
            }
        });
    }
};

export const errorTextFromData = (data, fallback = 'Une erreur est survenue.') => {
    if (data == null) return fallback;
    // Page HTML (erreur 500 d'un proxy/serveur) : ne pas l'afficher telle quelle
    if (typeof data === 'string' && /^\s*</.test(data)) return fallback;
    const out = [];
    collect(data, '', out);
    return out.length ? out.join(' ') : fallback;
};

export const apiErrorText = (err, fallback = 'Une erreur est survenue.') => {
    if (err?.response) return errorTextFromData(err.response.data, fallback);
    if (err?.request) return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    return fallback;
};

/** Erreurs par champ ({ amount: "..." }) pour afficher un message sous chaque champ. */
export const fieldErrors = (err) => {
    const data = err?.response?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const result = {};
    Object.entries(data).forEach(([key, value]) => {
        if (key === 'detail' || key === 'non_field_errors') return;
        const out = [];
        collect(value, '', out);
        if (out.length) result[key] = out.join(' ');
    });
    return result;
};

export default apiErrorText;
