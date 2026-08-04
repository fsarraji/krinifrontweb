import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('ALL');

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const response = await api.get('payments/');
                setPayments(response.data.results || response.data);
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération des paiements", error);
                setLoading(false);
            }
        };

        fetchPayments();
    }, []);

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des paiements...</div>;

    const totalCollected = payments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

    const methodOptions = [
        { value: 'ALL', label: 'Toutes', dot: 'bg-primary' },
        ...[...new Set(payments.map(p => p.payment_method).filter(Boolean))].map(m => ({
            value: m, label: m, dot: 'bg-secondary-container',
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

    return (
        <div className="max-w-7xl mx-auto px-0 mt-0">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">Paiements</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">Suivi global de toutes les transactions</p>
                </div>
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="material-symbols-outlined text-green-500">account_balance</span>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Collecté</p>
                        <p className="font-headline text-2xl font-extrabold text-[#00236f]">{totalCollected.toLocaleString()} DH</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {visiblePayments.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">money_off</span>
                        <p className="text-slate-500 font-bold">Aucun paiement enregistré pour le moment.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-4 font-extrabold">ID</th>
                                    <th className="px-6 py-4 font-extrabold">Date</th>
                                    <th className="px-6 py-4 font-extrabold">Contrat Associé</th>
                                    <th className="px-6 py-4 font-extrabold">Méthode</th>
                                    <th className="px-6 py-4 font-extrabold">Référence</th>
                                    <th className="px-6 py-4 font-extrabold text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {visiblePayments.map(payment => (
                                    <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-400">#{payment.id.toString().padStart(4, '0')}</td>
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            {new Date(payment.payment_date || payment.created_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link to={`/contracts/edit/${payment.contract}`} className="inline-flex items-center gap-1 font-bold text-primary hover:text-blue-700 hover:underline">
                                                <span>CTR-{payment.contract.toString().padStart(5, '0')}</span>
                                                <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold tracking-wider">
                                                {payment.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[150px]">
                                            {payment.reference || '-'}
                                        </td>
                                        <td className="px-6 py-4 font-extrabold text-green-600 text-right text-base">
                                            +{parseFloat(payment.amount).toLocaleString()} DH
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payments;
