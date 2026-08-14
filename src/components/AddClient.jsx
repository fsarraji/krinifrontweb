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
        { num: 1, label: 'Informations', icon: 'person', subtitle: 'Identité & contact' },
        { num: 2, label: 'Adresse', icon: 'home', subtitle: 'Localisation' },
        { num: 3, label: 'Permis', icon: 'card_membership', subtitle: 'Permis de conduire' },
        { num: 4, label: 'Documents', icon: 'folder_open', subtitle: 'Pièces justificatives' },
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
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
                {/* Stepper */}
                <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-white px-5 py-5 md:grid-cols-4">
                    {steps.map((s) => {
                        const state = stepState(s.num);
                        return (
                            <div key={s.num} className="flex items-center gap-3">
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                        state === 'done'
                                            ? 'bg-emerald-500 text-white'
                                            : state === 'active'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {state === 'done' ? '✓' : s.num}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-sm ${state === 'active' ? 'font-semibold text-blue-700' : state === 'done' ? 'text-slate-700' : 'text-slate-500'}`}>
                                        {s.label}
                                    </div>
                                    <div className="hidden text-xs text-slate-400 sm:block">{s.subtitle}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-5 bg-slate-50/50 p-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
                {/* Form panel */}
                <div className="space-y-5">
                    {currentStep === 1 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                            <div className="mb-7 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                </span>
                                <h2 className="text-lg font-semibold">Informations personnelles</h2>
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
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                            <div className="mb-7 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <span className="material-symbols-outlined text-[18px]">home</span>
                                </span>
                                <h2 className="text-lg font-semibold">Adresse</h2>
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
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                            <div className="mb-7 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <span className="material-symbols-outlined text-[18px]">card_membership</span>
                                </span>
                                <h2 className="text-lg font-semibold">Permis de conduire</h2>
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
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                                <div className="mb-7 flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                        <span className="material-symbols-outlined text-[18px]">folder_open</span>
                                    </span>
                                    <h2 className="text-lg font-semibold">Documents d'identité</h2>
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

                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-soft">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5 text-blue-600">info</span>
                                    <p className="text-[12.5px] font-medium text-blue-700">
                                        Le dossier client sera automatiquement rattaché aux contrats et réservations créés à son nom.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                    </div>

                    {/* Sidebar : summary */}
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                            <h3 className="mb-4 text-sm font-semibold text-slate-900">Résumé</h3>
                            <div className="space-y-3 text-[13px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Nom complet</span>
                                    <span className="font-semibold text-slate-700">{formData.prenom || '—'} {formData.nom || ''}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">{cinLabelFor(formData.nationalite)}</span>
                                    <span className="font-semibold text-slate-700">{formData.cin_passport || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Téléphone</span>
                                    <span className="font-semibold text-slate-700">{formData.telephone || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Ville</span>
                                    <span className="font-semibold text-slate-700">{formData.ville || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">N° de permis</span>
                                    <span className="font-semibold text-slate-700">{formData.permis_conduite || '—'}</span>
                                </div>
                            </div>
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--stroke)' }}>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Progression</p>
                                <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%`, background: '#1D4ED8' }}></div>
                                </div>
                                <p className="mt-2 text-[11px] font-semibold text-blue-700">Étape {currentStep} sur 4</p>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </form>

            {/* Bottom security + actions */}
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <span className="material-symbols-outlined">shield</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Vos données sont sécurisées</p>
                        <p className="text-xs text-slate-400">Nous protégeons vos informations avec le plus haut niveau de sécurité.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/clients')}
                        className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                    >
                        Annuler
                    </button>
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        >
                            <span className="material-symbols-outlined text-[16px] mr-1">chevron_left</span>
                            Précédent
                        </button>
                    )}
                    {currentStep < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        >
                            Suivant
                            <span className="material-symbols-outlined text-[16px] ml-1">chevron_right</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        >
                            <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                            {loading ? 'Enregistrement…' : 'Enregistrer le client'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddClient;
