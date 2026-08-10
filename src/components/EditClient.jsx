import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { SEXE_OPTIONS, NATIONALITES, cinLabelFor } from '../utils/clientConstants';
import { optimizeImageFile } from '../utils/imageUtils';

const EditClient = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        pays: '',
        sexe: '',
        nationalite: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: '',
        liste_noire: false
    });
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [files, setFiles] = useState({ scan_cin: null, scan_permis: null });
    const [uniqueErrors, setUniqueErrors] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

    const REQUIRED_FIELDS = [
        { key: 'prenom', label: 'Prénom', check: () => !formData.prenom },
        { key: 'nom', label: 'Nom', check: () => !formData.nom },
        { key: 'cin_passport', label: 'CIN / Passeport', check: () => !formData.cin_passport },
        { key: 'telephone', label: 'Téléphone', check: () => !formData.telephone },
        { key: 'adresse', label: 'Adresse', check: () => !formData.adresse },
        { key: 'permis_conduite', label: 'N° de permis', check: () => !formData.permis_conduite },
    ];

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? 'Champ requis' : '');

    const UNIQUE_FIELDS = {
        cin_passport: 'CIN/passeport',
        email: 'email',
        telephone: 'téléphone',
        permis_conduite: 'permis de conduire',
    };

    const checkUnique = async (field, value) => {
        if (!value || !value.trim()) {
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
            return;
        }
        try {
            const res = await api.get('clients/check-unique/', {
                params: { field, value: value.trim(), exclude_id: id }
            });
            setUniqueErrors(prev => ({
                ...prev,
                [field]: res.data.available === false
                    ? `Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.`
                    : false
            }));
        } catch (err) {
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientRes, contractsRes] = await Promise.all([
                    api.get(`clients/${id}/`),
                    api.get('contracts/')
                ]);
                
                setFormData(clientRes.data);
                
                // Filter contracts for this client
                const clientContracts = contractsRes.data.filter(c => c.client === parseInt(id));
                setContracts(clientContracts);
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching client data:", err);
                setError("Une erreur est survenue lors de la récupération des données.");
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (uniqueErrors[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
        }
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const handleFileChange = async (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles.length > 0) {
            const optimized = await optimizeImageFile(selectedFiles[0]);
            setFiles(prev => ({ ...prev, [name]: optimized }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const missing = REQUIRED_FIELDS.filter((f) => f.check());
        if (missing.length > 0) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                missing.forEach((f) => { next[f.key] = true; });
                return next;
            });
            toast.error(`Champs requis manquants : ${missing.map((m) => m.label).join(', ')}`);
            return;
        }

        // Vérifier une dernière fois les champs uniques avant enregistrement
        for (const field of Object.keys(UNIQUE_FIELDS)) {
            const val = formData[field];
            if (val && val.trim()) {
                try {
                    const res = await api.get('clients/check-unique/', { params: { field, value: val.trim(), exclude_id: id } });
                    if (res.data.available === false) {
                        setUniqueErrors(prev => ({ ...prev, [field]: `Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.` }));
                        toast.error(`Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.`);
                        return;
                    }
                } catch (err) {
                    console.error("Erreur vérification unicité", err);
                }
            }
        }

        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                // Ignore file URL fields when sending back, only send new files if selected
                if (key !== 'scan_cin' && key !== 'scan_permis') {
                    if (formData[key] !== null && formData[key] !== undefined) {
                        data.append(key, typeof formData[key] === 'boolean' ? (formData[key] ? 'true' : 'false') : formData[key]);
                    }
                }
            });
            if (files.scan_cin) data.append('scan_cin', files.scan_cin);
            if (files.scan_permis) data.append('scan_permis', files.scan_permis);

            await api.patch(`clients/${id}/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Client mis à jour avec succès.');
            navigate('/clients');
        } catch (err) {
            console.error("Error updating client:", err);
            setError("Erreur lors de la sauvegarde.");
            setSaving(false);
        }
    };

    const handleDelete = () => {
        messageBox.danger("Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.", "Supprimer le client", {
            onConfirm: async () => {
                try {
                    await api.delete(`clients/${id}/`);
                    toast.success('Client supprimé avec succès.');
                    navigate('/clients');
                } catch (err) {
                    console.error("Error deleting client:", err);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) return <div className="p-8 text-center font-bold" style={{ color: 'var(--primary-container)' }}>Chargement du profil client...</div>;

    const totalSpent = contracts.reduce((sum, c) => sum + parseFloat(c.montant_total || 0), 0);
    const rentalCount = contracts.length;

    const fieldClass = (name) => `field transition-all duration-200 ${
        hasError(name)
            ? 'border-rose-400 bg-rose-50/40 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'focus:bg-white'
    }`;

    return (
        <div className="w-full px-4 py-6">
            {/* Breadcrumb + header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        <Link to="/clients" className="hover:underline">Clients</Link> / Modifier
                    </p>
                    <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        Modifier le client
                    </h1>
                    <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                        {formData.prenom} {formData.nom} — {formData.cin_passport || `${cinLabelFor(formData.nationalite)} non renseigné`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Supprimer
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/clients')}
                        className="px-5 py-2.5 rounded-lg text-[13px] font-semibold card shadow-l1"
                        style={{ color: 'var(--on-surface-variant)' }}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="client-form"
                        disabled={saving}
                        className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                        style={{ background: 'var(--primary-container)' }}
                    >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        {saving ? 'Enregistrement...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg flex items-center gap-3 font-semibold text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6 items-start">
                {/* Left Column: Form Sections */}
                <form id="client-form" onSubmit={handleSubmit} className="col-span-2 space-y-6">
                    {/* Section 1: Personal Information */}
                    <div className="card shadow-l1 p-8">
                        <div className="section-title">
                            <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                            <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Informations personnelles</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="label">Prénom</label>
                                <input name="prenom" value={formData.prenom || ''} onChange={handleChange} className={fieldClass('prenom')} type="text" />
                                {fieldErrorMsg('prenom') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('prenom')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">Nom</label>
                                <input name="nom" value={formData.nom || ''} onChange={handleChange} className={fieldClass('nom')} type="text" />
                                {fieldErrorMsg('nom') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('nom')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{cinLabelFor(formData.nationalite)}</label>
                                <input name="cin_passport" value={formData.cin_passport || ''} onChange={handleChange} onBlur={handleBlurUnique('cin_passport')} className={fieldClass('cin_passport')} type="text" />
                                {fieldErrorMsg('cin_passport') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('cin_passport')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">Adresse Email</label>
                                <input name="email" value={formData.email || ''} onChange={handleChange} onBlur={handleBlurUnique('email')} className={fieldClass('email')} type="email" />
                                {fieldErrorMsg('email') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('email')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">Numéro de Téléphone</label>
                                <input name="telephone" value={formData.telephone || ''} onChange={handleChange} onBlur={handleBlurUnique('telephone')} className={fieldClass('telephone')} type="tel" />
                                {fieldErrorMsg('telephone') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('telephone')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">Sexe</label>
                                <div className="flex gap-3">
                                    {SEXE_OPTIONS.map(opt => (
                                        <label
                                            key={opt.value}
                                            className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-all duration-200"
                                            style={{
                                                borderColor: formData.sexe === opt.value ? 'var(--primary-container)' : 'var(--stroke)',
                                                background: formData.sexe === opt.value ? 'var(--info-bg)' : 'var(--slate-bg)'
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="sexe"
                                                value={opt.value}
                                                checked={formData.sexe === opt.value}
                                                onChange={handleChange}
                                                className="accent-[var(--primary-container)]"
                                            />
                                            <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="label">Nationalité</label>
                                <select name="nationalite" value={formData.nationalite || ''} onChange={handleChange} className={fieldClass('nationalite')}>
                                    <option value="">-- Sélectionner --</option>
                                    {NATIONALITES.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Ville</label>
                                <input name="ville" value={formData.ville || ''} onChange={handleChange} className={fieldClass('ville')} type="text" />
                            </div>
                            <div>
                                <label className="label">Pays</label>
                                <input name="pays" value={formData.pays || ''} onChange={handleChange} className={fieldClass('pays')} type="text" />
                            </div>
                            <div className="col-span-2">
                                <label className="label">Adresse</label>
                                <input name="adresse" value={formData.adresse || ''} onChange={handleChange} className={fieldClass('adresse')} type="text" />
                                {fieldErrorMsg('adresse') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('adresse')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Identity Documents */}
                    <div className="card shadow-l1 p-8">
                        <div className="section-title">
                            <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                            <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Documents d'identité</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            {/* Drivers License */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>card_membership</span>
                                    <p className="text-[13px] font-bold" style={{ color: 'var(--on-surface)' }}>Permis de Conduire</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">N° de permis</label>
                                        <input name="permis_conduite" value={formData.permis_conduite || ''} onChange={handleChange} onBlur={handleBlurUnique('permis_conduite')} className={fieldClass('permis_conduite')} type="text" />
                                        {fieldErrorMsg('permis_conduite') && (
                                            <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                                <span className="material-symbols-outlined text-[13px]">error</span>
                                                {fieldErrorMsg('permis_conduite')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Date de délivrance</label>
                                        <input name="date_delivrance_permis" value={formData.date_delivrance_permis || ''} onChange={handleChange} className={fieldClass('date_delivrance_permis')} type="date" />
                                    </div>
                                    <div>
                                        <label className="label">Scan du permis</label>
                                        {formData.scan_permis && !files.scan_permis && (
                                            <a href={formData.scan_permis} target="_blank" rel="noreferrer" className="text-xs font-bold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--primary-container)' }}>
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                Voir le scan actuel
                                            </a>
                                        )}
                                        <label className="dropzone p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors">
                                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>upload_file</span>
                                            <p className="text-[11px] font-semibold text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                {files.scan_permis ? files.scan_permis.name : "Télécharger un nouveau document"}
                                            </p>
                                            <input type="file" name="scan_permis" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {/* Passport / CIN */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>public</span>
                                    <p className="text-[13px] font-bold" style={{ color: 'var(--on-surface)' }}>{cinLabelFor(formData.nationalite)}</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">N° de document</label>
                                        <input name="cin_passport" value={formData.cin_passport || ''} onChange={handleChange} className={fieldClass('cin_passport')} type="text" />
                                    </div>
                                    <div>
                                        <label className="label">Scan d'identité</label>
                                        {formData.scan_cin && !files.scan_cin && (
                                            <a href={formData.scan_cin} target="_blank" rel="noreferrer" className="text-xs font-bold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--primary-container)' }}>
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                Voir le scan actuel
                                            </a>
                                        )}
                                        <label className="dropzone p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors">
                                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>upload_file</span>
                                            <p className="text-[11px] font-semibold text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                {files.scan_cin ? files.scan_cin.name : "Télécharger un nouveau document"}
                                            </p>
                                            <input type="file" name="scan_cin" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Rental History */}
                    <div className="card shadow-l1 p-8">
                        <div className="section-title">
                            <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                            <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Historique des locations</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                        <th className="pb-4 px-2">Véhicule</th>
                                        <th className="pb-4 px-2">Période</th>
                                        <th className="pb-4 px-2 text-right">Revenu</th>
                                        <th className="pb-4 px-2 text-right">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {contracts.slice(0, 5).map(contract => (
                                        <tr key={contract.id} className="hover:bg-white transition-colors" style={{ borderTop: '1px solid var(--stroke)' }}>
                                            <td className="py-4 px-2">
                                                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{contract.vehicle_name}</span>
                                            </td>
                                            <td className="py-4 px-2">
                                                <p className="text-xs" style={{ color: 'var(--on-surface)' }}>
                                                    {contract.formatted_dates?.range || `${new Date(contract.date_sortie).toLocaleDateString()} - ${new Date(contract.date_retour_prevue).toLocaleDateString()}`}
                                                </p>
                                                <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{contract.jours} Jours</p>
                                            </td>
                                            <td className="py-4 px-2 text-right font-bold" style={{ color: 'var(--primary-container)' }}>{contract.montant_total} MAD</td>
                                            <td className="py-4 px-2 text-right">
                                                <span className="text-[10px] px-2 py-1 rounded font-bold" style={
                                                    contract.statut === 'TERMINE'
                                                        ? { background: 'var(--slate-bg)', color: 'var(--secondary)' }
                                                        : contract.statut === 'EN_COURS'
                                                            ? { background: 'var(--success-bg)', color: 'var(--success)' }
                                                            : { background: 'var(--info-bg)', color: 'var(--primary-container)' }
                                                }>
                                                    {contract.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {contracts.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center italic" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                Aucun contrat trouvé pour ce client.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                    {/* Client Profile Summary */}
                    <div className="card shadow-l1 p-6 flex flex-col items-center text-center">
                        <div className="relative mb-5">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-container)', color: '#fff' }}>
                                <span className="material-symbols-outlined text-4xl">person</span>
                            </div>
                            <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: 'var(--success)', color: '#fff' }}>
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--on-surface)' }}>{formData.prenom} {formData.nom}</h3>
                        <p className="text-xs mb-5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                            {formData.email || 'Aucun email renseigné'}
                        </p>
                        <div className="flex gap-2 mb-6">
                            <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Vérifié</span>
                            <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}>Client</span>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4 text-left border-t pt-6" style={{ borderColor: 'var(--stroke)' }}>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Total Dépensé</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--primary-container)' }}>{totalSpent.toLocaleString()} MAD</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Locations</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--on-surface)' }}>{rentalCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Points Fidélité</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--on-surface)' }}>{Math.floor(totalSpent / 100)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Profil Risque</p>
                                <p className="text-lg font-extrabold" style={{ color: formData.liste_noire ? 'var(--danger)' : 'var(--success)' }}>
                                    {formData.liste_noire ? 'Bloqué' : 'Faible'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="card shadow-l1 p-6">
                        <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>Notes de gestion interne</h3>
                        <textarea
                            name="remarques"
                            value={formData.remarques || ''}
                            onChange={handleChange}
                            className="field resize-none"
                            placeholder="Ajoutez des notes confidentielles sur l'interaction avec le client..."
                            rows="4"
                        ></textarea>
                    </div>

                    {/* Blacklist Toggle */}
                    <div className="card shadow-l1 p-6" style={formData.liste_noire ? { background: 'var(--danger-bg)', borderColor: 'var(--danger)' } : {}}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-extrabold" style={{ color: formData.liste_noire ? 'var(--danger)' : 'var(--on-surface)' }}>Liste Noire</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Bloquer les futures locations</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="liste_noire"
                                    checked={formData.liste_noire}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 rounded-full peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: formData.liste_noire ? 'var(--danger)' : 'var(--stroke)', borderColor: 'var(--stroke)' }}></div>
                            </label>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="rounded-lg p-6 border" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
                        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--danger)' }}>
                            <span className="material-symbols-outlined text-[20px]">warning</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider">Zone de Danger</h3>
                        </div>
                        <p className="text-xs mb-6" style={{ color: 'var(--danger)', opacity: 0.7 }}>
                            La suppression d'un client archivera ses données. Il ne pourra plus louer de véhicules.
                        </p>
                        <button
                            onClick={handleDelete}
                            className="w-full py-3 font-bold text-xs rounded-lg transition-all"
                            style={{ background: '#fff', color: 'var(--danger)', border: '1px solid var(--danger)', fontWeight: 700 }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--danger)'; }}
                        >
                            SUPPRIMER LE PROFIL CLIENT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditClient;
