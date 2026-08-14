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
            <div className="flex items-center gap-4 w-full">
                {/* Search Bar */}
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined h-5 w-5 text-slate-400">search</span>
                    </div>
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm shadow-sm transition-all"
                        placeholder={placeholder}
                        type="text"
                    />
                </div>

                {/* Filter Dropdown */}
                {options && options.length > 0 && (
                    <div className="relative inline-block shrink-0">
                        <button
                            onClick={() => setOpen(o => !o)}
                            className="flex items-center justify-between gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-500/20 min-w-[7.5rem]"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 ${(current && current.dot) || 'bg-primary'} rounded-full shadow-sm`}></span>
                                <span>{(current && current.label) || 'Tous'}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-base">expand_more</span>
                        </button>
                        {open && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                                    {options.map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            onClick={() => handleSelect(opt.value)}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2.5 ${opt.value === filter ? 'text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
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