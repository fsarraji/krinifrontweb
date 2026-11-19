import { Dialog, DialogHeader } from '@astryxdesign/core';

// Adaptateur : API historique (isOpen/onClose/title/subtitle/size/footer/closeOnBackdrop) au-dessus
// du Dialog Astryx (élément <dialog> natif : focus piégé, Échap, verrouillage du défilement).
const WIDTHS = { sm: 440, md: 560, lg: 720, xl: 920 };

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
}) => (
    <Dialog
        isOpen={Boolean(isOpen)}
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        width={WIDTHS[size] || WIDTHS.lg}
        maxHeight="90dvh"
        // info : Échap + fond ferment ; form : le fond ne ferme plus après interaction (évite de perdre une saisie)
        purpose={closeOnBackdrop ? 'info' : 'form'}
        padding={0}
    >
        <div className="px-6 pt-5 pb-3 border-b border-stroke shrink-0">
            <DialogHeader id={labelId} title={title} subtitle={subtitle} onOpenChange={(open) => { if (!open) onClose?.(); }} />
        </div>
        <div className={`overflow-y-auto px-6 py-5 ${className}`} style={{ minHeight: 0, flex: '1 1 auto' }}>
            {children}
        </div>
        {footer && (
            <div className="px-6 py-4 border-t border-stroke flex items-center justify-end gap-3 flex-wrap shrink-0">
                {footer}
            </div>
        )}
    </Dialog>
);

export default Modal;
