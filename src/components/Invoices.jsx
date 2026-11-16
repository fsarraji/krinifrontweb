import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { fetchAllPages } from '../api';
import { toast } from './Toast';
import { downloadFile, openPdf } from '../utils/download';
import { formatDate, formatMoney } from '../utils/formatters';
import { getClaims } from '../utils/session';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Select } from './ui/Input';
import Modal from './ui/Modal';
import PageHeader from './ui/PageHeader';
import Table from './ui/Table';

const STATUS = {
    EMISE: { label: 'Émise', cls: 'bg-badge-info-bg text-badge-info-text border-badge-info-border' },
    ANNULEE: { label: 'Annulée', cls: 'bg-badge-neutral-bg text-badge-neutral-text border-badge-neutral-border' },
};

const errText = (err, fallback) => {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(' ') || fallback;
};

const Stat = ({ label, value }) => (
    <div className="bg-white border border-stroke rounded-token p-4">
        <p className="text-label-sm uppercase tracking-wider text-text-muted">{label}</p>
        <p className="text-xl font-bold text-on-surface mt-1">{value}</p>
    </div>
);

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
            setContracts(all.filter((c) => c.statut !== 'ANNULE'));
        } catch (err) {
            console.error(err);
            toast.error('Impossible de charger les contrats.');
        }
    };

    // Contrats déjà facturés (facture active) : exclus de la liste de choix.
    const invoicedContracts = useMemo(
        () => new Set(invoices.filter((i) => i.statut !== 'ANNULEE').map((i) => i.contract)),
        [invoices]
    );
    const invoiceable = contracts.filter((c) => !invoicedContracts.has(c.id));

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

    const closeCredit = () => {
        setCreditFor(null);
        setCreditAmount('');
        setCreditReason('');
    };

    const submitCredit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = { reason: creditReason };
            if (creditAmount !== '') body.amount = creditAmount;
            await api.post(`invoices/${creditFor.id}/credit-note/`, body);
            toast.success('Avoir émis.');
            closeCredit();
            await load();
        } catch (err) {
            toast.error(errText(err, "Échec de l'émission de l'avoir."));
        } finally {
            setBusy(false);
        }
    };

    const filtered = invoices.filter((i) => {
        if (statut !== 'ALL' && i.statut !== statut) return false;
        const q = search.trim().toLowerCase();
        return !q || `${i.number} ${i.client_name}`.toLowerCase().includes(q);
    });

    const totalTtc = filtered.reduce((s, i) => s + Number(i.montant_ttc), 0);
    const totalCredit = filtered.reduce((s, i) => s + Number(i.montant_credite), 0);

    const columns = [
        {
            key: 'number', label: 'N°', sortable: true,
            render: (v, inv) => (
                <span className="font-bold text-on-surface">
                    {v}
                    {inv.credit_notes?.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                            className="ml-2 text-label-sm text-primary hover:underline"
                            aria-expanded={expanded === inv.id}
                        >
                            {inv.credit_notes.length} avoir(s)
                        </button>
                    )}
                </span>
            ),
        },
        { key: 'client_name', label: 'Client', sortable: true },
        { key: 'date_emission', label: 'Date', sortable: true, render: (v) => formatDate(v) },
        { key: 'montant_ht', label: 'HT', align: 'right', sortable: true, render: (v) => formatMoney(v) },
        { key: 'montant_tva', label: 'TVA', align: 'right', render: (v) => formatMoney(v) },
        { key: 'montant_ttc', label: 'TTC', align: 'right', sortable: true, render: (v) => <strong>{formatMoney(v)}</strong> },
        {
            key: 'statut', label: 'Statut',
            render: (v) => (
                <span className={`inline-flex px-2 py-0.5 rounded-token border text-label-sm ${STATUS[v]?.cls || ''}`}>
                    {STATUS[v]?.label || v}
                </span>
            ),
        },
        {
            key: 'actions', label: 'Actions', align: 'right',
            render: (_, inv) => (
                <span className="inline-flex gap-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" icon="picture_as_pdf" onClick={() => openPdf(`invoices/${inv.id}/pdf/`)}>PDF</Button>
                    {isManager && inv.statut === 'EMISE' && (
                        <Button variant="ghost" size="sm" className="!text-danger-dark" icon="undo" onClick={() => setCreditFor(inv)}>Avoir</Button>
                    )}
                </span>
            ),
        },
    ];

    const creditNotesOf = (inv) => inv.credit_notes || [];

    return (
        <div className="space-y-6">
            <PageHeader
                className="!mb-0"
                title="Factures & avoirs"
                description="Numérotation séquentielle par agence. Une facture émise est immuable : on la corrige par un avoir."
                actions={(
                    <>
                        <Button variant="outline" icon="download" onClick={() => downloadFile('invoices/export/', 'factures.csv')}>Export CSV</Button>
                        <Button icon="add" onClick={openIssue}>Nouvelle facture</Button>
                    </>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Stat label="Factures" value={filtered.length} />
                <Stat label="Total TTC" value={formatMoney(totalTtc)} />
                <Stat label="Avoirs émis" value={formatMoney(totalCredit)} />
            </div>

            <div className="flex flex-wrap gap-3">
                <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (n° facture, client)…"
                    aria-label="Rechercher une facture"
                    className="flex-1 min-w-[220px] !w-auto"
                />
                <Select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                    aria-label="Filtrer par statut"
                    className="!w-auto"
                >
                    <option value="ALL">Tous les statuts</option>
                    <option value="EMISE">Émises</option>
                    <option value="ANNULEE">Annulées</option>
                </Select>
            </div>

            <Table
                caption="Liste des factures"
                columns={columns}
                rows={filtered}
                paginate
                defaultSort={{ key: 'date_emission', dir: 'desc' }}
                loading={loading}
                emptyTitle="Aucune facture"
                emptyDescription="Émettez une facture depuis un contrat pour la voir apparaître ici."
                footer={expanded && (() => {
                    const inv = invoices.find((i) => i.id === expanded);
                    if (!inv) return null;
                    return (
                        <div className="border-t border-stroke bg-surface px-4 py-3 space-y-2">
                            <p className="text-label-sm uppercase tracking-wider text-text-muted">Avoirs sur {inv.number}</p>
                            {creditNotesOf(inv).map((n) => (
                                <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <span className="font-semibold">{n.number}</span>
                                    <span className="text-text-muted flex-1 min-w-[120px]">{n.reason || '—'}</span>
                                    <span className="font-bold">-{formatMoney(n.montant_ttc)}</span>
                                    <Button variant="ghost" size="sm" icon="picture_as_pdf" onClick={() => openPdf(`credit-notes/${n.id}/pdf/`)}>PDF</Button>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            />

            <Modal
                isOpen={issueOpen}
                onClose={() => setIssueOpen(false)}
                title="Émettre une facture"
                size="md"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setIssueOpen(false)}>Annuler</Button>
                        <Button type="submit" form="issue-invoice-form" loading={busy} disabled={!contractId}>Émettre</Button>
                    </>
                )}
            >
                <form id="issue-invoice-form" onSubmit={issue}>
                    <Field label="Contrat à facturer" required hint="Seuls les contrats non annulés et non encore facturés sont proposés.">
                        <Select required value={contractId} onChange={(e) => setContractId(e.target.value)}>
                            <option value="">— Choisir —</option>
                            {invoiceable.map((c) => (
                                <option key={c.id} value={c.id}>
                                    #{c.id} — {c.client_prenom} {c.client_name} — {c.vehicle_matricule} ({formatMoney(c.montant_total)})
                                </option>
                            ))}
                        </Select>
                    </Field>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(creditFor)}
                onClose={closeCredit}
                title={`Avoir sur ${creditFor?.number || ''}`}
                size="md"
                footer={(
                    <>
                        <Button variant="outline" onClick={closeCredit}>Annuler</Button>
                        <Button type="submit" form="credit-note-form" variant="danger" loading={busy}>Émettre l'avoir</Button>
                    </>
                )}
            >
                <form id="credit-note-form" onSubmit={submitCredit} className="space-y-4">
                    <p className="text-sm text-text-muted">
                        Laissez le montant vide pour un avoir total du solde restant. Un avoir total annule la facture.
                    </p>
                    <Field label="Montant TTC (optionnel)">
                        <Input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                    </Field>
                    <Field label="Motif">
                        <Input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
};

export default Invoices;
