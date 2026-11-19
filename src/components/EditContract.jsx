import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import { translateOr } from '../i18n/helpers';
import Table from './ui/Table';
import { useParams, useNavigate } from 'react-router-dom';
import Dropdown from './Dropdown';
import api from '../api';
import { toast } from './Toast';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import Spinner from './ui/Spinner';
import ContractFees from './ContractFees';
import ContractPhotos from './ContractPhotos';
import AuditTimeline from './AuditTimeline';
import { formatDateTime, formatMoney } from '../utils/formatters';
import { apiErrorText, fieldErrors } from '../utils/apiErrorText';
import { useI18n } from '../i18n/context';

const EditContract = () => {
  const { t } = useI18n();
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
      toast.error(apiErrorText(e, t('u.erreur_lors_de_l_enregistrement_')));
    }
  };

  const handleDiscard = () => navigate('/contracts');

  // Montants calculés par le serveur : reste à payer = location + frais - déjà payé
  const resteAPayer = contract ? Number(contract.reste_a_payer ?? 0) : 0;
  const fraisSupplementaires = contract ? Number(contract.frais_supplementaires ?? 0) : 0;
  const totalDu = contract ? Number(contract.montant_total ?? 0) + fraisSupplementaires : 0;
  const paidPercent = totalDu > 0 ? Math.min(100, (Number(contract?.montant_paye ?? 0) / totalDu) * 100) : 0;

  const reloadContract = async () => {
    try {
      const { data } = await api.get(`contracts/${id}/`);
      setContract(data);
    } catch (err) {
      toast.error(apiErrorText(err, t('u.impossible_de_rafrachir_le_contr')));
    }
  };

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
      setPaymentErrors({ amount: t('u.le_montant_doit_tre_suprieur_zro') });
      return;
    }
    if (amount > resteAPayer + 0.001) {
      setPaymentErrors({ amount: t('u.le_montant_dpasse_le_reste_payer', { rest: formatMoney(resteAPayer) }) });
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
      toast.success(t('u.paiement_ajout_avec_succs'));
    } catch (err) {
      console.error('Add payment error', err);
      // Erreurs par champ (ex. montant) sous le champ, le reste en notification
      const byField = fieldErrors(err);
      setPaymentErrors(byField);
      if (!byField.amount) {
        toast.error(apiErrorText(err, t('u.erreur_lors_de_l_ajout_du_paieme')));
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
      setProlongError(t('u.impossible_de_calculer_le_devis'));
    }
  };

  const handleProlong = async (e) => {
    e.preventDefault();
    if (!prolongDate) { setProlongError(t('u.veuillez_choisir_une_nouvelle_da')); return; }
    setProlongSubmitting(true);
    setProlongError('');
    try {
      await api.post(`contracts/${id}/prolong/`, {
        date_retour_prevue: `${prolongDate.slice(0, 10)}T${prolongDate.slice(11, 16)}:00`
      });
      toast.success(t('u.contrat_prolong_avec_succs'));
      const { data } = await api.get(`contracts/${id}/`);
      setContract(data);
      setShowProlongModal(false);
    } catch (err) {
      setProlongError(apiErrorText(err, t('u.erreur_lors_de_la_prolongation_d')));
    } finally {
      setProlongSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 gap-3 text-primary font-semibold" role="status"><Spinner size={22} /> {t('u.chargement_du_contrat')}</div>;
  if (!contract) return <div className="flex items-center justify-center h-64 text-error font-bold">{t('u.contrat_non_trouv')}</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-slate-50/30 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1">{t('u.rsum_du_contrat_2')}</p>
          <h2 className="text-4xl font-extrabold text-primary">CTR-{String(id).padStart(5, '0')}</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDiscard}>{t('u.abandonner')}</Button>
          <Button onClick={handleSave}>{t('u.enregistrer')}</Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        <div className="space-y-6">
          {/* Status Section */}
          <div>
            <Dropdown
                options={[
                    { value: 'RESERVE', label: t('u.rserv') },
                    { value: 'EN_COURS', label: t('u.en_cours') },
                    { value: 'TERMINE', label: t('u.termin') },
                    { value: 'ANNULE', label: t('u.annul') },
                ]}
                value={formData.statut}
                onChange={(v) => setFormData({ ...formData, statut: v || '' })}
                aria-label={t('u.statut')}
            />
          </div>

          {/* Period Section */}
          <div>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{t('u.dpart')}</p>
                <p className="font-semibold">{contract.formatted_dates?.start || contract.date_debut}</p>
              </div>
              <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
              <div>
                <p className="text-xs font-medium text-slate-500">{t('u.retour')}</p>
                <p className="font-semibold">{contract.formatted_dates?.end || contract.date_fin}</p>
              </div>
            </div>
            {contract.statut === 'EN_COURS' && (
              <Button variant="outline" icon="schedule" className="mt-4 w-full !text-primary" onClick={openProlongModal}>
                {t('u.prolonger_le_contrat')}
              </Button>
            )}
            </div>

          {/* Frais supplémentaires */}
          <ContractFees contractId={id} locked={contract.statut === 'ANNULE'} onChanged={reloadContract} />

          {/* Photos de l'état des lieux (verrouillé si le contrat est annulé) */}
          <ContractPhotos contractId={id} locked={contract.statut === 'ANNULE'} />

          {/* Payments Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div />
              <Button size="sm" icon="add" onClick={openPaymentModal}>{t('u.ajouter')}</Button>
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
                <dt className="text-xs text-slate-500">{t('u.location')}</dt>
                <dd className="font-semibold">{formatMoney(contract.montant_total)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('u.frais_supplmentaires')}</dt>
                <dd className="font-semibold">{formatMoney(fraisSupplementaires)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('u.dj_pay')}</dt>
                <dd className="font-semibold">{formatMoney(contract.montant_paye)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{t('u.reste_payer_2')}</dt>
                <dd className={`font-bold ${resteAPayer > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(resteAPayer)}</dd>
              </div>
            </dl>
            {/* Payments List */}
            {paymentsHistory.length > 0 && (
              <Table
                caption={t('u.historique_des_transactions')}
                rows={paymentsHistory}
                columns={[
                  { key: 'payment_date', label: t('u.date'), render: (_, pay) => formatDateTime(pay.payment_date || pay.created_at) },
                  { key: 'payment_method', label: t('u.mthode'), render: (v) => translateOr(t, `method.${v}`, v) },
                  {
                    key: 'reference', label: t('u.rf_notes'),
                    render: (_, pay) => (
                      <div>
                        <p className="text-xs">{pay.reference || '-'}</p>
                        {pay.notes && <p className="text-label-sm font-normal text-text-muted">{pay.notes}</p>}
                      </div>
                    ),
                  },
                  { key: 'amount', label: t('u.montant'), align: 'right', render: (v) => <strong className="text-success">+{formatMoney(v)}</strong> },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <details className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">{t('u.historique_des_modifications')}</summary>
        <div className="mt-3">
          <AuditTimeline model="contract" id={id} />
        </div>
      </details>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        size="md"
        title={t('u.ajouter_un_paiement')}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>{t('u.annuler')}</Button>
            <Button type="submit" form="add-payment-form" loading={paymentSubmitting}>{t('u.valider_le_paiement')}</Button>
          </>
        )}
      >
        <form id="add-payment-form" onSubmit={handleAddPayment} className="space-y-4">
          <Field
            label={t('u.montant_mad')}
            required
            hint={t('u.reste_payer', { rest: formatMoney(resteAPayer) })}
            error={paymentErrors.amount}
          >
            <Input
              type="number" required min="0.01" max={resteAPayer > 0 ? resteAPayer : undefined} step="0.01" placeholder={t('u.ex_1500')}
              value={paymentFormData.amount}
              onChange={(e) => {
                setPaymentFormData({ ...paymentFormData, amount: e.target.value });
                if (paymentErrors.amount) setPaymentErrors({ ...paymentErrors, amount: undefined });
              }}
            />
          </Field>
          <div>
            <p className="label mb-1.5">{t('u.mthode')} <span className="text-danger" aria-hidden="true">*</span></p>
            <Dropdown
              options={[
                { value: 'Espèce', label: t('u.espce_cash') },
                { value: 'TPE', label: t('u.carte_bancaire_tpe') },
                { value: 'Virement', label: t('u.virement_bancaire') },
                { value: 'Chèque', label: t('method.Chèque') },
              ]}
              value={paymentFormData.payment_method}
              onChange={(value) => setPaymentFormData({ ...paymentFormData, payment_method: value || 'Espèce' })}
            />
          </div>
          <Field label={t('u.rfrence_optionnel')}>
            <Input
              type="text" placeholder={t('u.n_chque_ou_rf_virement')}
              value={paymentFormData.reference}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, reference: e.target.value })}
            />
          </Field>
          <Field label={t('u.notes')}>
            <Textarea
              rows={2} placeholder={t('u.dtails_supplmentaires')}
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
        title={t('u.prolonger_le_contrat')}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowProlongModal(false)}>{t('u.annuler')}</Button>
            <Button type="submit" form="prolong-form" loading={prolongSubmitting}>
              {prolongSubmitting ? t('u.prolongation') : t('u.prolonger')}
            </Button>
          </>
        )}
      >
        <form id="prolong-form" onSubmit={handleProlong} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Card padding={3} variant="default">
              <p className="text-label-sm uppercase tracking-wider text-text-muted mb-1">{t('u.retour_actuel')}</p>
              <p className="font-bold text-on-surface">{contract?.formatted_dates?.retour || contract?.formatted_dates?.end || ''}</p>
            </Card>
            <Card padding={3} variant="default">
              <p className="text-label-sm uppercase tracking-wider text-text-muted mb-1">{t('u.jours_actuel')}</p>
              <p className="font-bold text-on-surface">{t('u.jours', { n: contract?.jours })}</p>
            </Card>
          </div>

          <Field label={t('u.nouvelle_date_de_retour')} required hint={t('u.la_nouvelle_date_doit_tre_aprs_l')}>
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
                <p className="text-label-sm uppercase tracking-wider text-text-muted">{t('u.jours_2')}</p>
                <p className="text-lg font-extrabold text-primary">{prolongQuote.jours}</p>
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-text-muted">{t('u.prix_jour')}</p>
                <p className="text-lg font-extrabold text-primary">{formatMoney(prolongQuote.prix_moyen)}</p>
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-text-muted">{t('u.total')}</p>
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
