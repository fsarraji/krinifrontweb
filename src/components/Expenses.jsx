import React, { useState, useEffect } from 'react';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expenseType, setExpenseType] = useState('AGENCY'); // 'AGENCY' or 'VEHICLE'
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');

    const TYPE_FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'AGENCY', label: 'Agence', dot: 'bg-red-500' },
        { value: 'VEHICLE', label: 'Véhicule', dot: 'bg-blue-500' },
    ];

    const [formData, setFormData] = useState({
        title: '',
        category: 'Salaries',
        amount: '',
        vehicle: '', // Vehicle ID
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
                const [expRes, vehRes] = await Promise.all([
                    api.get('expenses/'),
                    api.get('vehicles/')
                ]);
                setExpenses(expRes.data.results || expRes.data);
                setVehicles(vehRes.data.results || vehRes.data);
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
                // agency is automatically set by the backend from the authenticated user token
            };

            await api.post('expenses/', payload);
            
            // Refresh
            const expRes = await api.get('expenses/');
            setExpenses(expRes.data.results || expRes.data);
            setShowModal(false);
            setFormData({
                title: '', category: 'Other', amount: '', vehicle: '', 
                expense_date: new Date().toISOString().split('T')[0], notes: ''
            });
        } catch (error) {
            console.error("Erreur ajout dépense", error);
            alert("Erreur lors de l'ajout de la dépense.");
        }
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement...</div>;

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

    return (
        <div className="max-w-7xl mx-auto px-0 mt-0">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">Dépenses</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">Gestion des charges de l'agence et de la flotte</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">add</span>
                    Ajouter une Dépense
                </button>
            </div>

            {/* Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#00236f] text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                    <span className="material-symbols-outlined absolute right-4 top-4 text-6xl opacity-10">account_balance_wallet</span>
                    <p className="text-[10px] uppercase font-bold text-blue-200 tracking-widest mb-2">Total des Dépenses</p>
                    <p className="font-headline text-3xl font-extrabold">{totalGlobal.toLocaleString()} DH</p>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center absolute right-6 top-6">
                        <span className="material-symbols-outlined">storefront</span>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Charges Agence</p>
                    <p className="font-headline text-2xl font-extrabold text-slate-800">{totalAgency.toLocaleString()} DH</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">Électricité, Loyers, Salaires</p>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center absolute right-6 top-6">
                        <span className="material-symbols-outlined">directions_car</span>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Charges Flotte</p>
                    <p className="font-headline text-2xl font-extrabold text-slate-800">{totalVehicles.toLocaleString()} DH</p>
                    <p className="text-xs text-slate-400 font-medium mt-1">Carburant, Entretiens, Assurances</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {visibleExpenses.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">Aucune dépense enregistrée.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <th className="px-6 py-4 font-extrabold">Date</th>
                                    <th className="px-6 py-4 font-extrabold">Titre / Description</th>
                                    <th className="px-6 py-4 font-extrabold">Type & Catégorie</th>
                                    <th className="px-6 py-4 font-extrabold text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleExpenses.map(e => (
                                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-600">
                                            {new Date(e.expense_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{e.title}</p>
                                            {e.notes && <p className="text-[10px] text-slate-400 line-clamp-1">{e.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                {e.vehicle ? (
                                                    <span className="inline-flex gap-1 items-center px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold tracking-widest uppercase rounded">
                                                        <span className="material-symbols-outlined text-[10px]">directions_car</span>
                                                        Véhicule #{e.vehicle}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex gap-1 items-center px-2 py-1 bg-red-50 text-red-600 text-[9px] font-bold tracking-widest uppercase rounded">
                                                        <span className="material-symbols-outlined text-[10px]">storefront</span>
                                                        Agence
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-500 font-medium">{CATEGORIES.find(c => c.value === e.category)?.label || e.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-extrabold text-red-600 text-right text-base whitespace-nowrap">
                                            -{parseFloat(e.amount).toLocaleString()} DH
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">money_off</span> 
                                Enregistrer une Dépense
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-error transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {/* Type Selector */}
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setExpenseType('AGENCY'); setFormData(f => ({...f, category: 'Salaries', vehicle: ''})); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${expenseType === 'AGENCY' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">storefront</span> Dépense Agence
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setExpenseType('VEHICLE'); setFormData(f => ({...f, category: 'Maintenance'})); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${expenseType === 'VEHICLE' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">directions_car</span> Dépense Véhicule
                                </button>
                            </div>

                            <form id="expenseForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titre de la dépense <span className="text-error">*</span></label>
                                        <input 
                                            type="text" required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold"
                                            placeholder="Ex: Facture électricité Janvier"
                                            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Montant (DH) <span className="text-error">*</span></label>
                                        <input 
                                            type="number" required min="0" step="0.01"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold"
                                            placeholder="Ex: 500"
                                            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date <span className="text-error">*</span></label>
                                        <input 
                                            type="date" required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold"
                                            value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className={`col-span-2 ${expenseType === 'VEHICLE' ? '' : 'hidden'}`}>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Véhicule Concerné <span className="text-error">*</span></label>
                                        <select 
                                            required={expenseType === 'VEHICLE'}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 text-sm font-bold outline-none"
                                            value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})}
                                        >
                                            <option value="">-- Sélectionner un véhicule --</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.marque} {v.modele} - {v.matricule}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catégorie <span className="text-error">*</span></label>
                                        <select 
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 text-sm font-bold outline-none"
                                            value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                                        >
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                                        <textarea 
                                            rows="2"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                            placeholder="Détails (facultatif)..."
                                            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                Annuler
                            </button>
                            <button form="expenseForm" type="submit" className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white bg-error shadow-lg shadow-error/20 hover:bg-error/95 hover:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Valider la Dépense
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
