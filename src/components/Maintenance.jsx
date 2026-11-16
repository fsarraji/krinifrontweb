import React, { useCallback, useEffect, useState } from 'react';
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
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

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
            toast.error("Impossible de charger l'historique de maintenance.");
        } finally {
            setLoading(false);
        }
    }, []);

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
            toast.success('Intervention enregistrée.');
            closeForm();
            await load();
        } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            if (Object.keys(fe).length === 0 || fe.detail) toast.error(fe.detail || "Échec de l'enregistrement.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async (r) => {
        const ok = await messageBox.ask(
            `Supprimer l'intervention du ${formatDate(r.date)} (${r.vehicle_matricule}) ?`,
            'Supprimer l\'intervention',
            { destructive: true, confirmText: 'Supprimer' }
        );
        if (ok !== true) return;
        try {
            await api.delete(`maintenance/${r.id}/`);
            setRecords((prev) => prev.filter((x) => x.id !== r.id));
            toast.success('Intervention supprimée.');
        } catch (err) {
            console.error(err);
            toast.error('Suppression impossible.');
        }
    };

    const visible = records.filter((r) =>
        (typeFilter === 'ALL' || r.type === typeFilter) &&
        (!vehicleFilter || String(r.vehicle) === vehicleFilter)
    );
    const totalCost = visible.reduce((s, r) => s + Number(r.cost || 0), 0);

    const columns = [
        { key: 'date', label: 'Date', sortable: true, render: (v) => formatDate(v) },
        { key: 'vehicle_matricule', label: 'Véhicule', sortable: true, render: (v) => <strong>{v}</strong> },
        { key: 'type_label', label: 'Type', sortable: true },
        { key: 'km', label: 'Km', align: 'right', sortable: true, render: (v) => formatNumber(v) },
        { key: 'cost', label: 'Coût', align: 'right', sortable: true, render: (v) => formatMoney(v) },
        {
            key: 'prochain_km', label: 'Prochaine échéance',
            render: (_, r) => [
                r.prochain_km ? `${formatNumber(r.prochain_km)} km` : null,
                r.prochaine_date ? formatDate(r.prochaine_date) : null,
            ].filter(Boolean).join(' / ') || '—',
        },
        {
            key: 'actions', label: '', align: 'right',
            render: (_, r) => (
                <Button variant="ghost" size="sm" iconOnly icon="delete" className="!text-danger-dark" aria-label={`Supprimer l'intervention du ${formatDate(r.date)}`} onClick={() => remove(r)} />
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                className="!mb-0"
                title="Maintenance"
                description="Historique des interventions. Une vidange met à jour le prochain kilométrage d'alerte du véhicule."
                actions={<Button icon="add" onClick={() => setOpen(true)}>Nouvelle intervention</Button>}
            />

            <div className="flex flex-wrap gap-3 items-center">
                <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} aria-label="Filtrer par véhicule" className="!w-auto">
                    <option value="">Tous les véhicules</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                </Select>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrer par type" className="!w-auto">
                    <option value="ALL">Tous les types</option>
                    {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
                <span className="ml-auto text-sm font-bold text-on-surface">Coût total : {formatMoney(totalCost)}</span>
            </div>

            <Table
                caption="Historique de maintenance"
                columns={columns}
                rows={visible}
                loading={loading}
                paginate
                defaultSort={{ key: 'date', dir: 'desc' }}
                emptyTitle="Aucune intervention"
                emptyDescription="Enregistrez une vidange, un changement de pneus ou toute autre intervention."
            />

            <Modal
                isOpen={open}
                onClose={closeForm}
                title="Nouvelle intervention"
                size="lg"
                footer={(
                    <>
                        <Button variant="outline" onClick={closeForm}>Annuler</Button>
                        <Button type="submit" form="maintenance-form" loading={busy}>Enregistrer</Button>
                    </>
                )}
            >
                <form id="maintenance-form" onSubmit={submit} className="space-y-4">
                    <Field label="Véhicule" required error={errors.vehicle}>
                        <Select required value={form.vehicle} onChange={set('vehicle')}>
                            <option value="">— Choisir —</option>
                            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Type" error={errors.type}>
                            <Select value={form.type} onChange={set('type')}>
                                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </Select>
                        </Field>
                        <Field label="Date" required error={errors.date}>
                            <Input type="date" required value={form.date} onChange={set('date')} />
                        </Field>
                        <Field label="Kilométrage" error={errors.km}>
                            <Input type="number" min="0" value={form.km} onChange={set('km')} />
                        </Field>
                        <Field label="Coût (MAD)" error={errors.cost}>
                            <Input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} />
                        </Field>
                        <Field label="Prochain km" error={errors.prochain_km}>
                            <Input type="number" min="0" value={form.prochain_km} onChange={set('prochain_km')} />
                        </Field>
                        <Field label="Prochaine date" error={errors.prochaine_date}>
                            <Input type="date" value={form.prochaine_date} onChange={set('prochaine_date')} />
                        </Field>
                    </div>
                    <Field label="Notes" error={errors.notes}>
                        <Input type="text" value={form.notes} onChange={set('notes')} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm font-medium text-on-surface">
                        <input type="checkbox" className="accent-primary" checked={form.create_expense} onChange={set('create_expense')} />
                        Enregistrer aussi comme dépense (catégorie Maintenance)
                    </label>
                </form>
            </Modal>
        </div>
    );
};

export default Maintenance;
