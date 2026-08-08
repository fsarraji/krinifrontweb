import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { resolveImage } from '../imageUrl';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';

const PAGE_SIZE_DEFAULT = 10;

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-indigo-600' },
        { value: 'Available', label: 'Disponible', dot: 'bg-emerald-500' },
        { value: 'Rented', label: 'Louée', dot: 'bg-rose-500' },
        { value: 'Maintenance', label: 'Maintenance', dot: 'bg-amber-500' },
    ];

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await api.get('vehicles/');
                setVehicles(response.data);
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

    const statusStyles = {
        'Available': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        'Rented': 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
        'Maintenance': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    };

    const statusLabels = {
        'Available': 'Disponible',
        'Rented': 'Louée',
        'Maintenance': 'Maintenance',
    };

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
        <div className="flex flex-col gap-6">
            {/* Editorial Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Stock d'actifs</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestion de Flotte</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                        title="Exporter en CSV (Excel)"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <Link
                        to="/vehicles/new"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        <span>Ajouter un Véhicule</span>
                    </Link>
                </div>
            </div>

            {/* KPI Architecture Section (Compact Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">directions_car</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Flotte Totale</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{totalFleet}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">key</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Actuellement Loués</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{rentedCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">build</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">En Maintenance</p>
                            <p className="text-xl font-extrabold text-rose-650 mt-1 leading-none">{maintenanceCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">payments</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Tarif Moyen / J</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{avgDailyRate} DH</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div>
                <SearchFilterBar
                    placeholder="Rechercher (matricule, marque, modèle)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={FILTER_OPTIONS}
                    filter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
            </div>

            {/* Fleet Table Section */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between bg-slate-50/80 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-500">{filteredVehicles.length} véhicule{filteredVehicles.length !== 1 ? 's' : ''} trouvé{filteredVehicles.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Photo</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Matricule</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Marque & Modèle</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Année</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Kilométrage</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Carburant</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Prix Journalier</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {paginatedVehicles.map(vehicle => (
                                <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {resolveImage(vehicle.image) ? (
                                            <img src={resolveImage(vehicle.image)} alt={vehicle.matricule} className="w-14 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                                        ) : (
                                            <div className="w-14 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-lg">directions_car</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg ring-1 ring-indigo-100">{vehicle.matricule}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{vehicle.marque_name}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{vehicle.modele_name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{vehicle.annee}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{vehicle.kilometrage.toLocaleString()} km</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                            <span className="material-symbols-outlined text-sm text-slate-400">local_gas_station</span> {vehicle.carburant}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${statusStyles[vehicle.statut]}`}>
                                            {statusLabels[vehicle.statut]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{vehicle.prix_par_jour} DH</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                to={`/vehicles/edit/${vehicle.id}`}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                title="Modifier"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedVehicles.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-6 py-10 text-center text-slate-400">Aucun véhicule trouvé.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredVehicles.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </div>
        </div>
    );
};

export default Vehicles;
