import React, { useState, useEffect } from 'react';
import api from '../api';
import FuelGaugeSelector from './FuelGaugeSelector';
import DamageSelector from './DamageSelector';
import Dropdown from './Dropdown';
import axios from 'axios';

const STEPS = [
  { id: 1, label: 'Dates & Kilométrage', icon: 'speed' },
  { id: 2, label: 'Carburant & État', icon: 'local_gas_station' },
  { id: 3, label: 'Accessoires', icon: 'checklist' },
  { id: 4, label: 'Dégâts au retour', icon: 'car_crash' },
  { id: 5, label: 'Règlement & Facture', icon: 'payments' },
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
      if (step === 5) {
          setPaymentAmount(Math.max(0, newBalance).toString());
      }
  }, [step, newBalance]);

  const handleSubmit = async () => {
    setError('');
    if (!kmRetour) { setError('Le kilométrage est obligatoire.'); return; }
    if (parseInt(kmRetour) < contract.km_sortie) {
      setError(`Le kilométrage doit être supérieur ou égal à ${contract.km_sortie} km.`);
      return;
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary-container p-1.5 bg-primary/20 rounded-lg text-lg">lock</span>
              <h2 className="font-headline text-xl font-extrabold tracking-tight">Clôturer le Contrat #{String(contract.id).padStart(5,'0')}</h2>
            </div>
            <p className="text-slate-400 text-xs font-medium space-x-2">
              <span className="text-primary-container">{contract.client_name} {contract.client_prenom}</span>
              <span className="text-slate-600">|</span>
              <span>{contract.vehicle_name} ({contract.vehicle_matricule})</span>
            </p>
            {isEarlyReturn && (
              <span className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                Retour Anticipé
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors mt-1 p-1 hover:bg-white/5 rounded-md">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  step === s.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                    : step > s.id
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {step > s.id
                  ? <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  : <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
                }
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <span className="text-slate-300 mx-1">
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Step 1: Dates & KM */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Km au Départ</p>
                  <p className="text-2xl font-headline font-bold text-slate-900">{contract.km_sortie?.toLocaleString()} <span className="text-xs font-medium text-slate-400">KM</span></p>
                </div>
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Distance Parcourue</p>
                  <p className={`text-2xl font-headline font-bold ${kmDiff >= 0 ? 'text-primary' : 'text-red-600'}`}>
                    {kmDiff >= 0 ? '+' : ''}{kmDiff.toLocaleString()} <span className="text-xs font-medium text-primary/50">KM</span>
                  </p>
                  {agencySettings.km_extra_active && kmDiff > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Inclus: {(recalculatedDays * agencySettings.km_par_jour).toLocaleString()} km ({agencySettings.km_par_jour}/j)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Date et Heure de Retour Réelle
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dateRetour}
                    onChange={e => setDateRetour(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                  />
                  {isEarlyReturn && (
                    <p className="text-amber-600 text-[10px] font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      Retour avant la date prévue ({new Date(contract.date_retour_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Kilométrage au Retour
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={kmRetour}
                      min={contract.km_sortie}
                      onChange={e => setKmRetour(e.target.value)}
                      placeholder={`min. ${contract.km_sortie?.toLocaleString()} km`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase tracking-widest">KM</span>
                  </div>
                  {parseInt(kmRetour) < contract.km_sortie && kmRetour !== '' && (
                    <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      Doit être supérieur au kilométrage de départ
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Fuel & Condition */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                  Niveau de Carburant (Retour)
                </label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Départ (Réf)</p>
                    <div className="opacity-40 grayscale pointer-events-none scale-90 origin-top">
                      <FuelGaugeSelector value={contract.carburant_sortie} onChange={() => {}} />
                    </div>
                    <p className="text-center text-[11px] font-bold text-slate-400">{contract.carburant_sortie}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest text-center">Retour ✏️</p>
                    <div className="scale-105 origin-top transition-transform">
                      <FuelGaugeSelector value={carburant} onChange={setCarburant} />
                    </div>
                    <p className="text-center text-[11px] font-extrabold text-primary">{carburant}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">État Général & Observations</label>
                <textarea
                  value={etatGeneral}
                  onChange={e => setEtatGeneral(e.target.value)}
                  placeholder="Notes sur la propreté, l'état intérieur, dysfonctionnements..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none font-medium"
                />
              </div>
            </div>
          )}

          {/* Step 3: Accessories */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Vérification des Accessoires</p>
                <span className="text-[10px] font-medium text-slate-400 italic">État au départ indiqué pour comparaison</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ACCESSORY_LABELS).map(([key, { label, icon }]) => {
                  const departurState = contract[key];
                  const returnState  = accessories[key];
                  const mismatch     = departurState && !returnState;
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        returnState
                          ? 'bg-primary/5 border-primary/20 shadow-sm'
                          : mismatch
                          ? 'bg-red-50 border-red-200 shadow-sm animate-pulse'
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
                        returnState ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {returnState && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                        <input
                          type="checkbox"
                          checked={returnState}
                          onChange={e => setAccessories(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="hidden"
                        />
                      </div>
                      <span className={`material-symbols-outlined text-xl shrink-0 ${
                        returnState ? 'text-primary' : mismatch ? 'text-red-500' : 'text-slate-400'
                      }`}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold tracking-tight ${returnState ? 'text-slate-900' : 'text-slate-500'}`}>{label}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${departurState ? 'text-slate-400' : 'text-slate-400 opacity-50'}`}>
                          Départ: {departurState ? 'Présent' : 'Absent'}
                          {mismatch && <span className="text-red-600 ml-2 font-black underline">Manquant !</span>}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Return Damage Map */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Revue des Dégâts au Retour</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Nouveaux Dégâts
                </div>
              </div>
              <DamageSelector
                damages={damages}
                onChange={setDamages}
                type="RETOUR"
                readOnly={false}
              />
            </div>
          )}

          {/* Step 5: Billing & Payment */}
          {step === 5 && (
            <div className="space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/5 text-8xl">account_balance_wallet</span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-container">Récapitulatif de Facturation</p>
                    
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-1">
                            <p className="text-xs text-slate-400">Durée Initiale</p>
                            <p className="text-lg font-headline font-bold">{contract.jours} Jours</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-slate-400">Durée Réele</p>
                            <p className="text-lg font-headline font-bold text-primary-container">{recalculatedDays} Jours</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-slate-400">Sous-total Initial</p>
                            <p className="text-lg font-headline font-bold line-through opacity-40">{contract.montant_total} DH</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-slate-400">Sous-total Ajusté</p>
                            <p className="text-xl font-headline font-black text-primary-container">{recalculatedTotal.toLocaleString()} DH</p>
                        </div>
                    </div>

                    {/* Km Overage */}
                    {agencySettings.km_extra_active && kmSupplementaires > 0 && (
                        <div className="mt-4 p-4 bg-orange-500/20 rounded-xl border border-orange-400/20 relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300 mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">speed</span>
                                Supplément Kilométrique
                            </p>
                            <div className="space-y-1 text-xs text-orange-200">
                                <p>Km inclus : {kmInclus.toLocaleString()} km ({agencySettings.km_par_jour} km/j × {recalculatedDays} j)</p>
                                <p>Km parcourus : {kmDiff.toLocaleString()} km</p>
                                <p className="font-bold text-orange-100">Dépassement : {kmSupplementaires.toLocaleString()} km × {tarifKmExtra} DH/km</p>
                            </div>
                            <p className="text-xl font-black text-orange-300 mt-2">+{montantKmExtra.toLocaleString()} DH</p>
                        </div>
                    )}

                    {agencySettings.km_extra_active && kmSupplementaires === 0 && kmDiff > 0 && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-400/20 relative z-10">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-green-300 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Kilométrage dans le forfait — Aucun supplément
                            </p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/10 flex justify-between items-end relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Déjà réglé</p>
                            <p className="text-lg font-bold text-green-400">{contract.montant_paye} DH</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-container">Reste à payer</p>
                            <p className={`text-3xl font-headline font-black ${newBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {newBalance.toLocaleString()} DH
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Enregistrer un versement final</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Montant versé (DH)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                />
                                <button 
                                    onClick={() => setPaymentAmount(Math.max(0, newBalance).toString())}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                                >
                                    SOLDE
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Mode de Paiement</label>
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
                </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-red-500 text-lg shrink-0">error</span>
              <p className="text-xs font-bold text-red-700 tracking-tight leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-slate-50/50">
          <button
            onClick={step > 1 ? () => setStep(s => s - 1) : onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-all uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {step > 1 ? 'Précédent' : 'Annuler'}
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`h-1 rounded-full transition-all duration-300 ${
                  step === s.id ? 'bg-primary w-8' : step > s.id ? 'bg-green-500 w-2' : 'bg-slate-200 w-2'
                }`}
              />
            ))}
          </div>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
            >
              Suivant
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:grayscale"
            >
              {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {loading ? 'Clôture...' : 'Valider la clôture'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloseContractModal;
