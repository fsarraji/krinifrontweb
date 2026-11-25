import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from './ui/StatusBadge';
import Card from './ui/Card';
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
import { useI18n } from '../i18n/context';

const errText = (err, fallback) => {
    const d = err?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    return Object.values(d).flat().join(' ') || fallback;
};

const Stat = ({ label, value }) => (
    <Card padding={4} variant="default">
        <p className="text-label-sm uppercase tracking-wider text-text-muted">{label}</p>
        <p className="text-xl font-bold text-on-surface mt-1">{value}</p>
    </Card>
);

const Invoices = () => {
    const { t } = useI18n();
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
            toast.error(t('u.impossible_de_charger_les_factur'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const openIssue = async () => {
        setIssueOpen(true);
        try {
            const all = await fetchAllPages('contracts/');
            setContracts(all.filter((c) => c.statut !== 'ANNULE'));
        } catch (err) {
            console.error(err);
            toast.error(t('u.impossible_de_charger_les_contra'));
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
            toast.success(t('u.facture_mise'));
            setIssueOpen(false);
            setContractId('');
            await load();
        } catch (err) {
            toast.error(errText(err, t('u.chec_de_l_mission')));
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
            toast.success(t('u.avoir_mis'));
            closeCredit();
            await load();
        } catch (err) {
            toast.error(errText(err, t('u.chec_de_l_mission_de_l_avoir')));
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
            key: 'number', label: t('u.n'), sortable: true,
            render: (v, inv) => (
                <span className="font-bold text-on-surface">
                    {v}
                    <div className="text-label-sm font-normal text-text-muted">{inv.client_name}</div>
                    {inv.credit_notes?.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === inv.id ? null : inv.id)} aria-expanded={expanded === inv.id}>
                            {t('u.avoir_s', { n: inv.credit_notes.length })}
                        </Button>
                    )}
                </span>
            ),
        },
        { key: 'date_emission', label: t('u.date'), sortable: true, render: (v) => formatDate(v) },
        {
            key: 'montant_ttc', label: t('u.ttc'), align: 'right', sortable: true,
            render: (v, inv) => (
                <>
                    <div><strong>{formatMoney(v)}</strong></div>
                    <div className="text-label-sm text-text-muted">
                        {t('u.ht')} {formatMoney(inv.montant_ht)} · {t('u.tva')} {formatMoney(inv.montant_tva)}
                    </div>
                </>
            ),
        },
        {
            key: 'statut', label: t('u.statut'),
            render: (v) => <StatusBadge status={v} />,
        },
        {
            key: 'actions', label: t('u.actions'), align: 'right',
            render: (_, inv) => (
                <span className="inline-flex gap-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" icon="picture_as_pdf" onClick={() => openPdf(`invoices/${inv.id}/pdf/`)}>PDF</Button>
                    {isManager && inv.statut === 'EMISE' && (
                        <Button variant="ghost" size="sm" className="!text-danger-dark" icon="undo" onClick={() => setCreditFor(inv)}>{t('u.avoir')}</Button>
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
                title={t('u.factures_avoirs')}
                description={t('u.numrotation_squentielle_par_agen')}
                actions={(
                    <>
                        <Button variant="outline" icon="download" onClick={() => downloadFile('invoices/export/', 'factures.csv')}>{t('u.export_csv')}</Button>
                        <Button icon="add" onClick={openIssue}>{t('u.nouvelle_facture')}</Button>
                    </>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Stat label={t('u.factures')} value={filtered.length} />
                <Stat label={t('u.total_ttc')} value={formatMoney(totalTtc)} />
                <Stat label={t('u.avoirs_mis')} value={formatMoney(totalCredit)} />
            </div>

            <div className="flex flex-wrap gap-3">
                <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('u.rechercher_n_facture_client')}
                    aria-label={t('u.rechercher_une_facture')}
                    className="flex-1 min-w-[220px] !w-auto"
                />
                <Select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value)}
                    aria-label={t('u.filtrer_par_statut')}
                    className="!w-auto"
                >
                    <option value="ALL">{t('u.tous_les_statuts')}</option>
                    <option value="EMISE">{t('u.mises')}</option>
                    <option value="ANNULEE">{t('u.annules')}</option>
                </Select>
            </div>

            <Table
                caption={t('u.liste_des_factures')}
                columns={columns}
                rows={filtered}
                paginate
                defaultSort={{ key: 'date_emission', dir: 'desc' }}
                loading={loading}
                emptyTitle={t('u.aucune_facture')}
                emptyDescription={t('u.mettez_une_facture_depuis_un_con')}
                footer={expanded && (() => {
                    const inv = invoices.find((i) => i.id === expanded);
                    if (!inv) return null;
                    return (
                        <div className="border-t border-stroke bg-surface px-4 py-3 space-y-2">
                            <p className="text-label-sm uppercase tracking-wider text-text-muted">{t('u.avoirs_sur', { number: inv.number })}</p>
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
                title={t('u.mettre_une_facture')}
                size="md"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setIssueOpen(false)}>{t('u.annuler')}</Button>
                        <Button type="submit" form="issue-invoice-form" loading={busy} disabled={!contractId}>{t('u.mettre')}</Button>
                    </>
                )}
            >
                <form id="issue-invoice-form" onSubmit={issue}>
                    <Field label={t('u.contrat_facturer')} required hint={t('u.seuls_les_contrats_non_annuls_et')}>
                        <Select required value={contractId} onChange={(e) => setContractId(e.target.value)}>
                            <option value="">{t('u.choisir')}</option>
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
                title={t('u.avoir_sur', { number: creditFor?.number || '' })}
                size="md"
                footer={(
                    <>
                        <Button variant="outline" onClick={closeCredit}>{t('u.annuler')}</Button>
                        <Button type="submit" form="credit-note-form" variant="danger" loading={busy}>{t('u.mettre_l_avoir')}</Button>
                    </>
                )}
            >
                <form id="credit-note-form" onSubmit={submitCredit} className="space-y-4">
                    <p className="text-sm text-text-muted">
                        {t('u.laissez_le_montant_vide_pour_un_')}
                    </p>
                    <Field label={t('u.montant_ttc_optionnel')}>
                        <Input type="number" min="0.01" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                    </Field>
                    <Field label={t('u.motif')}>
                        <Input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
};

export default Invoices;
