import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import Button from './ui/Button';
import Card from './ui/Card';
import Field from './ui/Field';
import { Input, Select } from './ui/Input';
import PageHeader from './ui/PageHeader';
import Table from './ui/Table';
import { apiErrorText } from '../utils/apiErrorText';
import { formatDate } from '../utils/formatters';
import { useI18n } from '../i18n/context';

const STATUS_STYLE = {
    pending: 'bg-slate-100 text-slate-600',
    matched: 'bg-blue-50 text-blue-700',
    no_contract: 'bg-amber-50 text-amber-700',
    queued: 'bg-amber-50 text-amber-700',
    submitted: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
};

// Champs NARSA manquants (clés API) -> clés de traduction lisibles
const MISSING_LABEL_KEYS = {
    nom: 'u.nom',
    prenom: 'u.prnom',
    nom_ar: 'narsa.nom_ar',
    prenom_ar: 'narsa.prenom_ar',
    type_document: 'narsa.type_document',
    cin_passport: 'u.n_de_document',
    permis_conduite: 'u.n_de_permis',
    adresse: 'u.adresse',
    adresse_ar: 'narsa.adresse_ar',
    localite_narsa: 'narsa.localite',
};

const EMPTY = { reference_pv: '', matricule: '', date_infraction: '', lieu: '', montant: '' };

/**
 * Infractions (avis de contravention) : on saisit l'avis, on choisit le contrat concerné
 * (en cours ou passé) puis le worker local déclare le conducteur sur le portail NARSA.
 */
const Infractions = () => {
    const { t } = useI18n();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [candidates, setCandidates] = useState({});

    const load = useCallback(async () => {
        try {
            const { data } = await api.get('infractions/');
            setRows(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            toast.error(apiErrorText(err, t('infra.load_error')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const add = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = { ...form, date_infraction: new Date(form.date_infraction).toISOString() };
            if (!body.montant) delete body.montant;
            await api.post('infractions/', body);
            setForm(EMPTY);
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, t('infra.save_error')));
        } finally {
            setSaving(false);
        }
    };

    const loadCandidates = async (row) => {
        try {
            const { data } = await api.get(`infractions/${row.id}/candidates/`);
            setCandidates((c) => ({ ...c, [row.id]: data }));
        } catch (err) {
            toast.error(apiErrorText(err, t('infra.load_error')));
        }
    };

    const chooseContract = async (row, contractId) => {
        try {
            await api.patch(`infractions/${row.id}/`, { contract: contractId ? Number(contractId) : null });
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, t('infra.save_error')));
        }
    };

    const fileInput = useRef(null);
    const pendingRow = useRef(null);

    const queue = async (row, file) => {
        try {
            let body;
            if (file) {
                body = new FormData();
                body.append('file', file);
            }
            await api.post(`infractions/${row.id}/queue/`, body, file ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
            toast.success(t('infra.queued'));
            await load();
        } catch (err) {
            toast.error(apiErrorText(err, t('infra.queue_error')));
        }
    };

    // NARSA exige le contrat signé : on le demande à chaque déclaration (il n'est pas conservé après envoi)
    const declare = (row) => {
        if (row.has_signed_contract) { queue(row); return; }  // relance après échec : fichier déjà en transit
        pendingRow.current = row;
        fileInput.current?.click();
    };

    const onFilePicked = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        const row = pendingRow.current;
        pendingRow.current = null;
        if (!file || !row) return;
        if (file.size > 10 * 1024 * 1024) { toast.error(t('infra.file_too_big')); return; }
        queue(row, file);
    };

    const statusLabel = (s) => t(`infra.status_${s}`);

    return (
        <div className="w-full space-y-6">
            <PageHeader as="h1" eyebrow={t('nav.infractions')} title={t('infra.title')} description={t('infra.description')} />

            <Card padding={5} variant="default">
                <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
                    <Field label={t('infra.pv')} className="sm:col-span-1">
                        <Input name="reference_pv" value={form.reference_pv} onChange={set} required />
                    </Field>
                    <Field label={t('infra.plate')} className="sm:col-span-1">
                        <Input name="matricule" value={form.matricule} onChange={set} required placeholder="12345-A-6" />
                    </Field>
                    <Field label={t('infra.date')} className="sm:col-span-2">
                        <Input name="date_infraction" type="datetime-local" value={form.date_infraction} onChange={set} required />
                    </Field>
                    <Field label={t('infra.place')} className="sm:col-span-1">
                        <Input name="lieu" value={form.lieu} onChange={set} />
                    </Field>
                    <Field label={t('infra.amount')} className="sm:col-span-1">
                        <Input name="montant" type="number" step="0.01" min="0" value={form.montant} onChange={set} />
                    </Field>
                    <div className="sm:col-span-6">
                        <Button type="submit" icon="add" loading={saving}>{t('infra.add')}</Button>
                    </div>
                </form>
            </Card>

            <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={onFilePicked} data-testid="signed-file" />
            <p className="text-xs text-slate-500">{t('infra.signed_hint')}</p>

            <Table
                caption={t('infra.list')}
                rows={rows}
                loading={loading}
                emptyTitle={t('infra.empty')}
                columns={[
                    {
                        key: 'reference_pv', label: t('infra.pv'),
                        render: (v, row) => (
                            <>
                                <div className="font-semibold">{v}</div>
                                <div className="text-label-sm text-text-muted">{row.matricule} · {formatDate(row.date_infraction)}</div>
                            </>
                        ),
                    },
                    {
                        key: 'contract', label: t('infra.contract'),
                        render: (_, row) => {
                            const locked = ['queued', 'submitted'].includes(row.status);
                            const options = candidates[row.id];
                            return (
                                <div className="space-y-1 min-w-[220px]">
                                    <Select
                                        value={row.contract || ''}
                                        disabled={locked}
                                        onFocus={() => !options && loadCandidates(row)}
                                        onChange={(e) => chooseContract(row, e.target.value)}
                                    >
                                        <option value="">{row.client_nom ? `${row.client_nom}` : t('infra.choose_contract')}</option>
                                        {(options || []).map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {`#${c.id} · ${c.client_nom} · ${formatDate(c.date_sortie)} → ${formatDate(c.date_retour)}${c.covers ? ' ✓' : ''}`}
                                            </option>
                                        ))}
                                    </Select>
                                    {row.narsa_missing?.length > 0 && (
                                        <Link to={`/clients/edit/${row.client}`} className="text-xs text-red-600 underline">
                                            {t('infra.missing_data', { fields: row.narsa_missing.map((k) => (MISSING_LABEL_KEYS[k] ? t(MISSING_LABEL_KEYS[k]) : k)).join(', ') })}
                                        </Link>
                                    )}
                                </div>
                            );
                        },
                    },
                    {
                        key: 'status', label: t('infra.status'),
                        render: (v, row) => (
                            <div className="space-y-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[v] || ''}`}>{statusLabel(v)}</span>
                                {row.error && <p className="text-xs text-red-600">{row.error}</p>}
                            </div>
                        ),
                    },
                    {
                        key: 'actions', label: '', align: 'right',
                        render: (_, row) => ['matched', 'failed'].includes(row.status) && (
                            <Button size="sm" icon="send" disabled={row.narsa_missing?.length > 0} onClick={() => declare(row)}>
                                {row.status === 'failed' ? t('infra.retry') : t('infra.declare')}
                            </Button>
                        ),
                    },
                ]}
            />
        </div>
    );
};

export default Infractions;
