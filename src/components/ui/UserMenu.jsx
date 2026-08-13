import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const getInitials = (name) => {
    if (!name) return 'FC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const UserMenu = ({ userName = 'Utilisateur', userRole = 'Admin', agencyName = '', collapsed = false }) => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-3 px-2 py-2 rounded-token card w-full transition-colors hover:bg-slate-100 ${collapsed ? 'justify-center' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open}
                title={userName}
            >
                <span className="avatar flex-shrink-0" style={{ background: 'var(--primary-container)', color: '#fff' }}>
                    {getInitials(userName)}
                </span>
                {!collapsed && (
                    <span className="min-w-0 flex-1 text-left leading-tight">
                        <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{userName}</span>
                        <span className="block text-[11px] font-medium truncate" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{userRole || "Admin"}</span>
                    </span>
                )}
                {!collapsed && (
                    <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-200 ml-auto ${open ? 'rotate-180' : ''}`}
                        style={{ color: 'var(--on-surface-variant)' }}
                    >
                        expand_more
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute left-0 bottom-[calc(100%+10px)] w-72 bg-white border border-stroke rounded-token shadow-l2 z-50"
                    role="menu"
                >
                    <div className="p-2">
                        <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-token">
                            <span className="avatar !w-9 !h-9 !text-[13px] flex-shrink-0" style={{ background: 'var(--primary-container)', color: '#fff' }}>
                                {getInitials(userName)}
                            </span>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{userName}</div>
                                <div className="text-xs text-slate-500 truncate">{agencyName || userRole}</div>
                            </div>
                            <span className="bg-info-bg border border-info/20 text-primary-container text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ms-auto flex-shrink-0">
                                {userRole}
                            </span>
                        </div>
                    </div>

                    <ul className="px-2 pb-2 text-sm font-semibold text-on-surface-variant">
                        <li>
                            <Link
                                to="/settings"
                                onClick={() => setOpen(false)}
                                role="menuitem"
                                className="flex items-center gap-2.5 w-full p-2.5 rounded-token hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">settings</span>
                                Paramètres
                            </Link>
                        </li>
                        <li className="border-t border-stroke pt-1.5 mt-1">
                            <button
                                type="button"
                                onClick={handleLogout}
                                role="menuitem"
                                className="flex items-center gap-2.5 w-full p-2.5 rounded-token text-danger hover:bg-danger-bg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                Déconnexion
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
