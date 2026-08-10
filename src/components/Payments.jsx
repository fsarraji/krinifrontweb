import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';

const Payments = () => {
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
    useEffect(() => { setCurrentPage(1); }, [search, methodFilter]);

    const handleExport = () => {
        exportToCSV(
            visiblePayments,
            'recettes_paiements',
            [
                { key: 'id', label: 'ID Paiement' },
                { key: 'payment_date', label: 'Date' },
                { key: 'contract', label: 'ID Contrat' },
                { key: 'payment_method', label: 'Méthode de Paiement' },
                { key: 'reference', label: 'Référence' },
                { key: 'amount', label: 'Montant (DH)' },
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
        { value: 'ALL', label: 'Toutes', dot: 'bg-indigo-600' },
        ...[...new Set(payments.map(p => p.payment_method).filter(Boolean))].map(m => ({
            value: m, label: m, dot: 'bg-indigo-500',
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
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Finances</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Paiements</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExport}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                        title="Exporter en CSV (Excel)"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center ring-1 ring-emerald-100">
                            <span className="material-symbols-outlined text-xl">account_balance</span>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase font-bold text-slate-500 tracking-widest">Total Collecté</p>
                            <p className="text-2xl font-extrabold text-slate-900">{totalCollected.toLocaleString()} DH</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div>
                <SearchFilterBar
                    placeholder="Rechercher (contrat, référence, méthode)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={methodOptions}
                    filter={methodFilter}
                    onFilterChange={setMethodFilter}
                />
            </div>

            {/* Content */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {visiblePayments.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">money_off</span>
                        <p className="text-slate-500 font-semibold text-sm">Aucun paiement enregistré pour le moment.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">ID</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contrat Associé</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Méthode</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Référence</th>
                                        <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Montant</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {paginatedPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400">
                                                #{payment.id.toString().padStart(4, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                                {new Date(payment.payment_date || payment.created_at).toLocaleDateString('fr-FR', {
                                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link to={`/contracts/edit/${payment.contract}`} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                                                    <span>CTR-{payment.contract.toString().padStart(5, '0')}</span>
                                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 inline-flex text-[11px] font-bold rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                                                    {payment.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500 truncate max-w-[150px]">
                                                {payment.reference || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-emerald-600 text-right">
                                                +{parseFloat(payment.amount).toLocaleString()} DH
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={visiblePayments.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default Payments;
