import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import PageHeader from '../ui/PageHeader';
import PageLoading from '../ui/PageLoading';
import StatusBadge from '../ui/StatusBadge';
import { useI18n } from '../../i18n/context';
import { formatDateTime, formatMoney, formatNumber } from '../../utils/formatters';

const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-stroke last:border-0">
        <dt className="text-sm text-text-muted">{label}</dt>
        <dd className="text-sm font-semibold text-on-surface text-end">{value}</dd>
    </div>
);

// Détail d'un de mes contrats. Un id qui ne m'appartient pas renvoie 404 : on l'affiche comme introuvable.
export default function ClientContractDetail() {
    const { t } = useI18n();
    const { id } = useParams();
    // État rattaché à l'identifiant chargé : un changement d'id n'affiche jamais l'ancien contrat.
    const [state, setState] = useState({ id: null, contract: null, error: false, notFound: false });
    const [attempt, setAttempt] = useState(0);
    const loaded = state.id === id;
    const contract = loaded ? state.contract : null;
    const error = loaded && state.error;
    const notFound = loaded && state.notFound;

    const retry = () => setAttempt((n) => n + 1);

    useEffect(() => {
        let cancelled = false;
        api.get(`clients/me/contracts/${id}/`)
            .then((res) => {
                if (!cancelled) setState({ id, contract: res.data, error: false, notFound: false });
            })
            .catch((err) => {
                if (cancelled) return;
                const is404 = err.response?.status === 404;
                setState({ id, contract: null, error: !is404, notFound: is404 });
            });
        return () => { cancelled = true; };
    }, [id, attempt]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('client.contract.title', { id })}
                back="/espace-client/contrats"
                actions={contract ? <StatusBadge status={contract.statut} /> : null}
            />

            {error && <ErrorBanner message={t('client.loadError')} onRetry={retry} />}
            {notFound && <EmptyState icon="search_off" title={t('client.contract.notFound')} />}
            {!error && !notFound && !contract && <PageLoading variant="cards" />}

            {contract && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card padding={5}>
                        <dl>
                            <Row label={t('client.contract.vehicle')} value={`${contract.vehicle_name} · ${contract.vehicle_matricule}`} />
                            <Row label={t('client.contract.period')} value={`${formatDateTime(contract.date_sortie)} → ${formatDateTime(contract.date_retour_prevue)}`} />
                            <Row label={t('client.contract.duration')} value={t('client.contract.days', { n: contract.jours })} />
                            <Row label={t('client.contract.km')} value={formatNumber(contract.km_sortie)} />
                            <Row label={t('client.contract.kmReturn')} value={contract.km_retour != null ? formatNumber(contract.km_retour) : '—'} />
                        </dl>
                    </Card>
                    <Card padding={5}>
                        <dl>
                            <Row label={t('client.contract.total')} value={formatMoney(contract.montant_total)} />
                            <Row label={t('client.contract.paid')} value={formatMoney(contract.montant_paye)} />
                            <Row label={t('client.contract.rest')} value={<span className="text-primary">{formatMoney(contract.reste_a_payer)}</span>} />
                        </dl>
                    </Card>
                    <Card padding={5} className="md:col-span-2">
                        <dl>
                            <Row label={t('client.contract.agency')} value={contract.agency_name} />
                            <Row label={t('client.contract.phone')} value={contract.agency_telephone || '—'} />
                            <Row label={t('client.contract.address')} value={contract.agency_adresse || '—'} />
                        </dl>
                    </Card>
                </div>
            )}

            <div>
                <Link to="/espace-client/contrats" className="text-sm font-semibold text-primary hover:underline">
                    ← {t('client.contract.back')}
                </Link>
            </div>
        </div>
    );
}
