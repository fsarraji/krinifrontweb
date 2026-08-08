import React, { useState, useEffect } from 'react';

// Simple event-bus for Toasts
const LISTENERS = new Set();

export const toast = {
    success: (message, title = 'Succès') => notify('success', title, message),
    error: (message, title = 'Erreur') => notify('error', title, message),
    warning: (message, title = 'Attention') => notify('warning', title, message),
    info: (message, title = 'Information') => notify('info', title, message),
};

function notify(type, title, message) {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const item = { id, type, title, message };
    LISTENERS.forEach(fn => fn(item));
}

export const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleNewToast = (toastItem) => {
            setToasts(prev => [...prev, toastItem]);
            // Auto remove after 4.5 seconds
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toastItem.id));
            }, 4500);
        };

        LISTENERS.add(handleNewToast);
        return () => LISTENERS.delete(handleNewToast);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    const toastStyles = {
        success: {
            bg: 'bg-emerald-600',
            ring: 'ring-emerald-700/30',
            icon: 'check_circle',
            accent: 'bg-emerald-500',
        },
        error: {
            bg: 'bg-rose-600',
            ring: 'ring-rose-700/30',
            icon: 'error',
            accent: 'bg-rose-500',
        },
        warning: {
            bg: 'bg-amber-600',
            ring: 'ring-amber-700/30',
            icon: 'warning',
            accent: 'bg-amber-500',
        },
        info: {
            bg: 'bg-indigo-600',
            ring: 'ring-indigo-700/30',
            icon: 'info',
            accent: 'bg-indigo-500',
        },
    };

    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map(t => {
                const style = toastStyles[t.type] || toastStyles.info;
                return (
                    <div
                        key={t.id}
                        className={`${style.bg} text-white p-4 rounded-2xl shadow-2xl ring-1 ${style.ring} pointer-events-auto flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-top-4 fade-in`}
                    >
                        <span className="material-symbols-outlined text-2xl shrink-0 mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm tracking-tight leading-tight">{t.title}</p>
                            <p className="text-xs font-medium text-white/90 mt-0.5 leading-snug break-words">{t.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="text-white/70 hover:text-white transition-colors shrink-0 p-0.5 rounded-lg hover:bg-white/10"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
