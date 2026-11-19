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

export const ToastContainer = () => {
    const showToast = useToast();

    useEffect(() => {
        const handle = ({ type, title, message }) => {
            // Astryx ne distingue que « info » et « error » : succès et avertissement passent en « info ».
            showToast({
                type: type === 'error' ? 'error' : 'info',
                body: title ? (
                    <span><strong>{title}</strong>{message ? ` — ${message}` : ''}</span>
                ) : message,
            });
        };
        LISTENERS.add(handle);
        return () => LISTENERS.delete(handle);
    }, [showToast]);

    return null;
};

export default ToastContainer;
