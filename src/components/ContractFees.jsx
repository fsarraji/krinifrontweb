import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input } from './ui/Input';
import Dropdown from './Dropdown';
import { formatMoney } from '../utils/formatters';
import { apiErrorText, fieldErrors } from '../utils/apiErrorText';
import { getRole } from '../utils/userRole';
import { useI18n } from '../i18n/context';

const FEE_KINDS = [
    { value: 'RETARD', labelKey: 'u.retard_de_restitution' },
    { value: 'CARBURANT', labelKey: 'u.carburant_manquant' },
    { value: 'KM_EXTRA', labelKey: 'u.kilomtrage_supplmentaire' },
    { value: 'DOMMAGE', labelKey: 'u.dommage_rparation' },
    { value: 'AMENDE', labelKey: 'u.amende_contravention' },
    { value: 'AUTRE', labelKey: 'u.autre' },
];

/**
 * Frais supplémentaires d'un contrat (retard, carburant, dommages, amendes...).
 * Ils s'ajoutent au reste à payer ; le serveur recalcule les montants.
 * Seul le gérant (OWNER) peut supprimer un frais.
 */
const ContractFees = ({ contractId, locked = false, onChanged }) => {
    const { t } = useI18n();
    const [fees, setFees] = useState([]);
    const feeOptions = FEE_KINDS.map((k) => ({ value: k.value, label: t(k.labelKey) }));
    const feeLabel = (fee) => feeOptions.find((k) => k.value === fee.kind)?.label || fee.kind_label;
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState('RETARD');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const isOwner = getRole() === 'OWNER';

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('contract-fees/', { params: { contract: contractId } });
            setFees(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            toast.error(apiErrorText(err, t('u.impossible_de_charger_les_frais')));
        } finally {
            setLoading(false);
        }
    }, [contractId, t]);

    useEffect(() => { load(); }, [load]);

    const total = fees.reduce((sum, f) => sum + Number(f.amount), 0);

    const handleAdd = async (e) => {
        e.preventDefault();
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            setErrors({ amount: t('u.le_montant_doit_tre_suprieur_zro') });
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await api.post('contract-fees/', {
                contract: Number(contractId),
                kind,
                amount: value.toFixed(2),
                description: description.trim(),
            });
            setAmount('');
            setDescription('');
            toast.success(t('u.frais_ajout_au_contrat'));
            await load();
            if (onChanged) await onChanged();
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            if (!byField.amount) toast.error(apiErrorText(err, t('u.erreur_lors_de_l_ajout_du_frais')));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (fee) => {
        const confirmed = await messageBox.ask(
            t('u.supprimer_ce_frais_le_reste_paye', { kind: feeLabel(fee), amount: formatMoney(fee.amount) }),
            t('u.supprimer_le_frais_2'),
            { destructive: true, confirmText: t('clients.menu.delete') },
        );
        if (!confirmed) return;
        try {
            await api.delete(`contract-fees/${fee.id}/`);
            toast.success(t('u.frais_supprim'));
            await load();
            if (onChanged) await onChanged();
        } catch (err) {
            toast.error(apiErrorText(err, t('u.suppression_impossible')));
        }
    };

    return (
        <section aria-labelledby="contract-fees-title" className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                <h3 id="contract-fees-title" className="text-xs font-bold uppercase text-slate-500">{t('u.frais_supplmentaires')}</h3>
                <span className="text-sm font-bold">{formatMoney(total)}</span>
            </div>

            {!locked && (
                <form onSubmit={handleAdd} className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start border-b border-slate-100">
                    <div className="sm:col-span-4">
                        <p className="label mb-1.5">{t('u.type')}</p>
                        <Dropdown options={feeOptions} value={kind} onChange={(v) => setKind(v || 'AUTRE')} />
                    </div>
                    <Field label={t('u.montant_mad')} error={errors.amount} className="sm:col-span-3">
                        <Input
                            type="number" min="0.01" step="0.01" placeholder={t('u.ex_150')}
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors({}); }}
                        />
                    </Field>
                    <Field label={t('u.description')} className="sm:col-span-3">
                        <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2 sm:pt-7">
                        <Button type="submit" size="sm" loading={submitting} className="w-full">{t('u.ajouter')}</Button>
                    </div>
                </form>
            )}

            {loading ? (
                <p className="p-4 text-sm text-slate-500" role="status">{t('u.chargement')}</p>
            ) : fees.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">{t('u.aucun_frais_supplmentaire_sur_ce')}</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {fees.map((fee) => (
                        <li key={fee.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{fee.kind_label}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {fee.date}{fee.description ? ` · ${fee.description}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-bold">{formatMoney(fee.amount)}</span>
                                {isOwner && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(fee)}
                                        aria-label={t('u.supprimer_le_frais', { kind: feeLabel(fee) })}
                                        className="text-danger hover:bg-danger-bg/50 rounded p-1"
                                    >
                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <p className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">
                {t('u.les_frais_s_ajoutent_au_reste_pa')}
            </p>
        </section>
    );
};

export default ContractFees;
