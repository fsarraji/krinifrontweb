import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';

const EditContract = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'Espèce',
    reference: '',
    notes: ''
  });
  const [formData, setFormData] = useState({
    statut: ''
  });

  // Fetch contract and payments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`contracts/${id}/`);
        setContract(data);
        setFormData({ statut: data.statut });
        const paymentsRes = await api.get(`payments/?contract=${id}`);
        setPaymentsHistory(paymentsRes.data.results || paymentsRes.data);
      } catch (e) {
        console.error('Error loading contract', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    try {
      await api.patch(`contracts/${id}/`, formData);
      navigate('/contracts');
    } catch (e) {
      console.error('Save error', e);
    }
  };

  const handleDiscard = () => navigate('/contracts');

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...paymentFormData,
        contract: parseInt(id),
        agency: contract.agency
      };
      await api.post('payments/', payload);
      // Refresh data
      const { data } = await api.get(`contracts/${id}/`);
      setContract(data);
      const paymentsRes = await api.get(`payments/?contract=${id}`);
      setPaymentsHistory(paymentsRes.data.results || paymentsRes.data);
      setShowPaymentModal(false);
      setPaymentFormData({ amount: '', payment_method: 'Espèce', reference: '', notes: '' });
      toast.success('Paiement ajouté avec succès.');
    } catch (err) {
      console.error('Add payment error', err);
      toast.error('Erreur lors de l\'ajout du paiement');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-primary font-bold">Chargement du contrat…</div>;
  if (!contract) return <div className="flex items-center justify-center h-screen text-error font-bold">Contrat non trouvé.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-slate-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">Résumé du Contrat</p>
          <h2 className="text-4xl font-extrabold text-primary">CTR-{String(id).padStart(5, '0')}</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDiscard}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Abandonner
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status Section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">rule</span> Statut du Contrat
            </h3>
            <Select
              options={[
                { value: 'RESERVE', label: 'Réservé' },
                { value: 'EN_COURS', label: 'En cours' },
                { value: 'TERMINE', label: 'Terminé' },
                { value: 'ANNULE', label: 'Annulé' }
              ]}
              value={
                {
                  value: formData.statut,
                  label: {
                    RESERVE: 'Réservé',
                    EN_COURS: 'En cours',
                    TERMINE: 'Terminé',
                    ANNULE: 'Annulé'
                  }[formData.statut] || ''
                }
              }
              onChange={(opt) => setFormData({ ...formData, statut: opt?.value || '' })}
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#f8fafc',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '2px'
                })
              }}
            />
          </section>

          {/* Period Section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">calendar_today</span> Période de Location
            </h3>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Départ</p>
                <p className="font-semibold">{contract.formatted_dates?.start || contract.date_debut}</p>
              </div>
              <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
              <div>
                <p className="text-xs font-medium text-slate-500">Retour</p>
                <p className="font-semibold">{contract.formatted_dates?.end || contract.date_fin}</p>
              </div>
            </div>
            <button className="mt-4 w-full py-2.5 rounded-xl border border-primary/10 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/5 transition-colors">
              Prolonger le contrat
            </button>
          </section>

          {/* Payments Section */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">payments</span> Suivi des Paiements
              </h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-xs">receipt</span> Facture
                </button>
                <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors">
                  <span className="material-symbols-outlined text-xs">add</span> Ajouter
                </button>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${contract.montant_total ? (contract.montant_paye / contract.montant_total) * 100 : 0}%` }}></div>
              </div>
              <span className="text-sm font-medium text-indigo-600">
                {contract.montant_total ? ((contract.montant_paye / contract.montant_total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            {/* Payments List */}
            {paymentsHistory.length > 0 && (
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
                  Historique des transactions
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Méthode</th>
                      <th className="px-4 py-2">Réf / Notes</th>
                      <th className="px-4 py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsHistory.map(pay => (
                      <tr key={pay.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-slate-600 font-medium">
                          {new Date(pay.payment_date || pay.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                            {pay.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-xs">
                          {pay.reference || '-'}
                          {pay.notes && <span className="block text-xs text-slate-400">{pay.notes}</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-green-600 whitespace-nowrap">
                          +{parseFloat(pay.amount).toLocaleString()} DH
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Financial Summary */}
          <section className="relative bg-indigo-950 text-white p-8 rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-indigo-800 to-indigo-600"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined">insights</span> Résumé Financier
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold opacity-70 uppercase">Valeur Totale</p>
                  <p className="text-2xl font-bold">{parseFloat(contract.montant_total).toLocaleString()} DH</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-bold opacity-70 uppercase">Payé à ce jour</p>
                    <p className="text-lg font-bold text-indigo-300">{(contract.montant_paye || 0).toLocaleString()} DH</p>
                  </div>
                  <span className="text-2xl opacity-20">–</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-bold text-blue-200 uppercase">Solde Restant</p>
                  <p className="text-4xl font-extrabold">{(contract.reste_a_payer || 0).toLocaleString()} DH</p>
                </div>
              </div>
            </div>
          </section>

          {/* Documents */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">folder_open</span> Documents
            </h3>
            <div className="flex flex-col gap-3">
              <button className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-slate-900">Contrat_Signe_{id}.pdf</p>
                  <p className="text-xs text-slate-500">PDF • 2.4 MB</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">download</span>
              </button>
              <button className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-indigo-600">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase text-slate-900">Renvoyer au Client</p>
                  <p className="text-xs text-slate-500">{contract.client_email || 'client@email.com'}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">send</span>
              </button>
            </div>
          </section>

          {/* Critical Action */}
          <section className="mt-4">
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-600 bg-white hover:bg-red-50 transition-colors text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-lg">gavel</span> Résilier le Contrat
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              La résiliation est irréversible et déclenchera le protocole de retour du véhicule.
            </p>
          </section>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">attach_money</span> Ajouter un paiement
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant (DH) <span className="text-error">*</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  placeholder="Ex: 1500"
                  value={paymentFormData.amount}
                  onChange={e => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Méthode <span className="text-error">*</span></label>
                <Dropdown
                  options={[
                    { value: 'Espèce', label: 'Espèce (Cash)' },
                    { value: 'TPE', label: 'Carte Bancaire (TPE)' },
                    { value: 'Virement', label: 'Virement Bancaire' },
                    { value: 'Chèque', label: 'Chèque' }
                  ]}
                  value={paymentFormData.payment_method}
                  onChange={opt => setPaymentFormData({ ...paymentFormData, payment_method: opt.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Référence (optionnel)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  placeholder="N° Chèque ou Réf Virement"
                  value={paymentFormData.reference}
                  onChange={e => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  placeholder="Détails supplémentaires..."
                  value={paymentFormData.notes}
                  onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors">
                  Valider le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditContract;
