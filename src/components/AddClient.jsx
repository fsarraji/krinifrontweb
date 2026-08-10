import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import { SEXE_OPTIONS, NATIONALITES, cinLabelFor } from '../utils/clientConstants';
import { optimizeImageFile } from '../utils/imageUtils';

const AddClient = () => {
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
        remarques: ''
    });
    const [files, setFiles] = useState({
        scan_cin: null,
        scan_permis: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [uniqueErrors, setUniqueErrors] = useState({});
    const [checkingUnique, setCheckingUnique] = useState({});

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
        setCheckingUnique(prev => ({ ...prev, [field]: true }));
        try {
            const res = await api.get('clients/check-unique/', {
                params: { field, value: value.trim() }
            });
            setUniqueErrors(prev => ({
                ...prev,
                [field]: res.data.available === false
                    ? `Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.`
                    : false
            }));
        } catch (err) {
            // En cas d'erreur réseau, on laisse passer sans bloquer
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
        } finally {
            setCheckingUnique(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    const steps = [
        { num: 1, label: 'Informations', icon: 'person' },
        { num: 2, label: 'Adresse', icon: 'home' },
        { num: 3, label: 'Permis', icon: 'card_membership' },
        { num: 4, label: 'Documents', icon: 'folder_open' },
    ];

    const requiredFields = {
        1: [
            { key: 'prenom', label: 'Prénom', check: () => !formData.prenom },
            { key: 'nom', label: 'Nom', check: () => !formData.nom },
            { key: 'cin_passport', label: 'CIN / Passeport', check: () => !formData.cin_passport },
            { key: 'telephone', label: 'Téléphone', check: () => !formData.telephone },
        ],
        2: [
            { key: 'adresse', label: 'Adresse', check: () => !formData.adresse },
        ],
        3: [
            { key: 'permis_conduite', label: 'N° de permis', check: () => !formData.permis_conduite },
        ],
        4: [],
    };

    const validateStep = (step) => (requiredFields[step] || []).filter((f) => f.check());

    const markErrors = (fields) => {
        const keys = fields.map((f) => f.key);
        setFieldErrors((prev) => {
            const next = { ...prev };
            keys.forEach((k) => { next[k] = true; });
            return next;
        });
    };

    const handleNext = () => {
        const missing = validateStep(currentStep);
        if (missing.length > 0) {
            markErrors(missing);
            toast.error(`Champs requis manquants : ${missing.map((m) => m.label).join(', ')}`);
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map(f => f.key)
            .filter(k => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(`Corrigez d'abord les champs en double : ${uniqueFieldsOnStep.map(k => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const inputClass = (name) => `field transition-all duration-200 ${
        hasError(name)
            ? 'border-rose-400 bg-rose-50/40 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'focus:bg-white'
    }`;

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? 'Champ requis' : '');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
        if (uniqueErrors[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
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
        const missing = validateStep(currentStep);
        if (currentStep < 4) {
            handleNext();
            return;
        }
        if (missing.length > 0) {
            markErrors(missing);
            toast.error(`Champs requis manquants : ${missing.map((m) => m.label).join(', ')}`);
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map(f => f.key)
            .filter(k => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(`Corrigez d'abord les champs en double : ${uniqueFieldsOnStep.map(k => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        // Vérifier une dernière fois les champs uniques avant enregistrement
        for (const field of Object.keys(UNIQUE_FIELDS)) {
            const val = formData[field];
            if (val && val.trim()) {
                try {
                    const res = await api.get('clients/check-unique/', { params: { field, value: val.trim() } });
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
        setLoading(true);
        setError(null);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    data.append(key, formData[key]);
                }
            });
            if (files.scan_cin) data.append('scan_cin', files.scan_cin);
            if (files.scan_permis) data.append('scan_permis', files.scan_permis);

            await api.post('clients/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Client créé avec succès.');
            navigate('/clients');
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue lors de la création du client.");
            setLoading(false);
        }
    };

    const stepState = (num) => {
        if (currentStep > num) return 'done';
        if (currentStep === num) return 'active';
        return 'idle';
    };

    return (
        <div className="w-full px-4 py-6">
            {/* Breadcrumb + header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/clients')}>Clients</span> / Nouveau client
                    </p>
                    <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        Ajouter un client
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/clients')}
                        className="px-5 py-2.5 rounded-lg text-[13px] font-semibold card shadow-l1"
                        style={{ color: 'var(--on-surface-variant)' }}
                    >
                        Annuler
                    </button>
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white"
                            style={{ background: 'var(--secondary)' }}
                        >
                            Étape précédente
                        </button>
                    )}
                    {currentStep < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-2"
                            style={{ background: 'var(--primary-container)' }}
                        >
                            Continuer
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                            style={{ background: 'var(--success)' }}
                        >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            {loading ? 'Enregistrement...' : 'Enregistrer le client'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center mb-8">
                {steps.map((s, i) => {
                    const state = stepState(s.num);
                    return (
                        <React.Fragment key={s.num}>
                            {i > 0 && (
                                <div
                                    className="step-line mx-4"
                                    style={currentStep >= s.num ? { background: 'var(--success)' } : {}}
                                ></div>
                            )}
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="step-dot text-white"
                                    style={
                                        state === 'done'
                                            ? { background: 'var(--success)' }
                                            : state === 'active'
                                                ? { background: 'var(--primary-container)' }
                                                : { background: 'var(--stroke)', color: 'var(--on-surface-variant)' }
                                    }
                                >
                                    {state === 'done' ? (
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                    ) : (
                                        s.num
                                    )}
                                </div>
                                <span
                                    className="text-[13px]"
                                    style={
                                        state === 'active'
                                            ? { fontWeight: 700, color: 'var(--primary-container)' }
                                            : { fontWeight: state === 'done' ? 600 : 500, color: state === 'done' ? 'var(--on-surface)' : 'var(--on-surface-variant)', opacity: state === 'idle' ? 0.6 : 1 }
                                    }
                                >
                                    {s.label}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg flex items-center gap-3 font-semibold text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6 items-start">
                {/* Form panel */}
                <div className="col-span-2 space-y-6">
                    {currentStep === 1 && (
                        <div className="card shadow-l1 p-8">
                            <div className="section-title">
                                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Informations personnelles</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="label">Prénom</label>
                                    <input
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        required
                                        className={inputClass('prenom')}
                                        placeholder="ex. Jonathan"
                                        type="text"
                                    />
                                    {fieldErrorMsg('prenom') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('prenom')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Nom</label>
                                    <input
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                        className={inputClass('nom')}
                                        placeholder="ex. Wick"
                                        type="text"
                                    />
                                    {fieldErrorMsg('nom') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('nom')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">{cinLabelFor(formData.nationalite)}</label>
                                    <input
                                        name="cin_passport"
                                        value={formData.cin_passport}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('cin_passport')}
                                        required
                                        className={inputClass('cin_passport')}
                                        placeholder="ex. AB123456"
                                        type="text"
                                    />
                                    {fieldErrorMsg('cin_passport') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('cin_passport')}
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
                                    <select
                                        name="nationalite"
                                        value={formData.nationalite}
                                        onChange={handleChange}
                                        className={inputClass('nationalite')}
                                    >
                                        <option value="">-- Sélectionner --</option>
                                        {NATIONALITES.map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Téléphone</label>
                                    <input
                                        name="telephone"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('telephone')}
                                        required
                                        className={inputClass('telephone')}
                                        placeholder="ex. +212 6 12 34 56 78"
                                        type="tel"
                                    />
                                    {fieldErrorMsg('telephone') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('telephone')}
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Adresse Email</label>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('email')}
                                        className={inputClass('email')}
                                        placeholder="ex. jonathan.wick@example.com"
                                        type="email"
                                    />
                                    {fieldErrorMsg('email') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('email')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="card shadow-l1 p-8">
                            <div className="section-title">
                                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Adresse</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="label">Adresse résidentielle</label>
                                    <textarea
                                        name="adresse"
                                        value={formData.adresse}
                                        onChange={handleChange}
                                        required
                                        className={`${inputClass('adresse')} resize-none`}
                                        placeholder="Rue, Numéro, Ville, Code Postal"
                                        rows="3"
                                    ></textarea>
                                    {fieldErrorMsg('adresse') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('adresse')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Ville</label>
                                    <input
                                        name="ville"
                                        value={formData.ville}
                                        onChange={handleChange}
                                        className={inputClass('ville')}
                                        placeholder="ex. Casablanca"
                                        type="text"
                                    />
                                </div>
                                <div>
                                    <label className="label">Pays</label>
                                    <input
                                        name="pays"
                                        value={formData.pays}
                                        onChange={handleChange}
                                        className={inputClass('pays')}
                                        placeholder="ex. Maroc"
                                        type="text"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="card shadow-l1 p-8">
                            <div className="section-title">
                                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Permis de conduire</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="label">N° de permis</label>
                                    <input
                                        name="permis_conduite"
                                        value={formData.permis_conduite}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('permis_conduite')}
                                        required
                                        className={inputClass('permis_conduite')}
                                        placeholder="ex. AB12345678"
                                        type="text"
                                    />
                                    {fieldErrorMsg('permis_conduite') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('permis_conduite')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Date de délivrance</label>
                                    <input
                                        name="date_delivrance_permis"
                                        value={formData.date_delivrance_permis}
                                        onChange={handleChange}
                                        className={inputClass('date_delivrance_permis')}
                                        type="date"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Remarques</label>
                                    <textarea
                                        name="remarques"
                                        value={formData.remarques}
                                        onChange={handleChange}
                                        className={`${inputClass('remarques')} resize-none`}
                                        rows="3"
                                        placeholder="Notes internes sur ce client (optionnel)"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <>
                            <div className="card shadow-l1 p-8">
                                <div className="section-title">
                                    <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                    <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Documents d'identité</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="label">Scan {cinLabelFor(formData.nationalite)}</label>
                                        <label className="dropzone p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors">
                                            <span className="material-symbols-outlined text-[24px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>badge</span>
                                            <p className="text-[12px] font-medium text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                {files.scan_cin ? files.scan_cin.name : "Glisser un fichier ou parcourir"}
                                            </p>
                                            <input type="file" name="scan_cin" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                    <div>
                                        <label className="label">Scan permis de conduire</label>
                                        <label className="dropzone p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors">
                                            <span className="material-symbols-outlined text-[24px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>contract</span>
                                            <p className="text-[12px] font-medium text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                                                {files.scan_permis ? files.scan_permis.name : "Glisser un fichier ou parcourir"}
                                            </p>
                                            <input type="file" name="scan_permis" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="card shadow-l1 p-6" style={{ background: 'var(--info-bg)', borderColor: '#bfd7fb' }}>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: 'var(--primary-container)' }}>info</span>
                                    <p className="text-[12.5px] font-medium" style={{ color: '#1e3a8a' }}>
                                        Le dossier client sera automatiquement rattaché aux contrats et réservations créés à son nom.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Sidebar : summary */}
                <div className="space-y-6">
                    <div className="card shadow-l1 p-6">
                        <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>Résumé</h3>
                        <div className="space-y-3 text-[13px]">
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Nom complet</span>
                                <span className="font-semibold">{formData.prenom || '—'} {formData.nom || ''}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{cinLabelFor(formData.nationalite)}</span>
                                <span className="font-semibold">{formData.cin_passport || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Téléphone</span>
                                <span className="font-semibold">{formData.telephone || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Ville</span>
                                <span className="font-semibold">{formData.ville || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>N° de permis</span>
                                <span className="font-semibold">{formData.permis_conduite || '—'}</span>
                            </div>
                        </div>
                        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--stroke)' }}>
                            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Progression</p>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--stroke)' }}>
                                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%`, background: 'var(--primary-container)' }}></div>
                            </div>
                            <p className="text-[11px] mt-2 font-semibold" style={{ color: 'var(--primary-container)' }}>Étape {currentStep} sur 4</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddClient;
