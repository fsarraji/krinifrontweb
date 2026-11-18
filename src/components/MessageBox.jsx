import React, { useState, useEffect, useCallback } from 'react';
import { tNow } from '../i18n/runtime';

// Event-bus for Message Boxes (modals)
const LISTENERS = new Set();

// eslint-disable-next-line react-refresh/only-export-components
export const messageBox = {
    info: (message, title = tNow('u.information')) => open('info', title, message),
    success: (message, title = tNow('u.succs')) => open('success', title, message),
    error: (message, title = tNow('u.erreur')) => open('error', title, message),
    warning: (message, title = tNow('u.attention')) => open('warning', title, message),
    confirm: (message, title = tNow('u.confirmation'), options = {}) => open(
        'confirm',
        title,
        message,
        options.confirmText,
        options.cancelText,
        options.destructive
    ).then((confirmed) => { if (confirmed && options.onConfirm) options.onConfirm(confirmed); }),
    // Variante « promesse » : resolve(true/false) — remplace window.confirm.
    ask: (message, title = tNow('u.confirmation'), options = {}) => open(
        options.destructive ? 'danger' : 'confirm',
        title,
        message,
        options.confirmText || tNow('u.confirmer'),
        options.cancelText || tNow('u.annuler'),
        Boolean(options.destructive)
    ),
    danger: (message, title = tNow('u.suppression'), options = {}) => open(
        'danger',
        title,
        message,
        options.confirmText || tNow('u.supprimer'),
        options.cancelText || tNow('u.annuler'),
        true
    ).then((confirmed) => { if (confirmed && options.onConfirm) options.onConfirm(confirmed); }),
};

function open(type, title, message, confirmText = 'OK', cancelText = tNow('u.annuler'), destructive = false) {
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

// Styles aligned with the Kricar Agency design system (index.css tokens)
const STYLES = {
    info: {
        bg: 'var(--info-bg)',
        border: 'var(--info-border)',
        text: 'var(--primary)',
        icon: 'info',
        iconBg: 'var(--primary)',
        btn: 'var(--primary)',
        btnHover: 'var(--primary-hover)',
    },
    success: {
        bg: 'var(--success-bg)',
        border: 'var(--success-border)',
        text: 'var(--success-dark)',
        icon: 'check_circle',
        iconBg: 'var(--success)',
        btn: 'var(--success)',
        btnHover: 'var(--success-dark)',
    },
    error: {
        bg: 'var(--error-bg)',
        border: 'var(--danger)',
        text: 'var(--danger)',
        icon: 'error',
        iconBg: 'var(--danger)',
        btn: 'var(--danger)',
        btnHover: 'var(--danger-dark)',
    },
    warning: {
        bg: 'var(--warning-bg)',
        border: 'var(--warning-border)',
        text: 'var(--warning-dark)',
        icon: 'warning',
        iconBg: 'var(--warning)',
        btn: 'var(--warning)',
        btnHover: 'var(--warning-dark)',
    },
    confirm: {
        bg: 'var(--info-bg)',
        border: 'var(--info-border)',
        text: 'var(--primary)',
        icon: 'help',
        iconBg: 'var(--primary)',
        btn: 'var(--primary)',
        btnHover: 'var(--primary-hover)',
    },
    danger: {
        bg: 'var(--error-bg)',
        border: 'var(--danger)',
        text: 'var(--danger)',
        icon: 'warning',
        iconBg: 'var(--danger)',
        btn: 'var(--danger)',
        btnHover: 'var(--danger-dark)',
    },
};

export const MessageBoxContainer = () => {
    const [state, setState] = useState(null);

    useEffect(() => {
        const handle = (item) => setState(item);
        LISTENERS.add(handle);
        return () => LISTENERS.delete(handle);
    }, []);

    const close = useCallback((value) => {
        setState(null);
        if (state && state.id) {
            resolveBox(state.id, value === undefined ? 'ok' : value);
        }
    }, [state]);

    useEffect(() => {
        if (state && state.type !== 'confirm' && state.type !== 'danger') {
            const timer = setTimeout(() => close('ok'), 8000);
            return () => clearTimeout(timer);
        }
    }, [state, close]);

    if (!state) return null;

    const s = STYLES[state.type] || STYLES.info;
    const isAction = state.type === 'confirm' || state.type === 'danger';
    const onKeyDown = (e) => {
        if (e.key === 'Escape') close(isAction ? false : 'ok');
    };

    return (
        <div
            className="fixed inset-0 z-[250] flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
            onKeyDown={onKeyDown}
        >
            <div
                onClick={() => close(isAction ? false : 'ok')}
                className="absolute inset-0"
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-md rounded-lg shadow-l1 overflow-hidden"
                style={{ background: 'var(--card-white)', border: '1px solid var(--stroke)' }}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.iconBg, color: '#fff' }}>
                            <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg tracking-tight" style={{ color: s.text }}>{state.title}</h3>
                            <p className="text-sm font-medium mt-1.5 leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--on-surface-variant)', opacity: 0.8 }}>
                                {state.message}
                            </p>
                        </div>
                        <button onClick={() => close(isAction ? false : 'ok')} className="p-1 rounded-lg hover:bg-white transition-colors shrink-0" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 pb-5">
                    {isAction && (
                        <button
                            onClick={() => close(false)}
                            className="px-4 py-2.5 rounded-lg text-sm font-bold card shadow-l1 transition-colors"
                            style={{ color: 'var(--on-surface-variant)' }}
                        >
                            {state.cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => close(isAction ? true : 'ok')}
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold text-white shadow-l1 transition-colors ${isAction ? '' : 'shadow-none'}`}
                        style={{ background: s.btn }}
                        autoFocus
                        onMouseOver={(e) => { if (s.btnHover) e.currentTarget.style.background = s.btnHover; }}
                        onMouseOut={(e) => { if (s.btnHover) e.currentTarget.style.background = s.btn; }}
                    >
                        {isAction ? state.confirmText : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageBoxContainer;
