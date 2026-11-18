import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { apiErrorText, fieldErrors } from '../utils/apiErrorText';

const EMPTY = { name: '', latitude: '', longitude: '', radius_km: '25' };

const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none disabled:bg-slate-50 disabled:text-slate-500';

const formatKm = (meters) => {
    const km = meters / 1000;
    return `${km >= 100 ? Math.round(km) : km.toFixed(1)} km`;
};

/**
 * Zones autorisées (géorepérage) : cercle (centre + rayon). Une alerte « Hors zone autorisée »
 * est créée quand un véhicule loué sort de toutes les zones actives (contrôle périodique).
 * Aucune zone active = aucun contrôle. Modification réservée au gérant.
 *
 * N'utilise pas <form> : ce composant est affiché à l'intérieur d'un formulaire.
 */
const GeofenceManager = ({ canEdit }) => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [outside, setOutside] = useState(null);
    const [draft, setDraft] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('geofences/');
            setZones(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            toast.error(apiErrorText(err, 'Impossible de charger les zones autorisées.'));
        } finally {
            setLoading(false);
        }
    }, []);

    const checkNow = useCallback(async () => {
        try {
            const { data } = await api.get('geofences/status/');
            setOutside(data.outside || []);
        } catch {
            setOutside(null); // GPS indisponible : pas d'état affiché
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const set = (key) => (e) => {
        setDraft((prev) => ({ ...prev, [key]: e.target.value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!draft.name.trim()) next.name = 'Le nom est obligatoire.';
        const lat = Number(draft.latitude);
        const lon = Number(draft.longitude);
        const km = Number(draft.radius_km);
        if (draft.latitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) next.latitude = 'Latitude entre -90 et 90.';
        if (draft.longitude === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) next.longitude = 'Longitude entre -180 et 180.';
        if (!Number.isFinite(km) || km < 0.05 || km > 2000) next.radius_m = 'Rayon entre 0,05 km et 2000 km.';
        return next;
    };

    const handleAdd = async () => {
        const local = validate();
        if (Object.keys(local).length) {
            setErrors(local);
            return;
        }
        setSaving(true);
        try {
            await api.post('geofences/', {
                name: draft.name.trim(),
                latitude: Number(draft.latitude),
                longitude: Number(draft.longitude),
                radius_m: Math.round(Number(draft.radius_km) * 1000),
                is_active: true,
            });
            toast.success('Zone ajoutée.');
            setDraft(EMPTY);
            setErrors({});
            setOutside(null);
            await load();
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            if (Object.keys(byField).length === 0) toast.error(apiErrorText(err, "Erreur lors de l'ajout de la zone."));
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (zone) => {
        try {
            await api.patch(`geofences/${zone.id}/`, { is_active: !zone.is_active });
            setOutside(null);
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, 'Mise à jour impossible.'));
        }
    };

    const handleDelete = async (zone) => {
        const confirmed = await messageBox.ask(`Supprimer la zone « ${zone.name} » ?`, 'Supprimer la zone', {
            destructive: true,
            confirmText: 'Supprimer',
        });
        if (!confirmed) return;
        try {
            await api.delete(`geofences/${zone.id}/`);
            toast.success('Zone supprimée.');
            setOutside(null);
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, 'Suppression impossible.'));
        }
    };

    const onEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // évite de soumettre le formulaire parent
            handleAdd();
        }
    };

    const activeCount = zones.filter((z) => z.is_active).length;

    return (
        <section aria-labelledby="geofence-title" className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
                <h2 id="geofence-title" className="text-xl font-extrabold font-headline text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">share_location</span>
                    Zones autorisées (géorepérage)
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Une alerte est créée lorsqu'un véhicule loué sort de toutes les zones actives. Sans zone active, aucun contrôle.
                    {!canEdit && <span className="font-bold text-danger ml-1">(Seul le propriétaire peut modifier)</span>}
                </p>
            </div>

            <div className="p-6 space-y-5">
                {loading ? (
                    <p className="text-sm text-slate-500" role="status">Chargement…</p>
                ) : zones.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune zone définie : les véhicules loués ne sont pas contrôlés.</p>
                ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                        {zones.map((zone) => (
                            <li key={zone.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{zone.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} · rayon {formatKm(zone.radius_m)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={zone.is_active}
                                            disabled={!canEdit}
                                            onChange={() => toggleActive(zone)}
                                        />
                                        Active
                                    </label>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(zone)}
                                            aria-label={`Supprimer la zone ${zone.name}`}
                                            className="p-1.5 rounded-lg text-danger hover:bg-danger-bg/50"
                                        >
                                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {canEdit && (
                    <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-start" onKeyDown={onEnter}>
                        <div className="col-span-2 lg:col-span-4">
                            <label htmlFor="gf-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nom</label>
                            <input id="gf-name" className={inputClass} value={draft.name} onChange={set('name')} placeholder="Ex : Casablanca" aria-invalid={Boolean(errors.name)} />
                            {errors.name && <p role="alert" className="text-xs text-danger mt-1">{errors.name}</p>}
                        </div>
                        <div className="lg:col-span-2">
                            <label htmlFor="gf-lat" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Latitude</label>
                            <input id="gf-lat" className={inputClass} inputMode="decimal" value={draft.latitude} onChange={set('latitude')} placeholder="33.5731" aria-invalid={Boolean(errors.latitude)} />
                            {errors.latitude && <p role="alert" className="text-xs text-danger mt-1">{errors.latitude}</p>}
                        </div>
                        <div className="lg:col-span-2">
                            <label htmlFor="gf-lon" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Longitude</label>
                            <input id="gf-lon" className={inputClass} inputMode="decimal" value={draft.longitude} onChange={set('longitude')} placeholder="-7.5898" aria-invalid={Boolean(errors.longitude)} />
                            {errors.longitude && <p role="alert" className="text-xs text-danger mt-1">{errors.longitude}</p>}
                        </div>
                        <div className="lg:col-span-2">
                            <label htmlFor="gf-radius" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Rayon (km)</label>
                            <input id="gf-radius" className={inputClass} inputMode="decimal" value={draft.radius_km} onChange={set('radius_km')} aria-invalid={Boolean(errors.radius_m)} />
                            {errors.radius_m && <p role="alert" className="text-xs text-danger mt-1">{errors.radius_m}</p>}
                        </div>
                        <div className="col-span-2 lg:col-span-2 lg:pt-7">
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={saving}
                                className="w-full px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {saving ? 'Ajout…' : 'Ajouter la zone'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={checkNow}
                        disabled={activeCount === 0}
                        className="text-sm font-semibold text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
                    >
                        Vérifier maintenant les véhicules loués
                    </button>
                    {outside !== null && (
                        <div className="mt-3" role="status">
                            {outside.length === 0 ? (
                                <p className="text-sm text-success font-semibold">Tous les véhicules loués suivis par GPS sont dans une zone autorisée.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {outside.map((v) => (
                                        <li key={v.contract_id} className="text-sm text-danger-dark bg-danger-bg rounded-lg px-3 py-2">
                                            <strong>{v.matricule}</strong> (contrat #{v.contract_id}, {v.client}) : à {formatKm(v.distance_outside_m)} de la zone « {v.nearest_zone} ».
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default GeofenceManager;
