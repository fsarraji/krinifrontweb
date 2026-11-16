import React, { useState } from 'react';
import api from '../api';
import useFetchAll from '../hooks/useFetchAll';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Field from './ui/Field';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import PageHeader from './ui/PageHeader';

const PLAN_OPTIONS = [
    { value: 'GRATUIT', label: 'Gratuit' },
    { value: 'BASIC', label: 'Basic' },
    { value: 'PRO', label: 'Pro' },
    { value: 'PREMIUM', label: 'Premium' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'CANCELLED', label: 'Annulé' },
];

const STATUS_BADGES = {
    ACTIVE: 'success',
    EXPIRED: 'danger',
    SUSPENDED: 'warning',
    CANCELLED: 'neutral',
};

const planLabel = (plan) => {
    const found = PLAN_OPTIONS.find(p => p.value === plan);
    return found ? found.label : plan;
};

const buildEmptyForm = () => ({
    agency: '',
    plan: 'BASIC',
    price: '0.00',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    })(),
    status: 'ACTIVE',
});

const toForm = (sub) => ({
    id: sub.id,
    agency: sub.agency ? String(sub.agency) : '',
    plan: sub.plan || 'BASIC',
    price: sub.price !== null && sub.price !== undefined ? String(sub.price) : '0.00',
    startDate: sub.start_date || new Date().toISOString().slice(0, 10),
    endDate: sub.end_date || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    })(),
    status: sub.status || 'ACTIVE',
});

const toPayload = (form) => ({
    agency: Number(form.agency),
    plan: form.plan,
    price: form.price || '0.00',
    start_date: form.startDate,
    end_date: form.endDate,
    status: form.status,
});

const Subscriptions = () => {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(buildEmptyForm());

    const { data: subscriptions, loading, refetch: fetchSubscriptions } = useFetchAll('subscriptions/');
    const { data: agencies } = useFetchAll('agencies/');

    const openModal = (sub = null) => {
        setForm(sub ? toForm(sub) : buildEmptyForm());
        setIsEditing(Boolean(sub));
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.agency) {
            toast.error("Veuillez sélectionner une agence.");
            return;
        }
        try {
            if (isEditing) {
                await api.put(`subscriptions/${form.id}/`, toPayload(form));
            } else {
                await api.post('subscriptions/', toPayload(form));
            }
            closeModal();
            await fetchSubscriptions();
            toast.success(isEditing ? 'Abonnement mis à jour avec succès.' : 'Abonnement créé avec succès.');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error("Erreur lors de l'enregistrement. Vérifiez les données.");
        }
    };

    const handleDelete = (id) => {
        messageBox.danger("Supprimer cet abonnement ?", "Supprimer l'abonnement", {
            onConfirm: async () => {
                try {
                    await api.delete(`subscriptions/${id}/`);
                    await fetchSubscriptions();
                    toast.success('Abonnement supprimé avec succès.');
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
    }

    return (
        <>
            <PageHeader
                eyebrow="Administration Système"
                title="Gestion des Abonnements"
                description="Abonnements SaaS des agences (plan, période, prix, statut)."
                actions={
                    <Button icon="workspace_premium" size="lg" onClick={() => openModal()}>
                        Nouvel Abonnement
                    </Button>
                }
            />

            <div className="card rounded-token shadow-l1 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-stroke" style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">Agence</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Prix / mois</th>
                                <th className="px-6 py-4">Période</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4">
                                        <EmptyState
                                            icon="workspace_premium"
                                            title="Aucun abonnement"
                                            description="Créez un premier abonnement pour une agence."
                                        />
                                    </td>
                                </tr>
                            ) : subscriptions.map(sub => (
                                <tr key={sub.id} className="group hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center font-bold text-primary">
                                                {(sub.agency_name || 'A')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{sub.agency_name}</p>
                                                <p className="text-[10px] text-on-surface-variant">Abonnement #{sub.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 rounded-full bg-primary-light text-primary text-[11px] font-bold uppercase tracking-wide">
                                            {planLabel(sub.plan)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-bold text-on-surface">{Number(sub.price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{sub.start_date}</p>
                                        <p className="text-[10px] text-on-surface-variant">→ {sub.end_date}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge
                                                variant={STATUS_BADGES[sub.status] || 'neutral'}
                                                appearance="dot"
                                                label={STATUS_OPTIONS.find(s => s.value === sub.status)?.label || sub.status}
                                            />
                                            {sub.is_current && (
                                                <StatusBadge variant="success" appearance="pill" label="En cours" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <Button variant="ghost" iconOnly icon="edit" aria-label="Modifier" onClick={() => openModal(sub)} />
                                            <Button variant="ghost" iconOnly icon="delete" className="!text-error hover:!bg-error/10" aria-label="Supprimer" onClick={() => handleDelete(sub.id)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? "Modifier l'abonnement" : "Ajouter un abonnement"}
                labelId="subscription-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>Annuler</Button>
                        <Button type="submit" form="subscription-form" icon="save">Enregistrer</Button>
                    </>
                }
            >
                <form id="subscription-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Agence" required className="md:col-span-2">
                            <Dropdown
                                options={agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))}
                                value={form.agency}
                                onChange={(v) => setField('agency', v)}
                                isSearchable
                            />
                        </Field>
                        <Field label="Plan">
                            <Dropdown
                                options={PLAN_OPTIONS}
                                value={form.plan}
                                onChange={(v) => setField('plan', v)}
                            />
                        </Field>
                        <Field label="Prix mensuel (DH)" required>
                            <input
                                className="field w-full"
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.price}
                                onChange={(e) => setField('price', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Date de début" required>
                            <input
                                className="field w-full"
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setField('startDate', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Date de fin" required>
                            <input
                                className="field w-full"
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setField('endDate', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Statut" className="md:col-span-2">
                            <Dropdown
                                options={STATUS_OPTIONS}
                                value={form.status}
                                onChange={(v) => setField('status', v)}
                            />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default Subscriptions;