import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../../i18n/context';

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Compteur : plusieurs modales empilées ne doivent déverrouiller le scroll qu'à la dernière fermeture.
let openModals = 0;

const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    size = 'lg',
    labelId,
    children,
    footer,
    className = '',
    closeOnBackdrop = true,
}) => {
    const { t } = useI18n();
    const autoId = useId();
    const titleId = labelId || `modal-title-${autoId}`;
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return undefined;
        const previouslyFocused = document.activeElement;
        openModals += 1;
        document.body.style.overflow = 'hidden';

        // Focus initial : premier champ du contenu, sinon le panneau lui-même.
        const panel = panelRef.current;
        const first = panel?.querySelector('[data-autofocus], input, select, textarea') || panel?.querySelector(FOCUSABLE);
        (first || panel)?.focus();

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current?.();
                return;
            }
            if (e.key !== 'Tab' || !panel) return;
            const items = [...panel.querySelectorAll(FOCUSABLE)];
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            openModals -= 1;
            if (openModals <= 0) {
                openModals = 0;
                document.body.style.overflow = '';
            }
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-on-surface/40 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`bg-surface w-full ${SIZES[size]} rounded-t-2xl sm:rounded-2xl shadow-l2 border border-stroke overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] outline-none ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-stroke flex justify-between items-center gap-4 bg-white shrink-0">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-xl font-bold text-on-surface leading-tight">{title}</h2>
                        {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 -mr-1 rounded-full hover:bg-surface-container transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        aria-label={t('u.fermer')}
                    >
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 bg-surface px-6 py-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-stroke bg-white flex items-center justify-end gap-3 shrink-0 flex-wrap">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
