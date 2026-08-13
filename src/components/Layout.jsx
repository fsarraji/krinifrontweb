import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import NotificationCenter from './NotificationCenter';
import UserMenu from './ui/UserMenu';

const Layout = ({ children }) => {
    const location = useLocation();
    const [agencyName, setAgencyName] = useState("Frères Cherifi Car");
    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("Fouad C.");
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(3);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setAgencyName(decoded.agency_name || "Frères Cherifi Car");
                setUserRole(decoded.role || "Admin");
                setUserName(decoded.username || "Fouad C.");
            } catch (error) {
                console.error("Erreur de lecture du token", error);
                localStorage.clear();
                window.location.href = '/login';
            }
        }
    }, []);

    const navSections = [
        {
            title: 'Opérations',
            items: [
                { path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard', roles: ['ALL'] },
                { path: '/vehicles', label: 'Véhicules', icon: 'directions_car', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/gps', label: 'Suivi GPS', icon: 'satellite_alt', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/reservations', label: 'Réservations', icon: 'event_note', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/calendar', label: 'Calendrier', icon: 'calendar_month', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/contracts', label: 'Contrats', icon: 'description', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
            ]
        },
        {
            title: 'Gestion',
            items: [
                { path: '/clients', label: 'Clients', icon: 'group', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/payments', label: 'Paiements', icon: 'payments', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/expenses', label: 'Dépenses', icon: 'receipt_long', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
                { path: '/admin/agencies', label: 'Gestion Agences', icon: 'admin_panel_settings', roles: ['SUPERADMIN'] },
                { path: '/admin/subscriptions', label: 'Abonnements', icon: 'workspace_premium', roles: ['SUPERADMIN'] },
                { path: '/admin/users', label: 'Gestion Utilisateurs', icon: 'manage_accounts', roles: ['SUPERADMIN'] },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen antialiased" style={{ background: 'var(--slate-bg)', color: 'var(--on-background)' }}>
            {/* Sidebar Sticky & Collapsible */}
            <aside
                className={`sticky top-0 h-screen ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} flex-shrink-0 flex flex-col justify-between transition-all duration-300 z-30`}
                style={{ background: 'var(--slate-bg)', borderRight: '1px solid var(--stroke)' }}
                data-purpose="sidebar"
            >
                {/* Floating Toggle Collapse Button */}
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white border border-stroke shadow-l1 text-slate-500 hover:text-primary flex items-center justify-center cursor-pointer transition-all duration-200 z-40 hover:scale-110"
                    title={isCollapsed ? "Déplier le menu" : "Réduire le menu"}
                >
                    <span className="material-symbols-outlined text-sm">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                <div className="flex flex-col min-h-0 flex-1">
                    {/* Header Agency */}
                    <div
                        className={`h-[72px] flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-6'}`}
                        style={{ borderBottom: '1px solid var(--stroke)' }}
                    >
                        <div
                            className="w-9 h-9 rounded-token flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--primary-container)' }}
                        >
                            <span className="material-symbols-outlined text-[20px] text-white">directions_car</span>
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden min-w-0">
                                <h1 className="font-bold text-[15px] tracking-tight leading-none truncate" style={{ color: 'var(--on-surface)' }} title="KRINICAR">
                                    KRINICAR
                                </h1>
                                <p className="text-[10.5px] font-semibold uppercase tracking-wide mt-1 truncate" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                                    {agencyName}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="px-3 py-5 space-y-1 overflow-y-auto flex-1">
                        {navSections.map((section, idx) => {
                            const filteredItems = section.items.filter(item => {
                                if (item.roles.includes('SUPERADMIN') && userRole !== 'SUPERADMIN') return false;
                                if (!item.roles.includes('ALL') && !item.roles.includes('SUPERADMIN') && userRole === 'SUPERADMIN') return false;
                                return true;
                            });

                            if (filteredItems.length === 0) return null;

                            return (
                                <div key={section.title} className={idx > 0 ? "mt-5" : ""}>
                                    {!isCollapsed && (
                                        <p className="text-[11px] font-bold uppercase tracking-wide px-3 mb-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                            {section.title}
                                        </p>
                                    )}
                                    {filteredItems.map(item => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                title={isCollapsed ? item.label : undefined}
                                                className={`sidebar-link ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                {/* Notifications & Profile Card Footer */}
                <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--stroke)' }}>
                    {/* Notification Button */}
                    <button
                        onClick={() => setIsNotificationOpen(prev => !prev)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-token font-semibold text-[13px] hover:bg-slate-100 transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                        style={{ color: 'var(--on-surface-variant)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                {notificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--error-c)' }}>
                                        {notificationCount}
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && <span>Notifications</span>}
                        </div>
                    </button>

                    {/* Profile Card / User Menu */}
                    <UserMenu userName={userName} userRole={userRole} agencyName={agencyName} collapsed={isCollapsed} />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 px-8 py-8 max-w-[1400px] min-w-0" data-purpose="main-content">
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
