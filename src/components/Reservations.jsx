import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import CloseContractModal from './CloseContractModal';
import ActivateReservationModal from './ActivateReservationModal';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import StatusBadge from './ui/StatusBadge';

const REQUEST_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
    { value: 'PENDING', label: 'En attente', dot: 'bg-warning' },
    { value: 'CONFIRMED', label: 'Confirmée', dot: 'bg-success' },
    { value: 'CANCELLED', label: 'Annulée', dot: 'bg-danger' },
];

const RESERVATION_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
    { value: 'Paid', label: 'Payé', dot: 'bg-success' },
    { value: 'Partial', label: 'Partiel', dot: 'bg-warning' },
    { value: 'Unpaid', label: 'Impayé', dot: 'bg-danger' },
];

const AVATAR_COLORS = [
    'bg-info-bg text-primary ring-info-bg',
    'bg-purple-50 text-purple-700 ring-purple-100',
    'bg-warning-bg text-warning ring-warning-bg',
    'bg-danger-bg text-danger ring-danger-bg',
    'bg-success-bg text-success ring-success-bg',
];

const Reservations = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('demandes');
    const [contracts, setContracts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [clientReservations, setClientReservations] = useState([]);
    const [loading, setLoading] = useState(true);
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
            const [contracts, requests, reservations] = await Promise.all([
                fetchAllPages('contracts/'),
                fetchAllPages('booking-requests/'),
                fetchAllPages('reservations/'),
            ]);
            setContracts(Array.isArray(contracts) ? contracts : []);
            setRequests(Array.isArray(requests) ? requests : []);
            setClientReservations(Array.isArray(reservations) ? reservations : []);
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
        toast.success('La réservation a été activée ! Le véhicule est maintenant loué.');
        fetchAll();
    };

    const handleConfirm = (request) => {
        messageBox.confirm('Confirmer cette demande de réservation ? Un contrat (Réservé) sera généré.', 'Confirmation', {
            confirmText: 'Confirmer',
            onConfirm: async () => {
                setBusyId(`${request.kind}-${request.id}`);
                try {
                    const isReservation = request.kind === 'reservation';
                    const res = await api.post(
                        isReservation ? `reservations/${request.id}/confirm/` : `booking-requests/${request.id}/confirm/`,
                        {}
                    );
                    const isNewClient = res.data?.client_created;
                    toast.success(
                        isNewClient
                            ? 'Réservation confirmée. Nouveau client créé automatiquement et contrat généré.'
                            : 'Réservation confirmée. Le contrat en statut Réservé a été créé.'
                    );
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors de la confirmation", error);
                    toast.error(error.response?.data?.detail || "Erreur lors de la confirmation de la réservation.");
                } finally {
                    setBusyId(null);
                }
            }
        });
    };

    const handleRefuse = (request) => {
        messageBox.confirm('Refuser cette demande de réservation ?', 'Refuser', {
            confirmText: 'Refuser',
            destructive: true,
            onConfirm: async () => {
                setBusyId(`${request.kind}-${request.id}`);
                try {
                    await api.patch(
                        request.kind === 'reservation' ? `reservations/${request.id}/` : `booking-requests/${request.id}/`,
                        { statut: 'CANCELLED' }
                    );
                    toast.success('Demande de réservation refusée.');
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors du refus", error);
                    toast.error(error.response?.data?.detail || "Erreur lors du refus de la réservation.");
                } finally {
                    setBusyId(null);
                }
            }
        });
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
            toast.error("Erreur lors de la génération du PDF.");
        }
    };

    const RESERVATION_STATUSES = ['RESERVE', 'EN_COURS', 'TERMINE'];
    const reservations = contracts.filter(c => RESERVATION_STATUSES.includes(c.statut));
    const allRequests = [
        ...requests.map(r => ({ ...r, kind: 'booking' })),
        ...clientReservations.map(r => ({ ...r, kind: 'reservation' })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const pendingRequests = allRequests.filter(r => r.statut === 'PENDING');

    const matchesSearch = (obj, fields) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return fields.filter(Boolean).some(f => String(f).toLowerCase().includes(q));
    };

    const visibleRequests = allRequests.filter(r =>
        (requestFilter === 'ALL' || r.statut === requestFilter) &&
        matchesSearch(r, [r.client_name, r.vehicle_name])
    );
    const visibleReservations = reservations.filter(c =>
        (reservationFilter === 'ALL' || c.payment_status === reservationFilter) &&
        matchesSearch(c, [c.client_name, c.client_prenom, c.vehicle_name, c.vehicle_matricule])
    );

    const paginatedRequests = visibleRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize);
    const paginatedReservations = visibleReservations.slice((contractPage - 1) * contractPageSize, contractPage * contractPageSize);

    const initialsFor = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        const first = (parts[0] || '').charAt(0);
        const second = parts.length > 1 ? (parts[1] || '').charAt(0) : '';
        return (first + second).toUpperCase() || name.charAt(0).toUpperCase();
    };

    if (loading) return <div className="flex justify-center items-center h-64 text-on-surface-variant font-semibold">Chargement des réservations...</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Editorial Header */}
            <header className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Opérations de Flotte</p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>Réservations</h2>
                </div>
                <button
                    onClick={() => navigate('/reservations/new')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--primary-container)' }}
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nouvelle Réservation
                </button>
            </header>

            {/* Filters & Search */}
            <div className="flex flex-col gap-5 mb-6">
                {/* Tabs */}
                <div className="flex gap-2 p-1 rounded-token w-fit" style={{ background: 'var(--slate-bg)' }}>
                    <button
                        onClick={() => setTab('demandes')}
                        className={`px-5 py-2 text-[13px] font-semibold rounded-token transition-colors flex items-center gap-2.5 ${
                            tab === 'demandes'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: tab === 'demandes' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        Demandes Clients
                        {pendingRequests.length > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab('reservations')}
                        className={`px-5 py-2 text-[13px] font-semibold rounded-token transition-colors flex items-center gap-2.5 ${
                            tab === 'reservations'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: tab === 'reservations' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        Réservations
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
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
            <div className="card rounded-token overflow-hidden shadow-l1">
                <div className="overflow-x-auto w-full">
                    {tab === 'demandes' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'var(--slate-bg)' }}>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Véhicule</th>
                                    <th className="px-6 py-4">Dates Demandées</th>
                                    <th className="px-6 py-4">Prix / Jour</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                                {paginatedRequests.map((request, i) => {
                                    const busy = busyId === `${request.kind}-${request.id}`;
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={`${request.kind}-${request.id}`} className="row hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 font-semibold">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`avatar ${avatarClass}`}>
                                                        {initialsFor(request.client_name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{request.client_name}</div>
                                                        <div className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                                                            <span>#RES-{request.id.toString().padStart(5, '0')}</span>
                                                            {request.kind === 'reservation' && (
                                                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Compte client</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>{request.vehicle_name}</td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>{request.formatted_dates?.range}</td>
                                            <td className="px-6 font-bold">{request.prix_par_jour} DH</td>
                                            <td className="px-6">
                                                <StatusBadge status={request.statut} />
                                            </td>
                                            <td className="px-6 text-right">
                                                {request.statut === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleRefuse(request)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-token text-[13px] font-bold disabled:opacity-50 transition-colors"
                                                            style={{ color: 'var(--error-c)', background: 'var(--error-bg)' }}
                                                        >
                                                            Refuser
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfirm(request)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-token text-[13px] font-bold text-white disabled:opacity-50 transition-colors hover:opacity-90"
                                                            style={{ background: 'var(--primary-container)' }}
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
                                        <td colSpan="6" className="px-6 py-10 text-center" style={{ color: 'var(--on-surface-variant)' }}>Aucune demande de réservation client.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'var(--slate-bg)' }}>
                                    <th className="px-6 py-4">Client / ID</th>
                                    <th className="px-6 py-4">Véhicule</th>
                                    <th className="px-6 py-4">Dates de Réservation</th>
                                    <th className="px-6 py-4">Montant Total</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4">Paiement</th>
                                    <th className="px-6 py-4">Actions Rapides</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                                {paginatedReservations.map((contract, i) => {
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={contract.id} className="row hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 font-semibold">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`avatar ${avatarClass}`}>
                                                        {contract.client_initials || initialsFor(`${contract.client_prenom} ${contract.client_name}`)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{contract.client_name} {contract.client_prenom}</div>
                                                        <div className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>#RES-{contract.id.toString().padStart(5, '0')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6">
                                                <div>{contract.vehicle_name}</div>
                                                <div className="font-mono text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{contract.vehicle_matricule}</div>
                                            </td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                                <div className="text-[13px]">{contract.formatted_dates?.range}</div>
                                                <div className="text-[12px] font-semibold" style={{ color: 'var(--primary-container)' }}>{contract.jours} Jours</div>
                                            </td>
                                            <td className="px-6 font-bold">{contract.montant_total} DH</td>
                                            <td className="px-6">
                                                <StatusBadge status={contract.statut} />
                                            </td>
                                            <td className="px-6">
                                                <StatusBadge
                                                    variant={contract.payment_status === 'Paid' ? 'success' : contract.payment_status === 'Partial' ? 'warning' : 'danger'}
                                                    label={contract.payment_status === 'Paid' ? 'Payé' : contract.payment_status === 'Partial' ? 'Partiel' : 'Non payé'}
                                                />
                                            </td>
                                            <td className="px-6">
                                                <div className="flex items-center gap-2">
                                                    {contract.statut === 'RESERVE' ? (
                                                        <button
                                                            onClick={() => openActivateModal(contract)}
                                                            className="p-2 rounded-token transition-colors"
                                                            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                                                            title="Activer la Réservation"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">play_circle</span>
                                                        </button>
                                                    ) : (
                                                        <div className="w-9 h-9"></div>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                        className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                                                        style={{ color: 'var(--on-surface-variant)' }}
                                                        title="Modifier la Réservation"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPDF(contract.id)}
                                                        className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                                                        style={{ color: 'var(--on-surface-variant)' }}
                                                        title="Générer PDF de la Réservation"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visibleReservations.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center" style={{ color: 'var(--on-surface-variant)' }}>Aucune réservation.</td>
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