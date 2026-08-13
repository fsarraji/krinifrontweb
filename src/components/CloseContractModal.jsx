import React, { useState, useEffect } from 'react';
import api from '../api';
import FuelGaugeSelector from './FuelGaugeSelector';
import DamageSelector from './DamageSelector';
import Dropdown from './Dropdown';
import axios from 'axios';
import { toast } from './Toast';

const STEPS = [
  { id: 1, label: 'Dates & Kilométrage', icon: 'speed' },
  { id: 2, label: 'Carburant & Accessoires', icon: 'local_gas_station' },
  { id: 3, label: 'Dégâts au retour', icon: 'car_crash' },
  { id: 4, label: 'Règlement & Facture', icon: 'payments' },
];

const ACCESSORY_LABELS = {
  roue_secours: { label: 'Roue de secours', icon: 'tire_repair' },
  cric:         { label: 'Cric',             icon: 'build' },
  manivelle:    { label: 'Manivelle',        icon: 'settings' },
  gilet:        { label: 'Gilet réfléchissant', icon: 'accessibility_new' },
  triangle:     { label: 'Triangle de sécurité', icon: 'warning' },
  extincteur:   { label: 'Extincteur',       icon: 'fire_extinguisher' },
  papiers:      { label: 'Papiers du véh.',  icon: 'description' },
  cles:         { label: 'Clés',             icon: 'key' },
};

