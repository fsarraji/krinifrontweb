import React from 'react';
import { NavLink } from 'react-router-dom';
import { logout } from '../../api';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useI18n } from '../../i18n/context';

const LINKS = [
    { to: '/espace-client', key: 'client.nav.home', icon: 'home', end: true },
    { to: '/espace-client/contrats', key: 'client.nav.contracts', icon: 'description' },
    { to: '/espace-client/reservations', key: 'client.nav.reservations', icon: 'event_note' },
    { to: '/espace-client/profil', key: 'client.nav.profile', icon: 'person' },
];

// Enveloppe de l'espace client : en-tête de marque, navigation, déconnexion.
// Volontairement distincte de la navigation du personnel (Layout).
export default function ClientLayout({ children }) {
    const { t } = useI18n();
    return (
        <div className="min-h-screen bg-app-bg text-on-surface">
            <header className="bg-white border-b border-stroke sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
                        <span className="font-bold text-sm truncate">
                            Kricar <span className="text-primary">Agency</span>
                        </span>
                        <span className="hidden sm:inline text-label-sm text-text-muted truncate">· {t('client.brand')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher compact />
                        <button
                            type="button"
                            onClick={() => logout()}
                            className="inline-flex items-center gap-1.5 text-label-md font-semibold text-on-surface-variant hover:text-danger-dark px-2 py-1.5 rounded-token focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
                            <span className="hidden sm:inline">{t('client.nav.logout')}</span>
                        </button>
                    </div>
                </div>
                <nav aria-label={t('client.brand')} className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
                    {LINKS.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) =>
                                `inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-label-md font-semibold border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                    isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-on-surface'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{link.icon}</span>
                            {t(link.key)}
                        </NavLink>
                    ))}
                </nav>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        </div>
    );
}
