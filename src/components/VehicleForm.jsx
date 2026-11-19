import { apiErrorText } from '../utils/apiErrorText';
import { CheckboxInput } from '@astryxdesign/core';
import Card from './ui/Card';
import { Input, Select } from './ui/Input';
import React, { useState, useEffect } from 'react';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
// Force Vercel redeploy - fix vehicle edit image issue
import { useParams, useNavigate, Link } from 'react-router-dom';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { optimizeImageFile } from '../utils/imageUtils';
import AuditTimeline from './AuditTimeline';
import { useI18n } from '../i18n/context';

const VehicleForm = () => {
    const { t } = useI18n();
    const { formProps, markClean } = useUnsavedChanges();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        matricule: '',
        matricule_definitif: '',
        marque: '',
        modele: '',
        annee: new Date().getFullYear(),
        couleur: '',
        carburant: 'Diesel',
        kilometrage: 0,
        prix_par_jour: 0,
        chauffeur_disponible: false,
        statut: 'Available',
        date_assurance: '',
        date_visite_technique: '',
        prochain_vidange_km: 0,
        tarif_km_extra: '',
        date_mise_en_circulation: '',
        date_autorisation_circulation: '',
        puissance_fiscale: '',
        price_intervals: [],
    });

    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [fetching, setFetching] = useState(isEditMode);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [uniqueErrors, setUniqueErrors] = useState({});
    const [checkingUnique, setCheckingUnique] = useState({});

    const steps = [
        { num: 1, label: t('u.identification'), icon: 'fingerprint', subtitle: t('u.informations_gnrales') },
        { num: 2, label: t('u.spcifications'), icon: 'settings_input_component', subtitle: t('u.dtails_techniques') },
        { num: 3, label: t('u.tarification'), icon: 'payments', subtitle: t('u.prix_et_options') },
        { num: 4, label: t('u.validit_statut'), icon: 'verified_user', subtitle: t('u.documents_et_disponibilit') },
    ];

    const requiredFields = {
        1: [
            { key: 'matricule', label: t('u.matricule'), check: () => !formData.matricule },
            { key: 'marque', label: t('u.marque'), check: () => !formData.marque },
            { key: 'modele', label: t('u.modle'), check: () => !formData.modele },
            { key: 'annee', label: t('u.anne'), check: () => !formData.annee },
        ],
        2: [
            { key: 'kilometrage', label: t('u.kilomtrage'), check: () => formData.kilometrage === '' || formData.kilometrage === null || formData.kilometrage === undefined },
        ],
        3: [
            { key: 'prix_par_jour', label: t('u.prix_journalier'), check: () => formData.prix_par_jour === '' || formData.prix_par_jour === null || formData.prix_par_jour === undefined },
        ],
        4: [
            { key: 'date_assurance', label: t('u.expiration_assurance'), check: () => !formData.date_assurance },
            { key: 'date_visite_technique', label: t('u.visite_technique'), check: () => !formData.date_visite_technique },
        ],
    };

    const UNIQUE_FIELDS = {
        matricule: t('u.matricule_2'),
        matricule_definitif: t('u.matricule_dfinitif_2'),
    };

    const checkUnique = async (field, value) => {
        if (!value || !value.trim()) {
            setUniqueErrors((prev) => ({ ...prev, [field]: false }));
            return;
        }
        setCheckingUnique((prev) => ({ ...prev, [field]: true }));
        try {
            const res = await api.get('vehicles/check-unique/', {
                params: {
                    field,
                    value: value.trim(),
                    ...(isEditMode ? { exclude_id: id } : {}),
                },
            });
            setUniqueErrors((prev) => ({
                ...prev,
                [field]: res.data.available === false
                    ? t('u.un_vhicule_de_votre_flotte_utili', { field: UNIQUE_FIELDS[field] })
                    : false,
            }));
        } catch (err) {
            console.error("Erreur lors de la vérification de l'unicité", err);
            setUniqueErrors((prev) => ({ ...prev, [field]: false }));
            toast.error(err.response?.status === 404
                ? t('u.vrification_indisponible_le_serv')
                : t('u.impossible_de_vrifier_l_unicit_d'));
        } finally {
            setCheckingUnique((prev) => ({ ...prev, [field]: false }));
        }
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
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
            toast.error(t('u.champs_requis_manquants', { fields: missing.map((m) => m.label).join(', ') }));
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map((f) => f.key)
            .filter((k) => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(t('u.corrigez_d_abord_les_champs_en_d', { fields: uniqueFieldsOnStep.map((k) => UNIQUE_FIELDS[k]).join(', ') }));
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? t('u.champ_requis') : '');

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const response = await api.get('brands/');
                setBrands(response.data);
            } catch (error) {
                console.error("Erreur lors de la récupération des marques", error);
            }
        };
        fetchBrands();
    }, []);

    useEffect(() => {
        if (!formData.marque) return;
        let cancelled = false;
        const fetchModels = async () => {
            try {
                const response = await api.get(`modelcars/?brand=${formData.marque}`);
                if (!cancelled) setModels(response.data);
            } catch (error) {
                console.error("Erreur lors de la récupération des modèles", error);
            }
        };
        fetchModels();
        return () => { cancelled = true; };
    }, [formData.marque]);

    useEffect(() => {
        if (isEditMode) {
            const fetchVehicle = async () => {
                try {
                    const response = await api.get(`vehicles/${id}/`);
                    // Ensure dates are string for input[type="date"]
                    const data = response.data;
                    setFormData({
                        ...data,
                        date_assurance: data.date_assurance || '',
                        date_visite_technique: data.date_visite_technique || '',
                        date_mise_en_circulation: data.date_mise_en_circulation || '',
                        date_autorisation_circulation: data.date_autorisation_circulation || '',
                        puissance_fiscale: data.puissance_fiscale || '',
                        matricule_definitif: data.matricule_definitif || '',
                        price_intervals: Array.isArray(data.price_intervals) ? data.price_intervals : [],
                    });
                    if (data.image) {
                        setImagePreview(data.image);
                    }
                    setFetching(false);
                } catch (error) {
                    console.error("Erreur lors de la récupération du véhicule", error);
                    setFetching(false);
                }
            };
            fetchVehicle();
        }
    }, [id, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: false }));
        }
        if (uniqueErrors[name]) {
            setUniqueErrors((prev) => ({ ...prev, [name]: false }));
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const optimized = await optimizeImageFile(file);
            setImage(optimized);
            setImagePreview(URL.createObjectURL(optimized));
        }
    };

    const MONTHS = [
        { value: 1, label: t('u.janvier') },
        { value: 2, label: t('u.fvrier') },
        { value: 3, label: t('u.mars') },
        { value: 4, label: t('u.avril') },
        { value: 5, label: t('u.mai') },
        { value: 6, label: t('u.juin') },
        { value: 7, label: t('u.juillet') },
        { value: 8, label: t('u.aot') },
        { value: 9, label: t('u.septembre') },
        { value: 10, label: t('u.octobre') },
        { value: 11, label: t('u.novembre') },
        { value: 12, label: t('u.dcembre') },
    ];
    const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

    const addInterval = () => {
        setFormData((prev) => ({
            ...prev,
            price_intervals: [...prev.price_intervals, { type: 'RECURRENT', prix: '', mois_debut: '', jour_debut: '', mois_fin: '', jour_fin: '', date_debut: '', date_fin: '' }],
        }));
    };

    const updateInterval = (index, patch) => {
        setFormData((prev) => {
            const next = [...prev.price_intervals];
            next[index] = { ...next[index], ...patch };
            return { ...prev, price_intervals: next };
        });
    };

    const removeInterval = (index) => {
        setFormData((prev) => ({
            ...prev,
            price_intervals: prev.price_intervals.filter((_, i) => i !== index),
        }));
    };

    const performSubmit = async () => {
        setLoading(true);
        const data = new FormData();
        const readOnlyFields = ['id', 'agency', 'marque_name', 'modele_name', 'agency_details', 'image', 'price_intervals'];
        
        Object.keys(formData).forEach((key) => {
            if (!readOnlyFields.includes(key)) {
                let value = formData[key];
                
                // Ensure foreign keys are not empty strings
                if ((key === 'marque' || key === 'modele') && value === '') {
                    value = null;
                }

                if (value !== null && value !== undefined) {
                    // Handle boolean for FormData
                    if (typeof value === 'boolean') {
                        data.append(key, value ? 'true' : 'false');
                    } else {
                        data.append(key, value);
                    }
                }
            }
        });
        
        // Périodes tarifaires saisonnières (envoyées en JSON pour le multipart)
        if (Array.isArray(formData.price_intervals)) {
            const intervals = formData.price_intervals
                .map((item) => ({
                    id: item.id ?? undefined,
                    type: item.type || 'RECURRENT',
                    prix: item.prix,
                    date_debut: item.date_debut || null,
                    date_fin: item.date_fin || null,
                    mois_debut: item.mois_debut ?? null,
                    jour_debut: item.jour_debut ?? null,
                    mois_fin: item.mois_fin ?? null,
                    jour_fin: item.jour_fin ?? null,
                }))
                .filter((item) => item.prix != null && item.prix !== '');
            if (intervals.length > 0) {
                data.append('price_intervals', JSON.stringify(intervals));
            } else {
                data.append('price_intervals', '[]');
            }
        }
        
        // Only append image if it's a new File object (not the existing URL string)
        if (image && image instanceof File) {
            data.append('image', image);
        }

        try {
            if (isEditMode) {
                await api.patch(`vehicles/${id}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('vehicles/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            markClean();
            navigate('/vehicles');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement du véhicule", error);
            
            let message = t('u.une_erreur_est_survenue_lors_de__4');
            if (error.response?.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    message = data;
                } else if (data.detail) {
                    message = data.detail;
                } else {
                    // Extract all field errors
                    const errors = Object.entries(data)
                        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
                        .join(' | ');
                    if (errors) message = errors;
                }
            }
            setError(message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const stepsWithErrors = [1, 2, 3, 4].filter((s) => validateStep(s).length > 0);
        if (stepsWithErrors.length > 0) {
            const missingAll = stepsWithErrors.flatMap((s) => validateStep(s));
            markErrors(missingAll);
            toast.error(t('', { fields: missingAll.map((m) => m.label).join(', ') }));
            setCurrentStep(Math.min(...stepsWithErrors));
            return;
        }

        for (const field of Object.keys(UNIQUE_FIELDS)) {
            const val = formData[field];
            if (!val || !val.trim()) continue;
            try {
                const res = await api.get('vehicles/check-unique/', {
                    params: {
                        field,
                        value: val.trim(),
                        ...(isEditMode ? { exclude_id: id } : {}),
                    },
                });
                if (res.data.available === false) {
                    setUniqueErrors((prev) => ({ ...prev, [field]: t('u.un_vhicule_de_votre_flotte_utili', { field: UNIQUE_FIELDS[field] }) }));
                    toast.error(t('u.un_vhicule_de_votre_flotte_utili', { field: UNIQUE_FIELDS[field] }));
                    setCurrentStep(1);
                    return;
                }
            } catch (err) {
                console.error("Erreur lors de la vérification de l'unicité", err);
            }
        }

        await performSubmit();
    };

    const handleDelete = () => {
        messageBox.danger(t('u.tes_vous_sr_de_vouloir_supprimer_2'), t('u.supprimer_le_vhicule'), {
            onConfirm: async () => {
                try {
                    await api.delete(`vehicles/${id}/`);
                    toast.success(t('u.vhicule_supprim_avec_succs'));
                    navigate('/vehicles');
                } catch (error) {
                    console.error("Erreur lors de la suppression du véhicule", error);
                    toast.error(apiErrorText(error, t('u.erreur_lors_de_la_suppression_du')));
                }
            }
        });
    };

    if (fetching) return <div className="flex items-center justify-center min-h-[50vh] gap-3 text-primary font-semibold" role="status"><Spinner size={22} /> {t('u.chargement_du_vhicule')}</div>;

    const stepState = (num) => {
        if (currentStep > num) return 'done';
        if (currentStep === num) return 'active';
        return 'idle';
    };

    return (
        <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
            {/* Breadcrumb + header */}
            <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Link to="/vehicles" className="hover:text-slate-600">{t('u.vhicules')}</Link>
                        <span className="mx-1">›</span>
                        {isEditMode ? t('u.modifier') : t('u.nouveau')}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {isEditMode ? t('u.modifier_un_vhicule') : t('u.ajouter_un_vhicule')}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{t('u.compltez_les_informations_pour_e')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isEditMode && (
                        <Button variant="danger" icon="delete" onClick={handleDelete}>{t('u.supprimer')}</Button>
                    )}
                </div>
            </header>

            {error && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            <form {...formProps} onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
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
                        <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Immatriculation (matricule)</span>
                                    <Input invalid={hasError('matricule')}
                                        name="matricule"
                                        value={formData.matricule}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('matricule')}
                                       
                                        type="text"
                                        placeholder="Ex: 12345-A-50"
                                    />
                                    {checkingUnique['matricule'] && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                            <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                            {t('u.vrification_de_l_unicit')}
                                        </p>
                                    )}
                                    {fieldErrorMsg('matricule') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('matricule')}
                                        </p>
                                    )}
                                </label>
                                <div>
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.marque')}</span>
                                    <Dropdown
                                        options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                                        value={formData.marque}
                                        onChange={(v) => {
                                            setFormData(prev => ({ ...prev, marque: v, modele: '' }));
                                            setFieldErrors(prev => ({ ...prev, marque: false, modele: false }));
                                        }}
                                        placeholder={t('u.slectionner_une_marque')}
                                        isSearchable
                                        isClearable
                                        status={hasError('marque') ? { type: 'error' } : undefined}
                                    />
                                    {fieldErrorMsg('marque') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('marque')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.modle')}</span>
                                    <Dropdown
                                        options={(formData.marque ? models : []).map(model => ({ value: model.id, label: model.name }))}
                                        value={formData.modele}
                                        onChange={(v) => {
                                            setFormData(prev => ({ ...prev, modele: v }));
                                            setFieldErrors(prev => ({ ...prev, modele: false }));
                                        }}
                                        placeholder={t('u.slectionner_un_modle')}
                                        isSearchable
                                        isClearable
                                        isDisabled={!formData.marque}
                                        status={hasError('modele') ? { type: 'error' } : undefined}
                                    />
                                    {fieldErrorMsg('modele') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('modele')}
                                        </p>
                                    )}
                                </div>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.anne')}</span>
                                    <Input invalid={hasError('annee')}
                                        name="annee"
                                        value={formData.annee}
                                        onChange={handleChange}
                                       
                                        type="number"
                                    />
                                    {fieldErrorMsg('annee') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('annee')}
                                        </p>
                                    )}
                                </label>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.plaque_dfinitive_optionnel')}</span>
                                    <Input invalid={hasError('matricule_definitif')}
                                        name="matricule_definitif"
                                        value={formData.matricule_definitif}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('matricule_definitif')}
                                       
                                        type="text"
                                        placeholder="Ex: 00000-A-50"
                                    />
                                    {checkingUnique['matricule_definitif'] && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                            <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                            {t('u.vrification_de_l_unicit')}
                                        </p>
                                    )}
                                    {fieldErrorMsg('matricule_definitif') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('matricule_definitif')}
                                        </p>
                                    )}
                                    <p className="mt-1.5 text-[11px] text-slate-400">{t('u.saisie_une_fois_la_plaque_00000_')}</p>
                                </label>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.date_de_mise_en_circulation')}</span>
                                    <Input invalid={hasError('date_mise_en_circulation')}
                                        name="date_mise_en_circulation"
                                        value={formData.date_mise_en_circulation}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.date_d_autorisation_de_circulati')}</span>
                                    <Input invalid={hasError('date_autorisation_circulation')}
                                        name="date_autorisation_circulation"
                                        value={formData.date_autorisation_circulation}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                </label>
                            </div>
                    )}

                    {currentStep === 2 && (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.couleur')}</span>
                                        <Input invalid={hasError('couleur')}
                                            name="couleur"
                                            value={formData.couleur}
                                            onChange={handleChange}
                                           
                                            type="text"
                                            placeholder={t('u.ex_noir_mtallis')}
                                        />
                                    </label>
                                    <div>
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.carburant')}</span>
                                        <Dropdown
                                            name="carburant"
                                            options={[
                                                { value: 'Diesel', label: t('u.diesel') },
                                                { value: 'Essence', label: t('u.essence') },
                                                { value: 'Hybride', label: t('u.hybride') },
                                                { value: 'Electrique', label: t('u.lectrique') }
                                            ]}
                                            value={formData.carburant}
                                            onChange={(v) => handleChange({ target: { name: 'carburant', value: v } })}
                                        />
                                    </div>
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.kilomtrage_actuel')}</span>
                                        <Input invalid={hasError('kilometrage')}
                                            name="kilometrage"
                                            value={formData.kilometrage}
                                            onChange={handleChange}
                                           
                                            type="number"
                                        />
                                        {fieldErrorMsg('kilometrage') && (
                                            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                                <span className="material-symbols-outlined text-[13px]">error</span>
                                                {fieldErrorMsg('kilometrage')}
                                            </p>
                                        )}
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.prochaine_vidange_km')}</span>
                                        <Input invalid={hasError('prochain_vidange_km')}
                                            name="prochain_vidange_km"
                                            value={formData.prochain_vidange_km}
                                            onChange={handleChange}
                                           
                                            type="number"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.puissance_fiscale_cv')}</span>
                                        <Input invalid={hasError('puissance_fiscale')}
                                            name="puissance_fiscale"
                                            value={formData.puissance_fiscale}
                                            onChange={handleChange}
                                           
                                            type="number"
                                            min="1"
                                            placeholder="Ex: 8"
                                        />
                                    </label>
                                </div>
                        </>
                    )}

                    {currentStep === 3 && (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.prix_journalier_dh')}</span>
                                    <Input invalid={hasError('prix_par_jour')}
                                        name="prix_par_jour"
                                        value={formData.prix_par_jour}
                                        onChange={handleChange}
                                       
                                        type="number"
                                        step="0.01"
                                    />
                                    {fieldErrorMsg('prix_par_jour') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('prix_par_jour')}
                                        </p>
                                    )}
                                </label>
                                <div className="flex items-end pb-1">
                                    <CheckboxInput label={t('u.chauffeur_disponible_avec_ce_vhi')} value={Boolean(formData.chauffeur_disponible)} onChange={(c) => handleChange({ target: { name: 'chauffeur_disponible', type: 'checkbox', checked: c } })} />
                                </div>
                                <div className="md:col-span-2">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.tarif_km_suppl_spcifique_ce_vhic')}</span>
                                    <Input invalid={hasError('tarif_km_extra')}
                                        name="tarif_km_extra"
                                        value={formData.tarif_km_extra || ''}
                                        onChange={handleChange}
                                       
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        placeholder={t('u.laissez_vide_utiliser_le_tarif_a')}
                                    />
                                    <p className="mt-2 text-xs text-slate-400">{t('u.si_non_renseign_le_tarif_par_dfa')}</p>
                                </div>
                            </div>
                            <div className="mt-7 border-t border-slate-200 pt-6">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.priodes_tarifaires_saisonnires')}</span>
                                        <p className="text-xs text-slate-400">{t('u.prix_journalier_appliqu_pendant_')}</p>
                                    </div>
                                    <Button variant="secondary" size="sm" icon="add" onClick={addInterval}>{t('u.ajouter_une_priode')}</Button>
                                </div>
                                {formData.price_intervals.length === 0 && (
                                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
                                        {t('u.aucune_priode_saisonnire_le_tari')}
                                    </p>
                                )}
                                <div className="space-y-3">
                                    {formData.price_intervals.map((interval, index) => (
                                        <Card padding={4} variant="muted" key={index}>
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Période {index + 1}</span>
                                                <Button variant="danger" size="sm" icon="delete" onClick={() => removeInterval(index)}>{t('u.supprimer')}</Button>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div>
                                                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('u.type')}</span>
                                                    <Dropdown
                                                        options={[
                                                            { value: 'RECURRENT', label: t('u.rcurrent_chaque_anne') },
                                                            { value: 'ABSOLUTE', label: t('u.absolu_dates_prcises') },
                                                        ]}
                                                        value={interval.type}
                                                        onChange={(v) => updateInterval(index, { type: v })}
                                                    />
                                                </div>
                                                <label className="block">
                                                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Prix / jour (DH)</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={interval.prix}
                                                        onChange={(e) => updateInterval(index, { prix: e.target.value })}
                                                       
                                                        placeholder="Ex: 400"
                                                    />
                                                </label>
                                                {interval.type === 'RECURRENT' ? (
                                                    <>
                                                        <div>
                                                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('u.dbut_mois_jour')}</span>
                                                            <div className="flex gap-2">
                                                                <Select
                                                                    value={interval.mois_debut}
                                                                    onChange={(e) => updateInterval(index, { mois_debut: e.target.value })}
                                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none transition focus:border-blue-600"
                                                                >
                                                                    <option value="">{t('u.mois')}</option>
                                                                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                                </Select>
                                                                <Select
                                                                    value={interval.jour_debut}
                                                                    onChange={(e) => updateInterval(index, { jour_debut: e.target.value })}
                                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none transition focus:border-blue-600"
                                                                >
                                                                    <option value="">{t('u.jour')}</option>
                                                                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fin (mois / jour)</span>
                                                            <div className="flex gap-2">
                                                                <Select
                                                                    value={interval.mois_fin}
                                                                    onChange={(e) => updateInterval(index, { mois_fin: e.target.value })}
                                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none transition focus:border-blue-600"
                                                                >
                                                                    <option value="">{t('u.mois')}</option>
                                                                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                                </Select>
                                                                <Select
                                                                    value={interval.jour_fin}
                                                                    onChange={(e) => updateInterval(index, { jour_fin: e.target.value })}
                                                                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-sm outline-none transition focus:border-blue-600"
                                                                >
                                                                    <option value="">{t('u.jour')}</option>
                                                                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 md:col-span-2">{t('u.peut_chevaucher_la_fin_d_anne_ex')}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <label className="block">
                                                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('u.date_de_dbut')}</span>
                                                            <Input
                                                                type="date"
                                                                value={interval.date_debut}
                                                                onChange={(e) => updateInterval(index, { date_debut: e.target.value })}
                                                               
                                                            />
                                                        </label>
                                                        <label className="block">
                                                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('u.date_de_fin')}</span>
                                                            <Input
                                                                type="date"
                                                                value={interval.date_fin}
                                                                onChange={(e) => updateInterval(index, { date_fin: e.target.value })}
                                                               
                                                            />
                                                        </label>
                                                    </>
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 4 && (
                        <>
                            <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.expiration_assurance')}</span>
                                    <Input invalid={hasError('date_assurance')}
                                        name="date_assurance"
                                        value={formData.date_assurance}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                    {fieldErrorMsg('date_assurance') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('date_assurance')}
                                        </p>
                                    )}
                                </label>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.visite_technique')}</span>
                                    <Input invalid={hasError('date_visite_technique')}
                                        name="date_visite_technique"
                                        value={formData.date_visite_technique}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                    {fieldErrorMsg('date_visite_technique') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('date_visite_technique')}
                                        </p>
                                    )}
                                </label>
                            </div>
                            <div className="mt-7">
                                <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('u.statut')}</span>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {['Available', 'Maintenance', 'Rented'].map((status) => {
                                        const active = formData.statut === status;
                                        return (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, statut: status }))}
                                                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm transition ${
                                                    active
                                                        ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700'
                                                        : 'border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {status === 'Available' ? 'check_circle' : status === 'Maintenance' ? 'build' : 'key'}
                                                </span>
                                                <span>{t(`status.${status}`)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                        </div>

                        {/* Photo */}
                        <div className="space-y-5">
                            <Card padding={5} variant="default">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                                    </span>
                                    <h2 className="font-semibold text-slate-900">{t('u.photo_du_vhicule')}</h2>
                                </div>
                                {imagePreview ? (
                                    <div className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200">
                                        <img
                                            src={imagePreview}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            alt={t('u.aperu')}
                                        />
                                        <label className="absolute end-3 top-3 cursor-pointer rounded-full bg-white/80 p-2 shadow-sm backdrop-blur transition-colors hover:bg-white">
                                            <span className="material-symbols-outlined text-[18px] text-blue-600">photo_camera</span>
                                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
                                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600">📷</div>
                                        <p className="text-sm font-semibold text-slate-700">{t('u.glisser_une_image_ici')}</p>
                                        <p className="mt-1 text-sm text-blue-600">{t('u.ou_cliquer_pour_parcourir')}</p>
                                        <p className="mt-3 text-xs text-slate-400">{t('u.formats_accepts_jpg_png_max_5_mo')}</p>
                                        <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                    </label>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </form>

            {isEditMode && (
                <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700">{t('u.historique_des_modifications')}</summary>
                    <div className="mt-3">
                        <AuditTimeline model="vehicle" id={id} />
                    </div>
                </details>
            )}

            {/* Bottom security + actions */}
            <Card padding={4} variant="default" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <span className="material-symbols-outlined">shield</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">{t('u.vos_donnes_sont_scurises')}</p>
                        <p className="text-xs text-slate-400">{t('u.nous_protgeons_vos_informations_')}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => navigate('/vehicles')}>{t('u.annuler')}</Button>
                    {currentStep > 1 && (
                        <Button variant="outline" icon="chevron_left" onClick={handlePrev}>{t('u.prcdent')}</Button>
                    )}
                    {isEditMode && (
                        <Button variant={currentStep < 4 ? 'outline' : 'primary'} icon="check" loading={loading} onClick={handleSubmit}>
                            {loading ? t('u.enregistrement') : t('u.enregistrer')}
                        </Button>
                    )}
                    {currentStep < 4 ? (
                        <Button onClick={handleNext}>
                            {t('u.suivant')}
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">chevron_right</span>
                        </Button>
                    ) : !isEditMode && (
                        <Button icon="check" loading={loading} onClick={handleSubmit}>
                            {loading ? t('u.enregistrement') : t('u.enregistrer')}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default VehicleForm;
