import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { jwtDecode } from 'jwt-decode';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
import { toast } from './Toast';

const getLocalDatetime = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

const ContractForm = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userRole, setUserRole] = useState('');
    const [agencySettings, setAgencySettings] = useState({ caution_active: true, caution_montant: 1500 });
    const [isCautionActive, setIsCautionActive] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});

    const steps = [
        { num: 1, label: 'Véhicule', icon: 'directions_car' },
        { num: 2, label: 'Client', icon: 'person' },
        { num: 3, label: 'Période & Tarification', icon: 'payments' },
        { num: 4, label: 'Inspection & Validation', icon: 'fact_check' },
    ];

    const hasError = (name) => Boolean(fieldErrors[name]);

    
    const [formData, setFormData] = useState({
        vehicle: '',
        client: '',
        deuxieme_chauffeur: '',
        date_sortie: getLocalDatetime(new Date()),
        date_retour_prevue: getLocalDatetime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        prix_par_jour: 0,
        montant_paye: 0,
        caution: 1500,
        km_sortie: 0,
        carburant_sortie: '2/8',
        statut: 'EN_COURS',
        notes: '',
        degats_depart: '',
        damages: [],
        chauffeur_service: false,
        // Éléments de l'état du véhicule
        roue_secours: false,
        cric: false,
        manivelle: false,
        gilet: false,
        triangle: false,
        extincteur: false,
        papiers: false,
        cles: true,
    });

    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);

    const fetchClients = async () => {
        try {
            const response = await api.get('clients/');
            setClients(response.data);
            return response.data;
        } catch (error) {
            console.error("Erreur lors du chargement des clients", error);
            return [];
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role || '');
            } catch (err) {
                console.error("Token decode error:", err);
            }
        }

        const fetchData = async () => {
            try {
                const [vRes, cRes, settingsRes] = await Promise.all([
                    api.get('vehicles/'),
                    api.get('clients/'),
                    api.get('agency/settings/').catch(() => ({ data: { caution_active: true, caution_montant: 1500 } }))
                ]);
                // On ne garde que les véhicules disponibles pour un nouveau contrat
                setVehicles(vRes.data.filter(v => v.statut === 'Available'));
                setClients(cRes.data);
                
                const settings = settingsRes.data;
                setAgencySettings(settings);
                setIsCautionActive(settings.caution_active);
                setFormData(prev => ({
                    ...prev,
                    caution: settings.caution_active ? parseFloat(settings.caution_montant) : 0
                }));
                
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors du chargement des données", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
            setFieldErrors((prev) => ({ ...prev, vehicle: false }));
            setFormData({
                ...formData,
                vehicle: vehicle.id,
                prix_par_jour: vehicle.prix_par_jour || 0,
                km_sortie: vehicle.kilometrage || 0
            });
        };
    
        const diffDays = () => {
            const start = new Date(formData.date_sortie);
            const end = new Date(formData.date_retour_prevue);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays || 1;
        };
    
        const totalEstimate = () => {
            const days = diffDays();
            const base = days * formData.prix_par_jour;
            const chauffeur = formData.chauffeur_service ? 50 * days : 0; // Exemple: 50 DH/jour pour le chauffeur
            return base + chauffeur;
        };
    
        const handleNext = () => {
            if (currentStep === 1) {
                if (!formData.vehicle) { setFieldErrors((prev) => ({ ...prev, vehicle: true })); toast.error('Veuillez sélectionner un véhicule'); return; }
            }
            if (currentStep === 2) {
                if (!formData.client) { setFieldErrors((prev) => ({ ...prev, client: true })); toast.error('Veuillez sélectionner un client'); return; }
            }
            setCurrentStep((prev) => Math.min(prev + 1, 4));
        };
        const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
    
        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!formData.vehicle) { setFieldErrors((prev) => ({ ...prev, vehicle: true })); setCurrentStep(1); toast.error('Veuillez sélectionner un véhicule'); return; }
            if (!formData.client) { setFieldErrors((prev) => ({ ...prev, client: true })); setCurrentStep(2); toast.error('Veuillez sélectionner un client'); return; }
            try {
                const dataToSubmit = {
                    ...formData,
                    jours: diffDays(),
                    montant_total: totalEstimate(),
                    // Les dates sont maintenant des datetime-local (YYYY-MM-DDTHH:mm)
                    date_sortie: `${formData.date_sortie}:00`,
                    date_retour_prevue: `${formData.date_retour_prevue}:00`,
                };
                await api.post('contracts/', dataToSubmit);
            if (dataToSubmit.vehicle && dataToSubmit.statut === 'EN_COURS') {
                try {
                    await api.patch(`vehicles/${dataToSubmit.vehicle}/`, { statut: 'Rented' });
                } catch (vErr) {
                    console.error("Erreur lors de la mise à jour du véhicule", vErr);
                }
            }
            navigate('/contracts');
            toast.success('Contrat créé avec succès.');
            } catch (error) {
                console.error("Erreur lors de la création du contrat", error);
                if (error.response?.data?.non_field_errors) {
                    toast.error(error.response.data.non_field_errors[0]);
                } else if (error.response?.data?.detail) {
                    toast.error(error.response.data.detail);
                } else {
                    toast.error("Erreur lors de la création du contrat. Vérifiez les champs et la disponibilité du véhicule.");
                }
            }
        };
    
        const filteredVehicles = vehicles.filter(v => 
            v.marque_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            v.modele_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
        if (loading) return <div className="p-8 text-center font-bold text-indigo-600">Initialisation du Fleet Concierge...</div>;
    
        return (
            <div className="min-h-screen">
                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Fleet Concierge</span>
                            <div className="h-px w-8 bg-indigo-300"></div>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Nouveau Contrat de Location</h2>
                        <p className="text-slate-500 mt-2 max-w-md text-sm">Remplissez les détails ci-dessous pour créer un nouveau contrat.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/contracts')}
                            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                        >
                            Annuler
                        </button>
                    </div>
                </header>

                {/* Stepper Header */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 flex-1">
                        {steps.map((s, i) => {
                            const active = currentStep === s.num;
                            const done = currentStep > s.num;
                            return (
                                <React.Fragment key={s.num}>
                                    {i > 0 && <div className={`h-0.5 flex-1 rounded-full ${currentStep >= s.num ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(s.num)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
    
                {/* Bento Layout Grid */}
                <div className="grid grid-cols-12 gap-6 pb-20">
                    {/* Left Column: Form Sections */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        {currentStep === 1 && (
                        <section className={`bg-white p-8 rounded-2xl border shadow-sm transition-colors ${hasError('vehicle') ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-indigo-600">directions_car</span>
                                    <h3 className="text-xl font-extrabold text-slate-900">Sélection du Véhicule</h3>
                                </div>
                                <div className="relative">
                                    <input 
                                        className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 w-64" 
                                        placeholder="Rechercher dans la flotte..." 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-sm">search</span>
                                </div>
                            </div>
    
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto p-1">
                                {filteredVehicles.map(vehicle => (
                                    <div 
                                        key={vehicle.id}
                                        onClick={() => handleVehicleSelect(vehicle)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center group ${formData.vehicle === vehicle.id ? 'border-indigo-600 bg-indigo-50/30 shadow-md shadow-indigo-100/50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-24 h-16 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.modele_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300 text-3xl">directions_car</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-sm transition-colors ${formData.vehicle === vehicle.id ? 'text-indigo-700' : 'text-slate-900'}`}>{vehicle.marque_name} {vehicle.modele_name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-wider">{vehicle.matricule}</span>
                                                <span className="text-xs text-indigo-600 font-bold">{vehicle.prix_par_jour} DH/j</span>
                                            </div>
                                        </div>
                                    {formData.vehicle === vehicle.id && (
                                        <span className="material-symbols-outlined text-indigo-600 text-xl">check_circle</span>
                                    )}
                                </div>
                            ))}
                            {filteredVehicles.length === 0 && (
                                <div className="col-span-2 py-10 text-center text-slate-400 font-medium text-sm">Aucun véhicule disponible trouvé.</div>
                            )}
                        </div>
                    </section>
                        )}

                        {currentStep === 2 && (
                    <section className={`bg-white p-8 rounded-2xl border shadow-sm transition-colors ${hasError('client') ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-indigo-600">person</span>
                                <h3 className="text-xl font-extrabold text-slate-900">Informations Client</h3>
                            </div>
                            <button 
                                onClick={() => setShowClientModal(true)}
                                className="text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 ring-1 ring-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                NOUVEAU CLIENT
                            </button>
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Sélectionner un client existant</label>
                            <Select 
                                options={clients.map(c => ({
                                    value: c.id,
                                    label: `${c.nom} ${c.prenom} (${c.cin_passport})`,
                                    clientData: c
                                }))}
                                onChange={(opt) => {
                                    setFormData({...formData, client: opt ? opt.value : ''});
                                    setFieldErrors((prev) => ({ ...prev, client: false }));
                                }}
                                value={formData.client ? {
                                    value: formData.client,
                                    label: clients.find(c => c.id == formData.client) ? `${clients.find(c => c.id == formData.client).nom} ${clients.find(c => c.id == formData.client).prenom} (${clients.find(c => c.id == formData.client).cin_passport})` : ''
                                } : null}
                                placeholder="Rechercher par nom, prénom ou CIN..."
                                isSearchable
                                isClearable
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.75rem',
                                        padding: '4px',
                                        borderColor: state.isFocused ? '#4f46e5' : '#e2e8f0',
                                        boxShadow: state.isFocused ? '0 0 0 1px #4f46e5' : 'none'
                                    })
                                }}
                            />
                        </div>
                        
                        {formData.client && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Téléphone</p>
                                    <p className="text-sm font-bold text-slate-900">{clients.find(c => c.id == formData.client)?.telephone || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">N° Permis</p>
                                    <p className="text-sm font-bold text-slate-900">{clients.find(c => c.id == formData.client)?.permis_conduite || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Deuxième Conducteur (Optionnel)</label>
                            <Select 
                                options={clients.filter(c => c.id != formData.client).map(c => ({
                                    value: c.id,
                                    label: `${c.nom} ${c.prenom} (${c.cin_passport})`
                                }))}
                                onChange={(opt) => setFormData({...formData, deuxieme_chauffeur: opt ? opt.value : ''})}
                                value={formData.deuxieme_chauffeur ? {
                                    value: formData.deuxieme_chauffeur,
                                    label: clients.find(c => c.id == formData.deuxieme_chauffeur) ? `${clients.find(c => c.id == formData.deuxieme_chauffeur).nom} ${clients.find(c => c.id == formData.deuxieme_chauffeur).prenom} (${clients.find(c => c.id == formData.deuxieme_chauffeur).cin_passport})` : ''
                                } : null}
                                placeholder="Rechercher un deuxième chauffeur..."
                                isSearchable
                                isClearable
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base, state) => ({
                                        ...base,
                                        backgroundColor: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.75rem',
                                        padding: '4px',
                                        borderColor: state.isFocused ? '#4f46e5' : '#e2e8f0',
                                        boxShadow: state.isFocused ? '0 0 0 1px #4f46e5' : 'none'
                                    })
                                }}
                            />
                        </div>
                    </section>
                        )}

                        {currentStep === 4 && (
                        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-indigo-600">checklist</span>
                            <h3 className="text-xl font-extrabold text-slate-900">Accessoires & État du Véhicule</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { id: 'roue_secours', label: 'Roue Secours' },
                                { id: 'cric', label: 'Cric' },
                                { id: 'manivelle', label: 'Manivelle' },
                                { id: 'gilet', label: 'Gilet' },
                                { id: 'triangle', label: 'Triangle' },
                                { id: 'extincteur', label: 'Extincteur' },
                                { id: 'papiers', label: 'Papiers' },
                                { id: 'cles', label: 'Clés' },
                            ].map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => setFormData({...formData, [item.id]: !formData[item.id]})}
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${formData[item.id] ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {formData[item.id] ? 'check_box' : 'check_box_outline_blank'}
                                    </span>
                                    <span className="text-xs font-bold">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Niveau de Carburant</label>
                                <FuelGaugeSelector 
                                    value={formData.carburant_sortie}
                                    onChange={(val) => setFormData({...formData, carburant_sortie: val})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Kilos Départ</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-xs">KM</span>
                                    <input 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-slate-50/50 pl-12 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        type="number" 
                                        value={formData.km_sortie}
                                        onChange={(e) => setFormData({...formData, km_sortie: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">État & Dégâts au Départ</label>
                            <DamageSelector 
                                damages={formData.damages}
                                onChange={(newDamages) => setFormData({...formData, damages: newDamages})}
                                type="DEPART"
                            />
                            
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Observation générale (optionnel)</label>
                                <textarea 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 resize-none" 
                                    placeholder="Note supplémentaire sur l'état général..." 
                                    rows="2"
                                    value={formData.degats_depart}
                                    onChange={(e) => setFormData({...formData, degats_depart: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    </section>
                        )}

                        {currentStep === 3 && (
                        <>
                    {/* Rental Dates & Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-indigo-600">calendar_today</span>
                                <h3 className="text-xl font-extrabold text-slate-900">Période de Location</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Date et Heure de Départ</label>
                                    <input 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        type="datetime-local"
                                        value={formData.date_sortie}
                                        onChange={(e) => setFormData({...formData, date_sortie: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Date et Heure de Retour Prévu</label>
                                    <input 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        type="datetime-local"
                                        value={formData.date_retour_prevue}
                                        onChange={(e) => setFormData({...formData, date_retour_prevue: e.target.value})}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-indigo-600">room_service</span>
                                <h3 className="text-xl font-extrabold text-slate-900">Préférences & Caution</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-200 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Service Chauffeur</p>
                                        <p className="text-xs text-slate-500">Conducteur premium</p>
                                    </div>
                                    <div 
                                        onClick={() => setFormData({...formData, chauffeur_service: !formData.chauffeur_service})}
                                        className="relative inline-flex items-center cursor-pointer"
                                    >
                                        <div className={`w-11 h-6 transition-colors rounded-full relative ${formData.chauffeur_service ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.chauffeur_service ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2 pl-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Garantie (Caution)</label>
                                        <div 
                                            onClick={() => {
                                                const newState = !isCautionActive;
                                                setIsCautionActive(newState);
                                                setFormData({...formData, caution: newState ? agencySettings.caution_montant : 0});
                                            }}
                                            className="relative inline-flex items-center cursor-pointer"
                                        >
                                            <div className={`w-9 h-5 transition-colors rounded-full relative ${isCautionActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${isCautionActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                        <input 
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold pl-12 outline-none transition-all duration-200 ${!isCautionActive ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600'}`} 
                                            type="number" 
                                            value={formData.caution}
                                            onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                            disabled={!isCautionActive}
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Montant Versé</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                            <input 
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-slate-50/50 pl-12 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                                type="number" 
                                                value={formData.montant_paye}
                                                onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Mode de Paiement</label>
                                        <Dropdown
                                            options={[
                                                { value: 'Espèce', label: 'Espèce' },
                                                { value: 'Chèque', label: 'Chèque' },
                                                { value: 'TPE', label: 'TPE' },
                                                { value: 'Virement', label: 'Virement' }
                                            ]}
                                            value={formData.methode_paiement || 'Espèce'}
                                            onChange={(v) => setFormData({...formData, methode_paiement: v})}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 hidden">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Statut Initial du Contrat</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, statut: 'EN_COURS'})}
                                            className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${formData.statut === 'EN_COURS' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined">play_circle</span>
                                            <span className="text-[10px] font-bold uppercase">Actif Immédiat</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, statut: 'RESERVE'})}
                                            className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${formData.statut === 'RESERVE' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined">event_note</span>
                                            <span className="text-[10px] font-bold uppercase">Réservation</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                        </>
                        )}

                        {currentStep === 4 && (
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-indigo-600">notes</span>
                            <h3 className="text-xl font-extrabold text-slate-900">Dispositions Particulières</h3>
                        </div>
                        <textarea 
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 resize-none" 
                            placeholder="Entrez toute condition supplémentaire, notes sur l'état, ou demandes client..." 
                            rows="4"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        ></textarea>
                    </section>
                        )}
                </div>

                {/* Bottom Navigation */}
                <div className="col-span-12 lg:col-span-8 mt-6 flex items-center justify-between gap-4">
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Précédent
                        </button>
                    ) : (
                        <span></span>
                    )}
                    {currentStep < 4 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200/50 flex items-center gap-2 transition-all text-sm"
                        >
                            Suivant
                            <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200/50 flex items-center gap-2 transition-all text-sm"
                        >
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'opsz' 20" }}>check_circle</span>
                            Valider le Contrat
                        </button>
                    )}
                </div>

                {/* Right Column: Pricing Summary */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="sticky top-12 space-y-6">
                        <section className="bg-slate-950 text-white p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
                            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                            
                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-8">Résumé Estimatif</h3>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xl font-bold">{diffDays()} Jours de Location</p>
                                        <p className="text-xs text-slate-400">{selectedVehicle ? `${selectedVehicle.marque_name} ${selectedVehicle.modele_name}` : 'Aucun véhicule sélectionné'}</p>
                                    </div>
                                    <p className="text-base font-bold">{ (diffDays() * formData.prix_par_jour).toLocaleString() } DH</p>
                                </div>
                                
                                {formData.chauffeur_service && (
                                    <div className="flex justify-between items-center py-4 border-y border-slate-800">
                                        <p className="text-sm font-medium">Supplement Chauffeur</p>
                                        <p className="text-sm font-medium">+{(diffDays() * 50).toLocaleString()} DH</p>
                                    </div>
                                )}
                                
                                <div className="pt-4">
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Approximatif</p>
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-4xl font-extrabold tracking-tighter text-indigo-400">{totalEstimate().toLocaleString()} DH</p>
                                        <p className="text-xs text-slate-500">TTC</p>
                                    </div>
                                </div>

                                {isCautionActive && (
                                    <div className="mt-8 p-4 bg-white/10 rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-emerald-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Caution Requise</span>
                                        </div>
                                        <p className="text-lg font-bold">{parseFloat(formData.caution || 0).toLocaleString()} DH</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1 italic">Retenue autorisée sur carte ou par dépôt.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3 text-slate-500">
                                <span className="material-symbols-outlined text-sm">info</span>
                                <p className="text-xs leading-relaxed">Le système vérifie automatiquement la disponibilité en temps réel.</p>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500">
                                <span className="material-symbols-outlined text-sm">lock</span>
                                <p className="text-xs leading-relaxed">Les contrats sont légalement contraignants dès la validation.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddClientModal 
                isOpen={showClientModal} 
                onClose={() => setShowClientModal(false)} 
                onClientCreated={(newClient) => {
                    setClients(prev => [...prev, newClient]);
                    setFormData(prev => ({ ...prev, client: newClient.id }));
                    setFieldErrors(prev => ({ ...prev, client: false }));
                }}
            />
        </div>
    );
};

const AddClientModal = ({ isOpen, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        email: '',
        telephone: '',
        adresse: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('clients/', formData);
            onClientCreated(response.data);
            onClose();
            // Reset form
            setFormData({
                prenom: '', nom: '', cin_passport: '', email: '',
                telephone: '', adresse: '', permis_conduite: '',
                date_delivrance_permis: '', remarques: ''
            });
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-slate-900">Nouveau Client Rapide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-100">{error}</div>}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Prénom</label>
                            <input name="prenom" value={formData.prenom} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="ex. Adam" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nom</label>
                            <input name="nom" value={formData.nom} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="ex. Bennett" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">CIN / Passeport</label>
                            <input name="cin_passport" value={formData.cin_passport} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="ex. AB123456" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Téléphone</label>
                            <input name="telephone" value={formData.telephone} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="+212 6..." />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Permis de Conduire</label>
                            <input name="permis_conduite" value={formData.permis_conduite} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="Numéro de permis" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-[2] px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200/50 transition-all disabled:opacity-50">
                            {loading ? 'Création...' : 'Créer et Sélectionner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
