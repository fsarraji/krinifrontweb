import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';

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
    const dayWidth = 62; // px per day
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
                const [vehicles, contracts] = await Promise.all([
                    fetchAllPages('vehicles/'),
                    fetchAllPages('contracts/')
                ]);
                setVehicles(Array.isArray(vehicles) ? vehicles : []);
                setContracts(Array.isArray(contracts) ? contracts : []);
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
            const isRented = normalizeVehicleStatut(v.statut) === 'Rented' || vehicleContracts.some(c => c.statut === 'EN_COURS');
            const isReserved = vehicleContracts.some(c => c.statut === 'RESERVE');
            const isMaintenance = normalizeVehicleStatut(v.statut) === 'Maintenance';
            const isAvailable = !isRented && !isReserved && !isMaintenance;

            if (statusFilter === 'Rented') return isRented;
            if (statusFilter === 'Reserved') return isReserved;
            if (statusFilter === 'Maintenance') return isMaintenance;
            if (statusFilter === 'Available') return isAvailable;
            return true;
        });
    }, [vehicles, contracts, search, statusFilter]);

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
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Location En Cours
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Réservation Confirmée
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Maintenance
                    </span>
                </div>
                <span className="text-slate-400 font-medium">Cliquez sur un contrat pour afficher les détails</span>
            </div>

            {/* Gantt Timeline Board */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <div className="min-w-max flex flex-col">
                        {/* Days Header */}
                        <div className="flex sticky top-0 z-20 bg-[#f8fafc] border-b border-slate-200">
                            {/* Vehicle Column Header */}
                            <div className="w-[245px] shrink-0 h-[54px] px-4 border-r border-slate-100 bg-[#f8fafc] sticky left-0 top-0 z-40 shadow-[4px_0_10px_-4px_rgba(16,24,40,0.10)] font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
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
                                            className={`relative h-[54px] flex flex-col items-center justify-center border-r border-slate-100 ${isWeekend ? 'bg-[#fff7f8]' : ''} ${isToday ? 'bg-[#f8f8ff]' : ''}`}
                                        >
                                            <p className={`text-[10px] font-bold ${isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>{dayName}</p>
                                            <p className={`text-xs font-extrabold mt-0.5 ${
                                                isToday
                                                    ? 'bg-indigo-600 text-white rounded-lg px-[7px] py-[4px] shadow-sm'
                                                    : isWeekend ? 'text-rose-600' : 'text-slate-600'
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
                                const isMaintenance = normalizeVehicleStatut(vehicle.statut) === 'Maintenance';

                                return (
                                    <div key={vehicle.id} className="flex h-[76px] group hover:bg-slate-50/70 transition-colors">
                                        {/* Vehicle Info Sticky Left Column */}
                                        <div className="w-[245px] shrink-0 px-4 border-r border-slate-100 bg-white sticky left-0 z-30 group-hover:bg-slate-50/70 transition-colors flex items-center gap-3 shadow-[4px_0_10px_-4px_rgba(16,24,40,0.10)]">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.matricule} className="w-[46px] h-9 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-[46px] h-9 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                    <span className="material-symbols-outlined text-lg">directions_car</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={`${vehicle.marque_name} ${vehicle.modele_name}`}>
                                                    {vehicle.marque_name} {vehicle.modele_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        {vehicle.matricule}
                                                    </span>
                                                    {isMaintenance && (
                                                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                                            Maint.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Bar Track */}
                                        <div className="relative h-[76px] flex-1" style={{ width: `${daysInMonthCount * dayWidth}px` }}>
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
                                                        className={`absolute top-[18px] h-10 rounded-xl px-3 flex items-center justify-between gap-2 cursor-pointer transition-all z-20 ${
                                                            isActive
                                                                ? 'bg-emerald-600 text-white shadow-[0_3px_8px_rgba(5,150,105,0.35)] hover:brightness-95 hover:-translate-y-px hover:shadow-md'
                                                                : 'bg-indigo-600 text-white shadow-[0_3px_8px_rgba(79,70,229,0.35)] hover:brightness-95 hover:-translate-y-px hover:shadow-md'
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
                                                <div className="absolute inset-x-2 top-[18px] h-10 rounded-xl bg-rose-500 text-white shadow-[0_3px_8px_rgba(225,29,72,0.35)] flex items-center justify-center gap-2 text-xs font-bold z-10">
                                                    <span className="material-symbols-outlined text-base text-white/90">build</span>
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
