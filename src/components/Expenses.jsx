import React, { useState, useEffect } from 'react';
import api, { fetchAllPages } from '../api';
import Dropdown from './Dropdown';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { toast } from './Toast';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import PageHeader from './ui/PageHeader';
import Table from './ui/Table';
import { formatDate, formatMoney } from '../utils/formatters';

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
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'AGENCY', label: 'Agence', dot: 'bg-danger' },
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
                { key: 'amount', label: 'Montant (MAD)' },
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
            <PageHeader
                className="!mb-0"
                eyebrow="Comptabilité"
                title="Dépenses"
                actions={(
                    <>
                        <Button variant="outline" icon="download" onClick={handleExport} title="Exporter en CSV (Excel)">Exporter (CSV)</Button>
                        <Button icon="add" onClick={() => setShowModal(true)}>Ajouter une dépense</Button>
                    </>
                )}
            />

            {/* Widgets (Compact Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary text-white p-4 rounded-xl shadow-sm flex items-center justify-between h-20 relative overflow-hidden">
                    <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                        <div className="w-11 h-11 bg-white/10 text-white rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-primary-light uppercase tracking-widest truncate">Total des Dépenses</p>
                            <p className="text-xl font-extrabold mt-1 leading-none">{formatMoney(totalGlobal)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-danger-bg text-danger rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">storefront</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Charges Agence</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{formatMoney(totalAgency)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-surface-container-high text-primary rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">directions_car</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Charges Flotte</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{formatMoney(totalVehicles)}</p>
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
            <Table
                caption="Liste des dépenses"
                rows={paginatedExpenses}
                emptyTitle="Aucune dépense enregistrée."
                columns={[
                    { key: 'expense_date', label: 'Date', className: 'whitespace-nowrap font-medium', render: (v) => formatDate(v) },
                    {
                        key: 'title', label: 'Titre / Description',
                        render: (v, e) => (
                            <>
                                <p className="font-semibold text-on-surface">{v}</p>
                                {e.notes && <p className="text-xs text-text-muted font-medium mt-0.5 line-clamp-1">{e.notes}</p>}
                            </>
                        ),
                    },
                    {
                        key: 'category', label: 'Type & catégorie',
                        render: (_, e) => (
                            <div className="flex flex-col gap-1 items-start">
                                {e.vehicle ? (
                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-label-sm rounded-full bg-primary-light text-primary-deep ring-1 ring-primary-border">
                                        <span className="material-symbols-outlined text-xs" aria-hidden="true">directions_car</span>
                                        Véhicule #{e.vehicle}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-label-sm rounded-full bg-danger-bg text-danger-dark ring-1 ring-danger-border">
                                        <span className="material-symbols-outlined text-xs" aria-hidden="true">storefront</span>
                                        Agence
                                    </span>
                                )}
                                <span className="text-xs text-text-muted font-medium">
                                    {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                                </span>
                            </div>
                        ),
                    },
                    { key: 'amount', label: 'Montant', align: 'right', render: (v) => <span className="font-extrabold text-danger">-{formatMoney(v)}</span> },
                ]}
                footer={visibleExpenses.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={visibleExpenses.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
                    />
                )}
            />

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                size="md"
                title="Enregistrer une dépense"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
                        <Button type="submit" form="expenseForm" variant="danger" icon="check_circle">Valider</Button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <div role="group" aria-label="Type de dépense" className="flex bg-surface-container p-1 rounded-token">
                        {[
                            ['AGENCY', 'storefront', 'Dépense agence', 'Salaries', { vehicle: '' }],
                            ['VEHICLE', 'directions_car', 'Dépense véhicule', 'Maintenance', {}],
                        ].map(([type, icon, label, cat, extra]) => (
                            <button
                                key={type}
                                type="button"
                                aria-pressed={expenseType === type}
                                onClick={() => { setExpenseType(type); setFormData((f) => ({ ...f, category: cat, ...extra })); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-token transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${expenseType === type ? 'bg-white text-on-surface shadow-l1' : 'text-text-muted hover:text-on-surface'}`}
                            >
                                <span className="material-symbols-outlined text-base" aria-hidden="true">{icon}</span> {label}
                            </button>
                        ))}
                    </div>

                    <form id="expenseForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Titre de la dépense" required className="sm:col-span-2">
                            <Input type="text" required placeholder="Ex : Facture électricité janvier" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                        </Field>
                        <Field label="Montant (MAD)" required>
                            <Input type="number" required min="0" step="0.01" placeholder="Ex : 500" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                        </Field>
                        <Field label="Date" required>
                            <Input type="date" required value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
                        </Field>

                        <div className={`sm:col-span-2 ${expenseType === 'VEHICLE' ? '' : 'hidden'}`}>
                            <p className="label mb-1.5">Véhicule concerné <span className="text-danger" aria-hidden="true">*</span></p>
                            <Dropdown
                                isSearchable
                                placeholder="-- Sélectionner un véhicule --"
                                options={vehicles.map((v) => ({ value: String(v.id), label: `${v.marque} ${v.modele} - ${v.matricule}` }))}
                                value={formData.vehicle}
                                onChange={(v) => setFormData({ ...formData, vehicle: v || '' })}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <p className="label mb-1.5">Catégorie <span className="text-danger" aria-hidden="true">*</span></p>
                            <Dropdown options={CATEGORIES} value={formData.category} onChange={(v) => setFormData({ ...formData, category: v })} />
                        </div>

                        <Field label="Notes" className="sm:col-span-2">
                            <Textarea rows={2} placeholder="Détails (facultatif)…" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                        </Field>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Expenses;
