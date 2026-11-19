import { useEffect } from 'react';
import { useToast } from '@astryxdesign/core';

// Bus d'événements : toast.success(...) peut être appelé hors composants React ; l'affichage est
// délégué au système de toasts d'Astryx (ToastContainer, monté une fois dans App).
const LISTENERS = new Set();

// eslint-disable-next-line react-refresh/only-export-components
export const toast = {
    success: (message, title) => notify('success', title, message),
    error: (message, title) => notify('error', title, message),
    warning: (message, title) => notify('warning', title, message),
    info: (message, title) => notify('info', title, message),
};

function notify(type, title, message) {
    LISTENERS.forEach((fn) => fn({ type, title, message }));
}

const TYPE_META = {
    success: { icon: 'check_circle', color: 'text-success' },
    error: { icon: 'error', color: 'text-danger' },
    warning: { icon: 'warning', color: 'text-warning' },
    info: { icon: 'info', color: 'text-primary' },
};

export const ToastContainer = () => {
    const showToast = useToast();

    useEffect(() => {
        const handle = ({ type, title, message }) => {
            // Astryx ne distingue que « info » et « error » : succès et avertissement gardent le type « info »
            // mais reçoivent une icône et une couleur propres pour rester reconnaissables.
            const meta = TYPE_META[type] || TYPE_META.info;
            showToast({
                type: type === 'error' ? 'error' : 'info',
                body: (
                    <span className="inline-flex items-start gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${meta.color}`} aria-hidden="true">{meta.icon}</span>
                        <span>{title ? <><strong>{title}</strong>{message ? ` — ${message}` : ''}</> : message}</span>
                    </span>
                ),
            });
        };
        LISTENERS.add(handle);
        return () => LISTENERS.delete(handle);
    }, [showToast]);

    return null;
};

export default ToastContainer;
