import React, { useState } from 'react';

const SearchFilterBar = ({ placeholder, search, onSearchChange, options, filter, onFilterChange }) => {
    const [open, setOpen] = useState(false);
    const current = options.find(o => o.value === filter) || options[0];

    const handleSelect = (value) => {
        onFilterChange(value);
        setOpen(false);
    };

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 w-full">
                {/* Search Bar */}
                <div className="relative flex-grow">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-shadow"
                        placeholder={placeholder}
                        type="text"
                    />
                </div>

                {/* Filter Dropdown */}
                {options && options.length > 0 && (
                    <div className="relative inline-block shrink-0">
                        <button
                            onClick={() => setOpen(o => !o)}
                            className="flex items-center justify-between gap-2 px-4 h-12 bg-surface-container-lowest border border-outline-variant rounded-xl font-label-sm text-label-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm min-w-[7.5rem]"
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 ${(current && current.dot) || 'bg-primary'} rounded-full`}></span>
                                <span>{(current && current.label) || 'Tous'}</span>
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant text-base">expand_more</span>
                        </button>
                        {open && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-50 py-1">
                                    {options.map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            onClick={() => handleSelect(opt.value)}
                                            className={`w-full text-left px-4 py-2 text-label-sm transition-colors flex items-center gap-2 ${opt.value === filter ? 'text-primary font-bold' : 'text-on-surface hover:bg-surface-container-low'}`}
                                        >
                                            <span className={`w-2 h-2 ${opt.dot || 'bg-primary'} rounded-full`}></span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SearchFilterBar;
