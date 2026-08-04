import React, { useState, useEffect } from 'react';
// Force Vercel redeploy - fix vehicle edit image issue
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';

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
        if (formData.marque) {
            const fetchModels = async () => {
                try {
                    const response = await api.get(`modelcars/?brand=${formData.marque}`);
                    setModels(response.data);
                } catch (error) {
                    console.error("Erreur lors de la récupération des modèles", error);
                }
            };
            fetchModels();
        } else {
            setModels([]);
        }
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
        setLoading(true);
        setError(null);

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

    const handleDelete = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) {
            try {
                await api.delete(`vehicles/${id}/`);
                navigate('/vehicles');
            } catch (error) {
                console.error("Erreur lors de la suppression du véhicule", error);
            }
        }
    };

    if (fetching) return <div className="flex items-center justify-center min-h-screen text-primary font-bold">Chargement...</div>;

    return (
        <div className="p-10 max-w-7xl mx-auto animate-fade-in">
            {/* Breadcrumbs & Actions Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Link to="/vehicles" className="text-xs font-inter uppercase tracking-widest hover:text-primary transition-colors">Flotte</Link>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-xs font-inter uppercase tracking-widest text-primary font-bold">
                            {isEditMode ? `${formData.marque} ${formData.modele}` : 'Nouveau Véhicule'}
                        </span>
                    </div>
                    <h2 className="text-4xl font-extrabold font-manrope text-blue-900 tracking-tight flex items-center gap-4">
                        {isEditMode ? 'Modifier le Véhicule' : 'Ajouter un Véhicule'}
                        {isEditMode && <span className="text-lg font-normal text-slate-300 font-inter">ID: #{id}</span>}
                    </h2>
                </div>
                {isEditMode && (
                    <button 
                        type="button"
                        onClick={handleDelete}
                        className="group flex items-center gap-2 text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">delete</span>
                        <span className="font-inter font-semibold text-sm">Supprimer</span>
                    </button>
                )}
            </div>
            
            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
                    <span className="material-symbols-outlined">error</span>
                    <p className="font-inter font-semibold text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
                {/* Left Column: Form Sections */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Vehicle Identification Section */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">fingerprint</span>
                            </div>
                            <h3 className="font-manrope font-semibold text-lg text-blue-900">Identification</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Matricule</label>
                                <input 
                                    name="matricule"
                                    value={formData.matricule}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-b-2 border-primary border-t-0 border-l-0 border-r-0 py-3 px-4 font-manrope text-lg font-semibold text-slate-900 focus:ring-0 focus:bg-white transition-all" 
                                    type="text" 
                                    placeholder="Ex: 12345-A-50"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Marque</label>
                                <Select 
                                    options={brands.map(brand => ({ value: brand.id, label: brand.name }))}
                                    onChange={(opt) => {
                                        setFormData(prev => ({ ...prev, marque: opt ? opt.value : '', modele: '' }));
                                    }}
                                    value={formData.marque ? { value: formData.marque, label: brands.find(b => b.id == formData.marque)?.name || '' } : null}
                                    placeholder="Sélectionner une marque"
                                    isSearchable
                                    isClearable
                                    classNamePrefix="react-select"
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: '#f8fafc',
                                            border: 'none',
                                            borderBottom: '2px solid #e2e8f0',
                                            borderRadius: '0',
                                            padding: '2px 0'
                                        }),
                                        placeholder: (base) => ({ ...base, color: '#94a3b8' })
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Modèle</label>
                                <Select 
                                    options={models.map(model => ({ value: model.id, label: model.name }))}
                                    onChange={(opt) => {
                                        setFormData(prev => ({ ...prev, modele: opt ? opt.value : '' }));
                                    }}
                                    value={formData.modele ? { value: formData.modele, label: models.find(m => m.id == formData.modele)?.name || '' } : null}
                                    placeholder="Sélectionner un modèle"
                                    isSearchable
                                    isClearable
                                    isDisabled={!formData.marque}
                                    classNamePrefix="react-select"
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: !formData.marque ? '#f1f5f9' : '#f8fafc',
                                            border: 'none',
                                            borderBottom: '2px solid #e2e8f0',
                                            borderRadius: '0',
                                            padding: '2px 0'
                                        }),
                                        placeholder: (base) => ({ ...base, color: '#94a3b8' })
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Année</label>
                                <input 
                                    name="annee"
                                    value={formData.annee}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 border-t-0 border-l-0 border-r-0 py-3 px-4 font-manrope text-lg font-semibold text-slate-900 focus:ring-0 focus:border-primary focus:bg-white transition-all" 
                                    type="number" 
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* Technical Specs Section */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">settings_input_component</span>
                            </div>
                            <h3 className="font-manrope font-semibold text-lg text-blue-900">Spécifications</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Kilométrage (KM)</label>
                                <div className="relative">
                                    <input 
                                        name="kilometrage"
                                        value={formData.kilometrage}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-b-2 border-slate-200 border-t-0 border-l-0 border-r-0 py-3 px-4 font-manrope text-lg font-semibold text-slate-900 focus:ring-0 focus:border-primary focus:bg-white transition-all" 
                                        type="number" 
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-inter text-xs font-bold">KM</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Carburant</label>
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
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Couleur</label>
                                <input 
                                    name="couleur"
                                    value={formData.couleur}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 border-t-0 border-l-0 border-r-0 py-3 px-4 font-manrope text-lg font-semibold text-slate-900 focus:ring-0 focus:border-primary focus:bg-white transition-all" 
                                    type="text" 
                                    placeholder="Ex: Noir Métallisé"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Prochain Vidange (KM)</label>
                                <input 
                                    name="prochain_vidange_km"
                                    value={formData.prochain_vidange_km}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border-b-2 border-slate-200 border-t-0 border-l-0 border-r-0 py-3 px-4 font-manrope text-lg font-semibold text-slate-900 focus:ring-0 focus:border-primary focus:bg-white transition-all" 
                                    type="number" 
                                />
                            </div>
                        </div>
                    </section>

                    {/* Tarification Section */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">payments</span>
                            </div>
                            <h3 className="font-manrope font-semibold text-lg text-blue-900">Tarification</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                            <div className="bg-slate-50 p-6 rounded-2xl space-y-2 border border-slate-100">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500">Prix Journalier</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        name="prix_par_jour"
                                        value={formData.prix_par_jour}
                                        onChange={handleChange}
                                        className="bg-transparent border-none p-0 font-manrope font-bold text-3xl text-primary focus:ring-0 w-32"
                                        type="number"
                                        step="0.01"
                                        required
                                    />
                                    <span className="text-slate-400 font-bold">DH / jour</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-center border border-slate-100">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500 mb-3">Service Chauffeur</label>
                                <label className="inline-flex items-center cursor-pointer">
                                    <input 
                                        name="chauffeur_disponible"
                                        checked={formData.chauffeur_disponible}
                                        onChange={handleChange}
                                        className="sr-only peer" 
                                        type="checkbox"
                                    />
                                    <div className="relative w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                    <span className="ml-4 text-sm font-bold text-blue-900 transition-colors">
                                        {formData.chauffeur_disponible ? 'Disponible' : 'Non disponible'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Tarif km extra override */}
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500 flex items-center gap-1 mb-2">
                                <span className="material-symbols-outlined text-sm text-primary">speed</span>
                                Tarif km suppl. spécifique à ce véhicule (DH/km)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">DH</span>
                                <input
                                    name="tarif_km_extra"
                                    value={formData.tarif_km_extra || ''}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-blue-100 rounded-lg pl-10 pr-4 py-2.5 font-manrope font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    placeholder="Laissez vide = utiliser le tarif agence (défaut)"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">Si non renseigné, le tarif par défaut des Paramètres sera appliqué.</p>
                        </div>
                    </section>

                    {/* Administrative Validity */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">verified_user</span>
                            </div>
                            <h3 className="font-manrope font-semibold text-lg text-blue-900">Validité</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary">policy</span>
                                    Expiration Assurance
                                </label>
                                <input 
                                    name="date_assurance"
                                    value={formData.date_assurance}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-manrope font-bold text-slate-700 focus:bg-white focus:border-primary transition-all shadow-sm" 
                                    type="date"
                                    required
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="font-inter uppercase tracking-wider text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-primary">engineering</span>
                                    Visite Technique
                                </label>
                                <input 
                                    name="date_visite_technique"
                                    value={formData.date_visite_technique}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-manrope font-bold text-slate-700 focus:bg-white focus:border-primary transition-all shadow-sm" 
                                    type="date"
                                    required
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Sidebar/Action Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Status Card */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-white shadow-sm">
                        <h3 className="font-manrope font-bold text-blue-900 mb-6">Statut</h3>
                        <div className="space-y-3">
                            {['Available', 'Maintenance', 'Rented'].map((status) => (
                                <button 
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, statut: status }))}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${
                                        formData.statut === status 
                                        ? 'bg-blue-900 text-white border-blue-900 shadow-lg shadow-blue-900/20' 
                                        : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-xl">
                                            {status === 'Available' ? 'check_circle' : status === 'Maintenance' ? 'build' : 'key'}
                                        </span>
                                        <span className={`font-inter ${formData.statut === status ? 'font-bold' : 'font-semibold'}`}>
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

                    {/* Quick Preview Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-primary group aspect-video shadow-2xl border-4 border-white">
                        {imagePreview ? (
                            <img 
                                src={imagePreview} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                alt="Aperçu" 
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white/30 font-inter text-sm flex-col gap-2">
                                <span className="material-symbols-outlined text-4xl">image</span>
                                <span>Aucune Image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent flex flex-col justify-end p-6">
                            <p className="text-white/60 text-[10px] font-inter uppercase tracking-[0.2em] font-bold mb-1">Aperçu Dynamique</p>
                            <h4 className="text-white font-manrope font-bold text-2xl tracking-tight">{formData.matricule || 'XXX-XXXX'}</h4>
                            <p className="text-white/80 text-xs font-inter font-medium">
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

                    {/* CTA Actions */}
                    <div className="space-y-4 pt-6">
                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl font-manrope font-bold text-lg shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined">save</span>
                            {loading ? 'Enregistrement...' : 'Sauvegarder'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => navigate('/vehicles')}
                            className="w-full py-4 bg-white text-slate-400 rounded-2xl font-inter font-bold border border-slate-100 hover:bg-slate-50 hover:text-slate-600 transition-all text-sm"
                        >
                            Abandonner
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default VehicleForm;
