import React, { useState, useEffect } from 'react';
import api, { fetchAllPages } from '../api';
import Dropdown from './Dropdown';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { toast } from './Toast';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expenseType, setExpenseType] = useState('AGENCY');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const TYPE_FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-indigo-600' },
        { value: 'AGENCY', label: 'Agence', dot: 'bg-rose-500' },
        { value: 'VEHICLE', label: 'Véhicule', dot: 'bg-indigo-500' },
    ];

    const [formData, setFormData] = useState({
        title: '',
        category: 'Salaries',
        amount: '',
        vehicle: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const AGENCY_CATEGORIES = [
        { value: 'Salaries', label: 'Salaires du personnel' },
        { value: 'Rent', label: 'Loyer de l\'agence' },
        { value: 'Utilities', label: 'Électricité / Eau / Internet' },
        { value: 'Taxes', label: 'Taxes & Assurances' },
        { value: 'Other', label: 'Autres charges agence' }
    ];

    const VEHICLE_CATEGORIES = [
        { value: 'Maintenance', label: 'Entretien & Réparation' },
        { value: 'Fuel', label: 'Carburant' },
        { value: 'Taxes', label: 'Vignette & Assurance véhicule' },
        { value: 'Other', label: 'Autres charges véhicule' }
    ];

    const CATEGORIES = expenseType === 'VEHICLE' ? VEHICLE_CATEGORIES : AGENCY_CATEGORIES;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [expenses, vehicles] = await Promise.all([
                    fetchAllPages('expenses/'),
                    fetchAllPages('vehicles/')
                ]);
                setExpenses(expenses);
                setVehicles(vehicles);
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération des données", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                category: formData.category,
                amount: parseFloat(formData.amount),
                expense_date: formData.expense_date,
                notes: formData.notes,
                vehicle: expenseType === 'VEHICLE' && formData.vehicle ? parseInt(formData.vehicle) : null,
            };

            await api.post('expenses/', payload);
            
            const expenses = await fetchAllPages('expenses/');
            setExpenses(expenses);
            setShowModal(false);
            toast.success("La dépense a été enregistrée avec succès.");
            setFormData({
                title: '', category: 'Other', amount: '', vehicle: '', 
                expense_date: new Date().toISOString().split('T')[0], notes: ''
            });
        } catch (error) {
            console.error("Erreur ajout dépense", error);
            toast.error("Erreur lors de l'ajout de la dépense.");
        }
    };

    const handleExport = () => {
        exportToCSV(
            visibleExpenses,
            'journal_depenses',
            [
                { key: 'expense_date', label: 'Date' },
                { key: 'title', label: 'Titre' },
                { key: 'category', label: 'Catégorie' },
                { key: 'amount', label: 'Montant (DH)' },
                { key: 'notes', label: 'Notes' },
            ]
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl"></div>
                <SkeletonCards count={3} />
                <SkeletonTable rows={5} cols={4} />
            </div>
        );
    }

    const totalAgency = expenses.filter(e => !e.vehicle).reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const totalVehicles = expenses.filter(e => e.vehicle).reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const totalGlobal = totalAgency + totalVehicles;

    const visibleExpenses = expenses.filter(e => {
        const q = search.trim().toLowerCase();
        const matchType = typeFilter === 'ALL' || (typeFilter === 'AGENCY' ? !e.vehicle : !!e.vehicle);
        const matchSearch = !q || [e.title, e.notes, e.category]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q));
        return matchType && matchSearch;
    });

    const paginatedExpenses = visibleExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Comptabilité</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dépenses</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                        title="Exporter en CSV (Excel)"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Ajouter une Dépense
                    </button>
                </div>
            </div>

            {/* Widgets (Compact Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-sm flex items-center justify-between h-20 relative overflow-hidden">
                    <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                        <div className="w-11 h-11 bg-white/10 text-white rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest truncate">Total des Dépenses</p>
                            <p className="text-xl font-extrabold mt-1 leading-none">{totalGlobal.toLocaleString()} DH</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">storefront</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Charges Agence</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{totalAgency.toLocaleString()} DH</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">directions_car</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Charges Flotte</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{totalVehicles.toLocaleString()} DH</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div>
                <SearchFilterBar
                    placeholder="Rechercher (titre, notes, catégorie)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={TYPE_FILTER_OPTIONS}
                    filter={typeFilter}
                    onFilterChange={setTypeFilter}
                />
            </div>

            {/* List */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {visibleExpenses.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-medium">Aucune dépense enregistrée.</div>
                ) : (
                    <>
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Titre / Description</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Type & Catégorie</th>
                                    <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {paginatedExpenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                            {new Date(e.expense_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                                            {e.notes && <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{e.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 items-start">
                                                {e.vehicle ? (
                                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-bold rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20">
                                                        <span className="material-symbols-outlined text-xs">directions_car</span>
                                                        Véhicule #{e.vehicle}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-600/20">
                                                        <span className="material-symbols-outlined text-xs">storefront</span>
                                                        Agence
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-rose-600 text-right">
                                            -{parseFloat(e.amount).toLocaleString()} DH
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={visibleExpenses.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                    />
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500 text-xl">money_off</span> 
                                Enregistrer une Dépense
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Type Selector */}
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => { setExpenseType('AGENCY'); setFormData(f => ({...f, category: 'Salaries', vehicle: ''})); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${expenseType === 'AGENCY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <span className="material-symbols-outlined text-base">storefront</span> Dépense Agence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setExpenseType('VEHICLE'); setFormData(f => ({...f, category: 'Maintenance'})); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${expenseType === 'VEHICLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <span className="material-symbols-outlined text-base">directions_car</span> Dépense Véhicule
                                </button>
                            </div>

                            <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Titre de la dépense <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="Ex: Facture électricité Janvier"
                                            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Montant (DH) <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="number" required min="0" step="0.01"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="Ex: 500"
                                            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="date" required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className={`col-span-2 ${expenseType === 'VEHICLE' ? '' : 'hidden'}`}>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Véhicule Concerné <span className="text-rose-500">*</span></label>
                                        <Dropdown
                                            isSearchable
                                            placeholder="-- Sélectionner un véhicule --"
                                            options={vehicles.map(v => ({
                                                value: String(v.id),
                                                label: `${v.marque} ${v.modele} - ${v.matricule}`
                                            }))}
                                            value={formData.vehicle}
                                            onChange={(v) => setFormData({...formData, vehicle: v || ''})}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Catégorie <span className="text-rose-500">*</span></label>
                                        <Dropdown
                                            options={CATEGORIES}
                                            value={formData.category}
                                            onChange={(v) => setFormData({...formData, category: v})}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notes</label>
                                        <textarea 
                                            rows="2"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            placeholder="Détails (facultatif)..."
                                            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                Annuler
                            </button>
                            <button form="expenseForm" type="submit" className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200/50 transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
