import React from 'react';
import Modal from './Modal';

/**
 * Ligne d'information (clé: valeur) pour les fiches.
 */
export const Row = ({ icon, label, value, strong }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-stroke last:border-0">
        <span className="flex items-center gap-2 text-label-md text-text-muted">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
            {label}
        </span>
        <span className={`text-label-md text-right ${strong ? 'font-bold text-primary' : 'font-semibold text-on-surface'}`}>
            {value}
        </span>
    </div>
);

/**
 * Section titrée pour les fiches.
 */
export const Section = ({ title, children }) => (
    <div className="mt-5 first:mt-0">
        <p className="text-label-sm uppercase tracking-wider mb-1.5 text-text-muted">{title}</p>
        <div className="card rounded-token p-4 shadow-l1">{children}</div>
    </div>
);

/**
 * Coquille de modale d'information (basée sur ui/Modal : Échap, focus, scroll lock).
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string
 * - subtitle?: string
 * - children: ReactNode
 */
const InfoModal = ({ isOpen, onClose, title, subtitle, children }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} size="lg">
        {children}
    </Modal>
);

export default InfoModal;
