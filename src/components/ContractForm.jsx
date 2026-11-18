import { apiErrorText } from '../utils/apiErrorText';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api, { fetchAllPages } from '../api';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
import { toast } from './Toast';
import DatePicker from './ui/DatePicker';
import Stepper from './ui/Stepper';
import AddClientModal from './AddClientModal';
import { formatMoney, formatNumber } from '../utils/formatters';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import Button from './ui/Button';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';
import { useI18n } from '../i18n/context';

const getLocalDatetime = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

const ContractForm = () => {
    const { t } = useI18n();
    const { formProps, markClean } = useUnsavedChanges();
    const navigate = useNavigate();
    const location = useLocation();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [agencySettings, setAgencySettings] = useState({ caution_active: true, caution_montant: 1500 });
    const [isCautionActive, setIsCautionActive] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [kmLoading, setKmLoading] = useState(false);
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);

    const steps = [
        { num: 1, label: t('u.vhicule'), icon: 'directions_car' },
        { num: 2, label: t('u.client'), icon: 'person' },
        { num: 3, label: t('u.priode_tarification'), icon: 'payments' },
        { num: 4, label: t('u.inspection_validation'), icon: 'fact_check' },
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
    // Ids des véhicules libres sur la période choisie (null = inconnu / non filtré)
    const [freeVehicleIds, setFreeVehicleIds] = useState(null);

    useEffect(() => {
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

    useEffect(() => {
        if (!formData.vehicle || !formData.date_sortie || !formData.date_retour_prevue) { setQuote(null); return; }
        let cancelled = false;
        setQuoteLoading(true);
        const fmt = (d) => {
            const date = new Date(d);
            const tzoffset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
        };
        api.get(`vehicles/${formData.vehicle}/price-quote/`, { params: { start: fmt(formData.date_sortie), end: fmt(formData.date_retour_prevue) } })
            .then((res) => { if (!cancelled) setQuote(res.data); })
            .catch(() => { if (!cancelled) setQuote(null); })
            .finally(() => { if (!cancelled) setQuoteLoading(false); });
        return () => { cancelled = true; };
    }, [formData.vehicle, formData.date_sortie, formData.date_retour_prevue]);

    // Disponibilité réelle (contrats + réservations + délai de confort) sur la période choisie
    useEffect(() => {
        const start = formData.date_sortie;
        const end = formData.date_retour_prevue;
        if (!start || !end || end <= start) { setFreeVehicleIds(null); return undefined; }
        let cancelled = false;
        api.get('vehicles/free/', { params: { start, end } })
            .then((res) => { if (!cancelled) setFreeVehicleIds(new Set((res.data?.ids || []).map(String))); })
            .catch(() => { if (!cancelled) setFreeVehicleIds(null); });
        return () => { cancelled = true; };
    }, [formData.date_sortie, formData.date_retour_prevue]);

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
        if (!selectedVehicle) { toast.error(t('u.veuillez_d_abord_slectionner_un_')); return; }
        setKmLoading(true);
        try {
            const { data } = await api.get(`gps/positions/${selectedVehicle.id}/`);
            const odometer = data?.position?.odometer;
            if (odometer != null) {
                const km = Math.round(odometer / 1000);
                setFormData((prev) => ({ ...prev, km_sortie: km }));
                toast.success(t('u.kilomtrage_gps_km', { km: formatNumber(km) }));
            } else {
                toast.error(t('u.aucune_position_gps_kilomtrage_d'));
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du kilométrage GPS", error);
            toast.error(t('u.impossible_de_rcuprer_le_kilomtr'));
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
            const base = quote && quote.total != null ? parseFloat(quote.total) : days * formData.prix_par_jour;
            const chauffeur = formData.chauffeur_service ? 50 * days : 0; // Exemple: 50 DH/jour pour le chauffeur
            return base + chauffeur;
        };
    
        const handleNext = () => {
            if (currentStep === 1) {
                if (!formData.vehicle) { setFieldErrors((prev) => ({ ...prev, vehicle: true })); toast.error(t('u.veuillez_slectionner_un_vhicule')); return; }
            }
            if (currentStep === 2) {
                if (!formData.client) { setFieldErrors((prev) => ({ ...prev, client: true })); toast.error(t('u.veuillez_slectionner_un_client')); return; }
            }
            setCurrentStep((prev) => Math.min(prev + 1, 4));
        };
        const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
    
        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!formData.vehicle) { setFieldErrors((prev) => ({ ...prev, vehicle: true })); setCurrentStep(1); toast.error(t('u.veuillez_slectionner_un_vhicule')); return; }
            if (!formData.client) { setFieldErrors((prev) => ({ ...prev, client: true })); setCurrentStep(2); toast.error(t('u.veuillez_slectionner_un_client')); return; }
            const advance = Number(formData.montant_paye || 0);
            if (!Number.isFinite(advance) || advance < 0) {
                setCurrentStep(4);
                toast.error(t('u.le_montant_vers_ne_peut_pas_tre_'));
                return;
            }
            if (advance > totalEstimate() + 0.001) {
                setCurrentStep(4);
                toast.error(t('u.le_montant_vers_dpasse_le_total_', { advance: formatMoney(advance), total: formatMoney(totalEstimate()) }));
                return;
            }
            try {
                const dataToSubmit = {
                    ...formData,
                    jours: diffDays(),
                    montant_total: totalEstimate(),
                    // Les dates sont maintenant des datetime-local (YYYY-MM-DDTHH:mm)
                    date_sortie: `${formData.date_sortie}:00`,
                    date_retour_prevue: `${formData.date_retour_prevue}:00`,
                };
                // Le serveur passe lui-même le véhicule en « Loué » à la création d'un contrat en cours.
                await api.post('contracts/', dataToSubmit);
            markClean();
            navigate('/contracts');
            toast.success(t('u.contrat_cr_avec_succs'));
            } catch (error) {
                console.error("Erreur lors de la création du contrat", error);
                toast.error(apiErrorText(error, t('u.erreur_lors_de_la_cration_du_con')));
            }
        };
    
        const matchesSearch = (v) =>
            v.marque_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.modele_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
        const isFreeOnPeriod = (v) => freeVehicleIds === null || freeVehicleIds.has(String(v.id));
        const filteredVehicles = vehicles.filter((v) => matchesSearch(v) && isFreeOnPeriod(v));
        const hiddenBusyCount = vehicles.filter((v) => matchesSearch(v) && !isFreeOnPeriod(v)).length;
    
        if (loading) return <div className="p-8 text-center font-bold" style={{ color: 'var(--primary-container)' }}>{t('u.initialisation_du_fleet_concierg')}</div>;

        const fieldClass = (name) => `field transition-all duration-200 ${hasError(name) ? 'border-danger bg-danger-bg/40' : 'focus:bg-white'}`;

        const selectStyles = (name) => ({
            control: (base, state) => ({
                ...base,
                backgroundColor: state.isDisabled ? 'var(--surface-container)' : 'var(--surface-container-low)',
                border: '1px solid',
                borderRadius: '0.5rem',
                padding: '4px',
                borderColor: hasError(name) ? 'var(--danger)' : (state.isFocused ? 'var(--primary)' : 'var(--stroke)'),
                boxShadow: hasError(name) ? '0 0 0 1px var(--danger)' : (state.isFocused ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'none'),
            }),
            placeholder: (base) => ({ ...base, color: 'var(--text-disabled)' }),
        });


        const selectedClient = clients.find(c => c.id == formData.client);

        return (
            <div className="max-w-6xl mx-auto px-4 py-6" {...formProps}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                            {t('u.contrats_nouveau')}
                        </p>
                        <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                            {t('u.nouveau_contrat_de_location')}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="ghost" onClick={() => navigate('/contracts')}>{t('u.annuler')}</Button>
                        {currentStep > 1 && (
                            <Button variant="outline" icon="arrow_back" onClick={handlePrev}>{t('u.tape_prcdente')}</Button>
                        )}
                        {currentStep < 4 ? (
                            <Button onClick={handleNext}>
                                {t('u.continuer')}
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_forward</span>
                            </Button>
                        ) : (
                            <Button variant="success" icon="fact_check" onClick={handleSubmit}>{t('u.valider_le_contrat')}</Button>
                        )}
                    </div>
                </div>

                {/* Stepper */}
                <Stepper steps={steps} currentStep={currentStep} />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start pb-10">
                    {/* Left column */}
                    <div className="xl:col-span-2 space-y-6">
                        {currentStep === 1 && (
                            <div className={hasError('vehicle') ? 'border-danger ring-1 ring-danger/30 rounded-xl' : ''}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute start-3 top-3 text-slate-400 text-[16px]">search</span>
                                        <input
                                            className="field ps-9"
                                            placeholder={t('u.rechercher_dans_la_flotte')}
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {hiddenBusyCount > 0 && (
                                    <p className="text-xs text-slate-500 mb-2" role="status">
                                        {hiddenBusyCount} véhicule{hiddenBusyCount > 1 ? 's' : ''} masqué{hiddenBusyCount > 1 ? 's' : ''} : déjà loué{hiddenBusyCount > 1 ? 's' : ''} ou réservé{hiddenBusyCount > 1 ? 's' : ''} sur cette période.
                                    </p>
                                )}
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
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-wider">{vehicle.matricule_actuel || vehicle.matricule}</span>
                                                    <span className="text-xs font-bold" style={{ color: 'var(--primary-container)' }}>{formatMoney(vehicle.prix_par_jour, { decimals: 0 })}/j</span>
                                                </div>
                                            </div>
                                            {formData.vehicle === vehicle.id && (
                                                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--success)' }}>check_circle</span>
                                            )}
                                        </div>
                                    ))}
                                    {filteredVehicles.length === 0 && (
                                        <div className="col-span-2 py-10 text-center text-slate-400 font-medium text-sm">{t('u.aucun_vhicule_disponible_trouv')}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className={hasError('client') ? 'border-danger ring-1 ring-danger/30 rounded-xl' : ''}>
                                <div className="flex items-center justify-between mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowClientModal(true)}
                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                                        style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        {t('u.nouveau_client')}
                                    </button>
                                </div>
                                <div>
                                    <label className="label mb-2">{t('u.slectionner_un_client_existant')}</label>
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
                                        placeholder={t('u.rechercher_par_nom_prnom_ou_cin')}
                                        isSearchable
                                        isClearable
                                        classNamePrefix="react-select"
                                        styles={selectStyles('client')}
                                    />
                                </div>

                                {formData.client && (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                                            <p className="label mb-1">{t('u.tlphone')}</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{selectedClient?.telephone || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                                            <p className="label mb-1">{t('u.n_permis')}</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{selectedClient?.permis_conduite || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--stroke)' }}>
                                    <label className="label mb-2">{t('u.deuxime_conducteur_optionnel')}</label>
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
                                        placeholder={t('u.rechercher_un_deuxime_chauffeur')}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="label">{t('u.date_et_heure_de_dpart')}</label>
                                        <DatePicker
                                            className={fieldClass('date_sortie')}
                                            value={formData.date_sortie}
                                            onChange={(v) => setFormData({...formData, date_sortie: v})}
                                            min={getLocalDatetime(new Date()).slice(0, 10)}
                                            disabledRanges={unavailableRanges}
                                            placeholder={t('u.choisir_la_date_de_dpart')}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">{t('u.date_et_heure_de_retour_prvu')}</label>
                                        <DatePicker
                                            className={fieldClass('date_retour_prevue')}
                                            value={formData.date_retour_prevue}
                                            onChange={(v) => setFormData({...formData, date_retour_prevue: v})}
                                            min={formData.date_sortie ? formData.date_sortie.slice(0, 10) : getLocalDatetime(new Date()).slice(0, 10)}
                                            disabledRanges={unavailableRanges}
                                            placeholder={t('u.choisir_la_date_de_retour')}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                        <div className="check-item justify-between">
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{t('u.service_chauffeur')}</p>
                                                <p className="text-xs" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.conducteur_premium')}</p>
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
                                                <label className="label mb-0">{t('u.garantie_caution')}</label>
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
                                                <span className="absolute start-4 top-3 text-slate-400 font-bold text-sm">MAD</span>
                                                <input
                                                    className={`field ps-10 ${!isCautionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    type="number"
                                                    value={formData.caution}
                                                    onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                                    disabled={!isCautionActive}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="label mb-2">{t('u.montant_vers')}</label>
                                                <div className="relative">
                                                    <span className="absolute start-4 top-3 text-slate-400 font-bold text-sm">MAD</span>
                                                    <input
                                                        className="field ps-10"
                                                        type="number"
                                                        min="0"
                                                        max={totalEstimate() || undefined}
                                                        value={formData.montant_paye}
                                                        onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label mb-2">{t('u.mode_de_paiement')}</label>
                                                <Dropdown
                                                    options={[
                                                        { value: 'Espèce', label: t('method.Espèce') },
                                                        { value: 'Chèque', label: t('method.Chèque') },
                                                        { value: 'TPE', label: t('method.TPE') },
                                                        { value: 'Virement', label: t('method.Virement') }
                                                    ]}
                                                    value={formData.methode_paiement || 'Espèce'}
                                                    onChange={(v) => setFormData({...formData, methode_paiement: v})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                            </>
                        )}

                        {currentStep === 4 && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="label mb-3">{t('u.niveau_de_carburant_au_dpart')}</label>
                                        <FuelGaugeSelector
                                            value={formData.carburant_sortie}
                                            onChange={(val) => setFormData({...formData, carburant_sortie: val})}
                                        />
                                    </div>
                                    <div>
                                        <label className="label mb-3">{t('u.kilomtrage_de_sortie')}</label>
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
                                                title={t('u.remplir_avec_le_kilomtrage_gps_t')} aria-label={t('u.remplir_avec_le_kilomtrage_gps_t')}
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

                                <label className="label mt-7 mb-3">{t('u.dgts_constats_au_dpart_cliquer_s')}</label>
                                <DamageSelector
                                    damages={formData.damages}
                                    onChange={(newDamages) => setFormData({...formData, damages: newDamages})}
                                    type="DEPART"
                                />

                                <div className="mt-4">
                                    <label className="label mb-2">{t('u.observation_gnrale_optionnel')}</label>
                                    <textarea
                                        className="field resize-none"
                                        placeholder={t('u.note_supplmentaire_sur_l_tat_gnr')}
                                        rows="2"
                                        value={formData.degats_depart}
                                        onChange={(e) => setFormData({...formData, degats_depart: e.target.value})}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { id: 'roue_secours', label: t('u.roue_secours') },
                                        { id: 'cric', label: t('u.cric') },
                                        { id: 'manivelle', label: t('u.manivelle') },
                                        { id: 'gilet', label: t('u.gilet') },
                                        { id: 'triangle', label: t('u.triangle') },
                                        { id: 'extincteur', label: t('u.extincteur') },
                                        { id: 'papiers', label: t('u.papiers') },
                                        { id: 'cles', label: t('u.cls') },
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

                                <textarea
                                    className="field resize-none"
                                    placeholder={t('u.entrez_toute_condition_supplment')}
                                    rows="3"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                ></textarea>
                            </>
                        )}
                    </div>

                    {/* Right column: summary */}
                    <div className="space-y-6">
                        <div className="card shadow-l1 p-6">
                            <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>{t('u.rsum_du_contrat')}</h3>
                            <div className="space-y-3 text-[13px]">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.vhicule')}</span>
                                    <span className="font-semibold">{selectedVehicle ? `${selectedVehicle.marque_name} ${selectedVehicle.modele_name}${selectedVehicle.matricule_actuel ? ` · ${selectedVehicle.matricule_actuel}` : ''}` : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.client')}</span>
                                    <span className="font-semibold">{selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.dure')}</span>
                                    <span className="font-semibold">{t('u.jours', { n: diffDays() })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.prix_jour')}</span>
                                    <span className="font-semibold">{formatMoney(quote && quote.prix_moyen != null ? quote.prix_moyen : formData.prix_par_jour || 0)}</span>
                                </div>
                                {quote && (
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.tarification')}</span>
                                        <span className="font-semibold text-[11px]" style={{ color: 'var(--primary-container)' }}>
                                            {quoteLoading ? '…' : quote.detail?.length > 0 ? t('u.saisonnire') : t('u.standard')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.caution')}</span>
                                    <span className="font-semibold">{isCautionActive ? formatMoney(formData.caution || 0) : '—'}</span>
                                </div>
                            </div>
                            <div className="my-4 h-px" style={{ background: 'var(--stroke)' }}></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-[14px]">{t('u.total')}</span>
                                <span className="font-bold text-[20px] flex items-center gap-2" style={{ color: 'var(--primary-container)' }}>
                                    {quoteLoading && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
                                    {formatMoney(totalEstimate())}
                                </span>
                            </div>
                        </div>

                        {currentStep === 4 && (
                            <div className="card shadow-l1 p-5" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)' }}>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: 'var(--success)' }}>task_alt</span>
                                    <p className="text-[12.5px] font-medium" style={{ color: 'var(--success-dark)' }}>
                                        {t('u.toutes_les_tapes_prcdentes_sont_')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                            <div className="flex items-center gap-3" style={{ color: 'var(--on-surface-variant)' }}>
                                <span className="material-symbols-outlined text-sm">info</span>
                                <p className="text-xs leading-relaxed">{t('u.le_systme_vrifie_automatiquement')}</p>
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

export default ContractForm;
