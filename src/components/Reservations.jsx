import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import CloseContractModal from './CloseContractModal';
import ActivateReservationModal from './ActivateReservationModal';
import SearchFilterBar from './SearchFilterBar';

const REQUEST_STATUS_META = {
    PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    CONFIRMED: { label: 'ConfirmÃ©e', className: 'bg-green-50 text-green-700' },
    CANCELLED: { label: 'AnnulÃ©e', className: 'bg-red-50 text-red-600' },
};

const REQUEST_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
    { value: 'PENDING', label: 'En attente', dot: 'bg-amber-500' },
    { value: 'CONFIRMED', label: 'ConfirmÃ©e', dot: 'bg-green-500' },
    { value: 'CANCELLED', label: 'AnnulÃ©e', dot: 'bg-red-500' },
];

const RESERVATION_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
    { value: 'Paid', label: 'PayÃ©', dot: 'bg-green-500' },
    { value: 'Partial', label: 'Partiel', dot: 'bg-amber-500' },
    { value: 'Unpaid', label: 'ImpayÃ©', dot: 'bg-red-500' },
];

const Reservations = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('demandes');
    const [contracts, setContracts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [search, setSearch] = useState('');
    const [requestFilter, setRequestFilter] = useState('ALL');
    const [reservationFilter, setReservationFilter] = useState('ALL');

    const fetchAll = async () => {
        try {
            const [contractsRes, requestsRes] = await Promise.all([
                api.get('contracts/?page_size=500'),
                api.get('reservations/?page_size=500'),
            ]);
            const contractData = contractsRes.data?.results ?? contractsRes.data ?? [];
            const requestData = requestsRes.data?.results ?? requestsRes.data ?? [];
            setContracts(Array.isArray(contractData) ? contractData : []);
            setRequests(Array.isArray(requestData) ? requestData : []);
            setLoading(false);
        } catch (error) {
            console.error('Erreur lors de la rÃ©cupÃ©ration des rÃ©servations', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    const openActivateModal = (contract) => {
        setSelectedContract(contract);
        setIsActivateModalOpen(true);
    };

    const handleActivated = () => {
        setSuccessMsg('ðŸš€ La rÃ©servation a Ã©tÃ© activÃ©e ! Le vÃ©hicule est maintenant louÃ©.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchAll();
    };

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirmer cette demande de rÃ©servation ? Un contrat (RÃ©servÃ©) sera crÃ©Ã©.')) return;
        setBusyId(id);
        try {
            await api.post(`reservations/${id}/confirm/`, {});
            setSuccessMsg('âœ… RÃ©servation confirmÃ©e. Le contrat en statut RÃ©servÃ© a Ã©tÃ© crÃ©Ã©.');
            setTimeout(() => setSuccessMsg(''), 5000);
            fetchAll();
        } catch (error) {
            console.error("Erreur lors de la confirmation", error);
            alert(error.response?.data?.detail || "Erreur lors de la confirmation de la rÃ©servation.");
        } finally {
            setBusyId(null);
        }
    };

    const handleRefuse = async (id) => {
        if (!window.confirm('Refuser cette demande de rÃ©servation ?')) return;
        setBusyId(id);
        try {
            await api.patch(`reservations/${id}/`, { statut: 'CANCELLED' });
            fetchAll();
        } catch (error) {
            console.error("Erreur lors du refus", error);
            alert(error.response?.data?.detail || "Erreur lors du refus de la rÃ©servation.");
        } finally {
            setBusyId(null);
        }
    };

    const handleDownloadPDF = async (id) => {
        try {
            const response = await api.get(`contracts/${id}/print_reservation_receipt/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Recu_Reservation_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erreur lors du tÃ©lÃ©chargement du PDF", error);
            alert("Erreur lors de la gÃ©nÃ©ration du PDF.");
        }
    };

    const RESERVATION_STATUSES = ['RESERVE', 'EN_COURS', 'TERMINE'];
    const reservations = contracts.filter(c => RESERVATION_STATUSES.includes(c.statut));
    const pendingRequests = requests.filter(r => r.statut === 'PENDING');

    const matchesSearch = (obj, fields) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return fields.filter(Boolean).some(f => String(f).toLowerCase().includes(q));
    };

    const visibleRequests = requests.filter(r =>
        (requestFilter === 'ALL' || r.statut === requestFilter) &&
        matchesSearch(r, [r.client_name, r.vehicle_name])
    );
    const visibleReservations = reservations.filter(c =>
        (reservationFilter === 'ALL' || c.payment_status === reservationFilter) &&
        matchesSearch(c, [c.client_name, c.client_prenom, c.vehicle_name, c.vehicle_matricule])
    );

    const paymentStyles = {
        'Paid': 'bg-tertiary-container/20 text-on-tertiary-fixed-variant',
        'Partial': 'bg-secondary-container text-on-secondary-container',
        'Unpaid': 'bg-error-container text-on-error-container',
    };

    const statusStyles = {
        'RESERVE': 'bg-secondary-container text-on-secondary-container',
        'EN_COURS': 'bg-tertiary-container text-on-tertiary-container',
        'TERMINE': 'bg-surface-container-highest text-on-surface-variant',
        'ANNULE': 'bg-error-container text-on-error-container',
    };

    const statusLabels = {
        'RESERVE': 'RÃ©servÃ©e',
        'EN_COURS': 'En cours',
        'TERMINE': 'TerminÃ©e',
        'ANNULE': 'AnnulÃ©e',
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des rÃ©servations...</div>;

    return (
        <div className="p-0">
            {successMsg && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                </div>
            )}

            {/* Editorial Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex flex-col">
                    <span className="font-label text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-1">OpÃ©rations de Flotte</span>
                    <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">RÃ©servations</h1>
                </div>
                <button
                    onClick={() => navigate('/reservations/new')}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:bg-primary/95 transition-all mt-1"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouvelle RÃ©servation
                </button>
            </div>

            {/* KPI Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">Demandes Clients Ã  Valider</span>
                        <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-lg">mark_email_unread</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-amber-600">{pendingRequests.length}</div>
                    <p className="text-xs text-slate-400 mt-2">En attente de validation par l'agence</p>
                </div>
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">RÃ©servations</span>
                        <span className="material-symbols-outlined text-secondary bg-secondary/5 p-2 rounded-lg">event_note</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-secondary">{reservations.length}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => setTab('demandes')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'demandes' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    Demandes Clients
                    {pendingRequests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{pendingRequests.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setTab('reservations')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'reservations' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    RÃ©servations
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{reservations.length}</span>
                </button>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
                <SearchFilterBar
                    placeholder={tab === 'demandes' ? "Rechercher (client, vÃ©hicule)..." : "Rechercher (client, vÃ©hicule, matricule)..."}
                    search={search}
                    onSearchChange={setSearch}
                    options={tab === 'demandes' ? REQUEST_FILTER_OPTIONS : RESERVATION_FILTER_OPTIONS}
                    filter={tab === 'demandes' ? requestFilter : reservationFilter}
                    onFilterChange={tab === 'demandes' ? setRequestFilter : setReservationFilter}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-50">
                <div className="overflow-x-auto">
                    {tab === 'demandes' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">VÃ©hicule</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Dates DemandÃ©es</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Prix / Jour</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Statut</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {visibleRequests.map(request => {
                                    const meta = REQUEST_STATUS_META[request.statut] || REQUEST_STATUS_META.PENDING;
                                    const busy = busyId === request.id;
                                    return (
                                        <tr key={request.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-headline font-bold text-primary">
                                                        {(request.client_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-headline font-bold text-slate-900 text-sm">{request.client_name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">#RES-{request.id.toString().padStart(5, '0')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-body font-semibold text-sm">{request.vehicle_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-slate-900 font-medium">{request.formatted_dates?.range}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-headline font-bold text-sm text-primary">{request.prix_par_jour} DH</td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {request.statut === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleRefuse(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        >
                                                            Refuser
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfirm(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                        >
                                                            {busy ? '...' : 'Confirmer'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visibleRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Aucune demande de rÃ©servation client.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client / ID</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">VÃ©hicule</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Dates de RÃ©servation</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Montant Total</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Statut</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Paiement</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold text-right">Actions rapides</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {visibleReservations.map(contract => (
                                    <tr key={contract.id} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-headline font-bold text-primary">
                                                    {contract.client_initials}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-headline font-bold text-slate-900 text-sm">{contract.client_name} {contract.client_prenom}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">#RES-{contract.id.toString().padStart(5, '0')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-body font-semibold text-sm">{contract.vehicle_name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{contract.vehicle_matricule}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-slate-900 font-medium">{contract.formatted_dates.range}</span>
                                                <span className="text-slate-500 italic">{contract.jours} Jours</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-headline font-bold text-sm text-primary">{contract.montant_total} DH</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[contract.statut]}`}>
                                                {statusLabels[contract.statut] || contract.statut}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStyles[contract.payment_status]}`}>
                                                {contract.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {contract.statut === 'RESERVE' && (
                                                    <button
                                                        onClick={() => openActivateModal(contract)}
                                                        className="p-2 text-green-500 hover:text-green-700 transition-colors bg-green-50 rounded-lg"
                                                        title="Activer la RÃ©servation (Transformer en Location En Cours)"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">play_circle</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    title="Modifier la RÃ©servation"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(contract.id)}
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    title="GÃ©nÃ©rer PDF de la RÃ©servation"
                                                >
                                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {visibleReservations.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Aucune rÃ©servation.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ActivateReservationModal
                isOpen={isActivateModalOpen}
                onClose={() => setIsActivateModalOpen(false)}
                contract={selectedContract}
                onActivated={handleActivated}
            />
        </div>
    );
};

export default Reservations;
