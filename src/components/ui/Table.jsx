import { useMemo, useState } from 'react';
import { Card, Table as AstryxTable, proportional, useTablePagination, useTableSortable } from '@astryxdesign/core';
import { SkeletonTable } from '../Skeleton';
import EmptyState from './EmptyState';
import { useI18n } from '../../i18n/context';

// Adaptateur : API historique (columns/rows/render/sortable/paginate…) au-dessus du Table Astryx
// (plugins de tri et de pagination). Le tri est « global puis découpage en pages ».
//
// columns : [{ key, label, align?: 'left'|'right'|'center', sortable?, sortValue?(row), render?(value,row), className? }]
const ALIGN = { left: 'start', right: 'end', center: 'center' };
const PAGE_SIZES = [10, 25, 50];

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
    caption,
    footer,
    className = '',
    defaultSort = null, // { key, dir: 'asc'|'desc' }
    paginate = false, // pagination intégrée
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

    const sortablePlugin = useTableSortable({
        sort: sort ? [{ sortKey: sort.key, direction: sort.dir === 'asc' ? 'ascending' : 'descending' }] : [],
        onSortChange: (next) => {
            const first = next[0];
            setSort(first ? { key: first.sortKey, dir: first.direction === 'ascending' ? 'asc' : 'desc' } : null);
        },
    });
    const paginationPlugin = useTablePagination({
        page: safePage,
        onPageChange: setPage,
        totalItems: sorted.length,
        pageSize,
        pageSizeOptions: PAGE_SIZES,
        onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        position: 'below',
        align: 'end',
    });

    if (loading) return <SkeletonTable cols={columns.length} />;

    const astryxColumns = columns.map((col, index) => ({
        key: col.key,
        header: col.label,
        // 1re colonne plus large (identité), colonne d'actions étroite, les autres égales
        width: col.width ?? (index === 0 ? proportional(2) : col.key === 'actions' ? proportional(0.6) : proportional(1)),
        align: ALIGN[col.align || 'left'],
        sortable: Boolean(col.sortable),
        renderCell: (row) => {
            const content = col.render ? col.render(row[col.key], row) : row[col.key];
            return col.className ? <span className={col.className}>{content}</span> : content;
        },
        // première colonne : libellé de ligne pour les lecteurs d'écran
        ...(index === 0 ? {} : {}),
    }));

    return (
        <Card variant="default" padding={0} className={className}>
            {sorted.length === 0 ? (
                <EmptyState title={emptyTitle ?? t('common.noResult')} description={emptyDescription} />
            ) : (
                <AstryxTable
                    aria-label={caption}
                    data={shown}
                    columns={astryxColumns}
                    idKey={(row) => row[rowKey] ?? JSON.stringify(row)}
                    density="compact"
                    dividers="rows"
                    hasHover
                    plugins={{ sortable: sortablePlugin, ...(paginate ? { pagination: paginationPlugin } : {}) }}
                />
            )}
            {footer}
        </Card>
    );
};

export default Table;
