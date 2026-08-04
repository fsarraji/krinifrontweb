import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';
import { resolveImage } from '../imageUrl';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'Available', label: 'Disponible', dot: 'bg-emerald-500' },
        { value: 'Rented', label: 'Louée', dot: 'bg-red-500' },
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

    // Calcul des KPIs
    const totalFleet = vehicles.length;
    const rentedCount = vehicles.filter(v => v.statut === 'Rented').length;
    const maintenanceCount = vehicles.filter(v => v.statut === 'Maintenance').length;
    const avgDailyRate = totalFleet > 0 
        ? (vehicles.reduce((acc, v) => acc + parseFloat(v.prix_par_jour), 0) / totalFleet).toFixed(2) 
        : "0.00";

    const statusStyles = {
        'Available': 'bg-tertiary-container text-on-tertiary-container border-on-tertiary-container/20',
        'Rented': 'bg-error-container text-on-error-container border-on-error-container/20',
        'Maintenance': 'bg-secondary-fixed text-on-secondary-fixed border-on-secondary-fixed/20',
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

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement de la flotte...</div>;

    return (
        <div className="p-0">
            {/* Editorial Header Section */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <p className="font-label text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-1">Stock d'actifs</p>
                    <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tight">Gestion de Flotte</h2>
                </div>
                <Link 
                    to="/vehicles/new"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <span className="material-symbols-outlined">add</span>
                    <span>Ajouter un Véhicule</span>
                </Link>
            </div>

            {/* KPI Tonal Architecture Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Flotte Totale</p>
                    <p className="font-headline text-3xl font-bold text-primary">{totalFleet}</p>
                    <div className="mt-4 flex items-center gap-1 text-green-600 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>Croissance stable</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Actuellement Loués</p>
                    <p className="font-headline text-3xl font-bold text-primary">{rentedCount}</p>
                    <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${totalFleet > 0 ? (rentedCount / totalFleet) * 100 : 0}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">En Maintenance</p>
                    <p className="font-headline text-3xl font-bold text-red-600">{maintenanceCount}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${maintenanceCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}></span>
                        <span className="text-xs text-slate-500 font-medium">
                            {maintenanceCount > 0 ? 'Attention requise' : 'Tout est opérationnel'}
                        </span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="font-label text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Prix Moyen / Jour</p>
                    <p className="font-headline text-3xl font-bold text-primary">{avgDailyRate} DH</p>
                    <div className="mt-4 flex items-center gap-1 text-slate-500 text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>Optimisé pour la demande</span>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
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
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50">
                    <div className="text-xs text-slate-500 font-medium">Affichage de {filteredVehicles.length} véhicules</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Photo</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Matricule</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Marque & Modèle</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Année</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Kilométrage</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Carburant</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Statut</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500">Prix Journalier</th>
                                <th className="px-6 py-4 font-label text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredVehicles.map(vehicle => (
                                <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        {resolveImage(vehicle.image) ? (
                                            <img src={resolveImage(vehicle.image)} alt={vehicle.matricule} className="w-16 h-12 rounded-lg object-cover border border-slate-100" />
                                        ) : (
                                            <div className="w-16 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                                <span className="material-symbols-outlined text-xl">directions_car</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="font-mono text-sm font-bold bg-blue-50 px-2 py-1 rounded text-primary">{vehicle.matricule}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{vehicle.marque_name}</p>
                                            <p className="text-xs text-slate-500">{vehicle.modele_name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-medium">{vehicle.annee}</td>
                                    <td className="px-6 py-5 text-sm font-medium">{vehicle.kilometrage.toLocaleString()} km</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                            <span className="material-symbols-outlined text-sm">local_gas_station</span> {vehicle.carburant}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[vehicle.statut]}`}>
                                            {statusLabels[vehicle.statut]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-headline font-bold text-primary">{vehicle.prix_par_jour} DH</td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link 
                                                to={`/vehicles/edit/${vehicle.id}`}
                                                className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined">edit</span>
                                            </Link>
                                            <button className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                                                <span className="material-symbols-outlined">visibility</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredVehicles.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-6 py-10 text-center text-slate-400">Aucun véhicule trouvé.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Vehicles;
