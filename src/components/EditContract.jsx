import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { apiErrorText, fieldErrors } from '../utils/apiErrorText';

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
  const [paymentErrors, setPaymentErrors] = useState({});
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    statut: ''
  });
  const [showProlongModal, setShowProlongModal] = useState(false);
  const [prolongDate, setProlongDate] = useState('');
  const [prolongQuote, setProlongQuote] = useState(null);
  const [prolongSubmitting, setProlongSubmitting] = useState(false);
  const [prolongError, setProlongError] = useState('');

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
      toast.error(apiErrorText(e, 'Erreur lors de l\'enregistrement du contrat.'));
    }
  };

  const handleDiscard = () => navigate('/contracts');

  // Montants calculés par le serveur : reste à payer = location + frais - déjà payé
  const resteAPayer = contract ? Number(contract.reste_a_payer ?? 0) : 0;
  const fraisSupplementaires = contract ? Number(contract.frais_supplementaires ?? 0) : 0;
  const totalDu = contract ? Number(contract.montant_total ?? 0) + fraisSupplementaires : 0;
  const paidPercent = totalDu > 0 ? Math.min(100, (Number(contract?.montant_paye ?? 0) / totalDu) * 100) : 0;

  const openPaymentModal = () => {
    setPaymentErrors({});
    setPaymentFormData({
      amount: resteAPayer > 0 ? resteAPayer.toFixed(2) : '',
      payment_method: 'Espèce',
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentFormData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentErrors({ amount: 'Le montant doit être supérieur à zéro.' });
      return;
    }
    if (amount > resteAPayer + 0.001) {
      setPaymentErrors({ amount: `Le montant dépasse le reste à payer (${formatMoney(resteAPayer)}).` });
      return;
    }
    setPaymentErrors({});
    setPaymentSubmitting(true);
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
      // Erreurs par champ (ex. montant) sous le champ, le reste en notification
      const byField = fieldErrors(err);
      setPaymentErrors(byField);
      if (!byField.amount) {
        toast.error(apiErrorText(err, 'Erreur lors de l\'ajout du paiement'));
      }
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const toLocalDatetime = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openProlongModal = () => {
    setProlongDate('');
    setProlongQuote(null);
    setProlongError('');
    setShowProlongModal(true);
  };

  const fetchProlongQuote = async (value) => {
    setProlongDate(value);
    setProlongError('');
    setProlongQuote(null);
    if (!value || !contract) return;
    try {
      const fmt = (v) => `${v.slice(0, 10)}T${v.slice(11, 16)}:00`;
      const { data } = await api.get(`vehicles/${contract.vehicle}/price-quote/`, {
        params: { start: fmt(contract.date_sortie), end: fmt(value) }
      });
      setProlongQuote(data);
    } catch {
      setProlongError('Impossible de calculer le devis.');
    }
  };

  const handleProlong = async (e) => {
    e.preventDefault();
    if (!prolongDate) { setProlongError('Veuillez choisir une nouvelle date de retour.'); return; }
    setProlongSubmitting(true);
    setProlongError('');
    try {
      await api.post(`contracts/${id}/prolong/`, {
        date_retour_prevue: `${prolongDate.slice(0, 10)}T${prolongDate.slice(11, 16)}:00`
      });
      toast.success('Contrat prolongé avec succès.');
      const { data } = await api.get(`contracts/${id}/`);
      setContract(data);
      setShowProlongModal(false);
    } catch (err) {
      setProlongError(apiErrorText(err, 'Erreur lors de la prolongation du contrat.'));
    } finally {
      setProlongSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 gap-3 text-primary font-semibold" role="status"><Spinner size={22} /> Chargement du contrat…</div>;
  if (!contract) return <div className="flex items-center justify-center h-screen text-error font-bold">Contrat non trouvé.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-slate-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">Résumé du Contrat</p>
          <h2 className="text-4xl font-extrabold text-primary">CTR-{String(id).padStart(5, '0')}</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDiscard}>Abandonner</Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        <div className="space-y-6">
          {/* Status Section */}
          <div>
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
          </div>

          {/* Period Section */}
          <div>
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
            {contract.statut === 'EN_COURS' && (
              <Button variant="outline" icon="schedule" className="mt-4 w-full !text-primary" onClick={openProlongModal}>
                Prolonger le contrat
              </Button>
            )}
            </div>

          {/* Payments Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div />
              <Button size="sm" icon="add" onClick={openPaymentModal}>Ajouter</Button>
            </div>
            {/* Progress Bar : payé / (location + frais) */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${paidPercent}%` }}></div>
              </div>
              <span className="text-sm font-medium text-primary">{paidPercent.toFixed(0)}%</span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Location</dt>
                <dd className="font-semibold">{formatMoney(contract.montant_total)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Frais supplémentaires</dt>
                <dd className="font-semibold">{formatMoney(fraisSupplementaires)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Déjà payé</dt>
                <dd className="font-semibold">{formatMoney(contract.montant_paye)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Reste à payer</dt>
                <dd className={`font-bold ${resteAPayer > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(resteAPayer)}</dd>
              </div>
            </dl>
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
                          {formatDateTime(pay.payment_date || pay.created_at)}
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
                        <td className="px-4 py-2 text-right font-bold text-success whitespace-nowrap">
                          +{formatMoney(pay.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        size="md"
        title="Ajouter un paiement"
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Annuler</Button>
            <Button type="submit" form="add-payment-form" loading={paymentSubmitting}>Valider le paiement</Button>
          </>
        )}
      >
        <form id="add-payment-form" onSubmit={handleAddPayment} className="space-y-4">
          <Field
            label="Montant (MAD)"
            required
            hint={`Reste à payer : ${formatMoney(resteAPayer)}`}
            error={paymentErrors.amount}
          >
            <Input
              type="number" required min="0.01" max={resteAPayer > 0 ? resteAPayer : undefined} step="0.01" placeholder="Ex : 1500"
              value={paymentFormData.amount}
              onChange={(e) => {
                setPaymentFormData({ ...paymentFormData, amount: e.target.value });
                if (paymentErrors.amount) setPaymentErrors({ ...paymentErrors, amount: undefined });
              }}
            />
          </Field>
          <div>
            <p className="label mb-1.5">Méthode <span className="text-danger" aria-hidden="true">*</span></p>
            <Dropdown
              options={[
                { value: 'Espèce', label: 'Espèce (Cash)' },
                { value: 'TPE', label: 'Carte Bancaire (TPE)' },
                { value: 'Virement', label: 'Virement Bancaire' },
                { value: 'Chèque', label: 'Chèque' },
              ]}
              value={paymentFormData.payment_method}
              onChange={(opt) => setPaymentFormData({ ...paymentFormData, payment_method: opt.value })}
            />
          </div>
          <Field label="Référence (optionnel)">
            <Input
              type="text" placeholder="N° chèque ou réf. virement"
              value={paymentFormData.reference}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              rows={2} placeholder="Détails supplémentaires…"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* Prolong Contract Modal */}
      <Modal
        isOpen={Boolean(showProlongModal && contract)}
        onClose={() => setShowProlongModal(false)}
        size="md"
        title="Prolonger le contrat"
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowProlongModal(false)}>Annuler</Button>
            <Button type="submit" form="prolong-form" loading={prolongSubmitting}>
              {prolongSubmitting ? 'Prolongation…' : 'Prolonger'}
            </Button>
          </>
        )}
      >
        <form id="prolong-form" onSubmit={handleProlong} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-surface border border-stroke rounded-token p-3">
              <p className="text-label-sm uppercase tracking-wider text-text-muted mb-1">Retour actuel</p>
              <p className="font-bold text-on-surface">{contract?.formatted_dates?.retour || contract?.formatted_dates?.end || ''}</p>
            </div>
            <div className="bg-surface border border-stroke rounded-token p-3">
              <p className="text-label-sm uppercase tracking-wider text-text-muted mb-1">Jours actuel</p>
              <p className="font-bold text-on-surface">{contract?.jours} jours</p>
            </div>
          </div>

          <Field label="Nouvelle date de retour" required hint="La nouvelle date doit être après le retour actuel.">
            <Input
              type="datetime-local" required
              min={contract?.date_retour_prevue ? toLocalDatetime(contract.date_retour_prevue) : ''}
              value={prolongDate}
              onChange={(e) => fetchProlongQuote(e.target.value)}
            />
          </Field>

          {prolongQuote && (
            <div className="bg-primary-light border border-primary-border rounded-token p-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-label-sm uppercase tracking-wider text-text-muted">Jours</p>
                <p className="text-lg font-extrabold text-primary">{prolongQuote.jours}</p>
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-text-muted">Prix / jour</p>
                <p className="text-lg font-extrabold text-primary">{formatMoney(prolongQuote.prix_moyen)}</p>
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-text-muted">Total</p>
                <p className="text-lg font-extrabold text-primary">{formatMoney(prolongQuote.total)}</p>
              </div>
            </div>
          )}

          {prolongError && (
            <div role="alert" className="text-xs font-semibold text-danger-dark bg-danger-bg border border-danger-border rounded-token px-4 py-3">
              {prolongError}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default EditContract;
