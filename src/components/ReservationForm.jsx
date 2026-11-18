import { apiErrorText } from '../utils/apiErrorText';
import { Input, Textarea } from './ui/Input';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Dropdown from './Dropdown';
import api, { fetchAllPages } from '../api';
import { toast } from './Toast';
import AddClientModal from './AddClientModal';
import DatePicker from './ui/DatePicker';
import Stepper from './ui/Stepper';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import { getRole } from '../utils/userRole';
import { useI18n } from '../i18n/context';

const ReservationForm = () => {
    const { t } = useI18n();
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
        date_sortie: new Date().toISOString().slice(0, 16),
        date_retour_prevue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
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

    useEffect(() => {
        setUserRole(getRole());
        
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
        api.get(`vehicles/${formData.vehicle}/price-quote/`, { params: { start: formData.date_sortie, end: formData.date_retour_prevue } })
            .then((res) => { if (!cancelled) setQuote(res.data); })
            .catch(() => { if (!cancelled) setQuote(null); });
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
            const res = await api.get(`vehicles/available_cars/?start_date=${formData.date_sortie}&end_date=${formData.date_retour_prevue}`);
            setVehicles(res.data);
            setStep(2);
        } catch (error) {
            console.error("Dispo erreur", error);
            toast.error(apiErrorText(error, t('u.erreur_de_disponibilit')));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const advance = Number(formData.montant_paye || 0);
        if (!Number.isFinite(advance) || advance < 0) {
            toast.error(t('u.le_montant_vers_ne_peut_pas_tre_'));
            return;
        }
        if (advance > totalEstimate() + 0.001) {
            toast.error(t('u.le_montant_vers_dpasse_le_total__2'));
            return;
        }
        try {
            const dataToSubmit = {
                ...formData,
                jours: diffDays(),
                montant_total: totalEstimate(),
                km_sortie: selectedVehicle?.kilometrage || 0,
                carburant_sortie: '2/8',
                date_sortie: `${formData.date_sortie}:00Z`,
                date_retour_prevue: `${formData.date_retour_prevue}:00Z`,
            };
            await api.post('contracts/', dataToSubmit);
            toast.success(t('u.rservation_cre_avec_succs'));
            navigate('/reservations');
        } catch (error) {
            console.error("Erreur lors de la création", error);
            toast.error(apiErrorText(error, t('u.erreur_lors_de_la_cration_de_la_')));
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.marque_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.modele_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-surface">
            {/* Header Section */}
            <PageHeader
                eyebrow={t('u.fleet_concierge')}
                title={t('u.nouvelle_rservation')}
                description={t('u.rservez_un_vhicule_en_3_tapes_da')}
                actions={(
                    <>
                        <Button variant="secondary" onClick={() => navigate('/reservations')}>{t('u.annuler')}</Button>
                        {step === 3 && (
                            <Button icon="event_available" onClick={handleSubmit}>{t('u.confirmer_la_rservation')}</Button>
                        )}
                    </>
                )}
            />

            {/* Stepper Indicator */}
            <Stepper
                currentStep={step}
                steps={[
                    { num: 1, label: t('u.dates') },
                    { num: 2, label: t('u.vhicule') },
                    { num: 3, label: t('u.client') },
                ]}
            />

            {/* Barre de progression */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t('u.progression')}</span>
                    <span className="text-[11px] font-bold text-primary">{t('u.tape_sur_3', { step })}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pb-20">
                <div className="flex flex-col gap-6">
                    {/* STEP 1: Dates */}
                    {step === 1 && (
                        <div>
                            <p className="text-slate-500 mb-8 text-sm">{t('u.veuillez_slectionner_la_date_de_')}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.date_et_heure_de_dpart')}</label>
                                    <DatePicker
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                                        value={formData.date_sortie}
                                        onChange={(v) => setFormData({...formData, date_sortie: v})}
                                        placeholder={t('u.choisir_la_date_de_dpart')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.retour_prvu_2')}</label>
                                    <DatePicker
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
                                        value={formData.date_retour_prevue}
                                        onChange={(v) => setFormData({...formData, date_retour_prevue: v})}
                                        min={formData.date_sortie ? formData.date_sortie.slice(0, 10) : null}
                                        placeholder={t('u.choisir_la_date_de_retour')}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={checkAvailability}
                                disabled={loading || !formData.date_sortie || !formData.date_retour_prevue}
                                className="w-full bg-primary hover:bg-primary-deep text-white py-4 rounded-xl font-bold text-base shadow-md shadow-primary-border/50 flex items-center justify-center gap-3 disabled:opacity-70 transition-all"
                            >
                                {loading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                                <span className="material-symbols-outlined">search</span>
                                {loading ? t('u.recherche_en_cours') : t('u.rechercher_les_vhicules')}
                            </button>
                        </div>
                    )}
                     {/* STEP 2: Vehicle */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="relative">
                                    <Input 
                                        className="ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200 w-64" 
                                        placeholder={t('u.rechercher_marque_modle_mat')} 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <span className="material-symbols-outlined absolute start-3 top-3 text-slate-400 text-sm">search</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pe-2 pb-2">
                                {filteredVehicles.map(vehicle => (
                                    <div 
                                        key={vehicle.id}
                                        onClick={() => handleVehicleSelect(vehicle)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-5 items-center group ${formData.vehicle === vehicle.id ? 'border-primary bg-primary-light/30 shadow-md shadow-primary-light/50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className="w-24 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.modele_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300 text-4xl">directions_car</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-base mb-1 transition-colors leading-tight ${formData.vehicle === vehicle.id ? 'text-primary' : 'text-slate-900'}`}>
                                                {vehicle.marque_name} {vehicle.modele_name}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-[10px] px-2 py-1 rounded-md bg-slate-200 text-slate-700 font-mono font-bold uppercase tracking-wider">{vehicle.matricule_actuel || vehicle.matricule}</span>
                                                <span className="text-sm text-primary font-bold">{vehicle.prix_par_jour} DH/j</span>
                                            </div>
                                        </div>
                                        {formData.vehicle === vehicle.id && (
                                            <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
                                        )}
                                    </div>
                                ))}
                                {filteredVehicles.length === 0 && (
                                    <div className="col-span-1 md:col-span-2 py-16 text-center">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">sentiment_dissatisfied</span>
                                        <h4 className="text-lg font-bold text-slate-600">{t('u.aucun_vhicule_trouv')}</h4>
                                        <p className="text-slate-400 text-sm">{t('u.essayez_de_modifier_vos_dates_ou')}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex gap-4 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                    {t('u.retour')}
                                </button>
                                <button 
                                    onClick={() => setStep(3)}
                                    disabled={!formData.vehicle}
                                    className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-primary-border/50 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    {t('u.continuer_avec_ce_vhicule')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Client & Preferences */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div />
                                <button 
                                    onClick={() => setShowClientModal(true)}
                                    className="text-xs font-bold text-primary-deep bg-primary-light/50 hover:bg-primary-light ring-1 ring-primary-light px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    {t('u.nouveau_client')}
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.slectionner_le_client_principal')}</label>
                                    <Dropdown
                                        options={clients.map(c => ({ value: c.id, label: `${c.nom} ${c.prenom} (${c.cin_passport})` }))}
                                        value={formData.client}
                                        onChange={(v) => setFormData({...formData, client: v})}
                                        placeholder={t('u.rechercher_par_nom_prnom_ou_cin')}
                                        isSearchable
                                        isClearable
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.deuxime_conducteur_optionnel')}</label>
                                    <Dropdown
                                        options={clients.filter(c => c.id != formData.client).map(c => ({ value: c.id, label: `${c.nom} ${c.prenom} (${c.cin_passport})` }))}
                                        value={formData.deuxieme_chauffeur}
                                        onChange={(v) => setFormData({...formData, deuxieme_chauffeur: v})}
                                        placeholder={t('u.rechercher_un_deuxime_chauffeur')}
                                        isSearchable
                                        isClearable
                                    />
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />
                            
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-primary text-3xl">payments</span>
                                <h3 className="text-xl font-extrabold text-slate-900">{t('u.paiement_d_avance_cautions')}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl transition-colors border border-slate-200">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{t('u.service_chauffeur')}</p>
                                            <p className="text-[10px] text-slate-500 font-medium">+50 DH/jour</p>
                                        </div>
                                        <div 
                                            onClick={() => setFormData({...formData, chauffeur_service: !formData.chauffeur_service})}
                                            className="relative inline-flex items-center cursor-pointer"
                                        >
                                            <div className={`w-11 h-6 transition-colors rounded-full relative ${formData.chauffeur_service ? 'bg-primary' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.chauffeur_service ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {agencySettings.caution_active && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.caution')}</label>
                                        <div className="relative">
                                            <span className="absolute start-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                            <Input 
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ps-12 outline-none transition-all duration-200 ${userRole !== 'OWNER' && userRole !== 'SUPERADMIN' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-200 text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary'}`} 
                                                type="number" 
                                                value={formData.caution}
                                                onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                                disabled={userRole !== 'OWNER' && userRole !== 'SUPERADMIN'}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.avance_verse')}</label>
                                    <div className="relative">
                                        <span className="absolute start-4 top-3.5 text-slate-400 font-bold text-sm">DH</span>
                                        <Input 
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-success-dark bg-success-bg/20 ps-12 text-sm font-extrabold focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200" 
                                            type="number" 
                                            value={formData.montant_paye}
                                            onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.mode_de_paiement_avance')}</label>
                                    <Dropdown
                                        options={[
                                            { value: 'Espèce', label: t('method.Espèce') },
                                            { value: 'Chèque', label: t('method.Chèque') },
                                            { value: 'TPE', label: t('method.TPE') },
                                            { value: 'Virement', label: t('method.Virement') }
                                        ]}
                                        value={formData.methode_paiement}
                                        onChange={(v) => setFormData({...formData, methode_paiement: v})}
                                    />
                                </div>
                            </div>
                            
                            <hr className="border-slate-100" />
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ps-1 mb-2">{t('u.notes_ou_demandes_spciales')}</label>
                                <Textarea 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-all duration-200 resize-none" 
                                    placeholder={t('u.entrez_toute_condition_supplment_2')} 
                                    rows="3"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                ></Textarea>
                            </div>
                            
                            <div className="flex gap-4 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={() => setStep(2)}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                                >
                                    {t('u.retour')}
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!formData.client || !formData.vehicle}
                                    className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-primary-border/50 flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
                                >
                                    <span className="material-symbols-outlined">event_available</span>
                                    {t('u.valider_et_rserver')}
                                </button>
                            </div>
                        </div>
                    )}
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

export default ReservationForm;
