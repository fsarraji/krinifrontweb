import React, { useState } from 'react';
import Table from './ui/Table';
import { Input } from './ui/Input';
import api from '../api';
import { formatMoney } from '../utils/formatters';
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
import { useI18n } from '../i18n/context';

const PLAN_OPTIONS = [
    { value: 'GRATUIT', labelKey: 'u.gratuit' },
    { value: 'BASIC', labelKey: 'u.basic' },
    { value: 'PRO', labelKey: 'u.pro' },
    { value: 'PREMIUM', labelKey: 'u.premium' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', labelKey: 'u.actif' },
    { value: 'EXPIRED', labelKey: 'u.expir' },
    { value: 'SUSPENDED', labelKey: 'u.suspendu' },
    { value: 'CANCELLED', labelKey: 'u.annul' },
];

const STATUS_BADGES = {
    ACTIVE: 'success',
    EXPIRED: 'danger',
    SUSPENDED: 'warning',
    CANCELLED: 'neutral',
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
    const { t } = useI18n();
    const tOpts = (opts) => opts.map((o) => ({ value: o.value, label: t(o.labelKey) }));
    const planOptions = tOpts(PLAN_OPTIONS);
    const statusOptions = tOpts(STATUS_OPTIONS);
    const planLabel = (plan) => planOptions.find((p) => p.value === plan)?.label || plan;
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
            toast.error(t('u.veuillez_slectionner_une_agence'));
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
            toast.success(isEditing ? t('u.abonnement_mis_jour_avec_succs') : t('u.abonnement_cr_avec_succs'));
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error(t('u.erreur_lors_de_l_enregistrement__2'));
        }
    };

    const handleDelete = (id) => {
        messageBox.danger(t('u.supprimer_cet_abonnement'), t('u.supprimer_l_abonnement'), {
            onConfirm: async () => {
                try {
                    await api.delete(`subscriptions/${id}/`);
                    await fetchSubscriptions();
                    toast.success(t('u.abonnement_supprim_avec_succs'));
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error(t('u.erreur_lors_de_la_suppression'));
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
                eyebrow={t('u.administration_systme')}
                title={t('u.gestion_des_abonnements')}
                description={t('u.abonnements_saas_des_agences_pla')}
                actions={
                    <Button icon="workspace_premium" size="lg" onClick={() => openModal()}>
                        {t('u.nouvel_abonnement')}
                    </Button>
                }
            />

            <Table
                caption={t('u.gestion_des_abonnements')}
                rows={subscriptions}
                emptyTitle={t('u.aucun_abonnement')}
                emptyDescription={t('u.crez_un_premier_abonnement_pour_')}
                columns={[
                    {
                        key: 'agency_name', label: t('u.agence'),
                        render: (_, sub) => (
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center font-bold text-primary shrink-0">
                                    {(sub.agency_name || 'A')[0].toUpperCase()}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">{sub.agency_name}</p>
                                    <p className="text-label-sm font-normal text-text-muted">#{sub.id}</p>
                                </div>
                            </div>
                        ),
                    },
                    { key: 'plan', label: t('u.plan'), render: (v) => <StatusBadge variant="info" label={planLabel(v)} /> },
                    { key: 'price', label: t('u.prix_mensuel_mad'), render: (v) => <strong>{formatMoney(v)}</strong> },
                    {
                        key: 'start_date', label: t('u.priode'),
                        render: (_, sub) => (
                            <div>
                                <p className="text-sm font-medium">{sub.start_date}</p>
                                <p className="text-label-sm font-normal text-text-muted">→ {sub.end_date}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'status', label: t('u.statut'),
                        render: (_, sub) => (
                            <div className="flex items-center gap-2">
                                <StatusBadge
                                    variant={STATUS_BADGES[sub.status] || 'neutral'}
                                    appearance="dot"
                                    label={statusOptions.find(s => s.value === sub.status)?.label || sub.status}
                                />
                                {sub.is_current && <StatusBadge variant="success" label={t('u.en_cours')} />}
                            </div>
                        ),
                    },
                    {
                        key: 'actions', label: t('u.actions'), align: 'right',
                        render: (_, sub) => (
                        <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" iconOnly icon="edit" aria-label={t('u.modifier')} onClick={() => openModal(sub)} />
                            <Button variant="ghost" iconOnly icon="delete" aria-label={t('u.supprimer')} onClick={() => handleDelete(sub.id)} />
                        </div>
                        ),
                    },
                ]}
            />

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? t('u.modifier_l_abonnement') : t('u.ajouter_un_abonnement')}
                labelId="subscription-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>{t('u.annuler')}</Button>
                        <Button type="submit" form="subscription-form" icon="save">{t('u.enregistrer')}</Button>
                    </>
                }
            >
                <form id="subscription-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label={t('u.agence')} required className="md:col-span-2">
                            <Dropdown
                                options={agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))}
                                value={form.agency}
                                onChange={(v) => setField('agency', v)}
                                isSearchable
                            />
                        </Field>
                        <Field label={t('u.plan')}>
                            <Dropdown
                                options={planOptions}
                                value={form.plan}
                                onChange={(v) => setField('plan', v)}
                            />
                        </Field>
                        <Field label={t('u.prix_mensuel_mad')} required>
                            <Input
                               
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.price}
                                onChange={(e) => setField('price', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('u.date_de_dbut')} required>
                            <Input
                               
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setField('startDate', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('u.date_de_fin')} required>
                            <Input
                               
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setField('endDate', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label={t('u.statut')} className="md:col-span-2">
                            <Dropdown
                                options={statusOptions}
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