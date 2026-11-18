import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import NotificationCenter from './NotificationCenter';
import UserMenu from './ui/UserMenu';
import LanguageSwitcher from './ui/LanguageSwitcher';
import { useI18n } from '../i18n/context';
import { logout } from '../api';

const OPS_STAFF = ['OWNER', 'EMPLOYEE'];

const NAV_SECTIONS = [
    {
        titleKey: 'nav.section.operations',
        items: [
            { path: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard', roles: ['ALL'] },
            { path: '/vehicles', labelKey: 'nav.vehicles', icon: 'directions_car', roles: OPS_STAFF },
            { path: '/gps', labelKey: 'nav.gps', icon: 'satellite_alt', roles: OPS_STAFF },
            { path: '/reservations', labelKey: 'nav.reservations', icon: 'event_note', roles: OPS_STAFF },
            { path: '/calendar', labelKey: 'nav.calendar', icon: 'calendar_month', roles: OPS_STAFF },
            { path: '/contracts', labelKey: 'nav.contracts', icon: 'description', roles: OPS_STAFF },
            { path: '/maintenance', labelKey: 'nav.maintenance', icon: 'build', roles: OPS_STAFF },
        ],
    },
    {
        titleKey: 'nav.section.management',
        items: [
            { path: '/clients', labelKey: 'nav.clients', icon: 'group', roles: OPS_STAFF },
            { path: '/payments', labelKey: 'nav.payments', icon: 'payments', roles: OPS_STAFF },
            { path: '/expenses', labelKey: 'nav.expenses', icon: 'receipt_long', roles: OPS_STAFF },
            { path: '/invoices', labelKey: 'nav.invoices', icon: 'request_quote', roles: OPS_STAFF },
            { path: '/reports', labelKey: 'nav.reports', icon: 'analytics', roles: OPS_STAFF },
            { path: '/admin/agencies', labelKey: 'nav.agencies', icon: 'admin_panel_settings', roles: ['SUPERADMIN'] },
            { path: '/admin/subscriptions', labelKey: 'nav.subscriptions', icon: 'workspace_premium', roles: ['SUPERADMIN'] },
            { path: '/admin/users', labelKey: 'nav.users', icon: 'manage_accounts', roles: ['SUPERADMIN'] },
        ],
    },
];

// Un lien est actif sur son chemin exact ou sur ses sous-pages (/vehicles/edit/3 → Véhicules).
const isActivePath = (pathname, itemPath) =>
    pathname === itemPath || pathname.startsWith(`${itemPath}/`);

const Layout = ({ children }) => {
    const location = useLocation();
    const { t, dir } = useI18n();
    const [notificationCount, setNotificationCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    // Le tiroir mobile est lié au chemin où il a été ouvert : changer de page le referme sans effet.
    const [drawerPath, setDrawerPath] = useState(null);
    const mobileOpen = drawerPath === location.pathname;
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

    const [session] = useState(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        try {
            const decoded = jwtDecode(token);
            return {
                agencyName: decoded.agency_name,
                userRole: decoded.role || 'Admin',
                userName: decoded.username,
            };
        } catch (error) {
            console.error('Erreur de lecture du token', error);
            return null;
        }
    });

    useEffect(() => {
        if (session === null) {
            logout();
        }
    }, [session]);

    const closeMobile = useCallback(() => setDrawerPath(null), []);
    useEffect(() => {
        if (!mobileOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && closeMobile();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [mobileOpen, closeMobile]);

    const agencyName = session?.agencyName || t('layout.yourAgency');
    const userRole = session?.userRole || '';
    const userName = session?.userName || '';

    const toggleCollapse = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    // Sur mobile le tiroir est toujours déployé (jamais en mode icônes seules).
    const compact = isCollapsed;

    return (
        <div className="flex min-h-screen antialiased bg-app-bg text-on-surface">
            {/* Barre supérieure mobile */}
            <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 bg-white border-b border-stroke flex items-center justify-between px-4">
                <button
                    type="button"
                    onClick={() => setDrawerPath(location.pathname)}
                    className="p-2 -ms-2 rounded-token text-on-surface-variant hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    aria-label={t('layout.openMenu')}
                    aria-expanded={mobileOpen}
                    aria-controls="app-sidebar"
                >
                    <span className="material-symbols-outlined" aria-hidden="true">menu</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
                    <span className="font-bold text-sm truncate">
                        Kricar <span className="text-primary">Agency</span>
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                    className="relative p-2 -me-2 rounded-token text-on-surface-variant hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    aria-label={notificationCount > 0 ? t('layout.notificationsUnread', { count: notificationCount }) : t('layout.notifications')}
                >
                    <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
                    {notificationCount > 0 && (
                        <span className="absolute top-1 end-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-danger">
                            {notificationCount}
                        </span>
                    )}
                </button>
            </header>

            {/* Fond du tiroir (mobile) */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-sm"
                    onClick={closeMobile}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar : tiroir sous lg, collante et repliable à partir de lg */}
            <aside
                id="app-sidebar"
                className={`fixed lg:sticky top-0 inset-y-0 start-0 h-screen w-[280px] ${compact ? 'lg:w-[80px]' : 'lg:w-[280px]'}
                    flex-shrink-0 flex flex-col justify-between bg-white border-e border-stroke
                    transition-all duration-300 z-50 lg:z-30
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0'}`}
                data-purpose="sidebar"
            >
                {/* Bouton de repli (desktop) */}
                <button
                    type="button"
                    onClick={toggleCollapse}
                    className="hidden lg:flex absolute -end-3.5 top-6 w-7 h-7 rounded-full bg-white border border-stroke shadow-l1 text-text-muted hover:text-primary items-center justify-center cursor-pointer transition-all duration-200 z-40 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    title={compact ? t('layout.expandMenu') : t('layout.collapseMenu')}
                    aria-label={compact ? t('layout.expandMenu') : t('layout.collapseMenu')}
                >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        {compact !== (dir === 'rtl') ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                <div className="flex flex-col min-h-0 flex-1">
                    {/* En-tête agence */}
                    <div className={`h-[72px] flex items-center border-b border-stroke ${compact ? 'lg:justify-center lg:p-2 gap-3 px-6' : 'gap-3 px-6'}`}>
                        <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain flex-shrink-0" />
                        <div className={`overflow-hidden min-w-0 flex-1 ${compact ? 'lg:hidden' : ''}`}>
                            <h1 className="font-bold text-[15px] tracking-tight leading-none truncate" title="Kricar Agency">
                                <span className="text-black">Kricar</span> <span className="text-primary">Agency</span>
                            </h1>
                            <p className="text-label-sm uppercase tracking-wide mt-1 truncate text-text-muted">
                                {agencyName}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobile}
                            className="lg:hidden p-2 -me-2 rounded-token text-on-surface-variant hover:bg-surface-hover"
                            aria-label={t('layout.closeMenu')}
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">close</span>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="px-3 py-5 space-y-1 overflow-y-auto flex-1" aria-label={t('layout.mainNav')}>
                        {NAV_SECTIONS.map((section, idx) => {
                            const items = section.items.filter((item) => {
                                if (item.roles.includes('SUPERADMIN') && userRole !== 'SUPERADMIN') return false;
                                if (!item.roles.includes('ALL') && !item.roles.includes('SUPERADMIN') && userRole === 'SUPERADMIN') return false;
                                return true;
                            });
                            if (items.length === 0) return null;

                            return (
                                <div key={section.titleKey} className={idx > 0 ? 'mt-5' : ''}>
                                    <p className={`text-label-sm uppercase tracking-wide px-3 mb-2 text-text-muted ${compact ? 'lg:hidden' : ''}`}>
                                        {t(section.titleKey)}
                                    </p>
                                    {items.map((item) => {
                                        const active = isActivePath(location.pathname, item.path);
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                title={compact ? t(item.labelKey) : undefined}
                                                aria-current={active ? 'page' : undefined}
                                                className={`sidebar-link ${active ? 'active' : ''} ${compact ? 'lg:justify-center lg:px-0' : ''}`}
                                            >
                                                <span
                                                    className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-text-muted'}`}
                                                    aria-hidden="true"
                                                >
                                                    {item.icon}
                                                </span>
                                                <span className={`truncate ${compact ? 'lg:hidden' : ''}`}>{t(item.labelKey)}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* Notifications et profil */}
                <div className="p-4 space-y-2 border-t border-stroke">
                    <button
                        type="button"
                        onClick={() => setIsNotificationOpen((prev) => !prev)}
                        className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-token font-semibold text-label-md text-on-surface-variant hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${compact ? 'justify-center' : 'justify-between'}`}
                        aria-label={notificationCount > 0 ? t('layout.notificationsUnread', { count: notificationCount }) : t('layout.notifications')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
                                {notificationCount > 0 && (
                                    <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-danger">
                                        {notificationCount}
                                    </span>
                                )}
                            </div>
                            {!compact && <span>{t('layout.notifications')}</span>}
                        </div>
                    </button>

                    <LanguageSwitcher compact={compact} className="w-full justify-center" />

                    <UserMenu userName={userName} userRole={userRole} agencyName={agencyName} collapsed={compact} />
                </div>
            </aside>

            {/* Contenu principal */}
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-20 pb-8 lg:py-8 max-w-[1400px]" data-purpose="main-content">
                <NotificationCenter
                    isCollapsed={isCollapsed}
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    onCountChange={setNotificationCount}
                />
                {children}
            </main>
        </div>
    );
};

export default Layout;
