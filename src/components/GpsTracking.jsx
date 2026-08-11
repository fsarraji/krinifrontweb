import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api, { fetchAllPages } from '../api';
import { resolveImage } from '../imageUrl';
import { toast } from './Toast';

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

// Traccar renvoie l'odomètre en mètres (attribute odometer / totalDistance).
const formatKm = (odometer) => {
    if (odometer == null) return '--';
    return `${Math.round(odometer / 1000).toLocaleString('fr-FR')}`;
};

const STATUS = {
    moving: { label: 'En mouvement', moving: true, color: '#16A34A', dotBg: '#16A34A', bg: '#DCFCE7', text: '#166534' },
    stopped: { label: "À l'arrêt", moving: false, color: '#D97706', dotBg: '#D97706', bg: '#FEF3C7', text: '#92400E' },
    offline: { label: 'Hors ligne', moving: false, color: '#94A3B8', dotBg: '#64748B', bg: '#F1F5F9', text: '#64748B' },
};

const COMMAND_LABELS = {
    engineStop: { label: 'Couper le moteur', icon: 'power_settings_new', danger: true },
    engineResume: { label: 'Réactiver le moteur', icon: 'play_circle' },
    custom: { label: 'Commande personnalisée', icon: 'terminal' },
    movement: { label: 'Alarme mouvement', icon: 'directions_run' },
    positionPeriodic: { label: 'Position périodique', icon: 'update' },
    setTimezone: { label: 'Fuseau horaire', icon: 'schedule' },
    sos: { label: 'SOS', icon: 'sos' },
    reset: { label: 'Réinitialiser', icon: 'restart_alt' },
    reboot: { label: 'Redémarrer', icon: 'refresh' },
};

const deriveStatus = (v) => {
    if (v.statut === 'Maintenance') return STATUS.offline;
    const p = v.position;
    if (!p) return STATUS.offline;
    const moving = p.moving ?? p.speed_kph > 0;
    return moving ? STATUS.moving : STATUS.stopped;
};

