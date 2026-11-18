import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonTable } from './Skeleton';
import Button from './ui/Button';
import PageHeader from './ui/PageHeader';
import Table from './ui/Table';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { useI18n } from '../i18n/context';

const Payments = () => {
    const { t } = useI18n();
    const methodLabel = (m) => {
        const key = `method.${m}`;
        const translated = t(key);
        return translated === key ? m : translated;
    };
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const payments = await fetchAllPages('payments/');
                setPayments(payments);
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération des paiements", error);
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    // Reset to page 1 on filter/search change
    const handleSearchChange = (value) => { setSearch(value); setCurrentPage(1); };
    const handleFilterChange = (value) => { setMethodFilter(value); setCurrentPage(1); };

    const handleExport = () => {
        exportToCSV(
            visiblePayments,
            'recettes_paiements',
            [
                { key: 'id', label: 'ID Paiement' },
                { key: 'payment_date', label: t('u.date') },
                { key: 'contract', label: 'ID Contrat' },
                { key: 'payment_method', label: t('u.mthode_de_paiement') },
                { key: 'reference', label: t('u.rfrence') },
                { key: 'amount', label: 'Montant (MAD)' },
            ]
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl"></div>
                <SkeletonTable rows={5} cols={6} />
            </div>
        );
    }

    const totalCollected = payments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    const methodOptions = [
        { value: 'ALL', label: t('payments.filter.all'), dot: 'bg-primary' },
        ...[...new Set(payments.map(p => p.payment_method).filter(Boolean))].map(m => ({
            value: m, label: methodLabel(m), dot: 'bg-indigo-500',
        })),
    ];

    const visiblePayments = payments.filter(p => {
        const q = search.trim().toLowerCase();
        const matchMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;
        const matchSearch = !q || [String(p.contract), p.reference, p.payment_method]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q));
        return matchMethod && matchSearch;
    });

    const paginatedPayments = visiblePayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <PageHeader
                className="!mb-0"
                eyebrow={t('payments.eyebrow')}
                title={t('payments.title')}
                actions={(
                    <>
                        <Button variant="outline" icon="download" onClick={handleExport} title={t('payments.exportTitle')}>{t('contracts.exportCsv')}</Button>
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-token border border-stroke shadow-l1">
                            <div className="w-10 h-10 bg-success-bg text-success rounded-token flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl" aria-hidden="true">account_balance</span>
                            </div>
                            <div>
                                <p className="text-label-sm uppercase tracking-widest text-text-muted">{t('payments.totalCollected')}</p>
                                <p className="text-2xl font-extrabold text-on-surface">{formatMoney(totalCollected)}</p>
                            </div>
                        </div>
                    </>
                )}
            />

            {/* Search & Filter */}
            <div>
                <SearchFilterBar
                    placeholder={t('payments.search')}
                    search={search}
                    onSearchChange={handleSearchChange}
                    options={methodOptions}
                    filter={methodFilter}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Content */}
            <Table
                caption={t('payments.caption')}
                rows={paginatedPayments}
                emptyTitle={t('payments.empty')}
                columns={[
                    { key: 'id', label: t('payments.col.id'), className: 'whitespace-nowrap text-xs font-bold text-text-muted', render: (v) => `#${v.toString().padStart(4, '0')}` },
                    { key: 'payment_date', label: t('payments.col.date'), className: 'whitespace-nowrap font-medium', render: (_, p) => formatDateTime(p.payment_date || p.created_at) },
                    {
                        key: 'contract', label: t('payments.col.contract'), className: 'whitespace-nowrap',
                        render: (v) => (
                            <Link to={`/contracts/edit/${v}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-deep hover:underline">
                                <span>CTR-{v.toString().padStart(5, '0')}</span>
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
                            </Link>
                        ),
                    },
                    {
                        key: 'payment_method', label: t('payments.col.method'), className: 'whitespace-nowrap',
                        render: (v) => <span className="px-3 py-1 inline-flex text-label-sm rounded-full bg-surface-container text-on-surface-variant ring-1 ring-stroke">{methodLabel(v)}</span>,
                    },
                    { key: 'reference', label: t('payments.col.reference'), className: 'whitespace-nowrap text-xs font-mono text-text-muted truncate max-w-[150px]', render: (v) => v || '—' },
                    { key: 'amount', label: t('payments.col.amount'), align: 'right', render: (v) => <span className="font-extrabold text-success">+{formatMoney(v)}</span> },
                ]}
                footer={visiblePayments.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={visiblePayments.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                )}
            />
        </div>
    );
};

export default Payments;
