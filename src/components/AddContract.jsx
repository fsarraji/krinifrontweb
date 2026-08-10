import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api, { fetchAllPages } from '../api';

// Design tokens for consistency with existing premium theme
const tokens = {
  container: 'max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-200',
  header: 'flex items-center justify-between mb-6 pb-4 border-b border-slate-100',
  title: 'text-2xl font-extrabold text-slate-900',
  buttonPrimary: 'px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors',
  buttonSecondary: 'px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors',
  input: 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600',
  select: 'react-select',
};

const AddContract = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    client: null,
    vehicle: null,
    startDate: '',
    endDate: '',
    montantTotal: '',
    caution: '',
  });

  // Fetch clients and vehicles once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clients, vehicles] = await Promise.all([
            fetchAllPages('clients/'),
            fetchAllPages('vehicles/'),
        ]);
        setClients(clients);
        setVehicles(vehicles);
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    try {
      const payload = {
        client: formData.client?.value,
        vehicle: formData.vehicle?.value,
        start_date: formData.startDate,
        end_date: formData.endDate,
        montant_total: parseFloat(formData.montantTotal),
        caution: parseFloat(formData.caution),
      };
      await api.post('contracts/', payload);
      navigate('/contracts');
    } catch (err) {
      console.error('Error creating contract', err);
    }
  };

  if (loading) return <div className="text-center mt-20 font-bold text-indigo-600">Chargement...</div>;

  return (
    <div className={tokens.container}>
      <div className={tokens.header}>
        <h2 className={tokens.title}>Créer un nouveau contrat</h2>
        <button onClick={() => navigate('/contracts')} className={tokens.buttonSecondary}>Annuler</button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {/* Step 1 – Client */}
        {step === 1 && (
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client</label>
            <Select
              options={clients.map(c => ({ value: c.id, label: `${c.prenom} ${c.nom}` }))}
              value={formData.client}
              onChange={(opt) => setFormData({ ...formData, client: opt })}
              classNamePrefix={tokens.select}
            />
          </div>
        )}
        {/* Step 2 – Vehicle & Dates */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Véhicule</label>
            <Select
              options={vehicles.map(v => ({ value: v.id, label: v.name }))}
              value={formData.vehicle}
              onChange={(opt) => setFormData({ ...formData, vehicle: opt })}
              classNamePrefix={tokens.select}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date de départ</label>
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={tokens.input} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date de retour</label>
                <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={tokens.input} />
              </div>
            </div>
          </div>
        )}
        {/* Step 3 – Finances */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Montant total (DH)</label>
              <input type="number" min="0" value={formData.montantTotal} onChange={(e) => setFormData({ ...formData, montantTotal: e.target.value })} className={tokens.input} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caution (DH)</label>
              <input type="number" min="0" value={formData.caution} onChange={(e) => setFormData({ ...formData, caution: e.target.value })} className={tokens.input} />
            </div>
          </div>
        )}
        {/* Step 4 – Recap */}
        {step === 4 && (
          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
            <h4 className="font-bold text-slate-900">Récapitulatif</h4>
            <p><span className="text-slate-500">Client :</span> {formData.client?.label}</p>
            <p><span className="text-slate-500">Véhicule :</span> {formData.vehicle?.label}</p>
            <p><span className="text-slate-500">Période :</span> {formData.startDate} → {formData.endDate}</p>
            <p><span className="text-slate-500">Montant total :</span> {formData.montantTotal} DH</p>
            <p><span className="text-slate-500">Caution :</span> {formData.caution} DH</p>
          </div>
        )}
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <button type="button" onClick={handleBack} disabled={step === 1} className={`${tokens.buttonSecondary} ${step === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>Précédent</button>
          {step < 4 ? (
            <button type="button" onClick={handleNext} className={tokens.buttonPrimary}>Suivant</button>
          ) : (
            <button type="submit" className={tokens.buttonPrimary}>Créer le contrat</button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddContract;
