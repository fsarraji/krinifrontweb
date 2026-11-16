import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { toast } from './Toast';
import { downloadFile, fmtMoney } from '../utils/download';
import { getClaims } from '../utils/session';

const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

const TABS = [
    { id: 'cash', label: 'Journal de caisse', path: 'cash-journal', managerOnly: false },
    { id: 'occupancy', label: 'Occupation', path: 'occupancy', managerOnly: false },
    { id: 'revenue', label: 'Revenus mensuels', path: 'revenue', managerOnly: true },
    { id: 'profit', label: 'Rentabilité', path: 'vehicle-profitability', managerOnly: true },
    { id: 'clients', label: 'Top clients', path: 'top-clients', managerOnly: true },
];

const Table = ({ columns, rows, empty = 'Aucune donnée sur la période.' }) => (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        {rows.length === 0 ? (
            <p className="p-8 text-center text-slate-400 font-medium">{empty}</p>
        ) : (
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>{columns.map(c => <th key={c.key} className={`p-3 ${c.right ? 'text-right' : 'text-left'}`}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                            {columns.map(c => (
                                <td key={c.key} className={`p-3 ${c.right ? 'text-right' : ''}`}>
                                    {c.render ? c.render(r[c.key], r) : r[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);

const Stat = ({ label, value, tone }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`text-xl font-extrabold mt-1 ${tone === 'neg' ? 'text-danger-dark' : 'text-slate-900'}`}>{value}</p>
    </div>
);

const money = (v) => fmtMoney(v);

const Reports = () => {
    const role = getClaims()?.role;
    const isManager = role === 'OWNER' || role === 'SUPERADMIN';
    const tabs = TABS.filter(t => isManager || !t.managerOnly);

    const [tab, setTab] = useState(tabs[0].id);
    const [from, setFrom] = useState(daysAgo(29));
    const [to, setTo] = useState(today());
    const [day, setDay] = useState(today());
    const [year, setYear] = useState(new Date().getFullYear());

    const current = tabs.find(t => t.id === tab);

    const params = useCallback(() => {
        if (tab === 'cash') return { date: day };
        if (tab === 'revenue') return { year };
        return { from, to };
    }, [tab, day, year, from, to]);

    // `result` mémorise la clé de la requête : tant qu'elle diffère de la clé courante, on charge.
    const [result, setResult] = useState({ key: null, data: null });
    const key = JSON.stringify([current.path, params()]);
    const loading = result.key !== key;
    const data = result.data;

    useEffect(() => {
        let cancelled = false;
        api.get(`reports/${current.path}/`, { params: params() })
            .then(res => { if (!cancelled) setResult({ key, data: res.data }); })
            .catch(err => {
                if (cancelled) return;
                console.error('Erreur rapport', err);
                setResult({ key, data: null });
                toast.error(err.response?.data?.detail || 'Impossible de charger le rapport.');
            });
        return () => { cancelled = true; };
    }, [current.path, params, key]);

    const exportCsv = () => downloadFile(`reports/${current.path}/`, `${current.path}.csv`, { ...params(), export: 'csv' });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Rapports</h1>
                    <p className="text-sm text-slate-500">Base caisse : les revenus sont comptés à la date d'encaissement des paiements.</p>
                </div>
                <button type="button" onClick={exportCsv} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Export CSV
                </button>
            </div>

            <div role="tablist" className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
                {tab === 'cash' && (
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Jour
                        <input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium" />
                    </label>
                )}
                {tab === 'revenue' && (
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Année
                        <input type="number" value={year} min="2000" max="2100" onChange={(e) => setYear(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium w-28" />
                    </label>
                )}
                {!['cash', 'revenue'].includes(tab) && (
                    <>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Du
                            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium" />
                        </label>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Au
                            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium" />
                        </label>
                    </>
                )}
            </div>

            {loading ? (
                <p className="p-10 text-center font-bold text-primary">Chargement…</p>
            ) : !data ? null : (
                <>
                    {tab === 'cash' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label="Total encaissé" value={money(data.total_collected)} />
                                <Stat label="Dont espèces" value={money(data.cash_collected)} />
                                <Stat label="Dépenses du jour" value={money(data.total_expenses)} />
                                <Stat label="Solde espèces − dépenses" value={money(Number(data.cash_collected) - Number(data.total_expenses))} tone={Number(data.cash_collected) - Number(data.total_expenses) < 0 ? 'neg' : undefined} />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                                {Object.entries(data.totals_by_method || {}).map(([m, t]) => (
                                    <span key={m} className="px-3 py-1 rounded-lg bg-slate-100">{m} : {money(t)}</span>
                                ))}
                            </div>
                            <Table
                                columns={[
                                    { key: 'time', label: 'Heure' },
                                    { key: 'client', label: 'Client' },
                                    { key: 'vehicle', label: 'Véhicule' },
                                    { key: 'method', label: 'Mode' },
                                    { key: 'reference', label: 'Référence' },
                                    { key: 'received_by', label: 'Reçu par' },
                                    { key: 'amount', label: 'Montant', right: true, render: money },
                                ]}
                                rows={data.payments || []}
                                empty="Aucun encaissement ce jour."
                            />
                        </>
                    )}

                    {tab === 'occupancy' && (
                        <>
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <Stat label="Occupation de la flotte" value={`${data.fleet_occupancy_rate} %`} />
                                <Stat label="Période" value={`${data.period_days} jours`} />
                            </div>
                            <Table
                                columns={[
                                    { key: 'matricule', label: 'Matricule' },
                                    { key: 'vehicle', label: 'Véhicule' },
                                    { key: 'rentals', label: 'Locations', right: true },
                                    { key: 'days_rented', label: 'Jours loués', right: true },
                                    { key: 'occupancy_rate', label: 'Occupation', right: true, render: v => `${v} %` },
                                ]}
                                rows={data.vehicles || []}
                            />
                        </>
                    )}

                    {tab === 'revenue' && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <Stat label="Revenus" value={money(data.totals.revenue)} />
                                <Stat label="Dépenses" value={money(data.totals.expenses)} />
                                <Stat label="Net" value={money(data.totals.net)} tone={Number(data.totals.net) < 0 ? 'neg' : undefined} />
                            </div>
                            <Table
                                columns={[
                                    { key: 'month', label: 'Mois' },
                                    { key: 'revenue', label: 'Revenus', right: true, render: money },
                                    { key: 'expenses', label: 'Dépenses', right: true, render: money },
                                    { key: 'net', label: 'Net', right: true, render: (v) => <span className={Number(v) < 0 ? 'text-danger-dark font-bold' : 'font-bold'}>{money(v)}</span> },
                                ]}
                                rows={data.months || []}
                            />
                        </>
                    )}

                    {tab === 'profit' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label="Revenus" value={money(data.totals.revenue)} />
                                <Stat label="Dépenses véhicules" value={money(data.totals.vehicle_expenses)} />
                                <Stat label="Frais généraux" value={money(data.totals.general_expenses)} />
                                <Stat label="Net après tous frais" value={money(data.totals.net_after_all_expenses)} tone={Number(data.totals.net_after_all_expenses) < 0 ? 'neg' : undefined} />
                            </div>
                            <Table
                                columns={[
                                    { key: 'matricule', label: 'Matricule' },
                                    { key: 'vehicle', label: 'Véhicule' },
                                    { key: 'revenue', label: 'Revenus', right: true, render: money },
                                    { key: 'expenses', label: 'Dépenses', right: true, render: money },
                                    { key: 'net', label: 'Net', right: true, render: (v) => <span className={Number(v) < 0 ? 'text-danger-dark font-bold' : 'font-bold'}>{money(v)}</span> },
                                ]}
                                rows={data.vehicles || []}
                            />
                        </>
                    )}

                    {tab === 'clients' && (
                        <Table
                            columns={[
                                { key: 'client', label: 'Client' },
                                { key: 'telephone', label: 'Téléphone' },
                                { key: 'contracts', label: 'Contrats', right: true },
                                { key: 'total', label: 'Total', right: true, render: money },
                                { key: 'paid', label: 'Payé', right: true, render: money },
                                { key: 'unpaid', label: 'Impayé', right: true, render: (v) => <span className={Number(v) > 0 ? 'text-danger-dark font-bold' : ''}>{money(v)}</span> },
                            ]}
                            rows={data.clients || []}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;
