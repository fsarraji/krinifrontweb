import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { resolveImage } from '../imageUrl';

const REFRESH_MS = 15000;
const MOROCCO = [31.63, -7.98];

const FR = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };

const formatTime = (iso) => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleString('fr-FR', FR);
    } catch {
        return '—';
    }
};

const deriveStatus = (v) => {
    if (v.statut === 'Maintenance') return { label: 'HORS LIGNE', moving: false, dot: 'bg-slate-400', accent: 'text-slate-500' };
    const p = v.position;
    if (!p) return { label: 'HORS LIGNE', moving: false, dot: 'bg-slate-400', accent: 'text-slate-500' };
    const moving = p.moving ?? p.speed_kph > 0;
    return moving
        ? { label: 'EN MOUVEMENT', moving: true, dot: 'bg-emerald-500', accent: 'text-indigo-600' }
        : { label: "À L'ARRÊT", moving: false, dot: 'bg-rose-500', accent: 'text-slate-500' };
};

const GpsTracking = () => {
    const [vehicles, setVehicles] = useState([]);
    const [tracking, setTracking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [fleetOpen, setFleetOpen] = useState(true);
    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);

    const mapRef = useRef(null);
    const map = useRef(null);
    const markerLayer = useRef(null);
    const routeLayer = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('gps/positions/');
                setTracking(Boolean(data.tracking));
                setVehicles(data.vehicles || []);
            } catch (error) {
                console.error("Erreur lors de la récupération des positions GPS", error);
                // Repli : si l'endpoint GPS échoue, on affiche quand même la flotte
                // (sans positions) pour ne pas laisser la liste vide.
                try {
                    const res = await api.get('vehicles/', { params: { page_size: 500 } });
                    setVehicles(Array.isArray(res.data) ? res.data : res.data.results || []);
                    setTracking(false);
                } catch (e2) {
                    console.error("Erreur lors du repli sur la liste des véhicules", e2);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!mapRef.current || map.current) return;
        const instance = L.map(mapRef.current, { zoomControl: false }).setView(MOROCCO, 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(instance);
        L.control.zoom({ position: 'bottomright' }).addTo(instance);
        markerLayer.current = L.layerGroup().addTo(instance);
        routeLayer.current = L.layerGroup().addTo(instance);
        map.current = instance;
        return () => {
            instance.remove();
            map.current = null;
            markerLayer.current = null;
            routeLayer.current = null;
        };
    }, []);

    const buildIcon = (v, isSelected) => {
        const p = v.position;
        const status = deriveStatus(v);
        const color = p ? (status.moving ? '#10b981' : '#f43f5e') : '#94a3b8';
        const size = isSelected ? 46 : 34;
        const ping = status.moving
            ? `<span class="gps-ping" style="border-color:${color}"></span>`
            : '';
        const html = `
            <div class="gps-marker-wrap">
                ${ping}
                <div class="gps-marker-dot" style="width:${size}px;height:${size}px;border-color:${color};${isSelected ? `background:${color};` : ''}">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;color:${isSelected ? '#fff' : color};font-size:${size * 0.5}px;">directions_car</span>
                </div>
            </div>`;
        return L.divIcon({ className: 'gps-marker', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    };

    useEffect(() => {
        if (!map.current || !markerLayer.current) return;
        markerLayer.current.clearLayers();
        routeLayer.current?.clearLayers();
        const positioned = vehicles.filter((v) => v.position);
        positioned.forEach((v) => {
            const isSelected = selectedId === v.id;
            const marker = L.marker([v.position.latitude, v.position.longitude], { icon: buildIcon(v, isSelected), zIndexOffset: isSelected ? 1000 : 0 });
            marker.on('click', () => setSelectedId(v.id === selectedId ? null : v.id));
            marker.bindTooltip(`${v.marque_name || 'Véhicule'} — ${v.matricule}`, { direction: 'top', offset: [0, -14] });
            markerLayer.current.addLayer(marker);
        });
        if (map.current.__gpsFitted === undefined && positioned.length) {
            map.current.__gpsFitted = true;
            const bounds = L.latLngBounds(positioned.map((v) => [v.position.latitude, v.position.longitude]));
            map.current.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
        }
    }, [vehicles, selectedId]);

    useEffect(() => {
        const sel = vehicles.find((v) => v.id === selectedId);
        if (map.current && sel?.position) {
            map.current.flyTo([sel.position.latitude, sel.position.longitude], Math.max(map.current.getZoom(), 13), { duration: 0.7 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vehicles;
        return vehicles.filter((v) =>
            [v.matricule, v.marque_name, v.modele_name].filter(Boolean).some((x) => String(x).toLowerCase().includes(q))
        );
    }, [vehicles, search]);

    const selected = useMemo(() => vehicles.find((v) => v.id === selectedId) || null, [vehicles, selectedId]);

    const showHistory = async () => {
        if (!selected || !selected.traccar_device_id) return;
        setRouteLoading(true);
        try {
            const to = new Date();
            const from = new Date(Date.now() - 24 * 3600 * 1000);
            const { data } = await api.get('gps/history/', {
                params: { vehicle_id: selected.id, from: from.toISOString(), to: to.toISOString() },
            });
            const points = (data.route || []).filter((p) => p.latitude != null && p.longitude != null);
            setRoute(points);
            if (map.current && routeLayer.current) {
                routeLayer.current.clearLayers();
                if (points.length) {
                    const line = L.polyline(points.map((p) => [p.latitude, p.longitude]), { color: '#0453cd', weight: 4, opacity: 0.75 });
                    routeLayer.current.addLayer(line);
                    map.current.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 15 });
                    const last = points[points.length - 1];
                    L.circleMarker([last.latitude, last.longitude], { radius: 6, color: '#0453cd', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(routeLayer.current);
                }
            }
        } catch (error) {
            console.error("Erreur historique GPS", error);
            setRoute([]);
        } finally {
            setRouteLoading(false);
        }
    };

    const actionButtons = [
        {
            icon: 'my_location', label: 'Suivi en Direct', primary: true,
            onClick: () => selected?.position && map.current?.flyTo([selected.position.latitude, selected.position.longitude], 16, { duration: 0.8 }),
        },
        { icon: 'history', label: 'Historique', primary: false, onClick: showHistory },
        { icon: 'share_location', label: 'Recentrer', primary: false, onClick: () => map.current?.setView(MOROCCO, 6) },
        { icon: 'close', label: 'Fermer', primary: false, onClick: () => setSelectedId(null) },
    ];

    return (
        <div className="-m-8 h-screen relative overflow-hidden bg-slate-200 flex" data-purpose="gps-tracking">
            <style>{`
                .leaflet-container { font-family: inherit; background: #eef2f9; }
                .gps-marker { background: transparent; border: none; }
                .gps-marker-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
                .gps-ping { position: absolute; inset: -4px; border-radius: 9999px; border-width: 3px; border-style: solid; opacity: .55; animation: gpsPing 1.6s cubic-bezier(0,0,.2,1) infinite; }
                .gps-marker-dot { border-radius: 9999px; background: #fff; border-width: 2px; border-style: solid; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.18); transition: all .2s ease; }
                @keyframes gpsPing { 0% { transform: scale(.5); opacity: .7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }
            `}</style>

            {/* Vraie carte */}
            <div className="absolute inset-0" ref={mapRef} data-location="map-traccar" />

            {!tracking && !loading && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg">
                    Suivi GPS non configuré — connectez votre compte Traccar dans les Paramètres de l'agence.
                </div>
            )}

            {vehicles.length === 0 && !loading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow border border-slate-200 text-center">
                        <p className="text-sm font-semibold text-slate-700">Aucun véhicule dans la flotte</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur px-6 py-4 rounded-2xl shadow border border-slate-200 text-center">
                        <p className="text-sm font-semibold text-slate-700">Chargement des positions…</p>
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
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vehicles.length} véh.</span>
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
                        {loading &&
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-3 rounded-xl bg-slate-50 animate-pulse">
                                    <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
                                    <div className="h-6 w-40 bg-slate-200 rounded"></div>
                                </div>
                            ))}
                        {!loading && filtered.map((v) => {
                            const active = selected?.id === v.id;
                            const status = deriveStatus(v);
                            return (
                                <div
                                    key={v.id}
                                    onClick={() => setSelectedId(v.id)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                        active
                                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-600 shadow-md shadow-indigo-200'
                                            : 'hover:bg-slate-50 border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${status.dot} ${status.moving ? 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}></span>
                                            <span className={`text-[10px] font-bold tracking-widest uppercase ${active ? 'text-white' : 'text-slate-500'}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-500'}`}>
                                            {v.position?.speed_kph != null ? `${Math.round(v.position.speed_kph)} km/h` : '--'}
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
                                                {v.marque_name || 'Véhicule'} {v.modele_name || ''}
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
                    onClick={() => setFleetOpen(true)}
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
                            <img src={resolveImage(selected.image)} alt={selected.marque_name} className="w-full h-full object-cover" />
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
                        {(() => {
                            const status = deriveStatus(selected);
                            return (
                                <div className={`absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-bold text-white ${status.moving ? 'bg-emerald-500/90' : status.dot === 'bg-rose-500' ? 'bg-rose-500/90' : 'bg-slate-500/90'} px-2 py-1 rounded-lg backdrop-blur`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.moving ? 'bg-white animate-pulse' : 'bg-white/70'}`}></span>
                                    {status.label}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0">
                                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{selected.marque_name} {selected.modele_name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                                        {selected.matricule}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200/70 px-3 py-2 rounded-xl shrink-0">
                                <span className={`material-symbols-outlined ${selected.position ? 'text-emerald-500' : 'text-slate-400'} text-lg`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {selected.position?.speed_kph > 0 ? 'bolt' : 'location_on'}
                                </span>
                                <span className="text-sm font-bold text-slate-700">
                                    {selected.position?.speed_kph != null ? `${Math.round(selected.position.speed_kph)} km/h` : '--'}
                                </span>
                            </div>
                        </div>

                        {/* Telemetry Bento Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-3 rounded-lg shadow-sm">
                                <span className="text-[10px] text-indigo-100 uppercase tracking-wider font-bold block mb-1">Vitesse</span>
                                <div className="flex items-end gap-1 text-white">
                                    <span className="text-2xl font-extrabold leading-none">{selected.position?.speed_kph != null ? Math.round(selected.position.speed_kph) : '--'}</span>
                                    <span className="text-xs font-medium pb-0.5 text-indigo-100">km/h</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 p-3 rounded-lg shadow-sm">
                                <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-bold block mb-1">Carburant</span>
                                <div className="flex items-end gap-1 text-white">
                                    <span className="text-2xl font-extrabold leading-none">{selected.position?.fuel_level != null ? Math.round(selected.position.fuel_level) : '--'}</span>
                                    <span className="text-xs font-medium pb-0.5 text-emerald-100">%</span>
                                </div>
                            </div>
                            <div className="col-span-2 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex items-start gap-3">
                                <span className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-indigo-500" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                </span>
                                <div className="min-w-0">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">Dernière Position</span>
                                    <span className="text-sm text-slate-900 font-semibold leading-snug">
                                        {selected.position?.address || (selected.position ? `${selected.position.latitude?.toFixed(5)}, ${selected.position.longitude?.toFixed(5)}` : 'Aucune position')}
                                    </span>
                                    <span className="text-xs text-slate-400 block mt-0.5">Mis à jour : {formatTime(selected.position?.fixTime)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Périphérique GPS */}
                        {(selected.gps_imei || selected.sim_number || selected.sim_operator || selected.traccar_device_id) && (
                            <div className="mb-4 bg-slate-50 border border-slate-200/70 rounded-lg p-3">
                                <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-100 pb-2 mb-2">Périphérique GPS</h3>
                                <div className="space-y-1.5">
                                    {selected.traccar_device_id != null && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="material-symbols-outlined text-slate-400 text-sm">satellite_alt</span>
                                            <span className="text-slate-500 font-semibold w-24">Dispositif</span>
                                            <span className="font-mono text-slate-900 font-semibold">#{selected.traccar_device_id}</span>
                                        </div>
                                    )}
                                    {selected.gps_imei && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="material-symbols-outlined text-slate-400 text-sm">memory</span>
                                            <span className="text-slate-500 font-semibold w-24">ID / IMEI</span>
                                            <span className="font-mono text-slate-900 font-semibold">{selected.gps_imei}</span>
                                        </div>
                                    )}
                                    {selected.sim_number && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="material-symbols-outlined text-slate-400 text-sm">sim_card</span>
                                            <span className="text-slate-500 font-semibold w-24">Carte SIM</span>
                                            <span className="font-mono text-slate-900 font-semibold">{selected.sim_number}</span>
                                        </div>
                                    )}
                                    {selected.sim_operator && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="material-symbols-outlined text-slate-400 text-sm">phone_in_talk</span>
                                            <span className="text-slate-500 font-semibold w-24">Opérateur</span>
                                            <span className="text-slate-900 font-semibold">{selected.sim_operator}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions Traccar */}
                        <div className="space-y-3">
                            <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-100 pb-2">Actions Traccar</h3>
                            {routeLoading && <p className="text-xs text-slate-400">Chargement de l'historique…</p>}
                            {route && !routeLoading && (
                                <p className="text-xs font-semibold text-indigo-600">Trajet des dernières 24h affiché sur la carte ({route.length} points)</p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {actionButtons.map((btn) => (
                                    <button
                                        key={btn.label}
                                        onClick={btn.onClick}
                                        disabled={btn.label === 'Historique' && !selected.traccar_device_id}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold text-sm transition-all ${
                                            btn.primary
                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed'
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
                <span className="flex items-center gap-1.5 font-semibold"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Hors ligne / maintenance</span>
            </div>

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
