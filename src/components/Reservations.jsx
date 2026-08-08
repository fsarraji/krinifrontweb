import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import CloseContractModal from './CloseContractModal';
import ActivateReservationModal from './ActivateReservationModal';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';

const REQUEST_STATUS_META = {
    PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    CONFIRMED: { label: 'Confirmée', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    CANCELLED: { label: 'Annulée', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
};

const REQUEST_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-indigo-600' },
    { value: 'PENDING', label: 'En attente', dot: 'bg-amber-500' },
    { value: 'CONFIRMED', label: 'Confirmée', dot: 'bg-emerald-500' },
    { value: 'CANCELLED', label: 'Annulée', dot: 'bg-rose-500' },
];

const RESERVATION_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-indigo-600' },
    { value: 'Paid', label: 'Payé', dot: 'bg-emerald-500' },
    { value: 'Partial', label: 'Partiel', dot: 'bg-amber-500' },
    { value: 'Unpaid', label: 'Impayé', dot: 'bg-rose-500' },
];

const AVATAR_COLORS = [
    'bg-indigo-50 text-indigo-700 ring-indigo-100',
    'bg-purple-50 text-purple-700 ring-purple-100',
    'bg-amber-50 text-amber-700 ring-amber-100',
    'bg-pink-50 text-pink-700 ring-pink-100',
    'bg-cyan-50 text-cyan-700 ring-cyan-100',
    'bg-emerald-50 text-emerald-700 ring-emerald-100',
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
    const [contractPage, setContractPage] = useState(1);
    const [contractPageSize, setContractPageSize] = useState(10);
    const [requestPage, setRequestPage] = useState(1);
    const [requestPageSize, setRequestPageSize] = useState(10);

    const fetchAll = async () => {
        try {
            const [contractsRes, requestsRes] = await Promise.all([
                api.get('contracts/?page_size=500'),
                api.get('booking-requests/?page_size=500'),
            ]);
            const contractData = contractsRes.data?.results ?? contractsRes.data ?? [];
            const requestData = requestsRes.data?.results ?? requestsRes.data ?? [];
            setContracts(Array.isArray(contractData) ? contractData : []);
            setRequests(Array.isArray(requestData) ? requestData : []);
            setLoading(false);
        } catch (error) {
            console.error('Erreur lors de la récupération des réservations', error);
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
        setSuccessMsg('🚀 La réservation a été activée ! Le véhicule est maintenant loué.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchAll();
    };

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirmer cette demande de réservation ? Le client sera créé automatiquement s\'il n\'existe pas, et un contrat (Réservé) sera généré.')) return;
        setBusyId(id);
        try {
            const res = await api.post(`booking-requests/${id}/confirm/`, {});
            const isNewClient = res.data?.client_created;
            setSuccessMsg(
                isNewClient
                    ? '✅ Réservation confirmée. Nouveau client créé automatiquement et contrat généré.'
                    : '✅ Réservation confirmée. Le contrat en statut Réservé a été créé.'
            );
            setTimeout(() => setSuccessMsg(''), 6000);
            fetchAll();
        } catch (error) {
            console.error("Erreur lors de la confirmation", error);
            alert(error.response?.data?.detail || "Erreur lors de la confirmation de la réservation.");
        } finally {
            setBusyId(null);
        }
    };

    const handleRefuse = async (id) => {
        if (!window.confirm('Refuser cette demande de réservation ?')) return;
        setBusyId(id);
        try {
            await api.patch(`booking-requests/${id}/`, { statut: 'CANCELLED' });
            fetchAll();
        } catch (error) {
            console.error("Erreur lors du refus", error);
            alert(error.response?.data?.detail || "Erreur lors du refus de la réservation.");
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
            console.error("Erreur lors du téléchargement du PDF", error);
            alert("Erreur lors de la génération du PDF.");
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
        'Paid': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        'Partial': 'bg-amber-50 text-amber-700 ring-amber-600/20',
        'Unpaid': 'bg-rose-50 text-rose-700 ring-rose-600/20',
    };

    const paginatedRequests = visibleRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize);
    const paginatedReservations = visibleReservations.slice((contractPage - 1) * contractPageSize, contractPage * contractPageSize);


    const statusStyles = {
        'RESERVE': 'bg-blue-50 text-blue-700 ring-blue-600/20',
        'EN_COURS': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        'TERMINE': 'bg-slate-100 text-slate-600 ring-slate-200',
        'ANNULE': 'bg-rose-50 text-rose-700 ring-rose-600/20',
    };

    const statusLabels = {
        'RESERVE': 'Réservée',
        'EN_COURS': 'En cours',
        'TERMINE': 'Terminée',
        'ANNULE': 'Annulée',
    };

    const initialsFor = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        const first = (parts[0] || '').charAt(0);
        const second = parts.length > 1 ? (parts[1] || '').charAt(0) : '';
        return (first + second).toUpperCase() || name.charAt(0).toUpperCase();
    };

    if (loading) return <div className="flex justify-center items-center h-64 text-slate-500 font-semibold">Chargement des réservations...</div>;

    return (
        <div className="flex flex-col h-full gap-6">
            {successMsg && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                </div>
            )}

            {/* Editorial Header */}
            <header className="flex items-end justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Opérations de Flotte</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Réservations</h2>
                </div>
                <button
                    onClick={() => navigate('/reservations/new')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouvelle Réservation
                </button>
            </header>

            {/* Filters & Search */}
            <div className="flex flex-col gap-5">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                        onClick={() => setTab('demandes')}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5 ${
                            tab === 'demandes'
                                ? 'text-slate-900 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                        Demandes Clients
                        {pendingRequests.length > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full ring-1 ring-amber-200/50">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('reservations')}
                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5 ${
                            tab === 'reservations'
                                ? 'text-slate-900 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                        Réservations
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full ring-1 ring-indigo-200/50">
                            {reservations.length}
                        </span>
                    </button>
                </div>

                {/* Search & Filter */}
                <SearchFilterBar
                    placeholder={tab === 'demandes' ? "Rechercher (client, véhicule)..." : "Rechercher (client, véhicule, matricule)..."}
                    search={search}
                    onSearchChange={setSearch}
                    options={tab === 'demandes' ? REQUEST_FILTER_OPTIONS : RESERVATION_FILTER_OPTIONS}
                    filter={tab === 'demandes' ? requestFilter : reservationFilter}
                    onFilterChange={tab === 'demandes' ? setRequestFilter : setReservationFilter}
                />
            </div>

            {/* Data Table */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    {tab === 'demandes' ? (
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Véhicule</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dates Demandées</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Prix / Jour</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {paginatedRequests.map((request, i) => {
                                    const meta = REQUEST_STATUS_META[request.statut] || REQUEST_STATUS_META.PENDING;
                                    const busy = busyId === request.id;
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={request.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`flex-shrink-0 h-10 w-10 rounded-xl ${avatarClass} flex items-center justify-center font-bold text-sm ring-1`}>
                                                        {initialsFor(request.client_name)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{request.client_name}</div>
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">#RES-{request.id.toString().padStart(5, '0')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{request.vehicle_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-800">{request.formatted_dates?.range}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{request.prix_par_jour} DH</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ring-1 ${meta.className}`}>{meta.label}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {request.statut === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleRefuse(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                                                        >
                                                            Refuser
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfirm(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Aucune demande de réservation client.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client / ID</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Véhicule</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dates de Réservation</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Montant Total</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Paiement</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Actions Rapides</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {paginatedReservations.map((contract, i) => {
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`flex-shrink-0 h-10 w-10 rounded-xl ${avatarClass} flex items-center justify-center font-bold text-sm ring-1`}>
                                                        {contract.client_initials || initialsFor(`${contract.client_prenom} ${contract.client_name}`)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{contract.client_name} {contract.client_prenom}</div>
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">#RES-{contract.id.toString().padStart(5, '0')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900">{contract.vehicle_name}</div>
                                                <div className="text-xs text-slate-500 font-medium mt-0.5">{contract.vehicle_matricule}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-800">{contract.formatted_dates?.range}</div>
                                                <div className="text-xs font-semibold text-indigo-600 mt-0.5">{contract.jours} Jours</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{contract.montant_total} DH</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ring-1 ${statusStyles[contract.statut]}`}>
                                                    {statusLabels[contract.statut] || contract.statut}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ring-1 ${paymentStyles[contract.payment_status]}`}>
                                                    {contract.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    {contract.statut === 'RESERVE' ? (
                                                        <button
                                                            onClick={() => openActivateModal(contract)}
                                                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                                                            title="Activer la Réservation (Transformer en Location En Cours)"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">play_circle</span>
                                                        </button>
                                                    ) : (
                                                        <div className="w-9 h-9"></div>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                        title="Modifier la Réservation"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPDF(contract.id)}
                                                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                        title="Générer PDF de la Réservation"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visibleReservations.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-slate-400">Aucune réservation.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                <Pagination
                    currentPage={tab === 'demandes' ? requestPage : contractPage}
                    totalItems={tab === 'demandes' ? visibleRequests.length : visibleReservations.length}
                    pageSize={tab === 'demandes' ? requestPageSize : contractPageSize}
                    onPageChange={tab === 'demandes' ? setRequestPage : setContractPage}
                    onPageSizeChange={tab === 'demandes'
                        ? (s) => { setRequestPageSize(s); setRequestPage(1); }
                        : (s) => { setContractPageSize(s); setContractPage(1); }
                    }
                />
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