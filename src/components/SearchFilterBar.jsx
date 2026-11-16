import React, { useEffect, useId, useState } from 'react';
import { Input } from './ui/Input';

// Barre de recherche + filtre déroulant. Le menu se ferme au clic extérieur et avec Échap.
const SearchFilterBar = ({ placeholder, search, onSearchChange, options, filter, onFilterChange }) => {
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const current = options?.find((o) => o.value === filter) || options?.[0];

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const handleSelect = (value) => {
        onFilterChange(value);
        setOpen(false);
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full">
                {/* Recherche */}
                <div className="relative flex-1 min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-disabled text-[20px] pointer-events-none" aria-hidden="true">search</span>
                    <Input
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-11 py-3 shadow-l1"
                        placeholder={placeholder}
                        aria-label={placeholder || 'Rechercher'}
                    />
                </div>

                {/* Filtre */}
                {options && options.length > 0 && (
                    <div className="relative inline-block shrink-0">
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            aria-controls={menuId}
                            className="flex items-center justify-between gap-2.5 px-5 py-3 bg-white border border-stroke rounded-token text-sm font-semibold text-on-surface-variant hover:bg-surface-hover shadow-l1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 min-w-[7.5rem]"
                        >
                            <span className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 ${(current && current.dot) || 'bg-primary'} rounded-full`} aria-hidden="true" />
                                <span>{(current && current.label) || 'Tous'}</span>
                            </span>
                            <span className="material-symbols-outlined text-text-disabled text-base" aria-hidden="true">expand_more</span>
                        </button>
                        {open && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
                                <ul id={menuId} role="listbox" className="absolute top-full right-0 mt-2 w-48 bg-white border border-stroke rounded-token shadow-l2 z-50 py-1">
                                    {options.map((opt) => (
                                        <li key={String(opt.value)} role="option" aria-selected={opt.value === filter}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(opt.value)}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5 focus:outline-none focus-visible:bg-surface-hover ${opt.value === filter ? 'text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-hover'}`}
                                            >
                                                <span className={`w-2 h-2 ${opt.dot || 'bg-primary'} rounded-full`} aria-hidden="true" />
                                                {opt.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SearchFilterBar;
