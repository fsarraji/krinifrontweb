import React, { useState, useEffect } from 'react';
// Force Vercel redeploy - fix vehicle edit image issue
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { optimizeImageFile } from '../utils/imageUtils';

const VehicleForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        matricule: '',
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
        { num: 1, label: 'Identification', icon: 'fingerprint', subtitle: 'Informations générales' },
        { num: 2, label: 'Spécifications', icon: 'settings_input_component', subtitle: 'Détails techniques' },
        { num: 3, label: 'Tarification', icon: 'payments', subtitle: 'Prix et options' },
        { num: 4, label: 'Validité & Statut', icon: 'verified_user', subtitle: 'Documents et disponibilité' },
    ];

    const requiredFields = {
        1: [
            { key: 'matricule', label: 'Matricule', check: () => !formData.matricule },
            { key: 'marque', label: 'Marque', check: () => !formData.marque },
            { key: 'modele', label: 'Modèle', check: () => !formData.modele },
            { key: 'annee', label: 'Année', check: () => !formData.annee },
        ],
        2: [
            { key: 'kilometrage', label: 'Kilométrage', check: () => formData.kilometrage === '' || formData.kilometrage === null || formData.kilometrage === undefined },
        ],
        3: [
            { key: 'prix_par_jour', label: 'Prix journalier', check: () => formData.prix_par_jour === '' || formData.prix_par_jour === null || formData.prix_par_jour === undefined },
        ],
        4: [
            { key: 'date_assurance', label: 'Expiration assurance', check: () => !formData.date_assurance },
            { key: 'date_visite_technique', label: 'Visite technique', check: () => !formData.date_visite_technique },
        ],
    };

    const UNIQUE_FIELDS = {
        matricule: 'matricule',
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
                    ? `Un véhicule de votre flotte utilise déjà ce ${UNIQUE_FIELDS[field]}.`
                    : false,
            }));
        } catch (err) {
            console.error("Erreur lors de la vérification de l'unicité", err);
            setUniqueErrors((prev) => ({ ...prev, [field]: false }));
            toast.error(err.response?.status === 404
                ? "Vérification indisponible : le serveur doit être mis à jour (vehicles/check-unique)."
                : "Impossible de vérifier l'unicité de ce matricule.");
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
            toast.error(`Champs requis manquants : ${missing.map((m) => m.label).join(', ')}`);
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map((f) => f.key)
            .filter((k) => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(`Corrigez d'abord les champs en double : ${uniqueFieldsOnStep.map((k) => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? 'Champ requis' : '');

    const inputClass = (name) => `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition-all duration-200 ${
        hasError(name)
            ? 'border-rose-400 bg-rose-50/40 hover:border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
            : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
    }`;

    const selectStyles = (name) => ({
        control: (base, state) => ({
            ...base,
            backgroundColor: state.isDisabled ? '#f1f5f9' : '#ffffff',
            border: '1px solid',
            borderRadius: '0.75rem',
            padding: '5px 6px',
            minHeight: '46px',
            borderColor: hasError(name) ? '#fb7185' : (state.isFocused ? '#3b82f6' : '#e2e8f0'),
            boxShadow: hasError(name) ? '0 0 0 3px rgba(244,63,94,0.12)' : (state.isFocused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none'),
            '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#94a3b8' },
        }),
        placeholder: (base) => ({ ...base, color: '#94a3b8' }),
        menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? '#1d4ed8' : '#1e293b',
            fontWeight: state.isSelected || state.isFocused ? '600' : '400',
            fontSize: '0.875rem',
            cursor: 'pointer',
        }),
    });
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

    const performSubmit = async () => {
        setLoading(true);
        const data = new FormData();
        const readOnlyFields = ['id', 'agency', 'marque_name', 'modele_name', 'agency_details', 'image'];
        
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
            navigate('/vehicles');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement du véhicule", error);
            
            let message = "Une erreur est survenue lors de l'enregistrement.";
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
            toast.error(`Champs requis manquants : ${missingAll.map((m) => m.label).join(', ')}`);
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
                    setUniqueErrors((prev) => ({ ...prev, [field]: `Un véhicule de votre flotte utilise déjà ce ${UNIQUE_FIELDS[field]}.` }));
                    toast.error(`Un véhicule de votre flotte utilise déjà ce ${UNIQUE_FIELDS[field]}.`);
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
        messageBox.danger("Êtes-vous sûr de vouloir supprimer ce véhicule ?", "Supprimer le véhicule", {
            onConfirm: async () => {
                try {
                    await api.delete(`vehicles/${id}/`);
                    toast.success('Véhicule supprimé avec succès.');
                    navigate('/vehicles');
                } catch (error) {
                    console.error("Erreur lors de la suppression du véhicule", error);
                    toast.error("Erreur lors de la suppression du véhicule.");
                }
            }
        });
    };

    if (fetching) return <div className="flex items-center justify-center min-h-screen text-primary font-bold">Chargement...</div>;

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
                        <Link to="/vehicles" className="hover:text-slate-600">Véhicules</Link>
                        <span className="mx-1">›</span>
                        {isEditMode ? 'Modifier' : 'Nouveau'}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {isEditMode ? 'Modifier un véhicule' : 'Ajouter un véhicule'}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Complétez les informations pour enregistrer votre véhicule.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Supprimer
                        </button>
                    )}
                </div>
            </header>

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
                                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                                </span>
                                <h2 className="text-lg font-semibold">Identification</h2>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Immatriculation (matricule)</span>
                                    <input
                                        name="matricule"
                                        value={formData.matricule}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('matricule')}
                                        className={inputClass('matricule')}
                                        type="text"
                                        placeholder="Ex: 12345-A-50"
                                    />
                                    {checkingUnique['matricule'] && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                            <span className="material-symbols-outlined animate-spin text-[13px]">progress_activity</span>
                                            Vérification de l'unicité…
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
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Marque</span>
                                    <Select
                                        options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                                        onChange={(opt) => {
                                            setFormData(prev => ({ ...prev, marque: opt ? opt.value : '', modele: '' }));
                                            setFieldErrors(prev => ({ ...prev, marque: false, modele: false }));
                                        }}
                                        value={formData.marque ? { value: formData.marque, label: brands.find(b => b.id == formData.marque)?.name || '' } : null}
                                        placeholder="Sélectionner une marque"
                                        isSearchable
                                        isClearable
                                        classNamePrefix="react-select"
                                        styles={selectStyles('marque')}
                                    />
                                    {fieldErrorMsg('marque') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('marque')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Modèle</span>
                                    <Select
                                        options={(formData.marque ? models : []).map(model => ({ value: model.id, label: model.name }))}
                                        onChange={(opt) => {
                                            setFormData(prev => ({ ...prev, modele: opt ? opt.value : '' }));
                                            setFieldErrors(prev => ({ ...prev, modele: false }));
                                        }}
                                        value={formData.modele ? { value: formData.modele, label: (formData.marque ? models : []).find(m => m.id == formData.modele)?.name || '' } : null}
                                        placeholder="Sélectionner un modèle"
                                        isSearchable
                                        isClearable
                                        isDisabled={!formData.marque}
                                        classNamePrefix="react-select"
                                        styles={selectStyles('modele')}
                                    />
                                    {fieldErrorMsg('modele') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('modele')}
                                        </p>
                                    )}
                                </div>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Année</span>
                                    <input
                                        name="annee"
                                        value={formData.annee}
                                        onChange={handleChange}
                                        className={inputClass('annee')}
                                        type="number"
                                    />
                                    {fieldErrorMsg('annee') && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('annee')}
                                        </p>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <>
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                                <div className="mb-7 flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                        <span className="material-symbols-outlined text-[18px]">settings_input_component</span>
                                    </span>
                                    <h2 className="text-lg font-semibold">Spécifications techniques</h2>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Couleur</span>
                                        <input
                                            name="couleur"
                                            value={formData.couleur}
                                            onChange={handleChange}
                                            className={inputClass('couleur')}
                                            type="text"
                                            placeholder="Ex: Noir Métallisé"
                                        />
                                    </label>
                                    <div>
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Carburant</span>
                                        <Dropdown
                                            name="carburant"
                                            options={[
                                                { value: 'Diesel', label: 'Diesel' },
                                                { value: 'Essence', label: 'Essence' },
                                                { value: 'Hybride', label: 'Hybride' },
                                                { value: 'Electrique', label: 'Électrique' }
                                            ]}
                                            value={formData.carburant}
                                            onChange={(v) => handleChange({ target: { name: 'carburant', value: v } })}
                                        />
                                    </div>
                                    <label className="block">
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Kilométrage actuel</span>
                                        <input
                                            name="kilometrage"
                                            value={formData.kilometrage}
                                            onChange={handleChange}
                                            className={inputClass('kilometrage')}
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
                                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prochaine vidange (km)</span>
                                        <input
                                            name="prochain_vidange_km"
                                            value={formData.prochain_vidange_km}
                                            onChange={handleChange}
                                            className={inputClass('prochain_vidange_km')}
                                            type="number"
                                        />
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 3 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                            <div className="mb-7 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <span className="material-symbols-outlined text-[18px]">payments</span>
                                </span>
                                <h2 className="text-lg font-semibold">Tarification</h2>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Prix journalier (DH)</span>
                                    <input
                                        name="prix_par_jour"
                                        value={formData.prix_par_jour}
                                        onChange={handleChange}
                                        className={inputClass('prix_par_jour')}
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
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-300 text-blue-600"
                                            style={{ accentColor: '#2563eb' }}
                                            name="chauffeur_disponible"
                                            checked={formData.chauffeur_disponible}
                                            onChange={handleChange}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Chauffeur disponible avec ce véhicule</span>
                                    </label>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tarif km suppl. spécifique à ce véhicule (DH/km)</span>
                                    <input
                                        name="tarif_km_extra"
                                        value={formData.tarif_km_extra || ''}
                                        onChange={handleChange}
                                        className={inputClass('tarif_km_extra')}
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        placeholder="Laissez vide = utiliser le tarif agence (défaut)"
                                    />
                                    <p className="mt-2 text-xs text-slate-400">Si non renseigné, le tarif par défaut des Paramètres sera appliqué.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
                            <div className="mb-7 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                </span>
                                <h2 className="text-lg font-semibold">Validité & Statut</h2>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expiration assurance</span>
                                    <input
                                        name="date_assurance"
                                        value={formData.date_assurance}
                                        onChange={handleChange}
                                        className={inputClass('date_assurance')}
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
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Visite technique</span>
                                    <input
                                        name="date_visite_technique"
                                        value={formData.date_visite_technique}
                                        onChange={handleChange}
                                        className={inputClass('date_visite_technique')}
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
                                <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</span>
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
                                                <span>{status === 'Available' ? 'Disponible' : status === 'Maintenance' ? 'Maintenance' : 'Louée'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                        </div>

                        {/* Photo */}
                        <div className="space-y-5">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                                    </span>
                                    <h2 className="font-semibold text-slate-900">Photo du véhicule</h2>
                                </div>
                                {imagePreview ? (
                                    <div className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200">
                                        <img
                                            src={imagePreview}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            alt="Aperçu"
                                        />
                                        <label className="absolute right-3 top-3 cursor-pointer rounded-full bg-white/80 p-2 shadow-sm backdrop-blur transition-colors hover:bg-white">
                                            <span className="material-symbols-outlined text-[18px] text-blue-600">photo_camera</span>
                                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                        </label>
                                    </div>
                                ) : (
                                    <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
                                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600">📷</div>
                                        <p className="text-sm font-semibold text-slate-700">Glisser une image ici</p>
                                        <p className="mt-1 text-sm text-blue-600">ou cliquer pour parcourir</p>
                                        <p className="mt-3 text-xs text-slate-400">Formats acceptés : JPG, PNG (max. 5 Mo)</p>
                                        <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                    </label>
                                )}
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
                        onClick={() => navigate('/vehicles')}
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
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        >
                            <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                            {loading ? 'Enregistrement…' : 'Enregistrer'}
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
                    ) : !isEditMode && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center rounded-md border border-slate-300 py-2 px-4 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                        >
                            <span className="material-symbols-outlined text-[16px] mr-1">check</span>
                            {loading ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleForm;
