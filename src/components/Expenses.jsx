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
import { useI18n } from '../i18n/context';

const Expenses = () => {
    const { t } = useI18n();
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
        { value: 'ALL', label: t('u.tous'), dot: 'bg-primary' },
        { value: 'AGENCY', label: t('u.agence'), dot: 'bg-danger' },
        { value: 'VEHICLE', label: t('u.vhicule'), dot: 'bg-indigo-500' },
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
        { value: 'Salaries', label: t('u.salaires_du_personnel') },
        { value: 'Rent', label: t('u.loyer_de_l_agence') },
        { value: 'Utilities', label: t('u.lectricit_eau_internet') },
        { value: 'Taxes', label: t('u.taxes_assurances') },
        { value: 'Other', label: t('u.autres_charges_agence') }
    ];

    const VEHICLE_CATEGORIES = [
        { value: 'Maintenance', label: t('u.entretien_rparation') },
        { value: 'Fuel', label: t('u.carburant') },
        { value: 'Taxes', label: t('u.vignette_assurance_vhicule') },
        { value: 'Other', label: t('u.autres_charges_vhicule') }
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
            toast.success(t('u.la_dpense_a_t_enregistre_avec_su'));
            setFormData({
                title: '', category: 'Other', amount: '', vehicle: '', 
                expense_date: new Date().toISOString().split('T')[0], notes: ''
            });
        } catch (error) {
            console.error("Erreur ajout dépense", error);
            toast.error(t('u.erreur_lors_de_l_ajout_de_la_dpe'));
        }
    };

    const handleExport = () => {
        exportToCSV(
            visibleExpenses,
            'journal_depenses',
            [
                { key: 'expense_date', label: t('u.date') },
                { key: 'title', label: t('u.titre') },
                { key: 'category', label: t('u.catgorie') },
                { key: 'amount', label: t('u.montant_mad') },
                { key: 'notes', label: t('u.notes') },
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
                eyebrow={t('u.comptabilit')}
                title={t('u.dpenses')}
                actions={(
                    <>
                        <Button variant="outline" icon="download" onClick={handleExport} title={t('u.exporter_en_csv_excel')}>{t('u.exporter_csv')}</Button>
                        <Button icon="add" onClick={() => setShowModal(true)}>{t('u.ajouter_une_dpense')}</Button>
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
                            <p className="text-[10px] font-bold text-primary-light uppercase tracking-widest truncate">{t('u.total_des_dpenses')}</p>
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{t('u.charges_agence')}</p>
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{t('u.charges_flotte')}</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{formatMoney(totalVehicles)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div>
                <SearchFilterBar
                    placeholder={t('u.rechercher_titre_notes_catgorie')}
                    search={search}
                    onSearchChange={setSearch}
                    options={TYPE_FILTER_OPTIONS}
                    filter={typeFilter}
                    onFilterChange={setTypeFilter}
                />
            </div>

            {/* List */}
            <Table
                caption={t('u.liste_des_dpenses')}
                rows={paginatedExpenses}
                emptyTitle={t('u.aucune_dpense_enregistre')}
                columns={[
                    { key: 'expense_date', label: t('u.date'), className: 'whitespace-nowrap font-medium', render: (v) => formatDate(v) },
                    {
                        key: 'title', label: t('u.titre_description'),
                        render: (v, e) => (
                            <>
                                <p className="font-semibold text-on-surface">{v}</p>
                                {e.notes && <p className="text-xs text-text-muted font-medium mt-0.5 line-clamp-1">{e.notes}</p>}
                            </>
                        ),
                    },
                    {
                        key: 'category', label: t('u.type_catgorie'),
                        render: (_, e) => (
                            <div className="flex flex-col gap-1 items-start">
                                {e.vehicle ? (
                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-label-sm rounded-full bg-primary-light text-primary-deep ring-1 ring-primary-border">
                                        <span className="material-symbols-outlined text-xs" aria-hidden="true">directions_car</span>
                                        {t('u.vhicule_2', { id: e.vehicle })}
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-label-sm rounded-full bg-danger-bg text-danger-dark ring-1 ring-danger-border">
                                        <span className="material-symbols-outlined text-xs" aria-hidden="true">storefront</span>
                                        {t('u.agence')}
                                    </span>
                                )}
                                <span className="text-xs text-text-muted font-medium">
                                    {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                                </span>
                            </div>
                        ),
                    },
                    { key: 'amount', label: t('u.montant'), align: 'right', render: (v) => <span className="font-extrabold text-danger">-{formatMoney(v)}</span> },
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
                title={t('u.enregistrer_une_dpense')}
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>{t('u.annuler')}</Button>
                        <Button type="submit" form="expenseForm" variant="danger" icon="check_circle">{t('u.valider')}</Button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <div role="group" aria-label={t('u.type_de_dpense')} className="flex bg-surface-container p-1 rounded-token">
                        {[
                            ['AGENCY', 'storefront', t('u.dpense_agence'), 'Salaries', { vehicle: '' }],
                            ['VEHICLE', 'directions_car', t('u.dpense_vhicule'), 'Maintenance', {}],
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
                        <Field label={t('u.titre_de_la_dpense')} required className="sm:col-span-2">
                            <Input type="text" required placeholder={t('u.ex_facture_lectricit_janvier')} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                        </Field>
                        <Field label={t('u.montant_mad')} required>
                            <Input type="number" required min="0" step="0.01" placeholder={t('u.ex_500')} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                        </Field>
                        <Field label={t('u.date')} required>
                            <Input type="date" required value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
                        </Field>

                        <div className={`sm:col-span-2 ${expenseType === 'VEHICLE' ? '' : 'hidden'}`}>
                            <p className="label mb-1.5">{t('u.vhicule_concern')} <span className="text-danger" aria-hidden="true">*</span></p>
                            <Dropdown
                                isSearchable
                                placeholder={t('u.slectionner_un_vhicule')}
                                options={vehicles.map((v) => ({ value: String(v.id), label: `${v.marque} ${v.modele} - ${v.matricule}` }))}
                                value={formData.vehicle}
                                onChange={(v) => setFormData({ ...formData, vehicle: v || '' })}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <p className="label mb-1.5">{t('u.catgorie')} <span className="text-danger" aria-hidden="true">*</span></p>
                            <Dropdown options={CATEGORIES} value={formData.category} onChange={(v) => setFormData({ ...formData, category: v })} />
                        </div>

                        <Field label={t('u.notes')} className="sm:col-span-2">
                            <Textarea rows={2} placeholder={t('u.dtails_facultatif')} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                        </Field>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Expenses;
