import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api, { fetchAllPages } from '../api';
import { jwtDecode } from 'jwt-decode';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
import { toast } from './Toast';
import DatePicker from './ui/DatePicker';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';

const getLocalDatetime = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

const ContractForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userRole, setUserRole] = useState('');
    const [agencySettings, setAgencySettings] = useState({ caution_active: true, caution_montant: 1500 });
    const [isCautionActive, setIsCautionActive] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [kmLoading, setKmLoading] = useState(false);

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
        // éléments de l'état du véhicule
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
    const [unavailableRanges, setUnavailableRanges] = useState([]);

    const fetchClients = async () => {
        try {
            const clients = await fetchAllPages('clients/');
            setClients(clients);
            return clients;
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
                const [vehicles, clients, settingsRes] = await Promise.all([
                    fetchAllPages('vehicles/'),
                    fetchAllPages('clients/'),
                    api.get('agency/settings/').catch(() => ({ data: { caution_active: true, caution_montant: 1500 } }))
                ]);
                // On ne garde que les véhicules disponibles pour un nouveau contrat
                setVehicles(vehicles.filter(v => normalizeVehicleStatut(v.statut) === 'Available'));
                setClients(clients);
                
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

    useEffect(() => {
        if (location.state?.vehicleId) {
            api.get(`vehicles/${location.state.vehicleId}/`)
                .then((res) => {
                    const v = res.data;
                    setSelectedVehicle(v);
                    setFieldErrors(prev => ({ ...prev, vehicle: false }));
                    setFormData(prev => ({ ...prev, vehicle: v.id, prix_par_jour: v.prix_par_jour || 0, km_sortie: v.kilometrage || 0 }));
                    fetchUnavailable(v.id);
                    setCurrentStep(2);
                })
                .catch((error) => console.error("Erreur lors du chargement du véhicule présélectionné", error));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUnavailable = async (vehicleId) => {
        if (!vehicleId) return;
        try {
            const res = await api.get(`public-vehicles/${vehicleId}/unavailable-dates/`);
            setUnavailableRanges(res.data?.unavailable || []);
        } catch (err) {
            console.error("Erreur lors du chargement des dates indisponibles", err);
            setUnavailableRanges([]);
        }
    };

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
            setFieldErrors((prev) => ({ ...prev, vehicle: false }));
            setFormData({
                ...formData,
                vehicle: vehicle.id,
                prix_par_jour: vehicle.prix_par_jour || 0,
                km_sortie: vehicle.kilometrage || 0
            });
            fetchUnavailable(vehicle.id);
        };

    const fetchGpsKm = async () => {
        if (!selectedVehicle) { toast.error('Veuillez d\'abord sélectionner un véhicule'); return; }
        setKmLoading(true);
        try {
            const { data } = await api.get(`gps/positions/${selectedVehicle.id}/`);
            const odometer = data?.position?.odometer;
            if (odometer != null) {
                const km = Math.round(odometer / 1000);
                setFormData((prev) => ({ ...prev, km_sortie: km }));
                toast.success(`Kilométrage GPS : ${km.toLocaleString('fr-FR')} km`);
            } else {
                toast.error('Aucune position GPS / kilométrage disponible pour ce véhicule.');
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du kilométrage GPS", error);
            toast.error("Impossible de récupérer le kilométrage GPS.");
        } finally {
            setKmLoading(false);
        }
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
    
        if (loading) return <div className="p-8 text-center font-bold" style={{ color: 'var(--primary-container)' }}>Initialisation du Fleet Concierge...</div>;

        const fieldClass = (name) => `field transition-all duration-200 ${hasError(name) ? 'border-danger bg-danger-bg/40' : 'focus:bg-white'}`;

        const selectStyles = (name) => ({
            control: (base, state) => ({
                ...base,
                backgroundColor: state.isDisabled ? '#f1f5f9' : '#f8fafc',
                border: '1px solid',
                borderRadius: '0.5rem',
                padding: '4px',
                borderColor: hasError(name) ? 'var(--danger)' : (state.isFocused ? 'var(--primary)' : 'var(--stroke)'),
                boxShadow: hasError(name) ? '0 0 0 1px var(--danger)' : (state.isFocused ? '0 0 0 2px rgba(29,78,216,0.15)' : 'none'),
            }),
            placeholder: (base) => ({ ...base, color: 'var(--text-disabled)' }),
        });

        const stepState = (num) => {
            if (currentStep > num) return 'done';
            if (currentStep === num) return 'active';
            return 'idle';
        };

        const selectedClient = clients.find(c => c.id == formData.client);

        return (
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                            Contrats / Nouveau
                        </p>
                        <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                            Nouveau contrat de location
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/contracts')}
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
                                className="px-6 py-2.5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-2"
                                style={{ background: 'var(--success)' }}
                            >
                                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                Valider le contrat
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

                <div className="grid grid-cols-3 gap-6 items-start pb-10">
                    {/* Left column */}
                    <div className="col-span-2 space-y-6">
                        {currentStep === 1 && (
                            <div className={`card shadow-l1 p-8 ${hasError('vehicle') ? 'border-danger ring-1 ring-danger/30' : ''}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="section-title mb-0">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Sélection du Véhicule</h2>
                                    </div>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-3 text-slate-400 text-[16px]">search</span>
                                        <input
                                            className="field pl-9"
                                            placeholder="Rechercher dans la flotte..."
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto p-1">
                                    {filteredVehicles.map(vehicle => (
                                        <div
                                            key={vehicle.id}
                                            onClick={() => handleVehicleSelect(vehicle)}
                                            className={`check-item items-center gap-3 ${formData.vehicle === vehicle.id ? 'on' : ''}`}
                                        >
                                            <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-stroke flex-shrink-0">
                                                {vehicle.image ? (
                                                    <img src={vehicle.image} alt={vehicle.modele_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-slate-300 text-2xl">directions_car</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-[13px] truncate" style={{ color: 'var(--on-surface)' }}>{vehicle.marque_name} {vehicle.modele_name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-wider">{vehicle.matricule}</span>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--primary-container)' }}>{vehicle.prix_par_jour} DH/j</span>
                                                </div>
                                            </div>
                                            {formData.vehicle === vehicle.id && (
                                                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--success)' }}>check_circle</span>
                                            )}
                                        </div>
                                    ))}
                                    {filteredVehicles.length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-slate-400 font-medium text-sm">Aucun véhicule disponible trouvé.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className={`card shadow-l1 p-8 ${hasError('client') ? 'border-danger ring-1 ring-danger/30' : ''}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="section-title mb-0">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Informations Client</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowClientModal(true)}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                        style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        NOUVEAU CLIENT
                                    </button>
                                </div>
                                <div>
                                    <label className="label mb-2">Sélectionner un client existant</label>
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
                                            label: selectedClient ? `${selectedClient.nom} ${selectedClient.prenom} (${selectedClient.cin_passport})` : ''
                                        } : null}
                                        placeholder="Rechercher par nom, prénom ou CIN..."
                                        isSearchable
                                        isClearable
                                        classNamePrefix="react-select"
                                        styles={selectStyles('client')}
                                    />
                                </div>

                                {formData.client && (
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                                            <p className="label mb-1">Téléphone</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{selectedClient?.telephone || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                                            <p className="label mb-1">N° Permis</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{selectedClient?.permis_conduite || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--stroke)' }}>
                                    <label className="label mb-2">Deuxième Conducteur (Optionnel)</label>
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
                                        styles={selectStyles('deuxieme_chauffeur')}
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <>
                                <div className="card shadow-l1 p-8">
                                    <div className="section-title">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Période de Location</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="label">Date et Heure de Départ</label>
                                            <DatePicker
                                                className={fieldClass('date_sortie')}
                                                value={formData.date_sortie}
                                                onChange={(v) => setFormData({...formData, date_sortie: v})}
                                                min={getLocalDatetime(new Date()).slice(0, 10)}
                                                disabledRanges={unavailableRanges}
                                                placeholder="Choisir la date de départ"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Date et Heure de Retour Prévu</label>
                                            <DatePicker
                                                className={fieldClass('date_retour_prevue')}
                                                value={formData.date_retour_prevue}
                                                onChange={(v) => setFormData({...formData, date_retour_prevue: v})}
                                                min={formData.date_sortie ? formData.date_sortie.slice(0, 10) : getLocalDatetime(new Date()).slice(0, 10)}
                                                disabledRanges={unavailableRanges}
                                                placeholder="Choisir la date de retour"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-l1 p-8">
                                    <div className="section-title">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Préférences & Caution</h2>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="check-item justify-between">
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>Service Chauffeur</p>
                                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>Conducteur premium</p>
                                            </div>
                                            <div
                                                onClick={() => setFormData({...formData, chauffeur_service: !formData.chauffeur_service})}
                                                className="relative inline-flex items-center cursor-pointer"
                                            >
                                                <div className={`w-11 h-6 transition-colors rounded-full relative ${formData.chauffeur_service ? 'bg-primary-container' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.chauffeur_service ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="label mb-0">Garantie (Caution)</label>
                                                <div
                                                    onClick={() => {
                                                        const newState = !isCautionActive;
                                                        setIsCautionActive(newState);
                                                        setFormData({...formData, caution: newState ? agencySettings.caution_montant : 0});
                                                    }}
                                                    className="relative inline-flex items-center cursor-pointer"
                                                >
                                                    <div className={`w-9 h-5 transition-colors rounded-full relative ${isCautionActive ? 'bg-primary-container' : 'bg-slate-300'}`}>
                                                        <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${isCautionActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">DH</span>
                                                <input
                                                    className={`field pl-10 ${!isCautionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    type="number"
                                                    value={formData.caution}
                                                    onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                                    disabled={!isCautionActive}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label mb-2">Montant Versé</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">DH</span>
                                                    <input
                                                        className="field pl-10"
                                                        type="number"
                                                        value={formData.montant_paye}
                                                        onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label mb-2">Mode de Paiement</label>
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
                                    </div>
                                </div>
                            </>
                        )}

                        {currentStep === 4 && (
                            <>
                                <div className="card shadow-l1 p-8">
                                    <div className="section-title">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>État de sortie du véhicule</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="label mb-3">Niveau de carburant au départ</label>
                                            <FuelGaugeSelector
                                                value={formData.carburant_sortie}
                                                onChange={(val) => setFormData({...formData, carburant_sortie: val})}
                                            />
                                        </div>
                                        <div>
                                            <label className="label mb-3">Kilométrage de sortie</label>
                                            <div className="flex gap-2">
                                                <input
                                                    className="field flex-1"
                                                    type="number"
                                                    value={formData.km_sortie}
                                                    onChange={(e) => setFormData({...formData, km_sortie: e.target.value})}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={fetchGpsKm}
                                                    disabled={kmLoading || !selectedVehicle}
                                                    title="Remplir avec le kilométrage GPS (Traccar)"
                                                    className="px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
                                                    style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}
                                                >
                                                    <span className={`material-symbols-outlined text-[16px] ${kmLoading ? 'animate-spin' : ''}`}>
                                                        {kmLoading ? 'progress_activity' : 'satellite_alt'}
                                                    </span>
                                                    GPS
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <label className="label mt-7 mb-3">Dégâts constatés au départ (cliquer sur le schéma)</label>
                                    <DamageSelector
                                        damages={formData.damages}
                                        onChange={(newDamages) => setFormData({...formData, damages: newDamages})}
                                        type="DEPART"
                                    />

                                    <div className="mt-4">
                                        <label className="label mb-2">Observation générale (optionnel)</label>
                                        <textarea
                                            className="field resize-none"
                                            placeholder="Note supplémentaire sur l'état général..."
                                            rows="2"
                                            value={formData.degats_depart}
                                            onChange={(e) => setFormData({...formData, degats_depart: e.target.value})}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="card shadow-l1 p-8">
                                    <div className="section-title">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Équipements fournis</h2>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { id: 'roue_secours', label: 'Roue secours' },
                                            { id: 'cric', label: 'Cric' },
                                            { id: 'manivelle', label: 'Manivelle' },
                                            { id: 'gilet', label: 'Gilet' },
                                            { id: 'triangle', label: 'Triangle' },
                                            { id: 'extincteur', label: 'Extincteur' },
                                            { id: 'papiers', label: 'Papiers' },
                                            { id: 'cles', label: 'Clés' },
                                        ].map(item => (
                                            <label
                                                key={item.id}
                                                className={`check-item ${formData[item.id] ? 'on' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4"
                                                    style={{ accentColor: 'var(--success)' }}
                                                    checked={formData[item.id]}
                                                    onChange={() => setFormData({...formData, [item.id]: !formData[item.id]})}
                                                />
                                                <span className="text-[12.5px] font-semibold">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="card shadow-l1 p-8">
                                    <div className="section-title">
                                        <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--primary-container)' }}></div>
                                        <h2 className="font-bold text-[17px]" style={{ color: 'var(--on-surface)' }}>Notes internes</h2>
                                    </div>
                                    <textarea
                                        className="field resize-none"
                                        placeholder="Entrez toute condition supplémentaire, notes sur l'état, ou demandes client..."
                                        rows="3"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    ></textarea>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right column: summary */}
                    <div className="space-y-6">
                        <div className="card shadow-l1 p-6">
                            <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>Résumé du contrat</h3>
                            <div className="space-y-3 text-[13px]">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Véhicule</span>
                                    <span className="font-semibold">{selectedVehicle ? `${selectedVehicle.marque_name} ${selectedVehicle.modele_name}` : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Client</span>
                                    <span className="font-semibold">{selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Durée</span>
                                    <span className="font-semibold">{diffDays()} jours</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Prix / jour</span>
                                    <span className="font-semibold">{parseFloat(formData.prix_par_jour || 0).toLocaleString()} DH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Caution</span>
                                    <span className="font-semibold">{isCautionActive ? `${parseFloat(formData.caution || 0).toLocaleString()} DH` : '—'}</span>
                                </div>
                            </div>
                            <div className="my-4 h-px" style={{ background: 'var(--stroke)' }}></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[14px]">Total</span>
                                <span className="font-bold text-[20px]" style={{ color: 'var(--primary-container)' }}>{totalEstimate().toLocaleString()} DH</span>
                            </div>
                        </div>

                        {currentStep === 4 && (
                            <div className="card shadow-l1 p-5" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)' }}>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: 'var(--success)' }}>task_alt</span>
                                    <p className="text-[12.5px] font-medium" style={{ color: 'var(--success-dark)' }}>
                                        Toutes les étapes précédentes sont complètes. Valide le contrat pour générer le PDF et activer la location.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                            <div className="flex items-center gap-3" style={{ color: 'var(--on-surface-variant)' }}>
                                <span className="material-symbols-outlined text-sm">info</span>
                                <p className="text-xs leading-relaxed">Le système vérifie automatiquement la disponibilité en temps réel. Les contrats sont légalement contraignants dès la validation.</p>
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
    const [uniqueErrors, setUniqueErrors] = useState({});

    const UNIQUE_FIELDS = {
        cin_passport: 'CIN/passeport',
        email: 'email',
        telephone: 'téléphone',
        permis_conduite: 'permis de conduire',
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (UNIQUE_FIELDS[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
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

    const fieldClass = (name) => `field ${uniqueErrors[name] ? 'border-danger bg-danger-bg/40' : ''}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duplicates = Object.keys(UNIQUE_FIELDS).filter(k => uniqueErrors[k]);
        if (duplicates.length > 0) {
            setError(`Corrigez d'abord les champs en double : ${duplicates.map(k => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
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
            setUniqueErrors({});
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden border border-stroke">
                <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--stroke)' }}>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>Nouveau Client Rapide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <div className="p-3 text-xs rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label mb-2">Prénom</label>
                            <input name="prenom" value={formData.prenom} onChange={handleChange} required className="field" placeholder="ex. Adam" />
                        </div>
                        <div>
                            <label className="label mb-2">Nom</label>
                            <input name="nom" value={formData.nom} onChange={handleChange} required className="field" placeholder="ex. Bennett" />
                        </div>
                        <div>
                            <label className="label mb-2">CIN / Passeport</label>
                            <input name="cin_passport" value={formData.cin_passport} onChange={handleChange} onBlur={handleBlurUnique('cin_passport')} required className={fieldClass('cin_passport')} placeholder="ex. AB123456" />
                            {uniqueErrors.cin_passport && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.cin_passport}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="label mb-2">Téléphone</label>
                            <input name="telephone" value={formData.telephone} onChange={handleChange} onBlur={handleBlurUnique('telephone')} required className={fieldClass('telephone')} placeholder="+212 6..." />
                            {uniqueErrors.telephone && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.telephone}
                                </p>
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className="label mb-2">Permis de Conduire</label>
                            <input name="permis_conduite" value={formData.permis_conduite} onChange={handleChange} onBlur={handleBlurUnique('permis_conduite')} required className={fieldClass('permis_conduite')} placeholder="Numéro de permis" />
                            {uniqueErrors.permis_conduite && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.permis_conduite}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border font-bold text-sm card" style={{ color: 'var(--on-surface-variant)' }}>Annuler</button>
                        <button type="submit" disabled={loading} className="flex-[2] px-4 py-3 rounded-lg text-white font-bold text-sm disabled:opacity-50" style={{ background: 'var(--primary-container)' }}>
                            {loading ? 'Création...' : 'Créer et Sélectionner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
