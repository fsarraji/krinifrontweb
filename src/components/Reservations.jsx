import { apiErrorText } from '../utils/apiErrorText';
import Card from './ui/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { useI18n } from '../i18n/context';
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
import Table from './ui/Table';
import { formatMoney } from '../utils/formatters';
import { getRole } from '../utils/userRole';

import { AVATAR_COLORS } from '../utils/avatarColors';

const Reservations = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const REQUEST_FILTER_OPTIONS = [
        { value: 'ALL', label: t('common.all'), dot: 'bg-primary' },
        { value: 'PENDING', label: t('status.PENDING'), dot: 'bg-warning' },
        { value: 'CONFIRMED', label: t('status.CONFIRMED'), dot: 'bg-success' },
        { value: 'RESERVE', label: t('res.filter.contract'), dot: 'bg-info' },
        { value: 'CANCELLED', label: t('status.CANCELLED'), dot: 'bg-danger' },
    ];
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
        messageBox.confirm(t('res.confirm.message'), t('res.confirm.title'), {
            confirmText: t('res.btn.confirm'),
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
                            ? t('res.confirm.okNewClient')
                            : t('res.confirm.ok')
                    );
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors de la confirmation", error);
                    toast.error(apiErrorText(error, t('res.confirm.error')));
                } finally {
                    setBusyId(null);
                }
            }
        });
    };

    const handleRefuse = (request) => {
        messageBox.confirm(t('res.refuse.message'), t('res.refuse.title'), {
            confirmText: t('res.btn.refuse'),
            destructive: true,
            onConfirm: async () => {
                setBusyId(`${request.kind}-${request.id}`);
                try {
                    await api.patch(
                        request.kind === 'reservation' ? `reservations/${request.id}/` : `booking-requests/${request.id}/`,
                        { statut: 'CANCELLED' }
                    );
                    toast.success(t('res.refuse.ok'));
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors du refus", error);
                    toast.error(apiErrorText(error, t('res.refuse.error')));
                } finally {
                    setBusyId(null);
                }
            }
        });
    };

    const handleCancel = (item) => {
        const isContract = item.kind === 'contract';
        messageBox.confirm(isContract ? t('res.cancel.messageContract') : t('res.cancel.message'), t('res.cancel.title'), {
            confirmText: t('res.btn.cancel'),
            destructive: true,
            onConfirm: async () => {
                setBusyId(`${item.kind}-${item.id}`);
                try {
                    await api.post(
                        isContract ? `contracts/${item.id}/cancel/` : `reservations/${item.id}/cancel/`,
                        {}
                    );
                    toast.success(isContract ? t('res.cancel.okContract') : t('res.cancel.ok'));
                    fetchAll();
                } catch (error) {
                    console.error("Erreur lors de l'annulation", error);
                    toast.error(apiErrorText(error, t('res.cancel.error')));
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

    const tagFor = (request) => {
        if (request.kind === 'contract') return { label: t('res.tag.agency'), cls: 'bg-primary-light text-primary' };
        if (request.kind === 'reservation') return { label: t('res.tag.client'), cls: 'bg-info-bg text-info-dark' };
        return { label: t('res.tag.request'), cls: 'bg-warning-bg text-warning-dark' };
    };

    const buildColumns = (pageRows) => [
        {
            key: 'displayName', label: t('res.col.client'),
            render: (_, request) => {
                const i = Math.max(0, pageRows.findIndex((x) => x.kind === request.kind && x.id === request.id));
                const isContract = request.kind === 'contract';
                const tag = tagFor(request);
                return (
                    <div className="flex items-center gap-3.5">
                        <div className={`avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>{initialsFor(request.displayName)}</div>
                        <div>
                            <div className="font-semibold">{request.displayName}</div>
                            <div className="text-label-sm font-normal text-text-muted mt-0.5 flex items-center gap-1.5">
                                <span>#{isContract ? `CTR-${request.id.toString().padStart(5, '0')}` : `RES-${request.id.toString().padStart(5, '0')}`}</span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${tag.cls}`}>{tag.label}</span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        { key: 'vehicle_name', label: t('res.col.vehicle'), className: 'text-on-surface-variant' },
        { key: 'dates', label: t('res.col.dates'), className: 'text-on-surface-variant', render: (_, r) => requestDates(r) },
        { key: 'prix_par_jour', label: t('res.col.price'), render: (v) => (v ? <strong>{formatMoney(v)}</strong> : '—') },
        { key: 'statut', label: t('res.col.status'), render: (v) => <StatusBadge status={v} /> },
        {
            key: 'actions', label: t('res.col.actions'), align: 'right',
            render: (_, request) => {
                const busy = busyId === `${request.kind}-${request.id}`;
                return (
                    <div className="flex items-center justify-end gap-2">
                        {request.statut === 'PENDING' && (
                            <>
                                <Button size="sm" variant="danger" disabled={busy} onClick={() => handleRefuse(request)}>{t('res.btn.refuse')}</Button>
                                <Button size="sm" disabled={busy} loading={busy} onClick={() => handleConfirm(request)}>{t('res.btn.confirm')}</Button>
                            </>
                        )}
                        {(request.statut === 'CONFIRMED' || request.statut === 'RESERVE') && isManager && (
                            <Button size="sm" variant="danger" disabled={busy} loading={busy} onClick={() => handleCancel(request)}>{t('res.btn.cancel')}</Button>
                        )}
                    </div>
                );
            },
        },
    ];

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={26} /></div>;

    return (
        <div className="flex flex-col h-full">
            {/* Editorial Header */}
            <PageHeader
                eyebrow={t('contracts.eyebrow')}
                title={t('res.title')}
                actions={(
                    <Button icon="add" onClick={() => navigate('/reservations/new')}>{t('res.new')}</Button>
                )}
            />

            {/* Filters & Search */}
            <div className="flex flex-col gap-5 mb-6">
                {/* Tabs */}
                <div className="w-fit">
                    <SegmentedControl label={t('res.title')} value={tab} onChange={setTab}>
                        <SegmentedControlItem value="reservations" label={`${t('res.title')} (${allReservations.length})`} />
                        <SegmentedControlItem value="demandes" label={pendingRequests.length > 0 ? `${t('res.tab.requests')} (${pendingRequests.length})` : t('res.tab.requests')} />
                    </SegmentedControl>
                </div>

                {/* Search & Filter */}
                <SearchFilterBar
                    placeholder={t('res.search')}
                    search={search}
                    onSearchChange={setSearch}
                    options={REQUEST_FILTER_OPTIONS}
                    filter={tab === 'demandes' ? requestFilter : reservationFilter}
                    onFilterChange={tab === 'demandes' ? setRequestFilter : setReservationFilter}
                />
            </div>

            {/* Data Table */}
            <Card padding={0} variant="default" className="overflow-hidden">
                <Table
                    className="!border-0 !rounded-none"
                    caption={tab === 'demandes' ? t('res.caption.requests') : t('res.title')}
                    rowKey="rowId"
                    rows={(tab === 'demandes' ? paginatedRequests : paginatedReservations).map((r) => ({ ...r, rowId: `${r.kind}-${r.id}` }))}
                    columns={buildColumns(tab === 'demandes' ? paginatedRequests : paginatedReservations)}
                    emptyTitle={tab === 'demandes' ? t('res.empty.requests') : t('res.empty.reservations')}
                />
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
            </Card>
        </div>
    );
};

export default Reservations;
