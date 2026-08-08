import React, { useState, useEffect, useCallback } from 'react';

// Event-bus for Message Boxes (modals)
const LISTENERS = new Set();

// eslint-disable-next-line react-refresh/only-export-components
export const messageBox = {
    info: (message, title = 'Information') => open('info', title, message),
    success: (message, title = 'Succès') => open('success', title, message),
    error: (message, title = 'Erreur') => open('error', title, message),
    warning: (message, title = 'Attention') => open('warning', title, message),
    confirm: (message, title = 'Confirmation', options = {}) => open(
        'confirm',
        title,
        message,
        options.confirmText,
        options.cancelText,
        options.destructive
    ).then((confirmed) => { if (confirmed && options.onConfirm) options.onConfirm(confirmed); }),
    danger: (message, title = 'Suppression', options = {}) => open(
        'danger',
        title,
        message,
        options.confirmText || 'Supprimer',
        options.cancelText || 'Annuler',
        true
    ).then((confirmed) => { if (confirmed && options.onConfirm) options.onConfirm(confirmed); }),
};

function open(type, title, message, confirmText = 'OK', cancelText = 'Annuler', destructive = false) {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const item = { id, type, title, message, confirmText, cancelText, destructive };
    LISTENERS.forEach(fn => fn(item));
    return new Promise((resolve) => {
        LISTENERS_RESOLVERS.set(id, resolve);
    });
}

const LISTENERS_RESOLVERS = new Map();

function resolveBox(id, value) {
    const r = LISTENERS_RESOLVERS.get(id);
    if (r) {
        r(value);
        LISTENERS_RESOLVERS.delete(id);
    }
}

const STYLES = {
    info: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'info', iconBg: 'bg-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'check_circle', iconBg: 'bg-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
    error: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'error', iconBg: 'bg-rose-600', btn: 'bg-rose-600 hover:bg-rose-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'warning', iconBg: 'bg-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
    confirm: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'help', iconBg: 'bg-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700' },
    danger: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'warning', iconBg: 'bg-rose-600', btn: 'bg-rose-600 hover:bg-rose-700' },
};

export const MessageBoxContainer = () => {
    const [state, setState] = useState(null);

    useEffect(() => {
        const handle = (item) => setState(item);
        LISTENERS.add(handle);
        return () => LISTENERS.delete(handle);
    }, []);

    const close = useCallback(() => setState(null), []);

    useEffect(() => {
        if (state && state.type !== 'confirm' && state.type !== 'danger') {
            const timer = setTimeout(() => close(), 8000);
            return () => clearTimeout(timer);
        }
    }, [state, close]);

    if (!state) return null;

    const s = STYLES[state.type] || STYLES.info;
    const onKeyDown = (e) => {
        if (e.key === 'Escape') close();
    };

    return (
        <div
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onKeyDown={onKeyDown}
        >
            <div
                onClick={close}
                className="absolute inset-0"
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className={`relative w-full max-w-md ${s.bg} border ${s.border} rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-full ${s.iconBg} flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined text-white text-2xl">{s.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className={`font-extrabold text-lg tracking-tight ${s.text}`}>{state.title}</h3>
                            <p className="text-sm text-slate-600 font-medium mt-1.5 leading-relaxed break-words whitespace-pre-wrap">{state.message}</p>
                        </div>
                        <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg hover:bg-slate-100 shrink-0">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 pb-5">
                    {(state.type === 'confirm' || state.type === 'danger') && (
                        <button
                            onClick={() => { resolveBox(state.id, false); close(); }}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            {state.cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            const isAction = state.type === 'confirm' || state.type === 'danger';
                            resolveBox(state.id, isAction ? true : 'ok');
                            close();
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-colors ${s.btn}`}
                        autoFocus
                    >
                        {state.type === 'confirm' || state.type === 'danger' ? state.confirmText : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageBoxContainer;