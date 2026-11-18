import React from 'react';
import { Pagination as AstryxPagination } from '@astryxdesign/core';

/**
 * Pagination (composant Astryx) — API historique.
 *  - currentPage : number (1-indexé)   - totalItems : number   - pageSize : number
 *  - onPageChange : (page) => void     - pageSizeOptions? : number[] (défaut [10, 25, 50])
 *  - onPageSizeChange? : (size) => void
 */
const Pagination = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    pageSizeOptions = [10, 25, 50],
    onPageSizeChange,
}) => {
    if (totalItems === 0) return null;

    return (
        <div className="flex justify-end px-4 py-3 border-t border-stroke">
            <AstryxPagination
                page={currentPage}
                onChange={onPageChange}
                totalItems={totalItems}
                pageSize={pageSize}
                pageSizeOptions={onPageSizeChange ? pageSizeOptions : undefined}
                onPageSizeChange={onPageSizeChange ? (size) => { onPageSizeChange(size); onPageChange(1); } : undefined}
            />
        </div>
    );
};

export default Pagination;
