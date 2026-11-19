import React, { useState, useEffect, useCallback } from 'react';
import { AlertDialog, Button, Dialog, DialogHeader } from '@astryxdesign/core';
import { tNow } from '../i18n/runtime';

// Event-bus for Message Boxes (modals)
const LISTENERS = new Set();

// eslint-disable-next-line react-refresh/only-export-components
export const messageBox = {
    info: (message, title = tNow('u.information')) => open('info', title, message),
    success: (message, title = tNow('u.succs')) => open('success', title, message),
    error: (message, title = tNow('u.erreur')) => open('error', title, message),
    warning: (message, title = tNow('u.attention')) => open('warning', title, message),
    // confirm = ask + rappel onConfirm : même rendu, mêmes libellés par défaut.
    confirm: (message, title = tNow('u.confirmation'), options = {}) => messageBox.ask(message, title, options)
        .then((confirmed) => { if (confirmed && options.onConfirm) options.onConfirm(confirmed); }),
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

// Rendu : AlertDialog Astryx pour les confirmations (confirm / danger), Dialog Astryx pour les messages.
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
        return undefined;
    }, [state, close]);

    if (!state) return null;

    const isAction = state.type === 'confirm' || state.type === 'danger';

    if (isAction) {
        return (
            <AlertDialog
                isOpen
                onOpenChange={(open) => { if (!open) close(false); }}
                title={state.title}
                description={String(state.message ?? '')}
                actionLabel={state.confirmText}
                cancelLabel={state.cancelText}
                actionVariant={state.destructive ? 'destructive' : 'primary'}
                onAction={() => close(true)}
            />
        );
    }

    return (
        <Dialog isOpen onOpenChange={(open) => { if (!open) close('ok'); }} width={440} padding={5}>
            <DialogHeader title={state.title} onOpenChange={(open) => { if (!open) close('ok'); }} />
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap break-words mt-3">{state.message}</p>
            <div className="flex justify-end mt-5">
                <Button label="OK" variant={state.type === 'error' ? 'destructive' : 'primary'} onClick={() => close('ok')} />
            </div>
        </Dialog>
    );
};

export default MessageBoxContainer;
