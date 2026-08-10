import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Menu déroulant des options ⋮ (3 points).
// items : [{ key, icon, label, color, destructive, onClick }]
const DropdownMenu = ({ open, onClose, items, anchor }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!open) return;
        // Repositionne si l'ancre change (scroll, resize)
        const compute = () => {
            const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
            if (!r) { setPos(null); return; }
            const width = 220;
            let left = r.right - width;
            if (left < 8) left = 8;
            let top = r.bottom + 6;
            if (top + 200 > window.innerHeight) top = Math.max(8, r.top - 200);
            setPos({ top, left, width });
        };
        compute();
        window.addEventListener('scroll', compute, true);
        window.addEventListener('resize', compute);
        return () => {
            window.removeEventListener('scroll', compute, true);
            window.removeEventListener('resize', compute);
        };
    }, [open, anchor]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            const isInsideMenu = ref.current && ref.current.contains(e.target);
            const isAnchor = anchor && anchor.contains && anchor.contains(e.target);
            if (!isInsideMenu && !isAnchor) onClose();
        };
        const escHandler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [open, onClose]);

    if (!open || !pos) return null;

    return createPortal(
        <div
            ref={ref}
            className="z-[300] min-w-[220px] rounded-token shadow-l2 py-1.5"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'var(--card-white)', border: '1px solid var(--stroke)' }}
        >
            {items.map((it) => (
                <button
                    key={it.key}
                    onClick={() => { onClose(); it.onClick(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-left transition-colors"
                    style={{ color: it.destructive ? 'var(--danger)' : 'var(--on-surface)' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = it.destructive ? 'var(--error-bg)' : 'var(--slate-bg)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: it.color || (it.destructive ? 'var(--danger)' : 'var(--on-surface-variant)') }}>
                        {it.icon}
                    </span>
                    <span>{it.label}</span>
                </button>
            ))}
        </div>,
        document.body
    );
};

export default DropdownMenu;
