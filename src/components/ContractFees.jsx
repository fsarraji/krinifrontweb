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

const FEE_KINDS = [
    { value: 'RETARD', label: 'Retard de restitution' },
    { value: 'CARBURANT', label: 'Carburant manquant' },
    { value: 'KM_EXTRA', label: 'Kilométrage supplémentaire' },
    { value: 'DOMMAGE', label: 'Dommage / réparation' },
    { value: 'AMENDE', label: 'Amende / contravention' },
    { value: 'AUTRE', label: 'Autre' },
];

/**
 * Frais supplémentaires d'un contrat (retard, carburant, dommages, amendes...).
 * Ils s'ajoutent au reste à payer ; le serveur recalcule les montants.
 * Seul le gérant (OWNER) peut supprimer un frais.
 */
const ContractFees = ({ contractId, locked = false, onChanged }) => {
    const [fees, setFees] = useState([]);
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
            toast.error(apiErrorText(err, 'Impossible de charger les frais.'));
        } finally {
            setLoading(false);
        }
    }, [contractId]);

    useEffect(() => { load(); }, [load]);

    const total = fees.reduce((sum, f) => sum + Number(f.amount), 0);

    const handleAdd = async (e) => {
        e.preventDefault();
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            setErrors({ amount: 'Le montant doit être supérieur à zéro.' });
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
            toast.success('Frais ajouté au contrat.');
            await load();
            if (onChanged) await onChanged();
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            if (!byField.amount) toast.error(apiErrorText(err, "Erreur lors de l'ajout du frais."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (fee) => {
        const confirmed = await messageBox.ask(
            `Supprimer ce frais (${fee.kind_label}, ${formatMoney(fee.amount)}) ? Le reste à payer du contrat sera recalculé.`,
            'Supprimer le frais',
            { destructive: true, confirmText: 'Supprimer' },
        );
        if (!confirmed) return;
        try {
            await api.delete(`contract-fees/${fee.id}/`);
            toast.success('Frais supprimé.');
            await load();
            if (onChanged) await onChanged();
        } catch (err) {
            toast.error(apiErrorText(err, 'Suppression impossible.'));
        }
    };

    return (
        <section aria-labelledby="contract-fees-title" className="border border-slate-100 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                <h3 id="contract-fees-title" className="text-xs font-bold uppercase text-slate-500">Frais supplémentaires</h3>
                <span className="text-sm font-bold">{formatMoney(total)}</span>
            </div>

            {!locked && (
                <form onSubmit={handleAdd} className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start border-b border-slate-100">
                    <div className="sm:col-span-4">
                        <p className="label mb-1.5">Type</p>
                        <Dropdown options={FEE_KINDS} value={kind} onChange={(v) => setKind(v || 'AUTRE')} />
                    </div>
                    <Field label="Montant (MAD)" error={errors.amount} className="sm:col-span-3">
                        <Input
                            type="number" min="0.01" step="0.01" placeholder="Ex : 150"
                            value={amount}
                            onChange={(e) => { setAmount(e.target.value); if (errors.amount) setErrors({}); }}
                        />
                    </Field>
                    <Field label="Description" className="sm:col-span-3">
                        <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Field>
                    <div className="sm:col-span-2 sm:pt-7">
                        <Button type="submit" size="sm" loading={submitting} className="w-full">Ajouter</Button>
                    </div>
                </form>
            )}

            {loading ? (
                <p className="p-4 text-sm text-slate-500" role="status">Chargement…</p>
            ) : fees.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Aucun frais supplémentaire sur ce contrat.</p>
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
                                        aria-label={`Supprimer le frais ${fee.kind_label}`}
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
                Les frais s'ajoutent au reste à payer ; ils s'encaissent avec le bouton « Ajouter » des paiements.
            </p>
        </section>
    );
};

export default ContractFees;
