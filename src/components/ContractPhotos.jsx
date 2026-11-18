import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Dropdown from './Dropdown';
import { apiErrorText } from '../utils/apiErrorText';
import { optimizeImageFile } from '../utils/imageUtils';
import { useI18n } from '../i18n/context';

const KINDS = [
    { value: 'DEPART', labelKey: 'u.dpart' },
    { value: 'RETOUR', labelKey: 'u.retour' },
    { value: 'DOMMAGE', labelKey: 'u.dommage' },
];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Photos d'état des lieux d'un contrat (départ, retour, dommages).
 * Envoi multipart vers /api/contract-photos/ ; 40 photos maximum par contrat.
 */
const ContractPhotos = ({ contractId, locked = false }) => {
    const { t } = useI18n();
    const [photos, setPhotos] = useState([]);
    const kindOptions = KINDS.map((k) => ({ value: k.value, label: t(k.labelKey) }));
    const KIND_LABEL = Object.fromEntries(kindOptions.map((k) => [k.value, k.label]));
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [kind, setKind] = useState('DEPART');
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('contract-photos/', { params: { contract: contractId } });
            setPhotos(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            toast.error(apiErrorText(err, t('u.impossible_de_charger_les_photos')));
        } finally {
            setLoading(false);
        }
    }, [contractId, t]);

    useEffect(() => { load(); }, [load]);

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error(t('u.le_fichier_doit_tre_une_image'));
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error(t('u.image_trop_volumineuse_10_mo_max'));
            return;
        }
        setUploading(true);
        try {
            // Réduit les photos de téléphone (plusieurs Mo) avant l'envoi quand c'est possible
            let toSend = file;
            try { toSend = (await optimizeImageFile(file)) || file; } catch { toSend = file; }
            const form = new FormData();
            form.append('contract', String(contractId));
            form.append('kind', kind);
            form.append('image', toSend, toSend.name || file.name);
            await api.post('contract-photos/', form);
            toast.success(t('u.photo_ajoute'));
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, t('u.chec_de_l_envoi_de_la_photo')));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (photo) => {
        const confirmed = await messageBox.ask(t('u.supprimer_cette_photo'), t('u.supprimer_la_photo_2'), {
            destructive: true,
            confirmText: t('clients.menu.delete'),
        });
        if (!confirmed) return;
        try {
            await api.delete(`contract-photos/${photo.id}/`);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            toast.success(t('u.photo_supprime'));
        } catch (err) {
            toast.error(apiErrorText(err, t('u.suppression_impossible')));
        }
    };

    return (
        <section aria-labelledby="contract-photos-title" className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                <h3 id="contract-photos-title" className="text-xs font-bold uppercase text-slate-500">
                    {t('u.photos_de_l_tat_des_lieux')}
                </h3>
                <span className="text-xs text-slate-500">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
            </div>

            {!locked && (
                <div className="p-4 flex flex-wrap items-end gap-3 border-b border-slate-100">
                    <div className="w-44">
                        <p className="label mb-1.5">{t('u.type_de_photo')}</p>
                        <Dropdown options={kindOptions} value={kind} onChange={(v) => setKind(v || 'DEPART')} />
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        aria-label={t('u.choisir_une_photo')}
                        onChange={handleFile}
                    />
                    <Button size="sm" icon="add_a_photo" loading={uploading} onClick={() => fileRef.current?.click()}>
                        {t('u.ajouter_une_photo')}
                    </Button>
                </div>
            )}

            <div className="p-4">
                {loading ? (
                    <p className="text-sm text-slate-500" role="status">{t('u.chargement')}</p>
                ) : photos.length === 0 ? (
                    <p className="text-sm text-slate-500">{t('u.aucune_photo_pour_ce_contrat')}</p>
                ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {photos.map((photo) => (
                            <li key={photo.id} className="relative rounded-lg overflow-hidden border border-slate-200">
                                <a href={photo.image} target="_blank" rel="noreferrer">
                                    <img
                                        src={photo.image}
                                        alt={photo.caption || t('u.photo', { kind: KIND_LABEL[photo.kind] || '' }).trim()}
                                        loading="lazy"
                                        className="w-full h-28 object-cover"
                                    />
                                </a>
                                <p className="px-2 py-1 text-[11px] font-semibold text-slate-600">{KIND_LABEL[photo.kind] || photo.kind}</p>
                                {!locked && (
                                    <Button variant="ghost" size="sm" iconOnly icon="delete" className="!text-danger" onClick={() => handleDelete(photo)} aria-label={t('u.supprimer_la_photo', { kind: KIND_LABEL[photo.kind] || '' }).trim()} />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default ContractPhotos;
