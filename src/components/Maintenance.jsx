import React, { useCallback, useEffect, useState } from 'react';
import api, { fetchAllPages } from '../api';
import { toast } from './Toast';
import { fmtMoney } from '../utils/download';
import { SkeletonTable } from './Skeleton';

const TYPES = [
    ['VIDANGE', 'Vidange'],
    ['PNEUS', 'Pneus'],
    ['FREINS', 'Freins'],
    ['CARROSSERIE', 'Carrosserie'],
    ['AUTRE', 'Autre'],
];

const EMPTY = {
    vehicle: '', type: 'VIDANGE', date: new Date().toISOString().slice(0, 10),
    km: '', cost: '', prochain_km: '', prochaine_date: '', notes: '', create_expense: true,
};

const errText = (err) => {
    const d = err?.response?.data;
    if (!d) return "Échec de l'enregistrement.";
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    return Object.entries(d).map(([k, v]) => `${k}: ${[].concat(v).join(' ')}`).join(' — ');
};

const input = 'mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium normal-case';
const label = 'block text-xs font-bold uppercase tracking-wider text-slate-600';

const Maintenance = () => {
    const [records, setRecords] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
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

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            // Les champs optionnels vides ne doivent pas être envoyés ("" invalide pour un nombre/date).
            const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
            await api.post('maintenance/', body);
            toast.success('Intervention enregistrée.');
            setOpen(false);
            setForm(EMPTY);
            await load();
        } catch (err) {
            toast.error(errText(err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (r) => {
        if (!window.confirm(`Supprimer l'intervention du ${r.date} (${r.vehicle_matricule}) ?`)) return;
        try {
            await api.delete(`maintenance/${r.id}/`);
            setRecords(prev => prev.filter(x => x.id !== r.id));
        } catch (err) {
            toast.error(errText(err));
        }
    };

    const visible = records.filter(r =>
        (typeFilter === 'ALL' || r.type === typeFilter) &&
        (!vehicleFilter || String(r.vehicle) === vehicleFilter)
    );
    const totalCost = visible.reduce((s, r) => s + Number(r.cost || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Maintenance</h1>
                    <p className="text-sm text-slate-500">Historique des interventions. Une vidange met à jour le prochain kilométrage d'alerte du véhicule.</p>
                </div>
                <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover">
                    Nouvelle intervention
                </button>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
                <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} aria-label="Filtrer par véhicule" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
                    <option value="">Tous les véhicules</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrer par type" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
                    <option value="ALL">Tous les types</option>
                    {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <span className="ml-auto text-sm font-bold text-slate-700">Coût total : {fmtMoney(totalCost)}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                {loading ? <SkeletonTable /> : visible.length === 0 ? (
                    <p className="p-10 text-center text-slate-400 font-medium">Aucune intervention.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left p-3">Date</th>
                                <th className="text-left p-3">Véhicule</th>
                                <th className="text-left p-3">Type</th>
                                <th className="text-right p-3">Km</th>
                                <th className="text-right p-3">Coût</th>
                                <th className="text-left p-3">Prochaine échéance</th>
                                <th className="p-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(r => (
                                <tr key={r.id} className="border-t border-slate-100">
                                    <td className="p-3">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="p-3 font-bold">{r.vehicle_matricule}</td>
                                    <td className="p-3">{r.type_label}</td>
                                    <td className="p-3 text-right">{r.km ?? '—'}</td>
                                    <td className="p-3 text-right">{fmtMoney(r.cost)}</td>
                                    <td className="p-3 text-slate-600">
                                        {[r.prochain_km ? `${r.prochain_km} km` : null, r.prochaine_date ? new Date(r.prochaine_date).toLocaleDateString('fr-FR') : null].filter(Boolean).join(' / ') || '—'}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button type="button" onClick={() => remove(r)} className="text-xs font-bold text-danger-dark hover:underline">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Nouvelle intervention">
                    <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
                        <h2 className="text-lg font-extrabold text-slate-900">Nouvelle intervention</h2>
                        <label className={label}>Véhicule
                            <select required value={form.vehicle} onChange={set('vehicle')} className={input}>
                                <option value="">— Choisir —</option>
                                {vehicles.map(v => <option key={v.id} value={v.id}>{v.matricule}</option>)}
                            </select>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={label}>Type
                                <select value={form.type} onChange={set('type')} className={input}>
                                    {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </label>
                            <label className={label}>Date
                                <input type="date" required value={form.date} onChange={set('date')} className={input} />
                            </label>
                            <label className={label}>Kilométrage
                                <input type="number" min="0" value={form.km} onChange={set('km')} className={input} />
                            </label>
                            <label className={label}>Coût (DH)
                                <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} className={input} />
                            </label>
                            <label className={label}>Prochain km
                                <input type="number" min="0" value={form.prochain_km} onChange={set('prochain_km')} className={input} />
                            </label>
                            <label className={label}>Prochaine date
                                <input type="date" value={form.prochaine_date} onChange={set('prochaine_date')} className={input} />
                            </label>
                        </div>
                        <label className={label}>Notes
                            <input type="text" value={form.notes} onChange={set('notes')} className={input} />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={form.create_expense} onChange={set('create_expense')} />
                            Enregistrer aussi comme dépense (catégorie Maintenance)
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">Annuler</button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                                {busy ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
