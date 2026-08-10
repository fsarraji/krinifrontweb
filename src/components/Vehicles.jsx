import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { resolveImage } from '../imageUrl';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';

const PAGE_SIZE_DEFAULT = 10;

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'Available', label: 'Disponible', dot: 'bg-success' },
        { value: 'Rented', label: 'Louée', dot: 'bg-info' },
        { value: 'Maintenance', label: 'Maintenance', dot: 'bg-warning' },
    ];

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const vehicles = await fetchAllPages('vehicles/');
                setVehicles(vehicles);
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération des véhicules", error);
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);

    // Reset to page 1 on filter/search change
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

    const totalFleet = vehicles.length;
    const rentedCount = vehicles.filter(v => v.statut === 'Rented').length;
    const maintenanceCount = vehicles.filter(v => v.statut === 'Maintenance').length;
    const avgDailyRate = totalFleet > 0
        ? (vehicles.reduce((acc, v) => acc + parseFloat(v.prix_par_jour), 0) / totalFleet).toFixed(2)
        : "0.00";

    const filteredVehicles = vehicles.filter(v => {
        const q = search.trim().toLowerCase();
        const matchStatus = statusFilter === 'ALL' || v.statut === statusFilter;
        const matchSearch = !q || [v.matricule, v.marque_name, v.modele_name, v.carburant]
            .filter(Boolean)
            .some(x => x.toLowerCase().includes(q));
        return matchStatus && matchSearch;
    });

    const paginatedVehicles = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleExport = () => {
        exportToCSV(
            filteredVehicles,
            'flotte_vehicules',
            [
                { key: 'matricule', label: 'Matricule' },
                { key: 'marque_name', label: 'Marque' },
                { key: 'modele_name', label: 'Modèle' },
                { key: 'annee', label: 'Année' },
                { key: 'kilometrage', label: 'Kilométrage (km)' },
                { key: 'carburant', label: 'Carburant' },
                { key: 'statut', label: 'Statut' },
                { key: 'prix_par_jour', label: 'Prix/Jour (DH)' },
            ]
        );
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
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Stock d'actifs</p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>Gestion de Flotte</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[13px] card hover:bg-slate-50 transition-colors shadow-l1"
                        title="Exporter en CSV (Excel)"
                        style={{ color: 'var(--on-surface)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <Link
                        to="/vehicles/new"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--primary-container)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span>Ajouter un Véhicule</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="card rounded-token p-5 shadow-l1 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--info-bg)' }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--info)' }}>directions_car</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{totalFleet}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Flotte Totale</p>
                        </div>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--success-bg)' }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--success)' }}>key</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{rentedCount}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Actuellement Loués</p>
                        </div>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--warning-bg)' }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--warning)' }}>build</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{maintenanceCount}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>En Maintenance</p>
                        </div>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--secondary-container)' }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--secondary)' }}>payments</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{avgDailyRate} <span className="text-[12px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>DH</span></p>
                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Tarif Moyen / Jour</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Filter Bar & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
                <div className="flex-1">
                    <SearchFilterBar
                        placeholder="Rechercher par matricule, marque, modèle, carburant..."
                        search={search}
                        onSearchChange={setSearch}
                        options={FILTER_OPTIONS}
                        filter={statusFilter}
                        onFilterChange={setStatusFilter}
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
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'var(--slate-bg)' }}>
                                    <th className="px-6 py-4">Véhicule</th>
                                    <th className="px-6 py-4">Matricule</th>
                                    <th className="px-6 py-4">Carburant</th>
                                    <th className="px-6 py-4">Km</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Tarif / jour</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                                {paginatedVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="row hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 font-semibold">
                                            <div className="flex items-center gap-3">
                                                {vehicle.image ? (
                                                    <img
                                                        src={resolveImage(vehicle.image)}
                                                        alt={`${vehicle.marque_name} ${vehicle.modele_name}`}
                                                        className="w-10 h-10 rounded-lg object-cover border border-stroke"
                                                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                                        {vehicle.marque_name?.slice(0, 2).toUpperCase() || 'VE'}
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{vehicle.marque_name} {vehicle.modele_name}</span>
                                                    <span className="ml-1.5 font-normal text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{vehicle.annee}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                            {vehicle.matricule}
                                        </td>
                                        <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                            {vehicle.carburant}
                                        </td>
                                        <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                            {vehicle.kilometrage ? parseInt(vehicle.kilometrage).toLocaleString() : 0} km
                                        </td>
                                        <td className="px-6">
                                            <StatusBadge status={vehicle.statut} />
                                        </td>
                                        <td className="px-6 text-right font-semibold">
                                            {vehicle.prix_par_jour} DH
                                        </td>
                                        <td className="px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/vehicles/edit/${vehicle.id}`}
                                                    className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                                                    style={{ color: 'var(--on-surface-variant)' }}
                                                    title="Modifier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVehicles.length === 0 && (
                                    <tr className="row">
                                        <td colSpan="7" className="px-6 text-center text-slate-400">
                                            Aucun véhicule ne correspond aux critères.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
                                    className="bg-card-white rounded-lg p-5 border border-stroke hover:shadow-l2 transition-all flex flex-col justify-between group"
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
                                                    <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors truncate">
                                                        {vehicle.marque_name} {vehicle.modele_name}
                                                    </h3>
                                                    <p className="text-body-sm text-on-surface-variant font-medium">{vehicle.matricule}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={vehicle.statut} />
                                        </div>

                                        <div className="space-y-2 text-body-sm text-on-surface-variant border-t border-stroke pt-3">
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
                                                <span className="font-mono font-semibold text-on-surface">{vehicle.kilometrage ? parseInt(vehicle.kilometrage).toLocaleString() : 0} km</span>
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
                                                <span className="font-bold text-on-surface">{vehicle.prix_par_jour} DH</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-stroke flex items-center justify-end">
                                        <Link
                                            to={`/vehicles/edit/${vehicle.id}`}
                                            className="text-label-sm font-bold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                                        >
                                            Gérer le véhicule <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
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
        </div>
    );
};

export default Vehicles;
