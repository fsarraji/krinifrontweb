import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import StatusBadge from './ui/StatusBadge';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { getRole } from '../utils/userRole';

import { AVATAR_COLORS } from '../utils/avatarColors';

const REQUEST_FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
    { value: 'PENDING', label: 'En attente', dot: 'bg-warning' },
    { value: 'CONFIRMED', label: 'Confirmée', dot: 'bg-success' },
    { value: 'RESERVE', label: 'Réservation (Contrat)', dot: 'bg-info' },
    { value: 'CANCELLED', label: 'Annulée', dot: 'bg-danger' },
];

const Reservations = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('reservations');
    const [requests, setRequests] = useState([]);
    const [clientReservations, setClientReservations] = useState([]);
    const [contractReservations, setContractReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [search, setSearch] = useState('');
    const [requestFilter, setRequestFilter] = useState('PENDING');
    const [reservationFilter, setReservationFilter] = useState('ALL');
    const [reservationPage, setReservationPage] = useState(1);
    const [reservationPageSize, setReservationPageSize] = useState(10);
    const [requestPage, setRequestPage] = useState(1);
    const [requestPageSize, setRequestPageSize] = useState(10);
    const [reloadKey, setReloadKey] = useState(0);
    const [role] = useState(getRole());

    const isManager = role === 'OWNER' || role === 'SUPERADMIN';

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [requests, reservations, reserveContracts] = await Promise.all([
                    fetchAllPages('booking-requests/'),
                    fetchAllPages('reservations/'),
                    fetchAllPages('contracts/', { statut: 'RESERVE' }),
                ]);
                if (cancelled) return;
                setRequests(Array.isArray(requests) ? requests : []);
                setClientReservations(Array.isArray(reservations) ? reservations : []);
                setContractReservations(Array.isArray(reserveContracts) ? reserveContracts : []);
            } catch (error) {
                console.error('Erreur lors de la récupération des réservations', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const fetchAll = () => setReloadKey((k) => k + 1);

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

    const handleCancel = (item) => {
        const isContract = item.kind === 'contract';
        const label = isContract ? 'annuler cette réservation (contrat Réservé) ?' : 'annuler cette réservation ?';
        messageBox.confirm(`Voulez-vous ${label}`, 'Annuler la réservation', {
            confirmText: 'Annuler',
            destructive: true,
            onConfirm: async () => {
                setBusyId(`${item.kind}-${item.id}`);
                try {
                    await api.post(
                        isContract ? `contracts/${item.id}/cancel/` : `reservations/${item.id}/cancel/`,
                        {}
                    );
                    toast.success(isContract ? 'Réservation (contrat) annulée.' : 'Réservation annulée.');
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors de l'annulation", error);
                    toast.error(error.response?.data?.detail || "Erreur lors de l'annulation de la réservation.");
                } finally {
                    setBusyId(null);
                }
            }
        });
    };

    const reservationItems = clientReservations.map(r => ({
        ...r,
        kind: 'reservation',
        displayName: r.client_name || '—',
    }));
    const contractItems = contractReservations.map(c => ({
        ...c,
        kind: 'contract',
        displayName: [c.client_prenom, c.client_name].filter(Boolean).join(' ') || '—',
    }));
    const bookingItems = requests.map(r => ({
        ...r,
        kind: 'booking',
        displayName: r.client_name || [r.prenom, r.nom].filter(Boolean).join(' ') || '—',
    }));

    const allReservations = [...reservationItems, ...contractItems].sort(
        (a, b) => new Date(b.created_at || b.date_creation) - new Date(a.created_at || a.date_creation)
    );
    const allRequests = [...bookingItems, ...reservationItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const pendingRequests = allRequests.filter(r => r.statut === 'PENDING');

    const matchesSearch = (obj, fields) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return fields.filter(Boolean).some(f => String(f).toLowerCase().includes(q));
    };

    const visibleRequests = allRequests.filter(r =>
        (requestFilter === 'ALL' || r.statut === requestFilter) &&
        matchesSearch(r, [r.displayName, r.vehicle_name])
    );
    const visibleReservations = allReservations.filter(r =>
        (reservationFilter === 'ALL' || r.statut === reservationFilter) &&
        matchesSearch(r, [r.displayName, r.vehicle_name])
    );

    const paginatedRequests = visibleRequests.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize);
    const paginatedReservations = visibleReservations.slice((reservationPage - 1) * reservationPageSize, reservationPage * reservationPageSize);

    const initialsFor = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        const first = (parts[0] || '').charAt(0);
        const second = parts.length > 1 ? (parts[1] || '').charAt(0) : '';
        return (first + second).toUpperCase() || name.charAt(0).toUpperCase();
    };

    const requestDates = (r) => r.formatted_dates?.range || (
        r.date_sortie ? `${String(r.date_sortie).slice(0, 10)} → ${String(r.date_retour_prevue || '').slice(0, 10)}` : '—'
    );

    const renderRow = (request, i) => {
        const busy = busyId === `${request.kind}-${request.id}`;
        const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const isReservation = request.kind === 'reservation';
        const isContract = request.kind === 'contract';
        return (
            <tr key={`${request.kind}-${request.id}`} className="row hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 font-semibold">
                    <div className="flex items-center gap-3.5">
                        <div className={`avatar ${avatarClass}`}>
                            {initialsFor(request.displayName)}
                        </div>
                        <div>
                            <div className="font-semibold">{request.displayName}</div>
                            <div className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                                <span>#{isContract ? `CTR-${request.id.toString().padStart(5, '0')}` : `RES-${request.id.toString().padStart(5, '0')}`}</span>
                                {isContract ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>Agence</span>
                                ) : isReservation ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Compte client</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Demande</span>
                                )}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>{request.vehicle_name}</td>
                <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>{requestDates(request)}</td>
                <td className="px-6 font-bold">{request.prix_par_jour ? `${request.prix_par_jour} DH` : '—'}</td>
                <td className="px-6">
                    <StatusBadge status={request.statut} />
                </td>
                <td className="px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {request.statut === 'PENDING' && (
                            <>
                                <Button size="sm" variant="danger" disabled={busy} onClick={() => handleRefuse(request)}>
                                    Refuser
                                </Button>
                                <Button size="sm" disabled={busy} loading={busy} onClick={() => handleConfirm(request)}>
                                    Confirmer
                                </Button>
                            </>
                        )}
                        {(request.statut === 'CONFIRMED' || request.statut === 'RESERVE') && isManager && (
                            <Button size="sm" variant="danger" disabled={busy} loading={busy} onClick={() => handleCancel(request)}>
                                Annuler
                            </Button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={26} /></div>;

    return (
        <div className="flex flex-col h-full">
            {/* Editorial Header */}
            <PageHeader
                eyebrow="Opérations de Flotte"
                title="Réservations"
                actions={(
                    <Button icon="add" onClick={() => navigate('/reservations/new')}>Nouvelle Réservation</Button>
                )}
            />

            {/* Filters & Search */}
            <div className="flex flex-col gap-5 mb-6">
                {/* Tabs */}
                <div className="flex gap-2 p-1 rounded-token w-fit" style={{ background: 'var(--slate-bg)' }}>
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
                            {allReservations.length}
                        </span>
                    </button>
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
                </div>

                {/* Search & Filter */}
                <SearchFilterBar
                    placeholder={tab === 'demandes' ? "Rechercher (client, véhicule)..." : "Rechercher (client, véhicule)..."}
                    search={search}
                    onSearchChange={setSearch}
                    options={REQUEST_FILTER_OPTIONS}
                    filter={tab === 'demandes' ? requestFilter : reservationFilter}
                    onFilterChange={tab === 'demandes' ? setRequestFilter : setReservationFilter}
                />
            </div>

            {/* Data Table */}
            <div className="card rounded-token overflow-hidden shadow-l1">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left">
                        <thead>
                            <tr style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Véhicule</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4">Prix / Jour</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                            {tab === 'demandes' ? paginatedRequests.map(renderRow) : paginatedReservations.map(renderRow)}
                            {(tab === 'demandes' ? visibleRequests.length : visibleReservations.length) === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center" style={{ color: 'var(--on-surface-variant)' }}>
                                        {tab === 'demandes' ? 'Aucune demande de réservation client.' : 'Aucune réservation.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={tab === 'demandes' ? requestPage : reservationPage}
                    totalItems={tab === 'demandes' ? visibleRequests.length : visibleReservations.length}
                    pageSize={tab === 'demandes' ? requestPageSize : reservationPageSize}
                    onPageChange={tab === 'demandes' ? setRequestPage : setReservationPage}
                    onPageSizeChange={tab === 'demandes'
                        ? (s) => { setRequestPageSize(s); setRequestPage(1); }
                        : (s) => { setReservationPageSize(s); setReservationPage(1); }
                    }
                />
            </div>
        </div>
    );
};

export default Reservations;
