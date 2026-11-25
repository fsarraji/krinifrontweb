import React, { useCallback, useEffect, useState } from 'react';
import { CheckboxInput } from '@astryxdesign/core';
import api, { fetchAllPages } from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import { formatDate, formatMoney, formatNumber } from '../utils/formatters';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Select } from './ui/Input';
import Modal from './ui/Modal';
import PageHeader from './ui/PageHeader';
import Table from './ui/Table';
import { useI18n } from '../i18n/context';

const TYPES = [
    ['VIDANGE', 'Vidange'],
    ['PNEUS', 'Pneus'],
    ['FREINS', 'Freins'],
    ['CARROSSERIE', 'Carrosserie'],
    ['AUTRE', 'Autre'],
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
    vehicle: '', type: 'VIDANGE', date: todayIso(),
    km: '', cost: '', prochain_km: '', prochaine_date: '', notes: '', create_expense: true,
});

// Transforme la réponse d'erreur DRF en { champ: message } pour l'affichage inline.
const fieldErrors = (err) => {
    const d = err?.response?.data;
    if (!d || typeof d !== 'object') return {};
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, [].concat(v).join(' ')]));
};

const Maintenance = () => {
    const { t } = useI18n();
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const typeLabels = {
        VIDANGE: t('u.vidange'), PNEUS: t('u.pneus'), FREINS: t('u.freins'),
        CARROSSERIE: t('u.carrosserie'), AUTRE: t('u.autre'),
    };

    const load = useCallback(async () => {
        try {
            const [recs, vehs] = await Promise.all([
                fetchAllPages('maintenance/', { ordering: '-date' }),
                fetchAllPages('vehicles/'),
            ]);
            setRecords(recs);
            setVehicles(vehs);
        } catch (err) {
            console.error('Erreur chargement maintenance', err);
            toast.error(t('u.impossible_de_charger_l_historiq'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

    const closeForm = () => {
        setOpen(false);
        setForm(emptyForm());
        setErrors({});
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            // Les champs optionnels vides ne doivent pas être envoyés ("" invalide pour un nombre/date).
            const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
            await api.post('maintenance/', body);
            toast.success(t('u.intervention_enregistre'));
            closeForm();
            await load();
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            if (Object.keys(fe).length === 0 || fe.detail) toast.error(fe.detail || t('u.chec_de_l_enregistrement'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (r) => {
        const ok = await messageBox.ask(
            t('u.supprimer_l_intervention_du', { date: formatDate(r.date), plate: r.vehicle_matricule }),
            t('u.supprimer_l_intervention'),
            { destructive: true, confirmText: t('clients.menu.delete') }
        );
        if (ok !== true) return;
        try {
            await api.delete(`maintenance/${r.id}/`);
            setRecords((prev) => prev.filter((x) => x.id !== r.id));
            toast.success(t('u.intervention_supprime'));
        } catch (err) {
            console.error(err);
            toast.error(t('u.suppression_impossible'));
        }
    };

    const visible = records.filter((r) =>
        (typeFilter === 'ALL' || r.type === typeFilter) &&
        (!vehicleFilter || String(r.vehicle) === vehicleFilter)
    );
    const totalCost = visible.reduce((s, r) => s + Number(r.cost || 0), 0);

    const columns = [
        {
            key: 'date', label: t('u.date'), sortable: true,
            render: (v, r) => (
                <>
                    <div>{formatDate(v)}</div>
                    <div className="text-label-sm text-text-muted">{formatNumber(r.km)} {t('veh.kmUnit')}</div>
                </>
            ),
        },
        {
            key: 'vehicle_matricule', label: t('u.vhicule'), sortable: true,
            render: (v, r) => (
                <>
                    <div><strong>{v}</strong></div>
                    <div className="text-label-sm text-text-muted">{typeLabels[r.type] || r.type_label}</div>
                </>
            ),
        },
        { key: 'cost', label: t('u.cot'), align: 'right', sortable: true, render: (v) => formatMoney(v) },
        {
            key: 'prochain_km', label: t('u.prochaine_chance'),
            render: (_, r) => [
                r.prochain_km ? `${formatNumber(r.prochain_km)} ${t('veh.kmUnit')}` : null,
                r.prochaine_date ? formatDate(r.prochaine_date) : null,
            ].filter(Boolean).join(' / ') || '—',
        },
        {
            key: 'actions', label: '', align: 'right',
            render: (_, r) => (
                <Button variant="ghost" size="sm" iconOnly icon="delete" className="!text-danger-dark" aria-label={t('u.supprimer_l_intervention_du_2', { date: formatDate(r.date) })} onClick={() => remove(r)} />
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                className="!mb-0"
                title={t('u.maintenance')}
                description={t('u.historique_des_interventions_une')}
                actions={<Button icon="add" onClick={() => setOpen(true)}>{t('u.nouvelle_intervention')}</Button>}
            />

            <div className="flex flex-wrap gap-3 items-center">
                <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} aria-label={t('u.filtrer_par_vhicule')} className="!w-auto">
                    <option value="">{t('u.tous_les_vhicules')}</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                </Select>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t('u.filtrer_par_type')} className="!w-auto">
                    <option value="ALL">{t('u.tous_les_types')}</option>
                    {TYPES.map(([v]) => <option key={v} value={v}>{typeLabels[v]}</option>)}
                </Select>
                <span className="ms-auto text-sm font-bold text-on-surface">{t('u.cot_total', { total: formatMoney(totalCost) })}</span>
            </div>

            <Table
                caption={t('u.historique_de_maintenance')}
                columns={columns}
                rows={visible}
                loading={loading}
                paginate
                defaultSort={{ key: 'date', dir: 'desc' }}
                emptyTitle={t('u.aucune_intervention')}
                emptyDescription={t('u.enregistrez_une_vidange_un_chang')}
            />

            <Modal
                isOpen={open}
                onClose={closeForm}
                title={t('u.nouvelle_intervention')}
                size="lg"
                footer={(
                    <>
                        <Button variant="outline" onClick={closeForm}>{t('u.annuler')}</Button>
                        <Button type="submit" form="maintenance-form" loading={busy}>{t('u.enregistrer')}</Button>
                    </>
                )}
            >
                <form id="maintenance-form" onSubmit={submit} className="space-y-4">
                    <Field label={t('u.vhicule')} required error={errors.vehicle}>
                        <Select required value={form.vehicle} onChange={set('vehicle')}>
                            <option value="">{t('u.choisir')}</option>
                            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Type" error={errors.type}>
                            <Select value={form.type} onChange={set('type')}>
                                {TYPES.map(([v]) => <option key={v} value={v}>{typeLabels[v]}</option>)}
                            </Select>
                        </Field>
                        <Field label={t('u.date')} required error={errors.date}>
                            <Input type="date" required value={form.date} onChange={set('date')} />
                        </Field>
                        <Field label={t('u.kilomtrage')} error={errors.km}>
                            <Input type="number" min="0" value={form.km} onChange={set('km')} />
                        </Field>
                        <Field label={t('u.cot_mad')} error={errors.cost}>
                            <Input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} />
                        </Field>
                        <Field label={t('u.prochain_km')} error={errors.prochain_km}>
                            <Input type="number" min="0" value={form.prochain_km} onChange={set('prochain_km')} />
                        </Field>
                        <Field label={t('u.prochaine_date')} error={errors.prochaine_date}>
                            <Input type="date" value={form.prochaine_date} onChange={set('prochaine_date')} />
                        </Field>
                    </div>
                    <Field label={t('u.notes')} error={errors.notes}>
                        <Input type="text" value={form.notes} onChange={set('notes')} />
                    </Field>
                    <CheckboxInput label={t('u.enregistrer_aussi_comme_dpense_c')} value={form.create_expense} onChange={(checked) => setForm((f) => ({ ...f, create_expense: checked }))} />
                </form>
            </Modal>
        </div>
    );
};

export default Maintenance;
