/**
 * Formatters partagés (affichage FR). Source unique pour dates, nombres et montants :
 * ne plus appeler toLocale*() ni écrire "DH"/"MAD" à la main dans les composants.
 */
export const CURRENCY = 'MAD';
const LOCALE = 'fr-FR';

const toDate = (v) => {
    if (!v) return null;
    // "YYYY-MM-DD" seul : on évite le décalage de fuseau en le traitant comme date locale.
    const s = String(v);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const fmt = (v, suffix = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`);

export const formatNumber = (v, suffix = '') => {
    if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
    return `${Number(v).toLocaleString(LOCALE)}${suffix}`;
};

// Montant avec 2 décimales et devise unique (ex. « 1 200,00 MAD »).
export const formatMoney = (v, { decimals = 2, currency = CURRENCY } = {}) => {
    if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
    const n = Number(v).toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${n} ${currency}`;
};

export const formatDate = (v, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString(LOCALE, opts) : '—';
};

export const formatDateTime = (v) => {
    const d = toDate(v);
    return d
        ? d.toLocaleString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';
};

// Rétro-compatibilité (utilisés par les modales d'information existantes).
export const fmtNum = formatNumber;
export const fmtDate = (iso) => formatDate(iso, { day: '2-digit', month: 'short', year: 'numeric' });
export const OUI_NON = (v) => (v ? 'Oui' : 'Non');
