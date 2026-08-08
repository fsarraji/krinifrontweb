import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { resolveImage } from '../imageUrl';

const SPOTS = [
    { x: 30, y: 40 }, { x: 55, y: 30 }, { x: 70, y: 56 },
    { x: 42, y: 62 }, { x: 62, y: 74 }, { x: 80, y: 36 },
    { x: 20, y: 60 }, { x: 48, y: 46 }, { x: 66, y: 18 },
];

const hashIndex = (id) => {
    let h = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h;
};

const deriveTelemetry = (vehicle, index) => {
    const h = hashIndex(vehicle.id || index);
    const statut = vehicle.statut;
    if (statut === 'Maintenance') {
        return { label: 'HORS LIGNE', speed: null, moving: false, dot: 'bg-slate-400', accent: 'text-slate-500' };
    }
    if (statut === 'Rented') {
        const speed = (h % 55) + 28;
        return { label: 'EN MOUVEMENT', speed, moving: true, dot: 'bg-emerald-500', accent: 'text-indigo-600' };
    }
    return { label: "À L'ARRÊT", speed: 0, moving: false, dot: 'bg-rose-500', accent: 'text-slate-500' };
};

const deriveFuel = (vehicle, index) => {
    const h = hashIndex(vehicle.id || index);
    return (h % 55) + 35;
};

const deriveLastSeen = (vehicle, index) => {
    const h = hashIndex(vehicle.id || index);
    return {
        place: h % 2 === 0 ? 'Av. Hassan II, Casablanca' : 'Boulevard Zerktouni, Casablanca',
        time: `0${(h % 10) + 8}h${String((h * 7) % 60).padStart(2, '0')}`
    };
};

const MapPattern = () => (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="1000" height="700" fill="#eef2f9" />
        <path d="M0 620 C 200 600 300 660 520 640 S 820 610 1000 630 L1000 700 L0 700 Z" fill="#dbe7f7" />
        <circle cx="905" cy="90" r="42" fill="#dbe7f7" />
        <g fill="#e6ecf6">
            <rect x="70" y="80" width="140" height="90" rx="10" />
            <rect x="260" y="180" width="120" height="80" rx="10" />
            <rect x="560" y="140" width="130" height="70" rx="10" />
            <rect x="740" y="260" width="110" height="96" rx="10" />
            <rect x="180" y="380" width="150" height="88" rx="10" />
            <rect x="420" y="420" width="120" height="90" rx="10" />
            <rect x="640" y="470" width="90" height="80" rx="10" />
            <rect x="300" y="520" width="140" height="70" rx="10" />
        </g>
        <g stroke="#ffffff" strokeWidth="14" strokeLinecap="round" fill="none">
            <path d="M-10 150 C 200 120, 300 170, 420 150 C 540 130, 600 90, 1010 120" />
            <path d="M80 -10 C 60 200, 90 420, 70 620 C 60 700, 70 720, 80 730" />
            <path d="M420 -10 C 400 200, 500 300, 480 500 C 470 600, 490 720, 480 730" />
            <path d="M-10 480 C 200 460, 400 520, 620 470 C 780 430, 900 470, 1020 440" />
        </g>
        <g stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M240 -10 C 230 180, 260 320, 250 480 C 245 600, 265 720, 255 730" />
            <path d="M-10 300 C 220 280, 300 340, 520 300 C 720 310, 850 280, 1020 300" />
            <path d="M900 -10 C 880 160, 920 340, 900 520 C 880 620, 920 720, 900 730" />
            <path d="M-10 90 C 300 60, 500 100, 700 70 C 860 60, 980 80, 1020 70" />
        </g>
        <g stroke="#cbd0dc" strokeWidth="4" fill="none">
            {Array.from({ length: 9 }).map((_, i) => (
                <path key={`r${i}`} d={`M${(i * 100) - 20} 0 C ${(i * 100) + 30} 240, ${(i * 100) - 40} 480, ${(i * 100) + 20} 700`} />
            ))}
        </g>
        <path d="M620 90 L760 90 L760 210 L680 210 L680 150 L620 150 Z" fill="#f9fbff" stroke="#cbd0dc" strokeWidth="2" />
        <rect x="905" y="80" rx="6" width="10" height="10" fill="#a5c3ea" />
    </svg>
);

