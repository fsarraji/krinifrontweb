import React, { useCallback, useEffect, useState } from 'react';
import Card from './ui/Card';
import { Switch } from '@astryxdesign/core';
import { Input } from './ui/Input';
import Field from './ui/Field';
import Button from './ui/Button';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { apiErrorText, fieldErrors } from '../utils/apiErrorText';
import { useI18n } from '../i18n/context';

const EMPTY = { name: '', latitude: '', longitude: '', radius_km: '25' };

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
    const { t } = useI18n();
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
            toast.error(apiErrorText(err, t('u.impossible_de_charger_les_zones_')));
        } finally {
            setLoading(false);
        }
    }, [t]);

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
        if (!draft.name.trim()) next.name = t('u.le_nom_est_obligatoire');
        const lat = Number(draft.latitude);
        const lon = Number(draft.longitude);
        const km = Number(draft.radius_km);
        if (draft.latitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) next.latitude = t('u.latitude_entre_90_et_90');
        if (draft.longitude === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) next.longitude = t('u.longitude_entre_180_et_180');
        if (!Number.isFinite(km) || km < 0.05 || km > 2000) next.radius_m = t('u.rayon_entre_0_05_km_et_2000_km');
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
            toast.success(t('u.zone_ajoute'));
            setDraft(EMPTY);
            setErrors({});
            setOutside(null);
            await load();
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            if (Object.keys(byField).length === 0) toast.error(apiErrorText(err, t('u.erreur_lors_de_l_ajout_de_la_zon')));
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
            toast.error(apiErrorText(err, t('u.mise_jour_impossible')));
        }
    };

    const handleDelete = async (zone) => {
        const confirmed = await messageBox.ask(t('u.supprimer_la_zone', { name: zone.name }), t('u.supprimer_la_zone_3'), {
            destructive: true,
            confirmText: t('clients.menu.delete'),
        });
        if (!confirmed) return;
        try {
            await api.delete(`geofences/${zone.id}/`);
            toast.success(t('u.zone_supprime'));
            setOutside(null);
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, t('u.suppression_impossible')));
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
        <Card padding={0} variant="default" aria-labelledby="geofence-title">
            <div className="p-6 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
                <h2 id="geofence-title" className="text-xl font-extrabold font-headline text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">share_location</span>
                    {t('u.zones_autorises_goreprage')}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {t('u.une_alerte_est_cre_lorsqu_un_vhi')}
                    {!canEdit && <span className="font-bold text-danger ms-1">{t('u.seul_le_propritaire_peut_modifie')}</span>}
                </p>
            </div>

            <div className="p-6 space-y-5">
                {loading ? (
                    <p className="text-sm text-slate-500" role="status">{t('u.chargement')}</p>
                ) : zones.length === 0 ? (
                    <p className="text-sm text-slate-500">{t('u.aucune_zone_dfinie_les_vhicules_')}</p>
                ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                        {zones.map((zone) => (
                            <li key={zone.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{zone.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} · {t('u.rayon', { radius: formatKm(zone.radius_m) })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch label={t('u.active')} value={zone.is_active} isDisabled={!canEdit} onChange={() => toggleActive(zone)} size="sm" />
                                    {canEdit && (
                                        <Button variant="ghost" iconOnly icon="delete" className="!text-danger" onClick={() => handleDelete(zone)} aria-label={t('u.supprimer_la_zone_2', { name: zone.name })} />
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {canEdit && (
                    <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 items-start" onKeyDown={onEnter}>
                        <Field label={t('u.nom')} error={errors.name} className="col-span-2 lg:col-span-4">
                            <Input value={draft.name} onChange={set('name')} placeholder={t('u.ex_casablanca')} />
                        </Field>
                        <Field label={t('u.latitude')} error={errors.latitude} className="lg:col-span-2">
                            <Input inputMode="decimal" value={draft.latitude} onChange={set('latitude')} placeholder="33.5731" />
                        </Field>
                        <Field label={t('u.longitude')} error={errors.longitude} className="lg:col-span-2">
                            <Input inputMode="decimal" value={draft.longitude} onChange={set('longitude')} placeholder="-7.5898" />
                        </Field>
                        <Field label={t('u.rayon_km')} error={errors.radius_m} className="lg:col-span-2">
                            <Input inputMode="decimal" value={draft.radius_km} onChange={set('radius_km')} />
                        </Field>
                        <div className="col-span-2 lg:col-span-2 lg:pt-6">
                            <Button onClick={handleAdd} disabled={saving} className="w-full">
                                {saving ? t('u.ajout') : t('u.ajouter_la_zone')}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                    <Button variant="ghost" icon="fact_check" onClick={checkNow} disabled={activeCount === 0}>{t('u.vrifier_maintenant_les_vhicules_')}</Button>
                    {outside !== null && (
                        <div className="mt-3" role="status">
                            {outside.length === 0 ? (
                                <p className="text-sm text-success font-semibold">{t('u.tous_les_vhicules_lous_suivis_pa')}</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {outside.map((v) => (
                                        <li key={v.contract_id} className="text-sm text-danger-dark bg-danger-bg rounded-lg px-3 py-2">
                                            <strong>{v.matricule}</strong> {t('u.contrat_de_la_zone', { id: v.contract_id, client: v.client, distance: formatKm(v.distance_outside_m), zone: v.nearest_zone })}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default GeofenceManager;
