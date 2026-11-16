const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

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
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelId}
                className={`bg-surface w-full ${SIZES[size]} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center gap-4 bg-white shrink-0">
                    <div className="min-w-0">
                        <h2 id={labelId} className="text-xl font-extrabold text-on-surface leading-tight">{title}</h2>
                        {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 -mr-1 rounded-full hover:bg-surface-container-low transition-colors shrink-0"
                        aria-label="Fermer"
                    >
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>close</span>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 bg-surface px-6 py-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-outline-variant/30 bg-white flex items-center justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;