import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api, { fetchAllPages } from '../api';
import { jwtDecode } from 'jwt-decode';
import { toast } from './Toast';

const ReservationForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [step, setStep] = useState(1);
    const [userRole, setUserRole] = useState('');
    const [agencySettings, setAgencySettings] = useState({ caution_active: true, caution_montant: 1500 });
    
    const [formData, setFormData] = useState({
        vehicle: '',
        client: '',
        deuxieme_chauffeur: '',
        date_sortie: new Date().toISOString().split('T')[0],
        date_retour_prevue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prix_par_jour: 0,
        montant_paye: 0,
        caution: 1500,
        methode_paiement: 'Espèce',
        statut: 'RESERVE',
        notes: '',
        chauffeur_service: false,
    });

    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);

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
        
        const fetchInitialData = async () => {
            try {
                const [clients, settingsRes] = await Promise.all([
                    fetchAllPages('clients/'),
                    api.get('agency/settings/').catch(() => ({ data: { caution_active: true, caution_montant: 1500 } }))
                ]);
                setClients(clients);
                
                const settings = settingsRes.data;
                setAgencySettings(settings);
                setFormData(prev => ({
                    ...prev,
                    caution: settings.caution_active ? parseFloat(settings.caution_montant) : 0
                }));
            } catch (error) {
                console.error("Erreur lors du chargement des données initiales", error);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (location.state?.vehicleId) {
            api.get(`vehicles/${location.state.vehicleId}/`)
                .then((res) => {
                    const v = res.data;
                    setSelectedVehicle(v);
                    setFormData(prev => ({ ...prev, vehicle: v.id, prix_par_jour: v.prix_par_jour || 0 }));
                    setStep(3);
                })
                .catch((error) => console.error("Erreur lors du chargement du véhicule présélectionné", error));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData({
            ...formData,
            vehicle: vehicle.id,
            prix_par_jour: vehicle.prix_par_jour || 0,
        });
    };

    useEffect(() => {
        if (!formData.vehicle || !formData.date_sortie || !formData.date_retour_prevue) { setQuote(null); return; }
        let cancelled = false;
        setQuoteLoading(true);
        api.get(`vehicles/${formData.vehicle}/price-quote/`, { params: { start: formData.date_sortie, end: formData.date_retour_prevue } })
            .then((res) => { if (!cancelled) setQuote(res.data); })
            .catch(() => { if (!cancelled) setQuote(null); })
            .finally(() => { if (!cancelled) setQuoteLoading(false); });
        return () => { cancelled = true; };
    }, [formData.vehicle, formData.date_sortie, formData.date_retour_prevue]);

    const diffDays = () => {
        const start = new Date(formData.date_sortie);
        const end = new Date(formData.date_retour_prevue);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
    };

    const totalEstimate = () => {
        const days = diffDays();
        const base = quote && quote.total != null ? parseFloat(quote.total) : days * formData.prix_par_jour;
        const chauffeur = formData.chauffeur_service ? 50 * days : 0;
        return base + chauffeur;
    };

    const checkAvailability = async () => {
        setLoading(true);
        try {
            const startStr = `${formData.date_sortie}T09:00:00`;
            const endStr = `${formData.date_retour_prevue}T09:00:00`;
            const res = await api.get(`vehicles/available_cars/?start_date=${startStr}&end_date=${endStr}`);
            setVehicles(res.data);
            setStep(2);
        } catch (error) {
            console.error("Dispo erreur", error);
            toast.error(error.response?.data?.detail || "Erreur de disponibilité");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = {
                ...formData,
                jours: diffDays(),
                montant_total: totalEstimate(),
                km_sortie: selectedVehicle?.kilometrage || 0,
                carburant_sortie: '2/8',
                date_sortie: `${formData.date_sortie}T09:00:00Z`,
                date_retour_prevue: `${formData.date_retour_prevue}T09:00:00Z`,
            };
            await api.post('contracts/', dataToSubmit);
            toast.success('Réservation créée avec succès.');
            navigate('/reservations');
        } catch (error) {
            console.error("Erreur lors de la création", error);
            if (error.response?.data?.non_field_errors) {
                toast.error(error.response.data.non_field_errors[0]);
            } else if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Erreur lors de la création de la réservation. Vérifiez les champs.");
            }
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.marque_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.modele_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-surface">
            {/* Header Section */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Fleet Concierge</span>
                        <div className="h-px w-8 bg-indigo-100"></div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nouvelle Réservation</h2>
                    <p className="text-slate-500 mt-2 max-w-md">Réservez un véhicule en 3 étapes : Dates, Choix du véhicule, et Informations du Client.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/reservations')}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors font-bold text-sm"
                    >
                        Annuler
                    </button>
                    {step === 3 && (
                        <button 
                            onClick={handleSubmit}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200/50 flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm"
                        >
                            <span className="material-symbols-outlined text-base">event_available</span>
                            Confirmer la Réservation
                        </button>
                    )}
                </div>
            </header>

            {/* Stepper Indicator */}
            <div className="flex items-center justify-center mb-10">
                <div className="flex items-center w-full max-w-2xl">
                    <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                        <span className="text-xs font-bold uppercase tracking-widest">Dates</span>
                    </div>
                    <div className={`h-1 flex-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                        <span className="text-xs font-bold uppercase tracking-widest">Véhicule</span>
                    </div>
                    <div className={`h-1 flex-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                    <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
                        <span className="text-xs font-bold uppercase tracking-widest">Client</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-12 gap-6 pb-20">
                {/* Center Column for Process */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* STEP 1: Dates */}
                    {step === 1 && (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-indigo-600 text-3xl">calendar_month</span>
                                <h3 className="text-xl font-extrabold text-slate-900">Choix de la Période</h3>
                            </div>
                            <p className="text-slate-500 mb-8 text-sm">Veuillez sélectionner la date de début et de fin de la réservation. Le système recherchera les véhicules disponibles pendant cette période précise.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Date de Départ</label>
                                    <input 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        type="date"
                                        value={formData.date_sortie}
                                        onChange={(e) => setFormData({...formData, date_sortie: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Retour Prévu</label>
                                    <input 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        type="date"
                                        min={formData.date_sortie}
                                        value={formData.date_retour_prevue}
                                        onChange={(e) => setFormData({...formData, date_retour_prevue: e.target.value})}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={checkAvailability}
                                disabled={loading || !formData.date_sortie || !formData.date_retour_prevue}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-base shadow-md shadow-indigo-200/50 flex items-center justify-center gap-3 disabled:opacity-70 transition-all"
                            >
                                {loading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                                <span className="material-symbols-outlined">search</span>
                                {loading ? 'Recherche en cours...' : 'Rechercher les véhicules'}
                            </button>
                        </div>
                    )}
                     {/* STEP 2: Vehicle */}
                    {step === 2 && (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-indigo-600 text-3xl">directions_car</span>
                                    <h3 className="text-xl font-extrabold text-slate-900">Véhicules Disponibles</h3>
                                </div>
                                <div className="relative">
                                    <input 
                                        className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 w-64" 
                                        placeholder="Rechercher (Marque, Modèle, MAT)..." 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-sm">search</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 pb-2">
                                {filteredVehicles.map(vehicle => (
                                    <div 
                                        key={vehicle.id}
                                        onClick={() => handleVehicleSelect(vehicle)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-5 items-center group ${formData.vehicle === vehicle.id ? 'border-indigo-600 bg-indigo-50/30 shadow-md shadow-indigo-100/50' : 'border-slate-250 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-24 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.modele_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300 text-4xl">directions_car</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-base mb-1 transition-colors leading-tight ${formData.vehicle === vehicle.id ? 'text-indigo-650' : 'text-slate-900'}`}>
                                                {vehicle.marque_name} {vehicle.modele_name}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-[10px] px-2 py-1 rounded-md bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-wider">{vehicle.matricule_actuel || vehicle.matricule}</span>
                                                <span className="text-sm text-indigo-600 font-bold">{vehicle.prix_par_jour} DH/j</span>
                                            </div>
                                        </div>
                                        {formData.vehicle === vehicle.id && (
                                            <span className="material-symbols-outlined text-indigo-600 text-2xl">check_circle</span>
                                        )}
                                    </div>
                                ))}
                                {filteredVehicles.length === 0 && (
                                    <div className="col-span-1 md:col-span-2 py-16 text-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sentiment_dissatisfied</span>
                                        <h4 className="text-lg font-bold text-slate-650">Aucun véhicule trouvé</h4>
                                        <p className="text-slate-400 text-sm">Essayez de modifier vos dates ou filtres de recherche.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex gap-4 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Retour
                                </button>
                                <button 
                                    onClick={() => setStep(3)}
                                    disabled={!formData.vehicle}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-indigo-200/50 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    Continuer avec ce Véhicule
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Client & Preferences */}
                    {step === 3 && (
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-indigo-600 text-3xl">person</span>
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

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Sélectionner le Client Principal *</label>
                                    <Select 
                                        options={clients.map(c => ({
                                            value: c.id,
                                            label: `${c.nom} ${c.prenom} (${c.cin_passport})`,
                                        }))}
                                        onChange={(opt) => setFormData({...formData, client: opt ? opt.value : ''})}
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
                                                backgroundColor: 'var(--card-white)',
                                                border: '1px solid var(--stroke)',
                                                borderRadius: '0.75rem',
                                                padding: '4px',
                                                borderColor: state.isFocused ? 'var(--primary)' : 'var(--stroke)',
                                                boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : 'none'
                                            })
                                        }}
                                    />
                                </div>

                                <div>
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
                                                backgroundColor: 'var(--card-white)',
                                                border: '1px solid var(--stroke)',
                                                borderRadius: '0.75rem',
                                                padding: '4px',
                                                borderColor: state.isFocused ? 'var(--primary)' : 'var(--stroke)',
                                                boxShadow: state.isFocused ? '0 0 0 1px var(--primary)' : 'none'
                                            })
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />
                            
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-indigo-600 text-3xl">payments</span>
                                <h3 className="text-xl font-extrabold text-slate-900">Paiement d'avance & Cautions</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl transition-colors border border-slate-200">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Service Chauffeur</p>
                                            <p className="text-[10px] text-slate-500 font-medium">+50 DH/jour</p>
                                        </div>
                                        <div 
                                            onClick={() => setFormData({...formData, chauffeur_service: !formData.chauffeur_service})}
                                            className="relative inline-flex items-center cursor-pointer"
                                        >
                                            <div className={`w-11 h-6 transition-colors rounded-full relative ${formData.chauffeur_service ? 'bg-indigo-600' : 'bg-slate-350'}`}>
                                                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.chauffeur_service ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {agencySettings.caution_active && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Caution</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                            <input 
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold pl-12 outline-none transition-all duration-200 ${userRole !== 'OWNER' && userRole !== 'SUPERADMIN' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-200 text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600'}`} 
                                                type="number" 
                                                value={formData.caution}
                                                onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                                disabled={userRole !== 'OWNER' && userRole !== 'SUPERADMIN'}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Avance Versée</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                        <input 
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-success-dark bg-success-bg/20 pl-12 text-sm font-extrabold focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200" 
                                            type="number" 
                                            value={formData.montant_paye}
                                            onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Mode de Paiement (Avance)</label>
                                    <Dropdown
                                        options={[
                                            { value: 'Espèce', label: 'Espèce' },
                                            { value: 'Chèque', label: 'Chèque' },
                                            { value: 'TPE', label: 'TPE' },
                                            { value: 'Virement', label: 'Virement' }
                                        ]}
                                        value={formData.methode_paiement}
                                        onChange={(v) => setFormData({...formData, methode_paiement: v})}
                                    />
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Notes ou Demandes Spéciales</label>
                                <textarea 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 resize-none" 
                                    placeholder="Entrez toute condition supplémentaire à satisfaire au moment de la récupération..." 
                                    rows="3"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                ></textarea>
                            </div>
                            
                            <div className="flex gap-4 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Retour
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!formData.client || !formData.vehicle}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-indigo-200/50 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                                >
                                    <span className="material-symbols-outlined">event_available</span>
                                    Valider et Réserver
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Reservation Summary Card */}
                <div className="col-span-12 lg:col-span-4 hidden lg:block">
                    <div className="sticky top-12">
                        <div className="bg-slate-950 text-white p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden" style={{ minHeight: '300px' }}>
                            {/* Decorative background */}
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
                            
                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-8 border-b border-slate-800 pb-4">Résumé de Réservation</h3>
                            
                            <div className="space-y-6 relative z-10">
                                {step >= 2 && selectedVehicle && (
                                    <div className="flex gap-4 animate-in fade-in duration-500">
                                        <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden border border-slate-800">
                                            {selectedVehicle.image ? (
                                                <img src={selectedVehicle.image} alt="car" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-white/50">directions_car</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-base">{selectedVehicle.marque_name} {selectedVehicle.modele_name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{selectedVehicle.matricule_actuel || selectedVehicle.matricule}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="py-4 border-y border-slate-800">
                                    <div className="flex items-center gap-4 text-sm font-medium mb-3">
                                        <span className="material-symbols-outlined text-indigo-400">flight_takeoff</span>
                                        <span className="text-slate-200">{formData.date_sortie}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-medium">
                                        <span className="material-symbols-outlined text-indigo-400">flight_land</span>
                                        <span className="text-slate-200">{formData.date_retour_prevue}</span>
                                    </div>
                                </div>
                                
                                {step >= 2 && selectedVehicle && (
                                    <>
                                        <div className="flex justify-between items-baseline pt-2">
                                            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Durée</p>
                                            <p className="text-lg font-bold">{diffDays()} Jours</p>
                                        </div>
                                        <div className="flex justify-between items-baseline py-2 border-b border-slate-800">
                                            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Est.</p>
                                            <p className="text-3xl font-extrabold text-indigo-400 flex items-center gap-2">
                                                {quoteLoading && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
                                                {totalEstimate().toLocaleString()} DH
                                            </p>
                                        </div>
                                    </>
                                )}
                                
                                {step === 3 && (
                                    <div className="bg-white/10 p-4 rounded-xl mt-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avance à régler (Avance Versée)</p>
                                        <p className="text-xl font-bold text-success-dark">
                                            {parseFloat(formData.montant_paye).toLocaleString()} DH
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Add Client Modal */}
            <AddClientModal 
                isOpen={showClientModal} 
                onClose={() => setShowClientModal(false)} 
                onClientCreated={(newClient) => {
                    setClients(prev => [...prev, newClient]);
                    setFormData(prev => ({ ...prev, client: newClient.id }));
                }}
            />
        </div>
    );
};

const AddClientModal = ({ isOpen, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState({
        prenom: '', nom: '', cin_passport: '', email: '',
        telephone: '', adresse: '', permis_conduite: '',
        date_delivrance_permis: '', remarques: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uniqueErrors, setUniqueErrors] = useState({});

    const UNIQUE_FIELDS = {
        cin_passport: 'CIN/passeport',
        email: 'email',
        telephone: 'téléphone',
        permis_conduite: 'permis de conduire',
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (UNIQUE_FIELDS[e.target.name]) {
            setUniqueErrors(prev => ({ ...prev, [e.target.name]: false }));
        }
    };

    const checkUnique = async (field, value) => {
        if (!value || !value.trim()) {
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
            return;
        }
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
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    const fieldClass = (name) => `w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-slate-900 bg-slate-50/50 focus:bg-white outline-none transition-all ${uniqueErrors[name] ? 'border-danger bg-danger-bg/40 focus:border-danger' : 'border-slate-200 focus:border-primary'}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duplicates = Object.keys(UNIQUE_FIELDS).filter(k => uniqueErrors[k]);
        if (duplicates.length > 0) {
            setError(`Corrigez d'abord les champs en double : ${duplicates.map(k => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('clients/', formData);
            onClientCreated(response.data);
            onClose();
        } catch (err) {
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Erreur");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-8 border border-slate-200">
                <h3 className="text-xl font-extrabold text-slate-900 mb-6">Nouveau Client</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="p-3 bg-danger-bg text-danger-dark text-xs rounded-xl border border-danger-border">{error}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <input name="prenom" value={formData.prenom} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="Prénom" />
                        <input name="nom" value={formData.nom} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 focus:border-indigo-600 focus:bg-white outline-none transition-all" placeholder="Nom" />
                        <input name="cin_passport" value={formData.cin_passport} onChange={handleChange} onBlur={handleBlurUnique('cin_passport')} required className={fieldClass('cin_passport')} placeholder="CIN/Passeport" />
                        {uniqueErrors.cin_passport && (
                            <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                <span className="material-symbols-outlined text-[13px]">error</span>
                                {uniqueErrors.cin_passport}
                            </p>
                        )}
                        <input name="telephone" value={formData.telephone} onChange={handleChange} onBlur={handleBlurUnique('telephone')} required className={fieldClass('telephone')} placeholder="Téléphone" />
                        {uniqueErrors.telephone && (
                            <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                <span className="material-symbols-outlined text-[13px]">error</span>
                                {uniqueErrors.telephone}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors font-bold text-sm flex-1">Annuler</button>
                        <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200/50 hover:bg-indigo-700 transition-all text-sm flex-1">{loading ? 'Création...' : 'Créer'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationForm;
