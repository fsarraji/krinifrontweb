import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import api, { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { resolveImage } from '../imageUrl';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';
import VehicleInfoModal from './ui/VehicleInfoModal';
import ArchiveVehicleModal from './ui/ArchiveVehicleModal';
import { messageBox } from './MessageBox';
import { toast } from './Toast';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import MetricCard from './ui/MetricCard';
import ExportButton from './ui/ExportButton';

const PAGE_SIZE_DEFAULT = 10;

import { getRole } from '../utils/userRole';
import MenuButton from './ui/MenuButton';
import Table from './ui/Table';
import { formatMoney, formatNumber } from '../utils/formatters';

const Vehicles = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const [menuId, setMenuId] = useState(null);
    const [infoVehicle, setInfoVehicle] = useState(null);
    const [archiveVehicle, setArchiveVehicle] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const isSuperAdmin = getRole() === 'SUPERADMIN';

    const FILTER_OPTIONS = [
        { value: 'ALL', label: t('common.all'), dot: 'bg-primary' },
        { value: 'Available', label: t('status.Available'), dot: 'bg-success' },
        { value: 'Rented', label: t('status.Rented'), dot: 'bg-info' },
        { value: 'Maintenance', label: t('status.Maintenance'), dot: 'bg-warning' },
        { value: 'archived', label: t('veh.filter.archived'), dot: 'bg-secondary' },
        ...(isSuperAdmin ? [{ value: 'deleted', label: t('veh.filter.deleted'), dot: 'bg-danger' }] : []),
    ];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const params = {};
                if (statusFilter === 'archived') params.include_archived = '1';
                if (statusFilter === 'deleted') params.include_deleted = '1';
                const data = await fetchAllPages('vehicles/', params);
                if (!cancelled) setVehicles(data);
            } catch (error) {
                console.error("Erreur lors de la récupération des véhicules", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [statusFilter, reloadKey]);

    const load = () => setReloadKey((k) => k + 1);

    const handleSearchChange = (value) => { setSearch(value); setCurrentPage(1); };
    const handleFilterChange = (value) => { setStatusFilter(value); setCurrentPage(1); };

    const totalFleet = vehicles.length;
    const rentedCount = vehicles.filter(v => normalizeVehicleStatut(v.statut) === 'Rented').length;
    const maintenanceCount = vehicles.filter(v => normalizeVehicleStatut(v.statut) === 'Maintenance').length;
    const avgDailyRate = totalFleet > 0
        ? (vehicles.reduce((acc, v) => acc + parseFloat(v.prix_par_jour), 0) / totalFleet).toFixed(2)
        : "0.00";

    const filteredVehicles = vehicles.filter(v => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q || [v.matricule, v.marque_name, v.modele_name, v.carburant]
            .filter(Boolean)
            .some(x => x.toLowerCase().includes(q));
        if (statusFilter === 'archived') return matchSearch && v.is_archived;
        if (statusFilter === 'deleted') return matchSearch && v.is_deleted;
        if (statusFilter !== 'ALL' && normalizeVehicleStatut(v.statut) !== statusFilter) return false;
        if (statusFilter !== 'archived' && statusFilter !== 'deleted' && (v.is_archived || v.is_deleted)) return false;
        return matchSearch;
    });

    const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const EXPORT_COLUMNS = [
        { key: 'matricule', label: t('u.matricule') },
        { key: 'marque_name', label: t('u.marque') },
        { key: 'modele_name', label: t('u.modle') },
        { key: 'annee', label: t('u.anne') },
        { key: 'kilometrage', label: t('u.kilomtrage_km') },
        { key: 'carburant', label: t('u.carburant') },
        { key: 'statut', label: t('u.statut') },
        { key: 'prix_par_jour', label: 'Prix/Jour (MAD)' },
    ];

    const handleDelete = (v) => {
        messageBox.danger(
            t('veh.del.message', { plate: v.matricule }),
            t('veh.del.title'),
            {
                confirmText: t('clients.menu.delete'),
                onConfirm: async () => {
                    try {
                        await api.patch(`vehicles/${v.id}/`, { is_deleted: true });
                        toast.success(t('veh.del.ok'));
                        load();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || t('veh.del.error'));
                    }
                },
            }
        );
    };

    const handleRestore = (v) => {
        const isDeleted = !!v.is_deleted;
        messageBox.confirm(
            isDeleted
                ? t('veh.restore.messageDeleted', { plate: v.matricule })
                : t('veh.restore.messageArchived', { plate: v.matricule }),
            t('veh.restore.title'),
            {
                confirmText: t('clients.menu.restore'),
                onConfirm: async () => {
                    try {
                        await api.patch(`vehicles/${v.id}/`, isDeleted
                            ? { is_deleted: false }
                            : { is_archived: false, date_fin_travail: null });
                        toast.success(t('veh.restore.ok'));
                        load();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || t('veh.restore.error'));
                    }
                },
            }
        );
    };

    const buildMenuItems = (v) => {
        const items = [];
        if (!v.is_deleted && !v.is_archived && normalizeVehicleStatut(v.statut) === 'Available') {
            items.push({ key: 'louer', icon: 'directions_car', label: t('veh.menu.rent'), color: 'var(--success)', onClick: () => navigate('/contracts/new', { state: { vehicleId: v.id } }) });
            items.push({ key: 'reserver', icon: 'event', label: t('veh.menu.book'), color: 'var(--info)', onClick: () => navigate('/reservations/new', { state: { vehicleId: v.id } }) });
        }
        items.push({ key: 'info', icon: 'info', label: t('clients.menu.info'), onClick: () => setInfoVehicle(v) });
        if (v.is_deleted || v.is_archived) {
            items.push({ key: 'restaurer', icon: 'unarchive', label: t('clients.menu.restore'), color: 'var(--success)', onClick: () => handleRestore(v) });
        } else {
            items.push({ key: 'editer', icon: 'edit', label: t('clients.menu.edit'), onClick: () => navigate(`/vehicles/edit/${v.id}`) });
            items.push({ key: 'archiver', icon: 'archive', label: t('veh.menu.archive'), onClick: () => setArchiveVehicle(v) });
            items.push({ key: 'supprimer', icon: 'delete', label: t('clients.menu.delete'), color: 'var(--danger)', destructive: true, onClick: () => handleDelete(v) });
        }
        return items;
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl"></div>
                <SkeletonCards count={4} />
                <SkeletonTable rows={6} cols={7} />
            </div>
        );
    }

    return (
        <div>
            {/* Header Section */}
            <PageHeader
                eyebrow={t('veh.eyebrow')}
                title={t('veh.title')}
                actions={(
                    <>
                        <ExportButton
                            data={filteredVehicles}
                            filename="flotte_vehicules"
                            columns={EXPORT_COLUMNS}
                            label={t('contracts.exportCsv')}
                        />
                        <Button icon="add" variant="primary" onClick={() => navigate('/vehicles/new')}>
                            {t('veh.add')}
                        </Button>
                    </>
                )}
            />

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <MetricCard icon="directions_car" iconBg="bg-info-bg" iconColor="text-info" value={totalFleet} label={t('veh.kpi.total')} />
                <MetricCard icon="key" iconBg="bg-success-bg" iconColor="text-success" value={rentedCount} label={t('veh.kpi.rented')} />
                <MetricCard icon="build" iconBg="bg-warning-bg" iconColor="text-warning" value={maintenanceCount} label={t('veh.kpi.maintenance')} />
                <MetricCard icon="payments" iconBg="bg-secondary-container" iconColor="text-secondary" value={avgDailyRate} unit="MAD" label={t('veh.kpi.avgRate')} />
            </div>

            {/* Search Filter Bar & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
                <div className="flex-1">
                    <SearchFilterBar
                        placeholder={t('veh.search')}
                        search={search}
                        onSearchChange={handleSearchChange}
                        options={FILTER_OPTIONS}
                        filter={statusFilter}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                {/* View switcher */}
                <div className="shrink-0">
                    <SegmentedControl label={t('clients.view.table')} value={viewMode} onChange={setViewMode}>
                        <SegmentedControlItem value="table" icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>table_rows</span>} label={t('clients.view.table')} />
                        <SegmentedControlItem value="grid" icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>grid_view</span>} label={t('clients.view.grid')} />
                    </SegmentedControl>
                </div>
            </div>

            {/* Data Table / Grid */}
            <Card padding={0} variant="default" className="overflow-hidden">
                {viewMode === 'table' ? (
                    <Table
                        className="!border-0 !rounded-none"
                        caption={t('veh.caption')}
                        rows={paginatedVehicles}
                        emptyTitle={t('veh.empty')}
                        columns={[
                            {
                                key: 'modele_name', label: t('veh.col.vehicle'),
                                render: (_, vehicle) => (
                                    <div className="flex items-center gap-3">
                                        {vehicle.image ? (
                                            <img
                                                src={resolveImage(vehicle.image)}
                                                alt={`${vehicle.marque_name} ${vehicle.modele_name}`}
                                                className="w-10 h-10 rounded-lg object-cover border border-stroke"
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs bg-info-bg text-info">
                                                {vehicle.marque_name?.slice(0, 2).toUpperCase() || 'VE'}
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-semibold text-on-surface">{vehicle.marque_name} {vehicle.modele_name}</span>
                                            <span className="ms-1.5 font-normal text-label-sm text-text-muted">{vehicle.annee}</span>
                                        </div>
                                    </div>
                                ),
                            },
                            { key: 'matricule', label: t('veh.col.plate'), className: 'text-on-surface-variant', render: (_, v) => v.matricule_actuel || v.matricule },
                            { key: 'carburant', label: t('veh.col.fuel'), className: 'text-on-surface-variant' },
                            { key: 'kilometrage', label: t('veh.col.km'), className: 'text-on-surface-variant', render: (v) => `${formatNumber(v ? parseInt(v, 10) : 0)} ${t('veh.kmUnit')}` },
                            {
                                key: 'statut', label: t('veh.col.status'),
                                render: (_, vehicle) => (vehicle.is_deleted ? (
                                    <StatusBadge variant="danger" label={t('status.deleted')} />
                                ) : vehicle.is_archived ? (
                                    <StatusBadge variant="neutral" label={t('status.archived')} />
                                ) : (
                                    <StatusBadge status={vehicle.statut} />
                                )),
                            },
                            { key: 'prix_par_jour', label: t('veh.col.rate'), align: 'right', className: 'font-semibold', render: (v) => formatMoney(v) },
                            {
                                key: 'actions', label: t('veh.col.actions'), align: 'right',
                                render: (_, vehicle) => (
                                    <div className="flex items-center justify-end gap-1">
                                        <MenuButton item={vehicle} items={buildMenuItems(vehicle)} menuId={menuId} setMenuId={setMenuId} />
                                    </div>
                                ),
                            },
                        ]}
                    />
                ) : (
                    /* Grid View */
                    filteredVehicles.length === 0 ? (
                        <div className="p-16 text-center font-medium flex flex-col items-center gap-2" style={{ color: 'var(--on-surface-variant)' }}>
                            <span className="material-symbols-outlined text-4xl" style={{ opacity: 0.4 }}>directions_car_off</span>
                            <p>{t('veh.empty')}</p>
                        </div>
                    ) : (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedVehicles.map((vehicle) => (
                                <div
                                    key={vehicle.id}
                                    className="bg-card-white rounded-lg p-5 border border-stroke hover:shadow-l2 transition-all flex flex-col justify-between group relative"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {vehicle.image ? (
                                                    <img
                                                        src={resolveImage(vehicle.image)}
                                                        alt={`${vehicle.marque_name} ${vehicle.modele_name}`}
                                                        className="w-12 h-12 rounded-lg object-cover border border-stroke shrink-0"
                                                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                                        <span className="material-symbols-outlined text-[20px]">directions_car</span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="text-label-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                                        {vehicle.marque_name} {vehicle.modele_name}
                                                    </h3>
                                                    <p className="text-label-md text-on-surface-variant">{vehicle.matricule_actuel || vehicle.matricule}</p>
                                                </div>
                                            </div>
                                            {vehicle.is_deleted ? (
                                                <StatusBadge variant="danger" label={t('status.deleted')} />
                                            ) : vehicle.is_archived ? (
                                                <StatusBadge variant="neutral" label={t('status.archived')} />
                                            ) : (
                                                <StatusBadge status={vehicle.statut} />
                                            )}
                                        </div>

                                        <div className="space-y-2 text-label-md text-on-surface-variant border-t border-stroke pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">local_gas_station</span> {t('veh.card.fuel')}
                                                </span>
                                                <span className="font-semibold text-on-surface">{vehicle.carburant}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">speed</span> {t('veh.card.mileage')}
                                                </span>
                                                <span className="font-mono font-semibold text-on-surface">{formatNumber(vehicle.kilometrage ? parseInt(vehicle.kilometrage, 10) : 0)} {t('veh.kmUnit')}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">event</span> {t('veh.card.year')}
                                                </span>
                                                <span className="font-semibold text-on-surface">{vehicle.annee}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">payments</span> {t('veh.card.rate')}
                                                </span>
                                                <span className="font-bold text-on-surface">{formatMoney(vehicle.prix_par_jour)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-stroke flex items-center justify-between">
                                        {!vehicle.is_deleted && !vehicle.is_archived ? (
                                            <Link
                                                to={`/vehicles/edit/${vehicle.id}`}
                                                className="text-label-sm font-bold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                                            >
                                                {t('veh.card.manage')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </Link>
                                        ) : <span />}
                                        <MenuButton item={vehicle} items={buildMenuItems(vehicle)} menuId={menuId} setMenuId={setMenuId} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredVehicles.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
                />
            </Card>

            <VehicleInfoModal isOpen={!!infoVehicle} vehicle={infoVehicle} onClose={() => setInfoVehicle(null)} />
            <ArchiveVehicleModal isOpen={!!archiveVehicle} vehicle={archiveVehicle} onClose={() => setArchiveVehicle(null)} onArchived={load} />
        </div>
    );
};

export default Vehicles;
