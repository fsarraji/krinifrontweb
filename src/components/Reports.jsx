import React, { useCallback, useEffect, useState } from 'react';
import Card from './ui/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import api from '../api';
import { toast } from './Toast';
import { downloadFile } from '../utils/download';
import { formatMoney } from '../utils/formatters';
import { getClaims } from '../utils/session';
import { translateOr } from '../i18n/helpers';
import Button from './ui/Button';
import { Input } from './ui/Input';
import PageHeader from './ui/PageHeader';
import UITable from './ui/Table';
import { useI18n } from '../i18n/context';

const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));

const TABS = [
    { id: 'cash', labelKey: 'u.journal_de_caisse', path: 'cash-journal', managerOnly: false },
    { id: 'occupancy', labelKey: 'u.occupation', path: 'occupancy', managerOnly: false },
    { id: 'revenue', labelKey: 'u.revenus_mensuels', path: 'revenue', managerOnly: true },
    { id: 'profit', labelKey: 'u.rentabilit', path: 'vehicle-profitability', managerOnly: true },
    { id: 'clients', labelKey: 'u.top_clients', path: 'top-clients', managerOnly: true },
];

// Adaptateur : même API qu'avant (empty, right) au-dessus du composant partagé ui/Table.
const Table = ({ columns, rows, empty }) => {
    const { t } = useI18n();
    return (
    <UITable
        columns={columns.map(({ right, ...c }) => ({ ...c, align: right ? 'right' : c.align, sortable: c.sortable ?? true }))}
        rows={rows}
        emptyTitle={empty ?? t('u.aucune_donne_sur_la_priode')}
    />
    );
};

const Stat = ({ label, value, tone }) => (
    <Card padding={4} variant="default">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`text-xl font-extrabold mt-1 ${tone === 'neg' ? 'text-danger-dark' : 'text-slate-900'}`}>{value}</p>
    </Card>
);

const money = (v) => formatMoney(v);