const GpsTracking = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [fleetOpen, setFleetOpen] = useState(true);

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await api.get('vehicles/');
                setVehicles(response.data);
            } catch (error) {
                console.error("Erreur lors de la récupération des véhicules", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVehicles();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vehicles;
        return vehicles.filter(v =>
            [v.matricule, v.marque_name, v.modele_name]
                .filter(Boolean)
                .some(x => x.toLowerCase().includes(q))
        );
    }, [vehicles, search]);

    const enriched = useMemo(() => filtered.map((v, i) => ({
        ...v,
        status: deriveTelemetry(v, i),
        fuel: deriveFuel(v, i),
        lastSeen: deriveLastSeen(v, i),
        spot: SPOTS[hashIndex(v.id || i) % SPOTS.length],
    })), [filtered]);

    const selected = useMemo(
        () => enriched.find(v => v.id === selectedId) || null,
        [enriched, selectedId]
    );

    const handleSelect = (id) => setSelectedId(id);

    const actionButtons = [
        { icon: 'my_location', label: 'Suivi en Direct', primary: true },
        { icon: 'history', label: 'Historique', primary: false },
        { icon: 'terminal', label: 'Commande', primary: false },
        { icon: 'share_location', label: 'Géofencing', primary: false },
    ];

    return (
        <div className="-m-8 h-screen relative overflow-hidden bg-slate-200 flex" data-purpose="gps-tracking">
            {/* Map Canvas */}
            <div className="absolute inset-0" data-location="Casablanca">
                <MapPattern />
            </div>

            {/* Map Markers */}
            {enriched.map((v) => {
                const isSelected = selectedId === v.id || (v.id === selected?.id);
                return (
                <button
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    title={`${v.marque_name} ${v.modele_name} — ${v.matricule}`}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group focus:outline-none ${isSelected ? 'z-30' : ''}`}
                    style={{ left: `${v.spot.x}%`, top: `${v.spot.y}%` }}
                >
                    {v.status.moving && !isSelected && (
                        <span className="absolute -inset-1 rounded-full bg-indigo-500/25 animate-ping"></span>
                    )}
                    <span className={`relative flex rounded-full items-center justify-center bg-white border-2 shadow-lg transition-all group-hover:scale-110 ${isSelected ? 'w-14 h-14 border-indigo-600 bg-indigo-600 shadow-indigo-300/60 shadow-2xl ring-8 ring-indigo-600/25' : 'w-9 h-9 border-slate-300'}`}>
                        <span className={`material-symbols-outlined transition-all ${isSelected ? 'text-white text-2xl' : `text-lg ${v.status.accent}`}`} style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                    </span>
                    {isSelected && (
                        <span className="absolute -inset-3 rounded-full bg-indigo-500/30 animate-ping"></span>
                    )}
                    <span className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg shadow text-xs font-bold whitespace-nowrap border transition-opacity ${isSelected ? 'opacity-100 bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 opacity-0 group-hover:opacity-100'}`}>
                        {v.matricule}
                    </span>
                    {isSelected && (
                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
                            {v.marque_name} {v.modele_name}
                        </span>
                    )}
                </button>
                );
            })}

            {enriched.length === 0 && !loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow border border-slate-200 text-center">
                        <p className="text-sm font-semibold text-slate-700">Aucun véhicule dans la flotte</p>
                    </div>
                </div>
            )}

            {/* Left Overlay: Fleet Panel */}
            {fleetOpen ? (
            <div className="absolute top-6 left-6 bottom-6 w-72 max-w-[calc(100%-20rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-20 flex-shrink-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-baseline justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Suivi GPS</h2>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{enriched.length} véh.</span>
                        </div>
                        <button
                            onClick={() => setFleetOpen(false)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Réduire la liste"
                        >
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                        </button>
                    </div>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un véhicule..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-colors text-slate-900 placeholder:text-slate-400"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading && (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-50 animate-pulse">
                                <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
                                <div className="h-6 w-40 bg-slate-200 rounded"></div>
                            </div>
                        ))
                    )}
                    {!loading && enriched.map((v) => {
                        const active = selected?.id === v.id;
                        return (
                            <div
                                key={v.id}
                                onClick={() => handleSelect(v.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                    active
                                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-600 shadow-md shadow-indigo-200'
                                        : 'hover:bg-slate-50 border-transparent'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${v.status.dot} ${v.status.moving ? 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}></span>
                                        <span className={`text-[10px] font-bold tracking-widest uppercase ${active ? 'text-white' : 'text-slate-500'}`}>
                                            {v.status.label}
                                        </span>
                                    </div>
                                    <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-500'}`}>
                                        {v.status.speed === null ? '--' : `${v.status.speed} km/h`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border overflow-hidden ${active ? 'bg-white/15 border-white/20' : 'bg-slate-100 border-slate-200'}`}>
                                        {resolveImage(v.image) ? (
                                            <img src={resolveImage(v.image)} alt={v.marque_name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <span className={`material-symbols-outlined ${active ? 'text-white' : 'text-slate-400'}`}>directions_car</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`font-semibold text-sm truncate ${active ? 'text-white' : 'text-slate-900'}`}>
                                            {v.marque_name || 'Véhicule'}
                                        </h3>
                                        <p className={`text-[11px] font-mono px-1.5 py-0.5 rounded inline-block ${active ? 'text-white/90 bg-white/15' : 'text-slate-500 bg-slate-100'}`}>{v.matricule}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            ) : (
                <button
                    onClick={() => { setFleetOpen(true); setSelectedId(null); }}
                    className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                    title="Afficher la flotte"
                >
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                </button>
            )}

            {/* Right Overlay: Selected Vehicle Details */}
            {selected && (
                <div className="absolute top-6 right-6 w-80 max-w-[calc(100%-3rem)] max-h-[calc(100%-3rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 z-20 flex flex-col overflow-hidden">
                    <div className="h-36 bg-slate-100 relative overflow-hidden border-b border-slate-100 flex-shrink-0">
                        {resolveImage(selected.image) ? (
                            <img src={resolveImage(selected.image)} alt={selected.marque_name} className="w-full h-full object-cover " />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500/90 to-indigo-700/90 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-white/80" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"></div>
                        <button
                            onClick={() => setSelectedId(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                            title="Fermer"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                        <div className={`absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-bold text-white ${selected.status.moving ? 'bg-emerald-500/90' : selected.status.label === "À L'ARRÊT" ? 'bg-rose-500/90' : 'bg-slate-500/90'} px-2 py-1 rounded-lg backdrop-blur`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${selected.status.moving ? 'bg-white animate-pulse' : 'bg-white/70'}`}></span>
                            {selected.status.label}
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0">
                                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{selected.marque_name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                                        {selected.matricule}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                                        <span className={`w-2 h-2 rounded-full ${selected.status.dot}`}></span> {selected.modele_name}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-2 rounded-xl shrink-0">
                                <span className={`material-symbols-outlined ${selected.status.moving ? 'text-emerald-500' : selected.status.label === "À L'ARRÊT" ? 'text-rose-500' : 'text-slate-400'} text-lg`} style={{ fontVariationSettings: "'FILL' 1" }}>{selected.status.moving ? 'bolt' : 'location_on'}</span>
                                <span className="text-sm font-bold text-slate-700">{selected.status.speed === null ? '--' : `${selected.status.speed} km/h`}</span>
                            </div>
                        </div>

                        {/* Telemetry Bento Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-3 rounded-lg shadow-sm">
                                <span className="text-[10px] text-indigo-100 uppercase tracking-wider font-bold block mb-1">Vitesse</span>
                                <div className="flex items-end gap-1 text-white">
                                    <span className="text-2xl font-extrabold leading-none">{selected.status.speed === null ? '--' : selected.status.speed}</span>
                                    <span className="text-xs font-medium pb-0.5 text-indigo-100">km/h</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 p-3 rounded-lg shadow-sm">
                                <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold block mb-1">Carburant</span>
                                <div className="flex items-end gap-1 text-white">
                                    <span className="text-2xl font-extrabold leading-none">{selected.fuel}</span>
                                    <span className="text-xs font-medium pb-0.5 text-emerald-100">%</span>
                                </div>
                            </div>
                            <div className="col-span-2 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-3">
                                <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-indigo-500" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                </span>
                                <div className="min-w-0">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">Dernière Position</span>
                                    <span className="text-sm text-slate-900 font-semibold leading-snug">{selected.lastSeen.place} ({selected.lastSeen.time})</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Traccar */}
                        <div className="space-y-3">
                            <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-100 pb-2">Actions Traccar</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {actionButtons.map((btn) => (
                                    <button
                                        key={btn.label}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold text-sm transition-all ${
                                            btn.primary
                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg" style={btn.primary ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                                            {btn.icon}
                                        </span>
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow border border-slate-200 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> En mouvement</span>
                <span className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full bg-rose-500"></span> À l'arrêt</span>
                <span className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Maintenance</span>
            </div>

            {/* Mobile hint: tap a marker */}
            {!selected && !loading && (
                <div className="absolute bottom-6 right-6 z-20 bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow border border-slate-200 text-sm text-slate-600 font-medium hidden md:flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">ads_click</span>
                    Sélectionnez un véhicule pour voir sa télémétrie
                </div>
            )}
        </div>
    );
};

export default GpsTracking;