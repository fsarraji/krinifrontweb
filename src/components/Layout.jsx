import React, { forwardRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppShell, SideNav, SideNavHeading, SideNavItem, SideNavSection, TopNav, TopNavHeading } from '@astryxdesign/core';
import { LinkProvider } from '@astryxdesign/core/Link';
import { jwtDecode } from 'jwt-decode';
import NotificationCenter from './NotificationCenter';
import UserMenu from './ui/UserMenu';
import { materialIcon } from './ui/navIcons';
import LanguageSwitcher from './ui/LanguageSwitcher';
import { useI18n } from '../i18n/context';
import { logout } from '../api';

// Les composants Astryx fournissent `href` ; react-router attend `to`.
const RouterLink = forwardRef(function RouterLink({ href, ...rest }, ref) {
    return <Link ref={ref} to={href} {...rest} />;
});

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
    const { t } = useI18n();
    const [notificationCount, setNotificationCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
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

    const agencyName = session?.agencyName || t('layout.yourAgency');
    const userRole = session?.userRole || '';
    const userName = session?.userName || '';

    const handleCollapsedChange = (next) => {
        setIsCollapsed(next);
        localStorage.setItem('sidebar_collapsed', String(next));
    };

    const sideNav = (
        <SideNav
            label={t('layout.mainNav')}
            header={(
                <SideNavHeading
                    heading="Kricar Agency"
                    headingHref="/dashboard"
                    icon={<img src="/logo.png" alt="" className="w-7 h-7 object-contain" />}
                />
            )}
            footer={<UserMenu userName={userName} userRole={userRole} agencyName={agencyName} collapsed={isCollapsed} />}
            collapsible={{
                isCollapsed,
                onCollapsedChange: handleCollapsedChange,
                hasButton: true,
                buttonLabel: isCollapsed ? t('layout.expandMenu') : t('layout.collapseMenu'),
            }}
        >
            {NAV_SECTIONS.map((section) => {
                const items = section.items.filter((item) => {
                    if (item.roles.includes('SUPERADMIN') && userRole !== 'SUPERADMIN') return false;
                    if (!item.roles.includes('ALL') && !item.roles.includes('SUPERADMIN') && userRole === 'SUPERADMIN') return false;
                    return true;
                });
                if (items.length === 0) return null;
                return (
                    <SideNavSection key={section.titleKey} title={t(section.titleKey)}>
                        {items.map((item) => (
                            <SideNavItem
                                key={item.path}
                                label={t(item.labelKey)}
                                href={item.path}
                                icon={materialIcon(item.icon)}
                                isSelected={isActivePath(location.pathname, item.path)}
                            />
                        ))}
                    </SideNavSection>
                );
            })}
        </SideNav>
    );

    const bellLabel = notificationCount > 0
        ? t('layout.notificationsUnread', { count: notificationCount })
        : t('layout.notifications');

    const topNav = (
        <TopNav
            label={agencyName}
            heading={<TopNavHeading heading={agencyName} />}
            endContent={(
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsNotificationOpen((prev) => !prev)}
                        className="relative w-9 h-9 rounded-token flex items-center justify-center text-on-surface-variant hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        aria-label={bellLabel}
                        title={bellLabel}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
                        {notificationCount > 0 && (
                            <span className="absolute top-0.5 end-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-danger">
                                {notificationCount}
                            </span>
                        )}
                    </button>
                    <LanguageSwitcher compact />
                </div>
            )}
        />
    );

    return (
        <LinkProvider component={RouterLink}>
            <AppShell variant="wash" sideNav={sideNav} topNav={topNav} contentPadding={0} height="fill">
                <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto w-full" data-purpose="main-content">
                    <NotificationCenter
                        isCollapsed={isCollapsed}
                        isOpen={isNotificationOpen}
                        onClose={() => setIsNotificationOpen(false)}
                        onCountChange={setNotificationCount}
                    />
                    {children}
                </div>
            </AppShell>
        </LinkProvider>
    );
};

export default Layout;
