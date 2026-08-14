import React from 'react';

/**
 * Pagination component — clean indigo-slate design.
 *
 * Props:
 *  - currentPage  : number (1-indexed)
 *  - totalItems   : number
 *  - pageSize     : number (items per page)
 *  - onPageChange : (page: number) => void
 *  - pageSizeOptions? : number[] (default [10, 25, 50])
 *  - onPageSizeChange? : (size: number) => void
 */
const Pagination = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    pageSizeOptions = [10, 25, 50],
    onPageSizeChange,
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    // Build page numbers with ellipsis
    const getPages = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = [];
        if (currentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
            {/* Left: count + page size selector */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">{from}–{to}</span> sur{' '}
                    <span className="font-bold text-slate-700">{totalItems}</span>
                </span>
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
                        className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        {pageSizeOptions.map(s => (
                            <option key={s} value={s}>{s} / page</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Right: page buttons */}
            <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page précédente"
                >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                {getPages().map((p, idx) =>
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 font-medium">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                p === currentPage
                                    ? 'bg-primary text-white shadow-sm shadow-primary-border/40'
                                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page suivante"
                >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
