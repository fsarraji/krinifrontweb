import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import NotificationCenter from './NotificationCenter';

const Layout = ({ children }) => {
    const location = useLocation();
    const [agencyName, setAgencyName] = useState("Chargement...");
    const [userRole, setUserRole] = useState("");
    const [userName, setUserName] = useState("Utilisateur");
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
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
                setAgencyName(decoded.agency_name || "Mon Agence");
                setUserRole(decoded.role || "");
                setUserName(decoded.username || "Utilisateur");
            } catch (error) {
                console.error("Erreur de lecture du token", error);
                setAgencyName("Mon Agence");
            }
        }
    }, []);

    const navItems = [
        { path: '/dashboard', label: 'Tableau de bord', icon: 'dashboard', roles: ['ALL'] },
        { path: '/vehicles', label: 'Véhicules', icon: 'directions_car', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/gps', label: 'Suivi GPS', icon: 'satellite_alt', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/clients', label: 'Clients', icon: 'group', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/contracts', label: 'Contrats', icon: 'description', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/reservations', label: 'Réservations', icon: 'event_note', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/calendar', label: 'Calendrier', icon: 'calendar_today', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/payments', label: 'Paiements', icon: 'payments', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/expenses', label: 'Dépenses', icon: 'receipt_long', roles: ['ADMIN', 'USER', 'STAFF', 'AGENCY'] },
        { path: '/admin/agencies', label: 'Gestion Agences', icon: 'admin_panel_settings', roles: ['SUPERADMIN'] },
        { path: '/admin/users', label: 'Gestion Utilisateurs', icon: 'manage_accounts', roles: ['SUPERADMIN'] },
    ];

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex min-h-screen text-slate-800 bg-slate-50">
            {/* Sidebar Sticky & Collapsible */}
            <aside
                className={`sticky top-0 h-screen ${
                    isCollapsed ? 'w-20' : 'w-72'
                } bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm flex-shrink-0 transition-all duration-300 z-30`}
                data-purpose="sidebar"
            >
                {/* Floating Toggle Collapse Button */}
                <button
                    onClick={toggleCollapse}
                    className="absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center cursor-pointer transition-all duration-200 z-40 hover:scale-110"
                    title={isCollapsed ? "Déplier le menu" : "Réduire le menu"}
                >
                    <span className="material-symbols-outlined text-sm">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                <div className="flex flex-col min-h-0 flex-1">
                    {/* Branding Header */}
                    <div className={`border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center p-4 h-20' : 'px-6 py-5 h-20 gap-3.5'}`}>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
                            <span className="material-symbols-outlined text-2xl">directions_car</span>
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden min-w-0">
                                <h1 className="font-extrabold text-slate-900 leading-tight text-base tracking-tight truncate" title={agencyName}>
                                    {agencyName}
                                </h1>
                                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Gestion de Flotte</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className={`px-3 py-4 space-y-1.5 overflow-y-auto flex-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                        {navItems.map((item) => {
                            if (item.roles.includes('SUPERADMIN') && userRole !== 'SUPERADMIN') return null;
                            if (!item.roles.includes('ALL') && !item.roles.includes('SUPERADMIN') && userRole === 'SUPERADMIN') return null;

                            const isActive = location.pathname === item.path;

                            if (isCollapsed) {
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        title={item.label}
                                        className={
                                            isActive
                                                ? "w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200/60 transition-all"
                                                : "w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
                                        }
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {item.icon}
                                        </span>
                                    </Link>
                                );
                            }

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={
                                        isActive
                                            ? "flex items-center gap-3 px-4 py-3 text-sm font-semibold text-indigo-700 bg-indigo-50/80 rounded-xl transition-all duration-200 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-indigo-600 before:rounded-r-full"
                                            : "flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                                    }
                                >
                                    <span className={`material-symbols-outlined text-xl ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer Actions */}
                <div className={`p-3 border-t border-slate-100 space-y-2 bg-slate-50/50 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                    {/* Notifications Button */}
                    {isCollapsed ? (
                        <button
                            onClick={() => setIsNotificationOpen(prev => !prev)}
                            title={`Notifications (${notificationCount})`}
                            className="relative w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-900 rounded-xl hover:shadow-sm transition-all"
                        >
                            <span className="material-symbols-outlined text-xl">notifications</span>
                            {notificationCount > 0 && (
                                <span className="absolute top-1 right-1 bg-rose-500 text-white font-bold text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                                    {notificationCount}
                                </span>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsNotificationOpen(prev => !prev)}
                            className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-700 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 text-xl">notifications</span>
                                <span>Notifications</span>
                            </div>
                            {notificationCount > 0 && (
                                <div className="relative">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping"></span>
                                    <span className="relative inline-flex bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] justify-center items-center">
                                        {notificationCount}
                                    </span>
                                </div>
                            )}
                        </button>
                    )}

                    {/* User Profile Dropdown */}
                    <div className="relative group w-full flex justify-center">
                        {isCollapsed ? (
                            <button
                                title={userName}
                                className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all"
                            >
                                <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {getInitials(userName)}
                                </div>
                            </button>
                        ) : (
                            <button className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-700 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                        {getInitials(userName)}
                                    </div>
                                    <span className="font-semibold text-slate-900 truncate max-w-[120px]">{userName}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 text-base">expand_more</span>
                            </button>
                        )}

                        {/* Profile Dropdown */}
                        <div className={`absolute bottom-full ${isCollapsed ? 'left-12' : 'left-0'} mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2 space-y-1`}>
                            <div className="p-2 border-b border-slate-100">
                                <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                                <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-widest mt-0.5">{userRole || "Admin Agence"}</p>
                            </div>
                            <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors font-medium">
                                <span className="material-symbols-outlined text-base">settings</span> Paramètres
                            </Link>
                            <button
                                onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold"
                            >
                                <span className="material-symbols-outlined text-base">logout</span> Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0" data-purpose="main-content">
                <NotificationCenter
                    isCollapsed={isCollapsed}
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    onCountChange={setNotificationCount}
                />
                <div className="flex-1 p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;