import React from 'react';

/**
 * Formatters partagés pour les modales d'information.
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

/**
 * Ligne d'information (clé: valeur) pour les fiches.
 */
export const Row = ({ icon, label, value, strong }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-stroke last:border-0">
        <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.8 }}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
        </span>
        <span className={`text-[13px] ${strong ? 'font-bold' : 'font-semibold'}`} style={{ color: strong ? 'var(--primary-container)' : 'var(--on-surface)' }}>
            {value}
        </span>
    </div>
);

/**
 * Section titrée pour les fiches.
 */
export const Section = ({ title, children }) => (
    <div className="mt-5">
        <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{title}</p>
        <div className="card rounded-token p-4 shadow-l1">{children}</div>
    </div>
);

/**
 * Coquille de modale réutilisable.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string
 * - subtitle?: string
 * - children: ReactNode
 */
const InfoModal = ({ isOpen, onClose, title, subtitle, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold font-headline text-on-surface">{title}</h2>
                        {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>
                <div className="overflow-y-auto p-6 bg-surface flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
