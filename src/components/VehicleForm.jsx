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
        traccar_device_id: '',
        gps_imei: '',
        sim_number: '',
        sim_operator: '',
    });

    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [traccarDevices, setTraccarDevices] = useState([]);
    const [fetching, setFetching] = useState(isEditMode);

    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [uniqueErrors, setUniqueErrors] = useState({});
    const [checkingUnique, setCheckingUnique] = useState({});
    const [syncingDevice, setSyncingDevice] = useState(false);

    const steps = [
        { num: 1, label: 'Identification', icon: 'fingerprint' },
        { num: 2, label: 'Spécifications', icon: 'settings_input_component' },
        { num: 3, label: 'Tarification', icon: 'payments' },
        { num: 4, label: 'Validité & Statut', icon: 'verified_user' },
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

    const inputClass = (name) => `field transition-all duration-200 ${
        hasError(name)
            ? 'border-rose-400 bg-rose-50/40 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'focus:bg-white'
    }`;

    const selectStyles = (name) => ({
        control: (base, state) => ({
            ...base,
            backgroundColor: state.isDisabled ? '#f1f5f9' : '#f8fafc',
            border: '1px solid',
            borderRadius: '0.5rem',
            padding: '4px',
            borderColor: hasError(name) ? '#fb7185' : (state.isFocused ? '#2563eb' : '#e2e8f0'),
            boxShadow: hasError(name) ? '0 0 0 1px #fb7185' : (state.isFocused ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none'),
        }),
        placeholder: (base) => ({ ...base, color: '#94a3b8' }),
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
        api.get('gps/devices/').then((r) => setTraccarDevices(r.data.devices || [])).catch(() => {});
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

    const handleAddTraccarDevice = async () => {
        const imei = (formData.gps_imei || '').trim();
        if (!imei) {
            toast.error('Renseignez d\'abord l\'ID/IMEI du dispositif.');
            return;
        }
        setSyncingDevice(true);
        try {
            const res = await api.post('gps/devices/', {
                name: formData.matricule || `Dispositif ${imei}`,
                uniqueId: imei,
            });
            const dev = res.data;
            setFormData((prev) => ({ ...prev, traccar_device_id: String(dev.id) }));
            setTraccarDevices((prev) =>
                prev.some((d) => String(d.id) === String(dev.id)) ? prev : [...prev, dev]
            );
            toast.success('Dispositif ajouté au serveur Traccar.');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Impossible d\'ajouter le dispositif sur Traccar.');
        } finally {
            setSyncingDevice(false);
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
                if (key === 'traccar_device_id' && (value === '' || value === null || value === undefined)) {
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
        <div className="max-w-5xl mx-auto px-4 py-6">
            {/* Breadcrumb + header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        <Link to="/vehicles" className="hover:underline">Véhicules</Link> / {isEditMode ? 'Modifier' : 'Nouveau'}
                    </p>
                    <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        {isEditMode ? 'Modifier un véhicule' : 'Ajouter un véhicule'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Supprimer
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/vehicles')}
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
                            {loading ? 'Enregistrement...' : 'Sauvegarder'}
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
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Identification</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="label">Matricule</label>
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
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--on-surface-variant)' }}>
                                            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                                            Vérification de l'unicité…
                                        </p>
                                    )}
                                    {fieldErrorMsg('matricule') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('matricule')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Marque</label>
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
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('marque')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Modèle</label>
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
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('modele')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Année</label>
                                    <input
                                        name="annee"
                                        value={formData.annee}
                                        onChange={handleChange}
                                        className={inputClass('annee')}
                                        type="number"
                                    />
                                    {fieldErrorMsg('annee') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('annee')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <>
                            <div className="card shadow-l1 p-8">
                                <div className="section-title">
                                    <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                    <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Spécifications techniques</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="label">Couleur</label>
                                        <input
                                            name="couleur"
                                            value={formData.couleur}
                                            onChange={handleChange}
                                            className={inputClass('couleur')}
                                            type="text"
                                            placeholder="Ex: Noir Métallisé"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Carburant</label>
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
                                    <div>
                                        <label className="label">Kilométrage actuel</label>
                                        <input
                                            name="kilometrage"
                                            value={formData.kilometrage}
                                            onChange={handleChange}
                                            className={inputClass('kilometrage')}
                                            type="number"
                                        />
                                        {fieldErrorMsg('kilometrage') && (
                                            <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                                <span className="material-symbols-outlined text-[13px]">error</span>
                                                {fieldErrorMsg('kilometrage')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Prochaine vidange (km)</label>
                                        <input
                                            name="prochain_vidange_km"
                                            value={formData.prochain_vidange_km}
                                            onChange={handleChange}
                                            className={inputClass('prochain_vidange_km')}
                                            type="number"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="card shadow-l1 p-8">
                                <div className="section-title">
                                    <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                    <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Suivi GPS</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2">
                                        <label className="label">Boîtier Traccar</label>
                                        <Select
                                            value={traccarDevices.find((d) => String(d.id) === String(formData.traccar_device_id)) || (formData.traccar_device_id === '' ? null : { id: formData.traccar_device_id, name: `Dispositif ${formData.traccar_device_id}` })}
                                            onChange={(opt) => setFormData((prev) => ({ ...prev, traccar_device_id: opt ? String(opt.id) : '' }))}
                                            options={traccarDevices.map((d) => ({ id: d.id, name: `${d.name} (${d.uniqueId || d.id})`, value: d.id }))}
                                            isClearable
                                            isDisabled={!traccarDevices.length}
                                            placeholder={traccarDevices.length ? 'Sélectionner un dispositif…' : 'Traccar non configuré'}
                                            styles={selectStyles('traccar_device_id')}
                                            getOptionLabel={(o) => o.name}
                                            getOptionValue={(o) => String(o.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">ID / IMEI GPS</label>
                                        <input
                                            name="gps_imei"
                                            value={formData.gps_imei || ''}
                                            onChange={handleChange}
                                            className={inputClass('gps_imei')}
                                            placeholder="Ex: 862345048765432"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTraccarDevice}
                                            disabled={syncingDevice}
                                            className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            style={{ background: 'var(--primary-container)' }}
                                        >
                                            <span className={`material-symbols-outlined text-base ${syncingDevice ? 'animate-spin' : ''}`}>
                                                {syncingDevice ? 'progress_activity' : 'sensors'}
                                            </span>
                                            {syncingDevice ? 'Ajout en cours…' : 'Ajouter au serveur Traccar'}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="label">N° SIM</label>
                                        <input
                                            name="sim_number"
                                            value={formData.sim_number || ''}
                                            onChange={handleChange}
                                            className={inputClass('sim_number')}
                                            placeholder="Ex: 0671234567"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Opérateur SIM</label>
                                        <input
                                            name="sim_operator"
                                            value={formData.sim_operator || ''}
                                            onChange={handleChange}
                                            className={inputClass('sim_operator')}
                                            placeholder="Ex: Maroc Telecom, Orange, Inwi"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 3 && (
                        <div className="card shadow-l1 p-8">
                            <div className="section-title">
                                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Tarification</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="label">Prix journalier (DH)</label>
                                    <input
                                        name="prix_par_jour"
                                        value={formData.prix_par_jour}
                                        onChange={handleChange}
                                        className={inputClass('prix_par_jour')}
                                        type="number"
                                        step="0.01"
                                    />
                                    {fieldErrorMsg('prix_par_jour') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('prix_par_jour')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="check-item w-full">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4"
                                            style={{ accentColor: 'var(--primary-container)' }}
                                            name="chauffeur_disponible"
                                            checked={formData.chauffeur_disponible}
                                            onChange={handleChange}
                                        />
                                        <span className="text-[13px] font-semibold">Chauffeur disponible avec ce véhicule</span>
                                    </label>
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Tarif km suppl. spécifique à ce véhicule (DH/km)</label>
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
                                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Si non renseigné, le tarif par défaut des Paramètres sera appliqué.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="card shadow-l1 p-8">
                            <div className="section-title">
                                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Validité & Statut</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="label">Expiration assurance</label>
                                    <input
                                        name="date_assurance"
                                        value={formData.date_assurance}
                                        onChange={handleChange}
                                        className={inputClass('date_assurance')}
                                        type="date"
                                    />
                                    {fieldErrorMsg('date_assurance') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('date_assurance')}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">Visite technique</label>
                                    <input
                                        name="date_visite_technique"
                                        value={formData.date_visite_technique}
                                        onChange={handleChange}
                                        className={inputClass('date_visite_technique')}
                                        type="date"
                                    />
                                    {fieldErrorMsg('date_visite_technique') && (
                                        <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                            <span className="material-symbols-outlined text-[13px]">error</span>
                                            {fieldErrorMsg('date_visite_technique')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6">
                                <label className="label mb-3">Statut</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Available', 'Maintenance', 'Rented'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, statut: status }))}
                                            className={`check-item justify-center ${formData.statut === status ? 'on' : ''}`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {status === 'Available' ? 'check_circle' : status === 'Maintenance' ? 'build' : 'key'}
                                            </span>
                                            <span className="text-[12.5px] font-semibold">
                                                {status === 'Available' ? 'Disponible' : status === 'Maintenance' ? 'Maintenance' : 'Louée'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar : photo + summary */}
                <div className="space-y-6">
                    <div className="card shadow-l1 p-6">
                        <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>Photo du véhicule</h3>
                        {imagePreview ? (
                            <div className="aspect-video rounded-lg overflow-hidden border border-stroke relative group">
                                <img
                                    src={imagePreview}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    alt="Aperçu"
                                />
                                <label className="absolute top-3 right-3 bg-white/80 backdrop-blur p-2 rounded-full cursor-pointer hover:bg-white transition-colors shadow-l1">
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>photo_camera</span>
                                    <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                </label>
                            </div>
                        ) : (
                            <label className="dropzone aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer">
                                <span className="material-symbols-outlined text-[28px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>add_a_photo</span>
                                <p className="text-[12px] font-medium text-center" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Glisser une image ou parcourir</p>
                                <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                            </label>
                        )}
                    </div>

                    <div className="card shadow-l1 p-6">
                        <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>Résumé</h3>
                        <div className="space-y-3 text-[13px]">
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Matricule</span>
                                <span className="font-semibold">{formData.matricule || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Marque</span>
                                <span className="font-semibold">{brands.find(b => b.id == formData.marque)?.name || (isEditMode ? formData.marque_name : '—')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Modèle</span>
                                <span className="font-semibold">{models.find(m => m.id == formData.modele)?.name || (isEditMode ? formData.modele_name : '—')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Année</span>
                                <span className="font-semibold">{formData.annee || '—'}</span>
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

export default VehicleForm;
