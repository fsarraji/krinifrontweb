import { useMemo, useState } from 'react';
import { SkeletonTable } from '../Skeleton';
import EmptyState from './EmptyState';
import Pagination from '../Pagination';
import { useI18n } from '../../i18n/context';

// Tableau de données : en-tête collant, colonnes triables, états chargement/vide intégrés,
// défilement horizontal sur mobile. Spec DESIGN.md : padding 16px horizontal / 12px vertical.
//
// columns : [{ key, label, align?: 'left'|'right'|'center', sortable?, sortValue?(row), render?(value,row), className? }]
// start/end suivent le sens de lecture (ltr/rtl) ; les valeurs d'API restent 'left'/'right'.
const ALIGN = { left: 'text-start', right: 'text-end', center: 'text-center' };

const compare = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
    return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
};

const Table = ({
    columns,
    rows,
    rowKey = 'id',
    loading = false,
    emptyTitle,
    emptyDescription,
    onRowClick,
    caption,
    footer,
    className = '',
    defaultSort = null, // { key, dir: 'asc'|'desc' }
    paginate = false, // pagination intégrée : tri global PUIS découpage en pages
    initialPageSize = 10,
}) => {
    const { t } = useI18n();
    const [sort, setSort] = useState(defaultSort);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const sorted = useMemo(() => {
        if (!sort) return rows;
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return rows;
        const get = col.sortValue || ((r) => r[col.key]);
        const out = [...rows].sort((a, b) => compare(get(a), get(b)));
        return sort.dir === 'desc' ? out.reverse() : out;
    }, [rows, sort, columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const shown = paginate ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;

    const toggleSort = (col) => {
        if (!col.sortable) return;
        setSort((prev) => {
            if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
            if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
            return null;
        });
    };

    if (loading) return <SkeletonTable cols={columns.length} />;

    return (
        <div className={`bg-white border border-stroke rounded-token overflow-hidden ${className}`}>
            {sorted.length === 0 ? (
                <EmptyState title={emptyTitle ?? t('common.noResult')} description={emptyDescription} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        {caption && <caption className="sr-only">{caption}</caption>}
                        <thead className="bg-surface text-label-sm uppercase tracking-wider text-text-muted">
                            <tr>
                                {columns.map((col) => {
                                    const active = sort?.key === col.key;
                                    return (
                                        <th
                                            key={col.key}
                                            scope="col"
                                            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                                            className={`px-4 py-3 font-semibold whitespace-nowrap ${ALIGN[col.align || 'left']} ${col.className || ''}`}
                                        >
                                            {col.sortable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort(col)}
                                                    className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
                                                >
                                                    {col.label}
                                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                                                        {active ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                                                    </span>
                                                </button>
                                            ) : col.label}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((row, i) => (
                                <tr
                                    key={row[rowKey] ?? i}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={`border-t border-stroke ${onRowClick ? 'cursor-pointer hover:bg-surface-hover' : 'hover:bg-surface/60'} transition-colors`}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'whitespace-nowrap ' : ''}${ALIGN[col.align || 'left']} ${col.className || ''}`}>
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {footer}
            {paginate && sorted.length > 0 && (
                <Pagination
                    currentPage={safePage}
                    totalItems={sorted.length}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                />
            )}
        </div>
    );
};

export default Table;
