import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { fetchAllPages } from '../api';
import { toast } from './Toast';
import { downloadFile, fmtMoney, openPdf } from '../utils/download';
import { getClaims } from '../utils/session';
import { SkeletonTable } from './Skeleton';

const STATUS_STYLE = {
    EMISE: 'bg-primary-light text-primary-deep',
    ANNULEE: 'bg-slate-200 text-slate-600',
};

const errText = (err, fallback) => {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(' ') || fallback;
};

const Invoices = () => {
    const role = getClaims()?.role;
    const isManager = role === 'OWNER' || role === 'SUPERADMIN';

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statut, setStatut] = useState('ALL');
    const [expanded, setExpanded] = useState(null);

    const [issueOpen, setIssueOpen] = useState(false);
    const [contracts, setContracts] = useState([]);
    const [contractId, setContractId] = useState('');
    const [busy, setBusy] = useState(false);

    const [creditFor, setCreditFor] = useState(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditReason, setCreditReason] = useState('');

    const load = useCallback(async () => {
        try {
            setInvoices(await fetchAllPages('invoices/', { ordering: '-date_emission' }));
        } catch (err) {
            console.error('Erreur chargement factures', err);
            toast.error('Impossible de charger les factures.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openIssue = async () => {
        setIssueOpen(true);
        try {
            const all = await fetchAllPages('contracts/');
            setContracts(all.filter(c => c.statut !== 'ANNULE'));
        } catch (err) {
            console.error(err);
            toast.error('Impossible de charger les contrats.');
        }
    };

    // Contrats déjà facturés (facture active) : exclus de la liste de choix.
    const invoicedContracts = useMemo(
        () => new Set(invoices.filter(i => i.statut !== 'ANNULEE').map(i => i.contract)),
        [invoices]
    );
    const invoiceable = contracts.filter(c => !invoicedContracts.has(c.id));

    const issue = async (e) => {
        e.preventDefault();
        if (!contractId) return;
        setBusy(true);
        try {
            await api.post('invoices/', { contract: Number(contractId) });
            toast.success('Facture émise.');
            setIssueOpen(false);
            setContractId('');
            await load();
        } catch (err) {
            toast.error(errText(err, "Échec de l'émission."));
        } finally {
            setBusy(false);
        }
    };

    const submitCredit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = { reason: creditReason };
            if (creditAmount !== '') body.amount = creditAmount;
            await api.post(`invoices/${creditFor.id}/credit-note/`, body);
            toast.success('Avoir émis.');
            setCreditFor(null);
            setCreditAmount('');
            setCreditReason('');
            await load();
        } catch (err) {
            toast.error(errText(err, "Échec de l'émission de l'avoir."));
        } finally {
            setBusy(false);
        }
    };

    const visible = invoices.filter(i => {
        if (statut !== 'ALL' && i.statut !== statut) return false;
        const q = search.trim().toLowerCase();
        return !q || `${i.number} ${i.client_name}`.toLowerCase().includes(q);
    });

    const totalTtc = visible.reduce((s, i) => s + Number(i.montant_ttc), 0);
    const totalCredit = visible.reduce((s, i) => s + Number(i.montant_credite), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Factures & avoirs</h1>
                    <p className="text-sm text-slate-500">Numérotation séquentielle par agence. Une facture émise est immuable : on la corrige par un avoir.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => downloadFile('invoices/export/', 'factures.csv')}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={openIssue}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover"
                    >
                        Nouvelle facture
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    ['Factures', visible.length],
                    ['Total TTC', fmtMoney(totalTtc)],
                    ['Avoirs émis', fmtMoney(totalCredit)],
                ].map(([label, value]) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-1">{value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-3">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (n° facture, client)…"
                    aria-label="Rechercher une facture"
                    className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                />
                <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                    aria-label="Filtrer par statut"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                    <option value="ALL">Tous les statuts</option>
                    <option value="EMISE">Émises</option>
                    <option value="ANNULEE">Annulées</option>
                </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                {loading ? (
                    <SkeletonTable />
                ) : visible.length === 0 ? (
                    <p className="p-10 text-center text-slate-400 font-medium">Aucune facture.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left p-3">N°</th>
                                <th className="text-left p-3">Client</th>
                                <th className="text-left p-3">Date</th>
                                <th className="text-right p-3">HT</th>
                                <th className="text-right p-3">TVA</th>
                                <th className="text-right p-3">TTC</th>
                                <th className="text-left p-3">Statut</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(inv => (
                                <React.Fragment key={inv.id}>
                                    <tr className="border-t border-slate-100">
                                        <td className="p-3 font-bold text-slate-900">
                                            {inv.number}
                                            {inv.credit_notes?.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                                                    className="ml-2 text-xs font-bold text-primary"
                                                    aria-expanded={expanded === inv.id}
                                                >
                                                    {inv.credit_notes.length} avoir(s)
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3">{inv.client_name}</td>
                                        <td className="p-3">{new Date(inv.date_emission).toLocaleDateString('fr-FR')}</td>
                                        <td className="p-3 text-right">{fmtMoney(inv.montant_ht)}</td>
                                        <td className="p-3 text-right">{fmtMoney(inv.montant_tva)}</td>
                                        <td className="p-3 text-right font-bold">{fmtMoney(inv.montant_ttc)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_STYLE[inv.statut] || 'bg-slate-100'}`}>
                                                {inv.statut === 'EMISE' ? 'Émise' : 'Annulée'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <button type="button" onClick={() => openPdf(`invoices/${inv.id}/pdf/`)} className="px-2 py-1 text-xs font-bold text-primary hover:underline">PDF</button>
                                            {isManager && inv.statut === 'EMISE' && (
                                                <button type="button" onClick={() => setCreditFor(inv)} className="px-2 py-1 text-xs font-bold text-danger-dark hover:underline">Avoir</button>
                                            )}
                                        </td>
                                    </tr>
                                    {expanded === inv.id && inv.credit_notes.map(n => (
                                        <tr key={`n-${n.id}`} className="bg-slate-50/70 text-xs">
                                            <td className="p-2 pl-8 font-semibold">{n.number}</td>
                                            <td className="p-2" colSpan={2}>{n.reason || '—'}</td>
                                            <td className="p-2 text-right">{fmtMoney(n.montant_ht)}</td>
                                            <td className="p-2 text-right">{fmtMoney(n.montant_tva)}</td>
                                            <td className="p-2 text-right font-bold">-{fmtMoney(n.montant_ttc)}</td>
                                            <td className="p-2" />
                                            <td className="p-2 text-right">
                                                <button type="button" onClick={() => openPdf(`credit-notes/${n.id}/pdf/`)} className="px-2 py-1 font-bold text-primary hover:underline">PDF</button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {issueOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Nouvelle facture">
                    <form onSubmit={issue} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <h2 className="text-lg font-extrabold text-slate-900">Émettre une facture</h2>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                            Contrat à facturer
                            <select
                                required
                                value={contractId}
                                onChange={(e) => setContractId(e.target.value)}
                                className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium normal-case"
                            >
                                <option value="">— Choisir —</option>
                                {invoiceable.map(c => (
                                    <option key={c.id} value={c.id}>
                                        #{c.id} — {c.client_prenom} {c.client_name} — {c.vehicle_matricule} ({fmtMoney(c.montant_total)})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIssueOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">Annuler</button>
                            <button type="submit" disabled={busy || !contractId} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                                {busy ? 'Émission…' : 'Émettre'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {creditFor && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Émettre un avoir">
                    <form onSubmit={submitCredit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
                        <h2 className="text-lg font-extrabold text-slate-900">Avoir sur {creditFor.number}</h2>
                        <p className="text-xs text-slate-500">Laissez le montant vide pour un avoir total du solde restant. Un avoir total annule la facture.</p>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                            Montant TTC (optionnel)
                            <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium" />
                        </label>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                            Motif
                            <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium normal-case" />
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCreditFor(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">Annuler</button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-danger text-white text-sm font-bold disabled:opacity-50">
                                {busy ? 'Émission…' : "Émettre l'avoir"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Invoices;