const Reports = () => {
    const { t } = useI18n();
    const role = getClaims()?.role;
    const isManager = role === 'OWNER' || role === 'SUPERADMIN';
    const tabs = TABS.filter(tb => isManager || !tb.managerOnly);

    const [tab, setTab] = useState(tabs[0].id);
    const [from, setFrom] = useState(daysAgo(29));
    const [to, setTo] = useState(today());
    const [day, setDay] = useState(today());
    const [year, setYear] = useState(new Date().getFullYear());

    const current = tabs.find(tb => tb.id === tab);

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
                toast.error(err.response?.data?.detail || t('u.impossible_de_charger_le_rapport'));
            });
        return () => { cancelled = true; };
    }, [current.path, params, key, t]);

    const exportCsv = () => downloadFile(`reports/${current.path}/`, `${current.path}.csv`, { ...params(), export: 'csv' });

    return (
        <div className="space-y-6">
            <PageHeader
                className="!mb-0"
                title={t('u.rapports')}
                description={t('u.base_caisse_les_revenus_sont_com')}
                actions={<Button variant="outline" icon="download" onClick={exportCsv}>{t('u.export_csv')}</Button>}
            />

            <div className="w-fit max-w-full overflow-x-auto">
                <SegmentedControl label={t('u.rapports')} value={tab} onChange={setTab}>
                    {tabs.map((tb) => (
                        <SegmentedControlItem key={tb.id} value={tb.id} label={t(tb.labelKey)} />
                    ))}
                </SegmentedControl>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                {tab === 'cash' && (
                    <label className="block text-label-sm uppercase tracking-wider text-text-muted">
                        {t('u.jour')}
                        <Input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} className="mt-1 !w-auto" />
                    </label>
                )}
                {tab === 'revenue' && (
                    <label className="block text-label-sm uppercase tracking-wider text-text-muted">
                        {t('u.anne')}
                        <Input type="number" value={year} min="2000" max="2100" onChange={(e) => setYear(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium w-28" />
                    </label>
                )}
                {!['cash', 'revenue'].includes(tab) && (
                    <>
                        <label className="block text-label-sm uppercase tracking-wider text-text-muted">
                            {t('u.du')}
                            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 !w-auto" />
                        </label>
                        <label className="block text-label-sm uppercase tracking-wider text-text-muted">
                            {t('u.au')}
                            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="mt-1 !w-auto" />
                        </label>
                    </>
                )}
            </div>

            {loading ? (
                <div className="space-y-4" aria-busy="true">
                    <div className="h-20 rounded-token bg-surface-dim/60 animate-pulse" />
                    <div className="h-48 rounded-token bg-surface-dim/60 animate-pulse" />
                </div>
            ) : !data ? null : (
                <>
                    {tab === 'cash' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label={t('u.total_encaiss')} value={money(data.total_collected)} />
                                <Stat label={t('u.dont_espces')} value={money(data.cash_collected)} />
                                <Stat label={t('u.dpenses_du_jour')} value={money(data.total_expenses)} />
                                <Stat label={t('u.solde_espces_dpenses')} value={money(Number(data.cash_collected) - Number(data.total_expenses))} tone={Number(data.cash_collected) - Number(data.total_expenses) < 0 ? 'neg' : undefined} />
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                                {Object.entries(data.totals_by_method || {}).map(([m, amount]) => (
                                    <span key={m} className="px-3 py-1 rounded-lg bg-slate-100">{translateOr(t, `method.${m}`, m)} : {money(amount)}</span>
                                ))}
                            </div>
                            <Table
                                columns={[
                                    { key: 'time', label: t('u.heure') },
                                    {
                                        key: 'client', label: t('u.client'),
                                        render: (v, r) => (<><div>{v}</div><div className="text-label-sm text-text-muted">{r.vehicle}</div></>),
                                    },
                                    {
                                        key: 'method', label: t('u.mode'),
                                        render: (v, r) => (
                                            <>
                                                <div>{v}</div>
                                                {(r.reference || r.received_by) && (
                                                    <div className="text-label-sm text-text-muted">{[r.reference, r.received_by].filter(Boolean).join(' · ')}</div>
                                                )}
                                            </>
                                        ),
                                    },
                                    { key: 'amount', label: t('u.montant'), right: true, render: money },
                                ]}
                                rows={data.payments || []}
                                empty={t('u.aucun_encaissement_ce_jour')}
                            />
                        </>
                    )}

                    {tab === 'occupancy' && (
                        <>
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <Stat label={t('u.occupation_de_la_flotte')} value={`${data.fleet_occupancy_rate} %`} />
                                <Stat label={t('u.priode')} value={t('u.jours', { n: data.period_days })} />
                            </div>
                            <Table
                                columns={[
                                    {
                                        key: 'vehicle', label: t('u.vhicule'),
                                        render: (v, r) => (<><div>{v}</div><div className="text-label-sm text-text-muted">{r.matricule}</div></>),
                                    },
                                    { key: 'rentals', label: t('u.locations'), right: true },
                                    { key: 'days_rented', label: t('u.jours_lous'), right: true },
                                    { key: 'occupancy_rate', label: 'Occupation', right: true, render: v => `${v} %` },
                                ]}
                                rows={data.vehicles || []}
                            />
                        </>
                    )}

                    {tab === 'revenue' && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <Stat label={t('u.revenus')} value={money(data.totals.revenue)} />
                                <Stat label={t('u.dpenses')} value={money(data.totals.expenses)} />
                                <Stat label={t('u.net')} value={money(data.totals.net)} tone={Number(data.totals.net) < 0 ? 'neg' : undefined} />
                            </div>
                            <Table
                                columns={[
                                    { key: 'month', label: t('u.mois') },
                                    { key: 'revenue', label: t('u.revenus'), right: true, render: money },
                                    { key: 'expenses', label: t('u.dpenses'), right: true, render: money },
                                    { key: 'net', label: t('u.net'), right: true, render: (v) => <span className={Number(v) < 0 ? 'text-danger-dark font-bold' : 'font-bold'}>{money(v)}</span> },
                                ]}
                                rows={data.months || []}
                            />
                        </>
                    )}

                    {tab === 'profit' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Stat label={t('u.revenus')} value={money(data.totals.revenue)} />
                                <Stat label={t('u.dpenses_vhicules')} value={money(data.totals.vehicle_expenses)} />
                                <Stat label={t('u.frais_gnraux')} value={money(data.totals.general_expenses)} />
                                <Stat label={t('u.net_aprs_tous_frais')} value={money(data.totals.net_after_all_expenses)} tone={Number(data.totals.net_after_all_expenses) < 0 ? 'neg' : undefined} />
                            </div>
                            <Table
                                columns={[
                                    {
                                        key: 'vehicle', label: t('u.vhicule'),
                                        render: (v, r) => (<><div>{v}</div><div className="text-label-sm text-text-muted">{r.matricule}</div></>),
                                    },
                                    { key: 'revenue', label: t('u.revenus'), right: true, render: money },
                                    { key: 'expenses', label: t('u.dpenses'), right: true, render: money },
                                    { key: 'net', label: t('u.net'), right: true, render: (v) => <span className={Number(v) < 0 ? 'text-danger-dark font-bold' : 'font-bold'}>{money(v)}</span> },
                                ]}
                                rows={data.vehicles || []}
                            />
                        </>
                    )}

                    {tab === 'clients' && (
                        <Table
                            columns={[
                                {
                                    key: 'client', label: t('u.client'),
                                    render: (v, r) => (<><div>{v}</div><div className="text-label-sm text-text-muted">{r.telephone}</div></>),
                                },
                                { key: 'contracts', label: t('u.contrats'), right: true },
                                { key: 'total', label: t('u.total'), right: true, render: money },
                                { key: 'paid', label: t('u.pay'), right: true, render: money },
                                { key: 'unpaid', label: t('u.impay'), right: true, render: (v) => <span className={Number(v) > 0 ? 'text-danger-dark font-bold' : ''}>{money(v)}</span> },
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
