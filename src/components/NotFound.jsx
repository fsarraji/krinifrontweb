import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--slate-bg)', color: 'var(--on-surface)' }}>
            <div className="text-center space-y-4 p-8">
                <p className="text-[64px] font-extrabold leading-none" style={{ color: 'var(--primary-container)' }}>404</p>
                <h1 className="text-2xl font-bold">Page introuvable</h1>
                <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                    L'URL demandée n'existe pas ou a été déplacée.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--primary-container)' }}
                >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    Retour au tableau de bord
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
