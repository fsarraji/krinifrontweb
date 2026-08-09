import React, { useState, useEffect } from 'react';
// Force Vercel redeploy - fix vehicle edit image issue
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';

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
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const hasError = (name) => Boolean(fieldErrors[name]);

    const inputClass = (name) => `w-full px-4 py-3 rounded-xl border text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:bg-white focus:ring-1 outline-none transition-all duration-200 ${
        hasError(name)
            ? 'border-rose-400 bg-rose-50/40 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600'
    }`;

    const selectStyles = (name) => ({
        control: (base, state) => ({
            ...base,
            backgroundColor: state.isDisabled ? '#f1f5f9' : '#f8fafc',
            border: '1px solid',
            borderRadius: '0.75rem',
            padding: '4px',
            borderColor: hasError(name) ? '#fb7185' : (state.isFocused ? '#4f46e5' : '#e2e8f0'),
            boxShadow: hasError(name) ? '0 0 0 1px #fb7185' : (state.isFocused ? '0 0 0 1px #4f46e5' : 'none'),
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
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
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

    return (
        <div className="max-w-7xl mx-auto">
            {/* Breadcrumbs & Actions Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-2 uppercase tracking-widest text-xs font-bold">
                        <Link to="/vehicles" className="hover:text-indigo-650 transition-colors">Flotte</Link>
                        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                        <span className="text-slate-900 font-bold">
                            {isEditMode ? `${formData.marque_name} ${formData.modele_name}` : 'Nouveau Véhicule'}
                        </span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
                        {isEditMode ? 'Modifier le Véhicule' : 'Ajouter un Véhicule'}
                        {isEditMode && <span className="text-sm font-normal text-slate-400">ID: #{id}</span>}
                    </h2>
                </div>
                {isEditMode && (
                    <button 
                        type="button"
                        onClick={handleDelete}
                        className="group flex items-center gap-2 text-rose-600 px-4 py-2 hover:bg-rose-50 rounded-xl transition-colors font-bold text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        <span>Supprimer</span>
                    </button>
                )}
            </div>
            
            {error && (
                <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 font-semibold text-sm">
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            {/* Stepper Indicator */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8">
                <div className="flex items-center gap-3">
                    {steps.map((s, i) => {
                        const active = currentStep === s.num;
                        const done = currentStep > s.num;
                        return (
                            <React.Fragment key={s.num}>
                                {i > 0 && <div className={`h-0.5 flex-1 rounded-full ${currentStep >= s.num ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(s.num)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${active ? 'bg-white/20' : done ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {done ? '✓' : s.num}
                                    </span>
                                    {s.label}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
                {/* Left Column: Form Sections */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {currentStep === 1 && (
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">fingerprint</span>
                            </div>
                            <h3 className="font-extrabold text-lg text-slate-900">Identification</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Matricule</label>
                                <input 
                                    name="matricule"
                                    value={formData.matricule}
                                    onChange={handleChange}
                                    className={inputClass('matricule')}
                                    type="text" 
                                    placeholder="Ex: 12345-A-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Marque</label>
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
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Modèle</label>
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
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Année</label>
                                <input 
                                    name="annee"
                                    value={formData.annee}
                                    onChange={handleChange}
                                    className={inputClass('annee')}
                                    type="number"
                                />
                            </div>
                        </div>
                    </section>
                    )}

                    {currentStep === 2 && (
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">settings_input_component</span>
                            </div>
                            <h3 className="font-extrabold text-lg text-slate-900">Spécifications</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Kilométrage (KM)</label>
                                <div className="relative">
                                    <input 
                                        name="kilometrage"
                                        value={formData.kilometrage}
                                        onChange={handleChange}
                                        className={inputClass('kilometrage')}
                                        type="number"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KM</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Carburant</label>
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
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Couleur</label>
                                <input 
                                    name="couleur"
                                    value={formData.couleur}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                    placeholder="Ex: Noir Métallisé"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Prochain Vidange (KM)</label>
                                <input 
                                    name="prochain_vidange_km"
                                    value={formData.prochain_vidange_km}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="number" 
                                />
                            </div>
                        </div>
                    </section>
                    )}

                    {currentStep === 3 && (
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">payments</span>
                            </div>
                            <h3 className="font-extrabold text-lg text-slate-900">Tarification</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                            <div className={`bg-slate-50 p-6 rounded-2xl space-y-2 border transition-colors ${hasError('prix_par_jour') ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'}`}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Prix Journalier</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        name="prix_par_jour"
                                        value={formData.prix_par_jour}
                                        onChange={handleChange}
                                        className={`bg-transparent border-none p-0 font-extrabold text-2xl focus:ring-0 w-32 outline-none ${hasError('prix_par_jour') ? 'text-rose-600' : 'text-indigo-600'}`}
                                        type="number"
                                        step="0.01"
                                    />
                                    <span className="text-slate-400 font-bold">DH / jour</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-center border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Service Chauffeur</label>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input 
                                        name="chauffeur_disponible"
                                        checked={formData.chauffeur_disponible}
                                        onChange={handleChange}
                                        className="sr-only peer" 
                                        type="checkbox"
                                    />
                                    <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-4 text-sm font-bold text-slate-900 transition-colors">
                                        {formData.chauffeur_disponible ? 'Disponible' : 'Non disponible'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Tarif km extra override */}
                        <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                                <span className="material-symbols-outlined text-sm text-indigo-600">speed</span>
                                Tarif km suppl. spécifique à ce véhicule (DH/km)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">DH</span>
                                <input
                                    name="tarif_km_extra"
                                    value={formData.tarif_km_extra || ''}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="Laissez vide = utiliser le tarif agence (défaut)"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">Si non renseigné, le tarif par défaut des Paramètres sera appliqué.</p>
                        </div>
                    </section>
                    )}

                    {currentStep === 4 && (
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">verified_user</span>
                            </div>
                            <h3 className="font-extrabold text-lg text-slate-900">Validité</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-indigo-600">policy</span>
                                    Expiration Assurance
                                </label>
                                <input 
                                    name="date_assurance"
                                    value={formData.date_assurance}
                                    onChange={handleChange}
                                    className={inputClass('date_assurance')}
                                    type="date"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-indigo-600">engineering</span>
                                    Visite Technique
                                </label>
                                                                <input 
                                    name="date_visite_technique"
                                    value={formData.date_visite_technique}
                                    onChange={handleChange}
                                    className={inputClass('date_visite_technique')}
                                    type="date"
                                />
                            </div>
                        </div>
                    </section>
                    )}
                </div>

                {/* Right Column: Sidebar/Action Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Status Card */}
                    {currentStep === 4 && (
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-extrabold text-slate-900 mb-6">Statut</h3>
                        <div className="space-y-3">
                            {['Available', 'Maintenance', 'Rented'].map((status) => (
                                <button 
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, statut: status }))}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${
                                        formData.statut === status 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200/50' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">
                                            {status === 'Available' ? 'check_circle' : status === 'Maintenance' ? 'build' : 'key'}
                                        </span>
                                        <span className={formData.statut === status ? 'font-bold' : 'font-semibold'}>
                                            {status === 'Available' ? 'Disponible' : status === 'Maintenance' ? 'Maintenance' : 'Louée'}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined transition-transform duration-300 group-hover:scale-110">
                                        {formData.statut === status ? 'radio_button_checked' : 'radio_button_unchecked'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Traccar Device Card */}
                    {currentStep === 4 && (
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-extrabold text-slate-900 mb-1">Suivi GPS</h3>
                        <p className="text-xs text-slate-500 mb-4">Associez ce véhicule à un dispositif Traccar et renseignez les informations du périphérique GPS installé. Si vous renseignez l'ID/IMEI sans choisir de dispositif existant, il sera créé automatiquement sur le serveur Traccar.</p>
                        <div className="space-y-1 mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Dispositif Traccar</label>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">ID / IMEI du dispositif</label>
                                <input
                                    name="gps_imei"
                                    value={formData.gps_imei || ''}
                                    onChange={handleChange}
                                    className={inputClass('gps_imei')}
                                    placeholder="Ex: 862345048765432"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Numéro carte SIM</label>
                                <input
                                    name="sim_number"
                                    value={formData.sim_number || ''}
                                    onChange={handleChange}
                                    className={inputClass('sim_number')}
                                    placeholder="Ex: 0671234567"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Opérateur télécom</label>
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
                    )}

                    {/* Quick Preview Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 group aspect-video shadow-lg border border-slate-200">
                        {imagePreview ? (
                            <img 
                                src={imagePreview} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                alt="Aperçu" 
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm flex-col gap-2">
                                <span className="material-symbols-outlined text-4xl">image</span>
                                <span>Aucune Image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-6">
                            <p className="text-white/60 text-[10px] uppercase tracking-wider font-bold mb-1">Aperçu Dynamique</p>
                            <h4 className="text-white font-bold text-xl tracking-tight">{formData.matricule || 'XXX-XXXX'}</h4>
                            <p className="text-white/80 text-xs font-medium">
                                {isEditMode 
                                    ? `${formData.marque_name} ${formData.modele_name}`
                                    : `${brands.find(b => b.id === parseInt(formData.marque))?.name || ''} ${models.find(m => m.id === parseInt(formData.modele))?.name || ''}`
                                }
                            </p>
                        </div>
                        <label className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/40 transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-lg">
                            <span className="material-symbols-outlined text-xl">photo_camera</span>
                            <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                        </label>
                    </div>

                    {/* Step Summary */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Étape {currentStep}/4</p>
                        <p className="text-sm font-bold text-slate-900">{steps[currentStep - 1]?.label}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {currentStep === 1 && "Identifiez le véhicule : matricule, marque, modèle et année."}
                            {currentStep === 2 && "Renseignez les spécifications techniques : kilométrage, carburant, couleur et vidange."}
                            {currentStep === 3 && "Définissez le prix journalier, le service chauffeur et le tarif km supplémentaire."}
                            {currentStep === 4 && "Validez les dates de validité, le statut puis enregistrez."}
                        </p>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="col-span-12 mt-2 flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <button 
                        type="button"
                        onClick={() => navigate('/vehicles')}
                        className="px-6 py-3 bg-white text-slate-500 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all text-sm shadow-sm"
                    >
                        Abandonner
                    </button>
                    <div className="flex items-center gap-4">
                        {currentStep > 1 && (
                            <button 
                                type="button"
                                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
                                className="px-6 py-3 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-100 transition-all text-sm shadow-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">arrow_back</span>
                                Précédent
                            </button>
                        )}
                        {currentStep < 4 ? (
                            <button 
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200/50 transition-all flex items-center gap-2"
                            >
                                Suivant
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200/50 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-base">save</span>
                                {loading ? 'Enregistrement...' : 'Sauvegarder'}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default VehicleForm;
