import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Dropdown from './Dropdown';
import { apiErrorText } from '../utils/apiErrorText';
import { optimizeImageFile } from '../utils/imageUtils';

const KINDS = [
    { value: 'DEPART', label: 'Départ' },
    { value: 'RETOUR', label: 'Retour' },
    { value: 'DOMMAGE', label: 'Dommage' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Photos d'état des lieux d'un contrat (départ, retour, dommages).
 * Envoi multipart vers /api/contract-photos/ ; 40 photos maximum par contrat.
 */
const ContractPhotos = ({ contractId, locked = false }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [kind, setKind] = useState('DEPART');
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('contract-photos/', { params: { contract: contractId } });
            setPhotos(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            toast.error(apiErrorText(err, 'Impossible de charger les photos.'));
        } finally {
            setLoading(false);
        }
    }, [contractId]);

    useEffect(() => { load(); }, [load]);

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Le fichier doit être une image.');
            return;
        }
        if (file.size > MAX_BYTES) {
            toast.error('Image trop volumineuse (10 Mo maximum).');
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
            toast.success('Photo ajoutée.');
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, "Échec de l'envoi de la photo."));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (photo) => {
        const confirmed = await messageBox.ask('Supprimer cette photo ?', 'Supprimer la photo', {
            destructive: true,
            confirmText: 'Supprimer',
        });
        if (!confirmed) return;
        try {
            await api.delete(`contract-photos/${photo.id}/`);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            toast.success('Photo supprimée.');
        } catch (err) {
            toast.error(apiErrorText(err, 'Suppression impossible.'));
        }
    };

    return (
        <section aria-labelledby="contract-photos-title" className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                <h3 id="contract-photos-title" className="text-xs font-bold uppercase text-slate-500">
                    Photos de l'état des lieux
                </h3>
                <span className="text-xs text-slate-500">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
            </div>

            {!locked && (
                <div className="p-4 flex flex-wrap items-end gap-3 border-b border-slate-100">
                    <div className="w-44">
                        <p className="label mb-1.5">Type de photo</p>
                        <Dropdown options={KINDS} value={kind} onChange={(v) => setKind(v || 'DEPART')} />
                    </div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        aria-label="Choisir une photo"
                        onChange={handleFile}
                    />
                    <Button size="sm" icon="add_a_photo" loading={uploading} onClick={() => fileRef.current?.click()}>
                        Ajouter une photo
                    </Button>
                </div>
            )}

            <div className="p-4">
                {loading ? (
                    <p className="text-sm text-slate-500" role="status">Chargement…</p>
                ) : photos.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune photo pour ce contrat.</p>
                ) : (
                    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {photos.map((photo) => (
                            <li key={photo.id} className="relative rounded-lg overflow-hidden border border-slate-200">
                                <a href={photo.image} target="_blank" rel="noreferrer">
                                    <img
                                        src={photo.image}
                                        alt={photo.caption || `Photo ${KIND_LABEL[photo.kind] || ''}`.trim()}
                                        loading="lazy"
                                        className="w-full h-28 object-cover"
                                    />
                                </a>
                                <p className="px-2 py-1 text-[11px] font-semibold text-slate-600">{KIND_LABEL[photo.kind] || photo.kind}</p>
                                {!locked && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(photo)}
                                        aria-label={`Supprimer la photo ${KIND_LABEL[photo.kind] || ''}`.trim()}
                                        className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-danger shadow"
                                    >
                                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                                    </button>
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
