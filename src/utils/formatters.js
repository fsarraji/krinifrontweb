/**
 * Formatters partagés (affichage FR).
 */
export const fmt = (v, suffix = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`);
export const fmtNum = (v, suffix = '') => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('fr-FR')}${suffix}`);
export const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(String(iso).slice(0, 10));
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const OUI_NON = (v) => (v ? 'Oui' : 'Non');