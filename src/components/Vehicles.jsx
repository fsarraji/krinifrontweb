import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { resolveImage } from '../imageUrl';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';
import DropdownMenu from './ui/DropdownMenu';
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
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'Available', label: 'Disponible', dot: 'bg-success' },
        { value: 'Rented', label: 'Louée', dot: 'bg-info' },
        { value: 'Maintenance', label: 'Maintenance', dot: 'bg-warning' },
        { value: 'archived', label: 'Archivés', dot: 'bg-secondary' },
        ...(isSuperAdmin ? [{ value: 'deleted', label: 'Supprimés', dot: 'bg-danger' }] : []),
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
        { key: 'matricule', label: 'Matricule' },
        { key: 'marque_name', label: 'Marque' },
        { key: 'modele_name', label: 'Modèle' },
        { key: 'annee', label: 'Année' },
        { key: 'kilometrage', label: 'Kilométrage (km)' },
        { key: 'carburant', label: 'Carburant' },
        { key: 'statut', label: 'Statut' },
        { key: 'prix_par_jour', label: 'Prix/Jour (MAD)' },
    ];

    const handleDelete = (v) => {
        messageBox.danger(
            `Le véhicule ${v.matricule} sera retiré de la flotte et ne sera plus visible. Il pourra être restauré par le super admin.`,
            'Confirmer la suppression',
            {
                confirmText: 'Supprimer',
                onConfirm: async () => {
                    try {
                        await api.patch(`vehicles/${v.id}/`, { is_deleted: true });
                        toast.success('Véhicule supprimé.');
                        load();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || 'Impossible de supprimer le véhicule.');
                    }
                },
            }
        );
    };

    const handleRestore = (v) => {
        const isDeleted = !!v.is_deleted;
        messageBox.confirm(
            isDeleted
                ? `Restaurer le véhicule ${v.matricule} ? Il réapparaîtra dans la flotte.`
                : `Restaurer le véhicule ${v.matricule} dans la flotte active ?`,
            'Restaurer le véhicule',
            {
                confirmText: 'Restaurer',
                onConfirm: async () => {
                    try {
                        await api.patch(`vehicles/${v.id}/`, isDeleted
                            ? { is_deleted: false }
                            : { is_archived: false, date_fin_travail: null });
                        toast.success('Véhicule restauré.');
                        load();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || 'Impossible de restaurer le véhicule.');
                    }
                },
            }
        );
    };

    const buildMenuItems = (v) => {
        const items = [];
        if (!v.is_deleted && !v.is_archived && normalizeVehicleStatut(v.statut) === 'Available') {
            items.push({ key: 'louer', icon: 'directions_car', label: 'Louer', color: 'var(--success)', onClick: () => navigate('/contracts/new', { state: { vehicleId: v.id } }) });
            items.push({ key: 'reserver', icon: 'event', label: 'Réserver', color: 'var(--info)', onClick: () => navigate('/reservations/new', { state: { vehicleId: v.id } }) });
        }
        items.push({ key: 'info', icon: 'info', label: 'Informations', onClick: () => setInfoVehicle(v) });
        if (v.is_deleted || v.is_archived) {
            items.push({ key: 'restaurer', icon: 'unarchive', label: 'Restaurer', color: 'var(--success)', onClick: () => handleRestore(v) });
        } else {
            items.push({ key: 'editer', icon: 'edit', label: 'Éditer', onClick: () => navigate(`/vehicles/edit/${v.id}`) });
            items.push({ key: 'archiver', icon: 'archive', label: 'Archiver', onClick: () => setArchiveVehicle(v) });
            items.push({ key: 'supprimer', icon: 'delete', label: 'Supprimer', color: 'var(--danger)', destructive: true, onClick: () => handleDelete(v) });
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
                eyebrow="Stock d'actifs"
                title="Gestion de Flotte"
                actions={(
                    <>
                        <ExportButton
                            data={filteredVehicles}
                            filename="flotte_vehicules"
                            columns={EXPORT_COLUMNS}
                            label="Exporter (CSV)"
                        />
                        <Button icon="add" variant="primary" onClick={() => navigate('/vehicles/new')}>
                            Ajouter un Véhicule
                        </Button>
                    </>
                )}
            />

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <MetricCard icon="directions_car" iconBg="bg-info-bg" iconColor="text-info" value={totalFleet} label="Flotte Totale" />
                <MetricCard icon="key" iconBg="bg-success-bg" iconColor="text-success" value={rentedCount} label="Actuellement Loués" />
                <MetricCard icon="build" iconBg="bg-warning-bg" iconColor="text-warning" value={maintenanceCount} label="En Maintenance" />
                <MetricCard icon="payments" iconBg="bg-secondary-container" iconColor="text-secondary" value={avgDailyRate} unit="MAD" label="Tarif Moyen / Jour" />
            </div>

            {/* Search Filter Bar & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
                <div className="flex-1">
                    <SearchFilterBar
                        placeholder="Rechercher par matricule, marque, modèle, carburant..."
                        search={search}
                        onSearchChange={handleSearchChange}
                        options={FILTER_OPTIONS}
                        filter={statusFilter}
                        onFilterChange={handleFilterChange}
                    />
                </div>

                {/* View switcher */}
                <div className="flex items-center p-1 rounded-token shrink-0" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-token text-[13px] font-semibold transition-all ${
                            viewMode === 'table'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: viewMode === 'table' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                        Tableau
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-token text-[13px] font-semibold transition-all ${
                            viewMode === 'grid'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: viewMode === 'grid' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                        Grille
                    </button>
                </div>
            </div>

            {/* Data Table / Grid */}
            <div className="card rounded-token overflow-hidden shadow-l1">
                {viewMode === 'table' ? (
                    <Table
                        className="!border-0 !rounded-none"
                        caption="Liste des véhicules"
                        rows={paginatedVehicles}
                        emptyTitle="Aucun véhicule ne correspond aux critères."
                        columns={[
                            {
                                key: 'modele_name', label: 'Véhicule',
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
                                            <span className="ml-1.5 font-normal text-label-sm text-text-muted">{vehicle.annee}</span>
                                        </div>
                                    </div>
                                ),
                            },
                            { key: 'matricule', label: 'Matricule', className: 'text-on-surface-variant', render: (_, v) => v.matricule_actuel || v.matricule },
                            { key: 'carburant', label: 'Carburant', className: 'text-on-surface-variant' },
                            { key: 'kilometrage', label: 'Km', className: 'text-on-surface-variant', render: (v) => `${formatNumber(v ? parseInt(v, 10) : 0)} km` },
                            {
                                key: 'statut', label: 'Statut',
                                render: (_, vehicle) => (vehicle.is_deleted ? (
                                    <StatusBadge variant="danger" label="Supprimé" />
                                ) : vehicle.is_archived ? (
                                    <StatusBadge variant="neutral" label="Archivé" />
                                ) : (
                                    <StatusBadge status={vehicle.statut} />
                                )),
                            },
                            { key: 'prix_par_jour', label: 'Tarif / jour', align: 'right', className: 'font-semibold', render: (v) => formatMoney(v) },
                            {
                                key: 'actions', label: 'Actions', align: 'right',
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
                            <p>Aucun véhicule ne correspond aux critères.</p>
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
                                                <StatusBadge variant="danger" label="Supprimé" />
                                            ) : vehicle.is_archived ? (
                                                <StatusBadge variant="neutral" label="Archivé" />
                                            ) : (
                                                <StatusBadge status={vehicle.statut} />
                                            )}
                                        </div>

                                        <div className="space-y-2 text-label-md text-on-surface-variant border-t border-stroke pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">local_gas_station</span> Carburant:
                                                </span>
                                                <span className="font-semibold text-on-surface">{vehicle.carburant}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">speed</span> Kilométrage:
                                                </span>
                                                <span className="font-mono font-semibold text-on-surface">{formatNumber(vehicle.kilometrage ? parseInt(vehicle.kilometrage, 10) : 0)} km</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">event</span> Année:
                                                </span>
                                                <span className="font-semibold text-on-surface">{vehicle.annee}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">payments</span> Tarif / jour:
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
                                                Gérer le véhicule <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
            </div>

            <VehicleInfoModal isOpen={!!infoVehicle} vehicle={infoVehicle} onClose={() => setInfoVehicle(null)} />
            <ArchiveVehicleModal isOpen={!!archiveVehicle} vehicle={archiveVehicle} onClose={() => setArchiveVehicle(null)} onArchived={load} />
        </div>
    );
};

export default Vehicles;
