import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';
import { SkeletonCards, SkeletonTable } from './Skeleton';

const Calendar = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedContract, setSelectedContract] = useState(null);

    const now = new Date();

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    // Timeline calculations
    const dayWidth = 54; // px per day
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const monthDisplay = `${monthNames[currentMonth]} ${currentYear}`;
    const daysOfWeek = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Toute la flotte', dot: 'bg-indigo-600' },
        { value: 'Rented', label: 'En location', dot: 'bg-emerald-500' },
        { value: 'Reserved', label: 'Réservés', dot: 'bg-indigo-500' },
        { value: 'Available', label: 'Disponibles', dot: 'bg-slate-400' },
        { value: 'Maintenance', label: 'Maintenance', dot: 'bg-rose-500' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehiclesRes, contractsRes] = await Promise.all([
                    api.get('vehicles/'),
                    api.get('contracts/')
                ]);
                setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : (vehiclesRes.data.results || []));
                setContracts(Array.isArray(contractsRes.data) ? contractsRes.data : (contractsRes.data.results || []));
            } catch (error) {
                console.error("Erreur chargement calendrier:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getDayName = (day) => {
        const date = new Date(currentYear, currentMonth, day);
        return daysOfWeek[date.getDay()];
    };

    const getPosition = (dateStr) => {
        const date = new Date(dateStr);
        if (date.getFullYear() < currentYear || (date.getFullYear() === currentYear && date.getMonth() < currentMonth)) {
            return 0;
        }
        if (date.getFullYear() > currentYear || (date.getFullYear() === currentYear && date.getMonth() > currentMonth)) {
            return daysInMonthCount * dayWidth;
        }
        const day = date.getDate();
        const hours = date.getHours();
        return (day - 1) * dayWidth + (hours / 24) * dayWidth;
    };

    const calculateBar = (startStr, endStr) => {
        const startPos = getPosition(startStr);
        const endPos = getPosition(endStr);
        const width = Math.max(endPos - startPos, 28);
        return {
            left: `${startPos}px`,
            width: `${width}px`
        };
    };

    // Filter vehicles by search and status
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const q = search.trim().toLowerCase();
            const matchSearch = !q || [v.matricule, v.marque_name, v.modele_name, v.carburant]
                .filter(Boolean)
                .some(x => x.toLowerCase().includes(q));

            if (!matchSearch) return false;

            const vehicleContracts = contracts.filter(c => c.vehicle === v.id && c.statut !== 'ANNULE');
            const isRented = v.statut === 'Rented' || vehicleContracts.some(c => c.statut === 'EN_COURS');
            const isReserved = vehicleContracts.some(c => c.statut === 'RESERVE');
            const isMaintenance = v.statut === 'Maintenance';
            const isAvailable = !isRented && !isReserved && !isMaintenance;

            if (statusFilter === 'Rented') return isRented;
            if (statusFilter === 'Reserved') return isReserved;
            if (statusFilter === 'Maintenance') return isMaintenance;
            if (statusFilter === 'Available') return isAvailable;
            return true;
        });
    }, [vehicles, contracts, search, statusFilter]);

    // Analytics KPIs
    const totalFleet = vehicles.length;
    const rentedCount = vehicles.filter(v => v.statut === 'Rented').length;
    const maintenanceCount = vehicles.filter(v => v.statut === 'Maintenance').length;
    const activeContractsCount = contracts.filter(c => c.statut === 'EN_COURS').length;
    const occupancyRate = totalFleet > 0 ? Math.round((rentedCount / totalFleet) * 100) : 0;

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
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Planning & Flotte</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planning Interactif (Gantt)</h2>
                </div>

                {/* Month Navigator Controls */}
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <button
                        onClick={handlePrevMonth}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Mois précédent"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <button
                        onClick={handleToday}
                        className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                        Aujourd'hui
                    </button>
                    <span className="text-sm font-extrabold text-slate-900 px-2 min-w-[140px] text-center">
                        {monthDisplay}
                    </span>
                    <button
                        onClick={handleNextMonth}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Mois suivant"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Taux d'Occupation</p>
                        <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-xl ring-1 ring-indigo-100">percent</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{occupancyRate}%</p>
                    <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contrats Actifs</p>
                        <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl ring-1 ring-emerald-100">key</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{activeContractsCount}</p>
                    <p className="text-xs text-slate-400 font-medium mt-2">Véhicules en cours de location</p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">En Maintenance</p>
                        <span className="material-symbols-outlined text-rose-600 bg-rose-50 p-2 rounded-xl ring-1 ring-rose-100">build</span>
                    </div>
                    <p className="text-3xl font-extrabold text-rose-600">{maintenanceCount}</p>
                    <p className="text-xs text-slate-400 font-medium mt-2">Actuellement indisponibles</p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flotte Totale</p>
                        <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-xl ring-1 ring-indigo-100">directions_car</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{totalFleet}</p>
                    <p className="text-xs text-slate-400 font-medium mt-2">Véhicules enregistrés</p>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div>
                <SearchFilterBar
                    placeholder="Filtrer le planning (matricule, marque, modèle)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={FILTER_OPTIONS}
                    filter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
            </div>

            {/* Timeline Legend */}
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-emerald-600"></span> Location En Cours
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-indigo-600"></span> Réservation Confirmée
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-rose-500"></span> Maintenance
                    </span>
                </div>
                <span className="text-slate-400 font-medium">Cliquez sur un contrat pour afficher les détails</span>
            </div>

            {/* Gantt Timeline Board */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <div className="min-w-max flex flex-col">
                        {/* Days Header */}
                        <div className="flex sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm border-b border-slate-200">
                            {/* Vehicle Column Header */}
                            <div className="w-64 shrink-0 p-4 border-r border-slate-200 bg-slate-100/80 sticky left-0 top-0 z-30 font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">directions_car</span>
                                Véhicule
                            </div>

                            {/* Days Timeline */}
                            <div className="flex" style={{ width: `${daysInMonthCount * dayWidth}px` }}>
                                {daysInMonth.map((day) => {
                                    const dayName = getDayName(day);
                                    const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                                    const isWeekend = dayName === "SAM" || dayName === "DIM";
                                    return (
                                        <div
                                            key={day}
                                            style={{ width: `${dayWidth}px` }}
                                            className={`p-2 text-center border-r border-slate-100 ${isWeekend ? 'bg-slate-100/50' : ''}`}
                                        >
                                            <p className={`text-[10px] font-bold ${isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>{dayName}</p>
                                            <p className={`text-xs font-extrabold mx-auto mt-0.5 ${
                                                isToday
                                                    ? 'text-white bg-indigo-600 rounded-lg w-6 h-6 flex items-center justify-center shadow-sm'
                                                    : isWeekend ? 'text-rose-600' : 'text-slate-700'
                                            }`}>
                                                {day.toString().padStart(2, '0')}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Vehicle Rows */}
                        <div className="divide-y divide-slate-100">
                            {filteredVehicles.map((vehicle) => {
                                const vehicleContracts = contracts.filter(c => c.vehicle === vehicle.id && c.statut !== 'ANNULE');
                                const isRented = vehicle.statut === 'Rented' || vehicleContracts.some(c => c.statut === 'EN_COURS');
                                const isMaintenance = vehicle.statut === 'Maintenance';

                                return (
                                    <div key={vehicle.id} className="flex group hover:bg-slate-50/70 transition-colors">
                                        {/* Vehicle Info Sticky Left Column */}
                                        <div className="w-64 shrink-0 p-4 border-r border-slate-200 bg-white sticky left-0 z-10 group-hover:bg-slate-50/70 transition-colors flex items-center gap-3">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.matricule} className="w-12 h-9 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-12 h-9 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                    <span className="material-symbols-outlined text-lg">directions_car</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={`${vehicle.marque_name} ${vehicle.modele_name}`}>
                                                    {vehicle.marque_name} {vehicle.modele_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded ring-1 ring-indigo-100">
                                                        {vehicle.matricule}
                                                    </span>
                                                    {isMaintenance && (
                                                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded ring-1 ring-rose-100">
                                                            Maint.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Bar Track */}
                                        <div className="relative h-16 flex-1" style={{ width: `${daysInMonthCount * dayWidth}px` }}>
                                            {/* Today Vertical Highlight Line */}
                                            {currentMonth === now.getMonth() && currentYear === now.getFullYear() && (
                                                <div
                                                    className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/40 pointer-events-none z-10"
                                                    style={{ left: `${(now.getDate() - 1) * dayWidth + (now.getHours() / 24) * dayWidth}px` }}
                                                />
                                            )}

                                            {/* Contracts Overlay */}
                                            {vehicleContracts.map(contract => {
                                                const barStyle = calculateBar(contract.date_sortie, contract.date_retour_prevue);
                                                const isActive = contract.statut === 'EN_COURS';

                                                return (
                                                    <div
                                                        key={contract.id}
                                                        onClick={() => setSelectedContract(contract)}
                                                        style={barStyle}
                                                        className={`absolute top-1/2 -translate-y-1/2 h-10 rounded-xl px-3 flex items-center justify-between gap-2 cursor-pointer transition-all z-20 shadow-sm hover:shadow-md hover:scale-[1.02] ${
                                                            isActive
                                                                ? 'bg-emerald-600 text-white shadow-emerald-200'
                                                                : 'bg-indigo-600 text-white shadow-indigo-200'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-extrabold truncate">
                                                            #{contract.id} — {contract.client_name || contract.client_prenom}
                                                        </span>
                                                        <span className="material-symbols-outlined text-sm text-white/80 shrink-0">info</span>
                                                    </div>
                                                );
                                            })}

                                            {/* Maintenance Bar */}
                                            {isMaintenance && vehicleContracts.length === 0 && (
                                                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center gap-2 text-xs font-bold z-10">
                                                    <span className="material-symbols-outlined text-base text-rose-500">build</span>
                                                    <span>Véhicule en Maintenance</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredVehicles.length === 0 && (
                                <div className="p-12 text-center text-slate-400 font-medium">
                                    Aucun véhicule trouvé pour ce filtre.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contract Details Modal */}
            {selectedContract && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Détails du Contrat</span>
                                <h3 className="text-lg font-extrabold text-slate-900">#CTR-{selectedContract.id.toString().padStart(5, '0')}</h3>
                            </div>
                            <button onClick={() => setSelectedContract(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs font-medium text-slate-700">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Client:</span>
                                <span className="font-bold text-sm text-slate-900">{selectedContract.client_name} {selectedContract.client_prenom}</span>
                            </div>

                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Véhicule:</span>
                                <span className="font-semibold text-slate-900">{selectedContract.vehicle_name} ({selectedContract.vehicle_matricule})</span>
                            </div>

                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Période:</span>
                                <span className="font-semibold">{new Date(selectedContract.date_sortie).toLocaleDateString()} ➔ {new Date(selectedContract.date_retour_prevue).toLocaleDateString()}</span>
                            </div>

                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Montant Total:</span>
                                <span className="font-extrabold text-indigo-600 text-sm">{selectedContract.montant_total} DH ({selectedContract.jours} jours)</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Statut:</span>
                                <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${selectedContract.statut === 'EN_COURS' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'}`}>
                                    {selectedContract.statut === 'EN_COURS' ? 'En Cours (Loué)' : 'Réservé'}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setSelectedContract(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-white transition-colors"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => navigate(`/contracts/edit/${selectedContract.id}`)}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span> Modifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
