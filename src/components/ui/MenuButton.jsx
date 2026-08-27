import React, { useRef } from 'react';
import DropdownMenu from './DropdownMenu';

/**
 * Bouton "..." avec DropdownMenu contextuel.
 * Générique : fonctionne avec n'importe quel item ayant un `.id`.
 *
 * Props:
 * - item: { id } — l'élément associé au menu
 * - items: array — éléments du dropdown (même format que DropdownMenu)
 * - menuId: number | null — id de l'élément dont le menu est ouvert
 * - setMenuId: (id | null) => void
 */
const MenuButton = ({ item, items, menuId, setMenuId }) => {
    const btnRef = useRef(null);
    return (
        <div className="inline-block">
            <button
                ref={btnRef}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuId(menuId === item.id ? null : item.id); }}
                className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--on-surface-variant)' }}
                title="Options"
            >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            <DropdownMenu
                open={menuId === item.id}
                onClose={() => setMenuId(null)}
                items={items}
                anchor={btnRef.current}
            />
        </div>
    );
};

export default MenuButton;