const GpsTracking = () => {
    const [vehicles, setVehicles] = useState([]);
    const [tracking, setTracking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [view, setView] = useState('list');
    const [fleetOpen, setFleetOpen] = useState(true);
    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [commands, setCommands] = useState([]);
    const [customCommand, setCustomCommand] = useState('');
    const [commandLoading, setCommandLoading] = useState(false);

    const mapRef = useRef(null);
    const map = useRef(null);
    const markerLayer = useRef(null);
    const routeLayer = useRef(null);
    const scrollRef = useRef(null);

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
                    const vehicles = await fetchAllPages('vehicles/');
                    setVehicles(Array.isArray(vehicles) ? vehicles : []);
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
        const color = p ? status.color : STATUS.offline.color;
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
            marker.on('click', () => {
                setSelectedId(v.id === selectedId ? null : v.id);
                if (v.id !== selectedId) setView('detail');
            });
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
        if (selectedId) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

    useEffect(() => {
        if (!selected?.traccar_device_id) {
            setCommands([]);
            return;
        }
        api.get('gps/commands/', { params: { vehicle_id: selected.id } })
            .then((r) => setCommands(Array.isArray(r.data.commands) ? r.data.commands : []))
            .catch(() => setCommands([]));
    }, [selected]);

    const sendCommand = async (type, attributes) => {
        if (!selected?.traccar_device_id) return;
        const meta = COMMAND_LABELS[type];
        if (meta?.danger && !window.confirm(`${meta.label} ? Cette action peut immobiliser le véhicule.`)) return;
        setCommandLoading(true);
        try {
            const { data } = await api.post('gps/commands/', { vehicle_id: selected.id, type, attributes: attributes || {} });
            toast.success(`Commande « ${data.command?.type || type} » envoyée au dispositif.`);
        } catch (error) {
            toast.error(error.response?.data?.detail || `Échec de l'envoi de la commande « ${type} ».`);
        } finally {
            setCommandLoading(false);
        }
    };

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
                    const line = L.polyline(points.map((p) => [p.latitude, p.longitude]), { color: '#2563EB', weight: 4, opacity: 0.75 });
                    routeLayer.current.addLayer(line);
                    map.current.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 15 });
                    const last = points[points.length - 1];
                    L.circleMarker([last.latitude, last.longitude], { radius: 6, color: '#2563EB', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(routeLayer.current);
                }
            }
        } catch (error) {
            console.error("Erreur historique GPS", error);
            setRoute([]);
        } finally {
            setRouteLoading(false);
        }
    };

    const movingCount = vehicles.filter((v) => deriveStatus(v).moving).length;
    const offlineCount = vehicles.length - movingCount;

    const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const subtitle = `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)} — Position en temps réel`;

    return (
        <div
            className="-m-8 h-screen overflow-hidden flex flex-col"
            style={{ background: 'var(--slate-bg)', color: 'var(--on-surface)' }}
            data-purpose="gps-tracking"
        >
            <style>{`
                .leaflet-container { font-family: inherit; background: #eef2f9; }
                .gps-marker { background: transparent; border: none; }
                .gps-marker-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
                .gps-ping { position: absolute; inset: -4px; border-radius: 9999px; border-width: 3px; border-style: solid; opacity: .55; animation: gpsPing 1.6s cubic-bezier(0,0,.2,1) infinite; }
                .gps-marker-dot { border-radius: 9999px; background: #fff; border-width: 2px; border-style: solid; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.18); transition: all .2s ease; }
                @keyframes gpsPing { 0% { transform: scale(.5); opacity: .7; } 80%, 100% { transform: scale(2.4); opacity: 0; } }

                .mono { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

                .badge-dot.pulse { position: relative; }
                .badge-dot.pulse::after { content: ''; position: absolute; inset: -5px; border-radius: 9999px; background: currentColor; opacity: .25; animation: pulse 1.8s infinite; }
                @keyframes pulse { 0% { transform: scale(.5); opacity: .5; } 100% { transform: scale(2); opacity: 0; } }

                .veh-row { display: flex; align-items: center; gap: 11px; padding: 10px 10px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; }
                .veh-row:hover { background: var(--slate-bg); }
                .veh-row.selected { background: var(--info-bg); border-color: #bcd2fb; }

                .thumb { width: 44px; height: 44px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

                .stat-tile { border: 1px solid var(--stroke); border-radius: 8px; padding: 12px 14px; background: var(--card-white); }

                .toggle-tab { padding: 7px 16px; border-radius: 9999px; font-size: 12.5px; font-weight: 700; cursor: pointer; color: var(--on-surface-variant); white-space: nowrap; }
                .toggle-tab.active { background: var(--primary-container); color: #fff; }

                details.tech summary { list-style: none; cursor: pointer; }
                details.tech summary::-webkit-details-marker { display: none; }
                details.tech .chev { transition: transform .15s; }
                details.tech[open] .chev { transform: rotate(90deg); }
            `}</style>

            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-end justify-between flex-shrink-0">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{subtitle}</p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>Suivi GPS</h2>
                </div>
                <div className="flex items-center gap-3">
                    {!fleetOpen && (
                        <button
                            onClick={() => setFleetOpen(true)}
                            className="card rounded-token shadow-l1 w-10 h-10 flex items-center justify-center hover:opacity-80"
                            title="Afficher la flotte"
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--on-surface-variant)' }}>format_list_bulleted</span>
                        </button>
                    )}
                    <span className="badge" style={{ background: 'var(--success-bg)', color: '#166534' }}>
                        <span className="badge-dot pulse" style={{ background: 'var(--success)' }}></span>
                        {movingCount} en mouvement
                    </span>
                    <span className="badge" style={{ background: '#F1F5F9', color: '#64748B' }}>
                        <span className="badge-dot" style={{ background: '#64748B' }}></span>
                        {offlineCount} hors ligne
                    </span>
                </div>
            </div>

            {/* Content grid */}
            <div className="flex-1 min-h-0 grid grid-cols-3 gap-6 px-8 pb-8">
                {/* LEFT: fleet panel (list <-> detail) */}
                {fleetOpen && (
                    <div className="card rounded-token shadow-l1 overflow-hidden flex flex-col min-h-0">
                        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--stroke)' }}>
                            <h3 className="font-bold text-[15px]" style={{ color: 'var(--on-surface)' }}>
                                Flotte <span className="font-semibold text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>· {vehicles.length} véh.</span>
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--slate-bg)' }}>
                                    <div className={`toggle-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</div>
                                    <div className={`toggle-tab ${view === 'detail' ? 'active' : ''}`} onClick={() => setView('detail')}>Détail</div>
                                </div>
                                <button
                                    onClick={() => setFleetOpen(false)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                                    style={{ color: 'var(--on-surface-variant)' }}
                                    title="Réduire la liste"
                                >
                                    <span className="material-symbols-outlined text-base">chevron_left</span>
                                </button>
                            </div>
                        </div>

                        {/* LIST VIEW */}
                        {view === 'list' && (
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                <div className="px-4 pt-4 pb-2 relative flex-shrink-0">
                                    <span className="material-symbols-outlined absolute left-7 top-[26px] text-[18px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>search</span>
                                    <input
                                        className="input"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Rechercher un véhicule…"
                                        style={{ paddingLeft: 36, fontSize: 13 }}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1" ref={scrollRef}>
                                    {loading && Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-token animate-pulse" style={{ background: 'var(--slate-bg)' }}>
                                            <div className="w-11 h-11 rounded-full" style={{ background: 'var(--stroke)' }}></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 w-24 rounded" style={{ background: 'var(--stroke)' }}></div>
                                                <div className="h-2.5 w-16 rounded" style={{ background: 'var(--stroke)' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                    {!loading && filtered.length === 0 && (
                                        <p className="text-[12.5px] font-semibold text-center pt-6" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                            Aucun véhicule trouvé
                                        </p>
                                    )}
                                    {!loading && filtered.map((v) => {
                                        const active = selectedId === v.id;
                                        const status = deriveStatus(v);
                                        return (
                                            <div key={v.id} className={`veh-row ${active ? 'selected' : ''}`} onClick={() => { setSelectedId(v.id); setView('detail'); }}>
                                                <div className="thumb overflow-hidden" style={{ background: status.bg }}>
                                                    {resolveImage(v.image) ? (
                                                        <img src={resolveImage(v.image)} alt={`${v.marque_name || 'Véhicule'} ${v.modele_name || ''}`} className="w-full h-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[20px]" style={{ color: status.color }}>directions_car</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13.5px] font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                                                        {v.marque_name || 'Véhicule'} {v.modele_name || ''}
                                                    </p>
                                                    <p className="text-[11px] mono" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{v.matricule}</p>
                                                    <span className="badge mt-1" style={{ background: status.bg, color: status.text, padding: '2px 8px 2px 6px' }}>
                                                        <span className={`badge-dot ${status.moving ? 'pulse' : ''}`} style={{ background: status.dotBg }}></span>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                {v.position?.speed_kph != null && (
                                                    <span className="text-[12px] font-bold mono flex-shrink-0" style={{ color: status.color }}>
                                                        {Math.round(v.position.speed_kph)} km/h
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* DETAIL VIEW */}
                        {view === 'detail' && (
                            <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
                                {!selected ? (
                                    <div className="px-5 py-10 text-center">
                                        <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                            Sélectionnez un véhicule dans la liste pour voir ses détails
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="px-5 pt-4">
                                            <button className="flex items-center gap-1 text-[12px] font-semibold hover:opacity-70" style={{ color: 'var(--on-surface-variant)' }} onClick={() => setView('list')}>
                                                <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour à la liste
                                            </button>
                                        </div>

                                        <div className="mx-5 mt-3 rounded-token overflow-hidden relative" style={{ border: '1px solid var(--stroke)' }}>
                                            <div className="h-[120px] flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#EEF1FD,#DCE3FA)' }}>
                                                {resolveImage(selected.image) ? (
                                                    <img src={resolveImage(selected.image)} alt={selected.marque_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined" style={{ fontSize: 52, color: 'var(--primary-container)', opacity: 0.8 }}>directions_car</span>
                                                )}
                                            </div>
                                            {(() => {
                                                const status = deriveStatus(selected);
                                                return (
                                                    <span className="badge absolute left-3 bottom-3" style={{ background: 'rgba(255,255,255,.95)', color: status.text }}>
                                                        <span className={`badge-dot ${status.moving ? 'pulse' : ''}`} style={{ background: status.dotBg }}></span>
                                                        {status.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-start justify-between px-5 mt-4">
                                            <div>
                                                <h4 className="font-bold text-[18px]" style={{ color: 'var(--on-surface)' }}>{selected.marque_name} {selected.modele_name}</h4>
                                                <p className="text-[12px] mono mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{selected.matricule}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[18px] mono" style={{ color: deriveStatus(selected).color }}>
                                                    {selected.position?.speed_kph != null ? Math.round(selected.position.speed_kph) : '--'}
                                                </p>
                                                <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>km/h</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 px-5 mt-4">
                                            <div className="stat-tile">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>local_gas_station</span>
                                                    <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Carburant</span>
                                                </div>
                                                <p className="text-[13px] font-bold mt-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                                                    {selected.position?.fuel_level != null ? `${Math.round(selected.position.fuel_level)} %` : 'Non renseigné'}
                                                </p>
                                            </div>
                                            <div className="stat-tile">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>speed</span>
                                                    <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Kilométrage</span>
                                                </div>
                                                <p className="text-[15px] font-bold mono mt-2" style={{ color: 'var(--on-surface)' }}>
                                                    {formatKm(selected.position?.odometer)} <span className="text-[11px] font-semibold" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>km</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="stat-tile mx-5 mt-3">
                                            <div className="flex items-start gap-3">
                                                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>pin_drop</span>
                                                <div className="min-w-0">
                                                    <p className="text-[12.5px] font-bold" style={{ color: 'var(--on-surface)' }}>
                                                        {selected.position?.address || (selected.position ? `${selected.position.latitude?.toFixed(5)}, ${selected.position.longitude?.toFixed(5)}` : 'Aucune position')}
                                                    </p>
                                                    {selected.position && (
                                                        <p className="text-[10.5px] mono mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                                                            {selected.position.latitude?.toFixed(5)}, {selected.position.longitude?.toFixed(5)}
                                                        </p>
                                                    )}
                                                    <p className="text-[10.5px] mt-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                                                        Mis à jour : {formatTime(selected.position?.fixTime)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <details className="tech mx-5 mt-4 mb-5 pt-3" style={{ borderTop: '1px solid var(--stroke)' }}>
                                            <summary className="flex items-center justify-between">
                                                <span className="text-[12px] font-bold" style={{ color: 'var(--on-surface-variant)' }}>Détails techniques du boîtier</span>
                                                <span className="material-symbols-outlined chev text-[16px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>chevron_right</span>
                                            </summary>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                {selected.traccar_device_id != null && (
                                                    <div>
                                                        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>Dispositif</p>
                                                        <p className="text-[12px] font-bold mono mt-0.5">#{selected.traccar_device_id}</p>
                                                    </div>
                                                )}
                                                {selected.gps_imei && (
                                                    <div>
                                                        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>ID / IMEI</p>
                                                        <p className="text-[12px] font-bold mono mt-0.5">{selected.gps_imei}</p>
                                                    </div>
                                                )}
                                                {selected.sim_number && (
                                                    <div>
                                                        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>Carte SIM</p>
                                                        <p className="text-[12px] font-bold mono mt-0.5">{selected.sim_number}</p>
                                                    </div>
                                                )}
                                                {selected.sim_operator && (
                                                    <div>
                                                        <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>Opérateur</p>
                                                        <p className="text-[12px] font-bold mono mt-0.5">{selected.sim_operator}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {routeLoading && <p className="text-[12px] mt-4" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Chargement de l'historique…</p>}
                                            {route && !routeLoading && (
                                                <p className="text-[12px] font-semibold mt-4" style={{ color: 'var(--primary-container)' }}>
                                                    Trajet des dernières 24h affiché sur la carte ({route.length} points)
                                                </p>
                                            )}
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    onClick={showHistory}
                                                    disabled={!selected.traccar_device_id}
                                                    className="flex-1 py-2.5 rounded-token text-[12px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                                    style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)', color: 'var(--secondary)' }}
                                                >
                                                    Historique du trajet
                                                </button>
                                                <button
                                                    onClick={() => selected?.position && map.current?.flyTo([selected.position.latitude, selected.position.longitude], 16, { duration: 0.8 })}
                                                    className="flex-1 py-2.5 rounded-token text-[12px] font-bold text-white"
                                                    style={{ background: 'var(--primary-container)' }}
                                                >
                                                    Centrer sur la carte
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => selected?.position && map.current?.flyTo([selected.position.latitude, selected.position.longitude], 16, { duration: 0.8 })}
                                                    className="flex-1 py-2 rounded-token text-[11.5px] font-bold"
                                                    style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)', color: 'var(--secondary)' }}
                                                >
                                                    Suivi en Direct
                                                </button>
                                                <button
                                                    onClick={() => map.current?.setView(MOROCCO, 6)}
                                                    className="flex-1 py-2 rounded-token text-[11.5px] font-bold"
                                                    style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)', color: 'var(--secondary)' }}
                                                >
                                                    Recentrer la carte
                                                </button>
                                            </div>

                                            {commands.length > 0 && (
                                                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--stroke)' }}>
                                                    <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--on-surface-variant)' }}>Commandes du boîtier</p>
                                                    <div className="flex flex-col gap-2">
                                                        {commands.map((t) => {
                                                            const meta = COMMAND_LABELS[t] || { label: t, icon: 'terminal' };
                                                            return (
                                                                <button
                                                                    key={t}
                                                                    disabled={commandLoading}
                                                                    onClick={() => sendCommand(t)}
                                                                    className="flex items-center justify-center gap-2 py-2.5 rounded-token text-[12px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    style={
                                                                        meta.danger
                                                                            ? { background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C' }
                                                                            : { background: 'var(--slate-bg)', border: '1px solid var(--stroke)', color: 'var(--secondary)' }
                                                                    }
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                                                                    {meta.label}
                                                                </button>
                                                            );
                                                        })}
                                                        {commands.includes('custom') && (
                                                            <div className="flex gap-2 mt-1">
                                                                <input
                                                                    className="input"
                                                                    placeholder="Données custom (ex: hex)"
                                                                    value={customCommand}
                                                                    onChange={(e) => setCustomCommand(e.target.value)}
                                                                    style={{ fontSize: 12 }}
                                                                />
                                                                <button
                                                                    disabled={commandLoading || !customCommand.trim()}
                                                                    onClick={() => sendCommand('custom', { data: customCommand.trim() })}
                                                                    className="px-4 py-2 rounded-token text-[12px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                                                    style={{ background: 'var(--primary-container)' }}
                                                                >
                                                                    Envoyer
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {commandLoading && (
                                                        <p className="text-[11.5px] mt-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                            Envoi de la commande en cours…
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </details>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* RIGHT: map */}
                <div className={`card rounded-token shadow-l1 overflow-hidden relative min-h-0 ${fleetOpen ? 'col-span-2' : 'col-span-3'}`}>
                    {/* Vraie carte (z-0 confine les calques Leaflet sous les panneaux) */}
                    <div className="absolute inset-0 z-0" ref={mapRef} data-location="map-traccar" />

                    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                        <div className="card rounded-token shadow-l1 px-3 py-2 flex items-center gap-4 text-[11.5px] font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
                            <span className="flex items-center gap-1.5"><span className="badge-dot" style={{ background: 'var(--success)' }}></span>En mouvement</span>
                            <span className="flex items-center gap-1.5"><span className="badge-dot" style={{ background: '#D97706' }}></span>À l'arrêt</span>
                            <span className="flex items-center gap-1.5"><span className="badge-dot" style={{ background: '#64748B' }}></span>Hors ligne</span>
                        </div>
                        <button
                            onClick={() => map.current?.setView(MOROCCO, 6)}
                            className="card rounded-token shadow-l1 w-9 h-9 flex items-center justify-center hover:opacity-80"
                            title="Recentrer sur le Maroc"
                        >
                            <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--on-surface-variant)' }}>my_location</span>
                        </button>
                    </div>

                    {!tracking && !loading && (
                        <div
                            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-[12.5px] font-semibold px-4 py-2.5 rounded-token shadow-l1 whitespace-nowrap"
                            style={{ background: 'var(--warning-bg)', border: '1px solid #FCD34D', color: 'var(--warning)' }}
                        >
                            Suivi GPS non configuré — connectez votre compte Traccar dans les Paramètres de l'agence.
                        </div>
                    )}

                    {vehicles.length === 0 && !loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <div className="card rounded-token shadow-l1 px-6 py-4 text-center">
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Aucun véhicule dans la flotte</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center">
                            <div className="card rounded-token shadow-l1 px-6 py-4 text-center">
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface-variant)' }}>Chargement des positions…</p>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-4 right-16 text-[10.5px] px-2.5 py-1 rounded-token z-10" style={{ background: 'rgba(255,255,255,.85)', color: 'var(--on-surface-variant)' }}>
                        Fond de carte OpenStreetMap
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GpsTracking;