const nowLocalISO = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CloseContractModal = ({ contract, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [kmLoading, setKmLoading] = useState(false);
  const [hasDevice, setHasDevice] = useState(false);
  const [agencySettings, setAgencySettings] = useState({ km_extra_active: false, km_par_jour: 250, km_tarif_extra_defaut: 1.5 });

  const [dateRetour, setDateRetour]     = useState(nowLocalISO());
  const [kmRetour, setKmRetour]         = useState('');
  const [carburant, setCarburant]       = useState(contract?.carburant_sortie || '4/8');
  const [etatGeneral, setEtatGeneral]   = useState('');
  const [damages, setDamages]           = useState([]);
  
  // Final Payment
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Espèce');

  // Accessories — pre-fill from departure state
  const [accessories, setAccessories] = useState(() => {
    const acc = {};
    Object.keys(ACCESSORY_LABELS).forEach(k => {
      acc[k] = contract?.[k] ?? false;
    });
    return acc;
  });

  useEffect(() => {
    if (contract) {
      setKmRetour(contract.km_sortie?.toString() || '');
    }
    // Fetch km settings
    const token = localStorage.getItem('access_token');
    axios.get('http://localhost:8000/api/agency/settings/', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setAgencySettings({
        km_extra_active: res.data.km_extra_active,
        km_par_jour: parseInt(res.data.km_par_jour) || 250,
        km_tarif_extra_defaut: parseFloat(res.data.km_tarif_extra_defaut) || 1.5,
      });
    }).catch(() => {});
  }, [contract]);

  // Détecte si le véhicule dispose d'un dispositif GPS (Traccar)
  useEffect(() => {
    if (!contract?.vehicle) { setHasDevice(false); return; }
    api.get(`vehicles/${contract.vehicle}/`)
      .then(res => {
        setHasDevice(res.data?.traccar_device_id != null);
      })
      .catch(() => setHasDevice(false));
  }, [contract]);

  const kmDiff = contract ? (parseInt(kmRetour || 0) - contract.km_sortie) : 0;
  const isEarlyReturn = contract && new Date(dateRetour) < new Date(contract.date_retour_prevue);

  // Recalculation logic — must be declared BEFORE km overage which depends on recalculatedDays
  const getRecalculatedDays = () => {
    if (!contract) return 0;
    const start = new Date(contract.date_sortie);
    const end = new Date(dateRetour);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const recalculatedDays = getRecalculatedDays();
  const recalculatedTotal = contract ? (recalculatedDays * parseFloat(contract.prix_par_jour)) : 0;

  // Km overage calculation (uses recalculatedDays, so must come after)
  const kmInclus = agencySettings.km_extra_active ? (recalculatedDays * agencySettings.km_par_jour) : Infinity;
  const kmSupplementaires = agencySettings.km_extra_active ? Math.max(0, kmDiff - kmInclus) : 0;
  const tarifKmExtra = parseFloat(contract?.vehicle_tarif_km_extra || agencySettings.km_tarif_extra_defaut || 1.5);
  const montantKmExtra = agencySettings.km_extra_active ? (kmSupplementaires * tarifKmExtra) : 0;

  const newBalance = contract ? (recalculatedTotal + montantKmExtra - parseFloat(contract.montant_paye)) : 0;

  // Auto-set payment amount to balance on step 5 entry? (Optional quality of life)
  useEffect(() => {
      if (step === 4) {
          setPaymentAmount(Math.max(0, newBalance).toString());
      }
  }, [step, newBalance]);

  const validateStep = (stepNum) => {
    const errors = {};
    if (stepNum === 1) {
      if (!dateRetour) errors.dateRetour = "La date et heure de retour est obligatoire.";
      if (!kmRetour) errors.kmRetour = "Le kilométrage au retour est obligatoire.";
      else if (parseInt(kmRetour) <= contract.km_sortie) errors.kmRetour = `Le kilométrage au retour doit être supérieur au kilométrage de départ (${contract.km_sortie} km).`;
    }
    if (stepNum === 4) {
      if (paymentAmount === '' || paymentAmount === null || paymentAmount === undefined) {
        errors.paymentAmount = "Le montant versé est obligatoire.";
      } else if (parseFloat(paymentAmount) < 0) {
        errors.paymentAmount = "Le montant versé doit être positif ou nul.";
      }
    }
    return errors;
  };

  const clearFieldError = (name) => {
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const fetchGpsKm = async () => {
    if (!contract?.vehicle) { toast.error("Véhicule introuvable."); return; }
    setKmLoading(true);
    try {
      const { data } = await api.get(`gps/positions/${contract.vehicle}/`);
      const odometer = data?.position?.odometer;
      if (odometer != null && odometer > 0) {
        const km = Math.round(odometer / 1000);
        setKmRetour(km.toString());
        clearFieldError('kmRetour');
        toast.success(`Kilométrage GPS : ${km.toLocaleString('fr-FR')} km`);
      } else {
        toast.error("Aucune position GPS / kilométrage disponible pour ce véhicule.");
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du kilométrage GPS", err);
      toast.error("Impossible de récupérer le kilométrage GPS.");
    } finally {
      setKmLoading(false);
    }
  };

  const goToStep = (target) => {
    if (target > step) {
      const errors = validateStep(step);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    setStep(target);
  };

  const handleSubmit = async () => {
    const step4Errors = validateStep(4);
    if (Object.keys(step4Errors).length > 0) { setFieldErrors(step4Errors); return; }
    const step1Errors = validateStep(1);
    if (Object.keys(step1Errors).length > 0) { setFieldErrors(step1Errors); setStep(1); return; }
    setError('');
    setLoading(true);
    try {
      const damagesPayload = damages
        .filter(d => d.type === 'RETOUR')
        .map(({ x, y, description }) => ({ x, y, description }));

      await api.post(`contracts/${contract.id}/return_vehicle/`, {
        km_retour: parseInt(kmRetour),
        carburant_retour: carburant,
        degats_retour: etatGeneral,
        date_retour_effective: new Date(dateRetour).toISOString(),
        accessories_retour: accessories,
        damages_retour: damagesPayload,
        payment_amount: parseFloat(paymentAmount || 0),
        payment_method: paymentMethod,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue lors de la clôture du contrat.");
    } finally {
      setLoading(false);
    }
  };

  if (!contract) return null;

  const stepState = (num) => {
    if (step > num) return 'done';
    if (step === num) return 'active';
    return 'idle';
  };

  const SectionTitle = ({ icon, title }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <h3 className="text-base font-bold font-headline text-on-surface">{title}</h3>
    </div>
  );

  const FieldError = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
        <span className="material-symbols-outlined text-[14px]">error</span>
        {message}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-start bg-white shrink-0">
          <div>
            <h2 className="text-xl font-extrabold font-headline text-on-surface">Clôturer le Contrat #{String(contract.id).padStart(5,'0')}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {contract.client_name} {contract.client_prenom}
              <span className="mx-1.5 opacity-50">|</span>
              {contract.vehicle_name} ({contract.vehicle_matricule})
            </p>
            {isEarlyReturn && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Retour Anticipé
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-4 py-2.5 bg-white border-b border-outline-variant/30 flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => {
            const state = stepState(s.id);
            return (
              <React.Fragment key={s.id}>
                {i > 0 && (
                  <div className="step-line min-w-4 mx-0.5" style={step > s.id ? { background: 'var(--success)' } : {}}></div>
                )}
                <button
                  onClick={() => goToStep(s.id)}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <div
                    className="step-dot text-white"
                    style={
                      {
                        width: 30,
                        height: 30,
                        fontSize: 12,
                        ...(state === 'done'
                          ? { background: 'var(--success)' }
                          : state === 'active'
                              ? { background: 'var(--primary-container)' }
                              : { background: 'var(--stroke)', color: 'var(--on-surface-variant)' })
                      }
                    }
                  >
                    {state === 'done' ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                    )}
                  </div>
                  <span
                    className="text-[11px] whitespace-nowrap"
                    style={
                      state === 'active'
                        ? { fontWeight: 700, color: 'var(--primary-container)' }
                        : { fontWeight: state === 'done' ? 600 : 500, color: state === 'done' ? 'var(--on-surface)' : 'var(--on-surface-variant)', opacity: state === 'idle' ? 0.6 : 1 }
                    }
                  >
                    {s.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-surface space-y-4">

          {error && (
            <div className="bg-error/10 text-error p-3 rounded-xl border border-error/20 flex gap-3 items-center animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined">error</span>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Step 1: Dates & KM */}
          {step === 1 && (
            <section className="bg-white p-4 rounded-xl border border-outline-variant/30">
              <SectionTitle icon="speed" title="Dates & Kilométrage" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                  <p className="label mb-1">Km au Départ</p>
                  <p className="text-xl font-headline font-bold text-on-surface">{contract.km_sortie?.toLocaleString()} <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>KM</span></p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--info-bg)', border: '1px solid #bfd7fb' }}>
                  <p className="label mb-1" style={{ color: 'var(--primary-container)' }}>Distance Parcourue</p>
                  <p className={`text-xl font-headline font-bold ${kmDiff >= 0 ? '' : 'text-red-600'}`} style={kmDiff >= 0 ? { color: 'var(--primary-container)' } : {}}>
                    {kmDiff >= 0 ? '+' : ''}{kmDiff.toLocaleString()} <span className="text-xs font-medium opacity-50">KM</span>
                  </p>
                  {agencySettings.km_extra_active && kmDiff > 0 && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Inclus: {(recalculatedDays * agencySettings.km_par_jour).toLocaleString()} km ({agencySettings.km_par_jour}/j)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1">
                    Date et Heure de Retour Réelle
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRetour}
                    onChange={e => { setDateRetour(e.target.value); clearFieldError('dateRetour'); }}
                    className="field"
                    style={fieldErrors.dateRetour ? { borderColor: 'var(--danger)', background: 'var(--error-bg)' } : {}}
                  />
                  <FieldError message={fieldErrors.dateRetour} />
                  {isEarlyReturn && (
                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      Retour avant la date prévue ({new Date(contract.date_retour_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
                    </p>
                  )}
                </div>

                <div>
                  <label className="label mb-1">
                    Kilométrage au Retour
                    <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute right-4 top-3 text-slate-400 text-xs font-bold uppercase tracking-widest">KM</span>
                      <input
                        type="number"
                        value={kmRetour}
                        min={contract.km_sortie + 1}
                        onChange={e => { setKmRetour(e.target.value); clearFieldError('kmRetour'); }}
                        placeholder={`min. ${contract.km_sortie?.toLocaleString()} km`}
                        className="field font-bold pr-12"
                        style={fieldErrors.kmRetour ? { borderColor: 'var(--danger)', background: 'var(--error-bg)' } : {}}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchGpsKm}
                      disabled={kmLoading || !hasDevice}
                      title={!hasDevice ? "Ce véhicule n'a pas de dispositif GPS (Traccar)" : "Remplir avec le kilométrage GPS (Traccar)"}
                      className="px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${kmLoading ? 'animate-spin' : ''}`}>
                        {kmLoading ? 'progress_activity' : 'satellite_alt'}
                      </span>
                      GPS
                    </button>
                  </div>
                  <FieldError message={fieldErrors.kmRetour} />
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Fuel & Condition + Accessories */}
          {step === 2 && (
            <section className="bg-white p-4 rounded-xl border border-outline-variant/30">
              {/* Row 1: Carburant (1/3) | Accessoires (2/3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <SectionTitle icon="local_gas_station" title="Carburant" />
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <p className="label mb-1 text-center" style={{ color: 'var(--on-surface-variant)' }}>Départ (Réf)</p>
                      <div className="opacity-40 grayscale pointer-events-none">
                        <FuelGaugeSelector value={contract.carburant_sortie} onChange={() => {}} compact />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="label mb-1 text-center" style={{ color: 'var(--primary-container)' }}>Retour</p>
                      <div className="transition-transform">
                        <FuelGaugeSelector value={carburant} onChange={setCarburant} compact />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 sm:border-l sm:border-outline-variant/30 sm:pl-5">
                  <SectionTitle icon="checklist" title="Vérification des Accessoires" />
                  <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>État au départ indiqué pour comparaison</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {Object.entries(ACCESSORY_LABELS).map(([key, { label, icon }]) => {
                      const departurState = contract[key];
                      const returnState  = accessories[key];
                      const mismatch     = departurState && !returnState;
                      return (
                        <label
                          key={key}
                          className={`check-item items-center gap-2 ${returnState ? 'on' : ''}`}
                          style={{ padding: '6px 10px', ...(mismatch ? { background: 'var(--danger-bg)', borderColor: 'var(--danger)' } : {}) }}
                        >
                          <div className={`w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-all ${
                            returnState ? 'text-white border-transparent' : 'border-slate-300 bg-white'
                          }`} style={returnState ? { background: 'var(--success)' } : {}}>
                            {returnState && <span className="material-symbols-outlined text-[12px] font-black">check</span>}
                            <input
                              type="checkbox"
                              checked={returnState}
                              onChange={e => setAccessories(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="hidden"
                            />
                          </div>
                          <span className={`material-symbols-outlined text-base shrink-0 ${returnState ? '' : mismatch ? 'text-red-500' : 'text-slate-400'}`} style={returnState ? { color: 'var(--success)' } : {}}>{icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-bold tracking-tight ${returnState ? 'text-on-surface' : 'text-slate-500'}`}>{label}</p>
                            <p className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)', opacity: departurState ? 0.8 : 0.5 }}>
                              Départ: {departurState ? 'Présent' : 'Absent'}
                              {mismatch && <span className="font-black underline ml-2" style={{ color: 'var(--danger)' }}>Manquant !</span>}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: État Général & Observations */}
              <div className="mt-4 pt-4 sm:border-t sm:border-outline-variant/30">
                <SectionTitle icon="notes" title="État Général & Observations" />
                <textarea
                  value={etatGeneral}
                  onChange={e => setEtatGeneral(e.target.value)}
                  placeholder="Notes sur la propreté, l'état intérieur, dysfonctionnements..."
                  rows={2}
                  className="field resize-none"
                />
              </div>
            </section>
          )}

          {/* Step 3: Return Damage Map */}
          {step === 3 && (
            <section className="bg-white p-4 rounded-xl border border-outline-variant/30">
              <div className="flex items-center justify-between mb-3">
                <SectionTitle icon="car_crash" title="Revue des Dégâts au Retour" />
                <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: 'var(--on-surface-variant)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }}></span>
                  Nouveaux Dégâts
                </div>
              </div>
              <DamageSelector
                damages={damages}
                onChange={setDamages}
                type="RETOUR"
                readOnly={false}
              />
            </section>
          )}

          {/* Step 4: Billing & Payment */}
          {step === 4 && (
            <section className="bg-white p-4 rounded-xl border border-outline-variant/30">
              <SectionTitle icon="payments" title="Règlement & Facture" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                  <p className="label mb-0.5">Durée Initiale</p>
                  <p className="text-base font-headline font-bold text-on-surface">{contract.jours} J</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--info-bg)', border: '1px solid #bfd7fb' }}>
                  <p className="label mb-0.5" style={{ color: 'var(--primary-container)' }}>Durée Réele</p>
                  <p className="text-base font-headline font-bold" style={{ color: 'var(--primary-container)' }}>{recalculatedDays} J</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                  <p className="label mb-0.5">Sous-total Initial</p>
                  <p className="text-base font-headline font-bold text-on-surface line-through opacity-40">{contract.montant_total} DH</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--info-bg)', border: '1px solid #bfd7fb' }}>
                  <p className="label mb-0.5" style={{ color: 'var(--primary-container)' }}>Sous-total Ajusté</p>
                  <p className="text-lg font-headline font-black" style={{ color: 'var(--primary-container)' }}>{recalculatedTotal.toLocaleString()} DH</p>
                </div>
              </div>

              {/* Km Overage */}
              {agencySettings.km_extra_active && kmSupplementaires > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--warning-bg)', border: '1px solid #fde68a' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                    <span className="material-symbols-outlined text-sm">speed</span>
                    Supplément Kilométrique
                  </p>
                  <div className="space-y-0.5 text-xs" style={{ color: '#92400e' }}>
                    <p>Km inclus : {kmInclus.toLocaleString()} km ({agencySettings.km_par_jour} km/j × {recalculatedDays} j)</p>
                    <p>Km parcourus : {kmDiff.toLocaleString()} km</p>
                    <p className="font-bold">Dépassement : {kmSupplementaires.toLocaleString()} km × {tarifKmExtra} DH/km</p>
                  </div>
                  <p className="text-lg font-black mt-1" style={{ color: 'var(--warning)' }}>+{montantKmExtra.toLocaleString()} DH</p>
                </div>
              )}

              {agencySettings.km_extra_active && kmSupplementaires === 0 && kmDiff > 0 && (
                <div className="mt-3 p-2.5 rounded-lg" style={{ background: 'var(--success-bg)', border: '1px solid #bbf0cf' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Kilométrage dans le forfait — Aucun supplément
                  </p>
                </div>
              )}

              <div className="mt-3 pt-3 flex justify-between items-end" style={{ borderTop: '1px solid var(--stroke)' }}>
                <div>
                  <p className="label mb-0.5">Déjà réglé</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>{contract.montant_paye} DH</p>
                </div>
                <div className="text-right">
                  <p className="label mb-0.5" style={{ color: 'var(--primary-container)' }}>Reste à payer</p>
                  <p className={`text-2xl font-headline font-black ${newBalance > 0 ? 'text-red-600' : ''}`} style={newBalance <= 0 ? { color: 'var(--success)' } : {}}>
                    {newBalance.toLocaleString()} DH
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--stroke)' }}>
                <div>
                  <label className="label mb-1">Montant versé (DH)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => { setPaymentAmount(e.target.value); clearFieldError('paymentAmount'); }}
                      className="field font-bold"
                      style={fieldErrors.paymentAmount ? { borderColor: 'var(--danger)', background: 'var(--error-bg)' } : {}}
                    />
                    <button
                      onClick={() => setPaymentAmount(Math.max(0, newBalance).toString())}
                      className="absolute right-3 top-2 text-[11px] font-bold px-2 py-1 rounded-lg hover:opacity-80"
                      style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}
                    >
                      SOLDE
                    </button>
                  </div>
                  <FieldError message={fieldErrors.paymentAmount} />
                </div>
                <div>
                  <label className="label mb-1">Mode de Paiement</label>
                  <Dropdown
                    options={[
                        { value: 'Espèce', label: 'Espèce' },
                        { value: 'Chèque', label: 'Chèque' },
                        { value: 'Virement', label: 'Virement' },
                        { value: 'TPE', label: 'TPE' }
                    ]}
                    value={paymentMethod}
                    onChange={(v) => setPaymentMethod(v)}
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/30 bg-white flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={step > 1 ? () => setStep(s => s - 1) : onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-colors text-slate-600"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {step > 1 ? 'Précédent' : 'Annuler'}
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => goToStep(step + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-headline font-bold hover:bg-primary/90 transition-transform hover:scale-[0.99]"
            >
              Suivant
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-7 py-2.5 bg-primary text-white rounded-xl font-headline font-bold hover:bg-primary/90 transition-transform hover:scale-[0.99] disabled:opacity-50 disabled:grayscale"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {loading ? 'Clôture...' : 'Valider la clôture'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloseContractModal;
