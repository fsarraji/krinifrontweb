import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import PageHeader from '../ui/PageHeader';
import PageLoading from '../ui/PageLoading';
import StatusBadge from '../ui/StatusBadge';
import { useI18n } from '../../i18n/context';
import { formatDate, formatMoney } from '../../utils/formatters';

// Liste de mes contrats (un seul appel : l'API ne renvoie que ceux du client connecté).
export default function ClientContracts() {
    const { t } = useI18n();
    const [contracts, setContracts] = useState(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const retry = () => {
        setError(false);
        setAttempt((n) => n + 1);
    };

    useEffect(() => {
        let cancelled = false;
        api.get('clients/me/contracts/')
            .then((res) => !cancelled && setContracts(Array.isArray(res.data) ? res.data : []))
            .catch(() => !cancelled && setError(true));
        return () => { cancelled = true; };
    }, [attempt]);

    return (
        <div className="space-y-6">
            <PageHeader title={t('client.contracts.title')} description={t('client.contracts.subtitle')} />

            {error && <ErrorBanner message={t('client.loadError')} onRetry={retry} />}
            {!error && !contracts && <PageLoading variant="cards" />}

            {contracts && contracts.length === 0 && (
                <EmptyState icon="description" title={t('client.contracts.empty')} description={t('client.contracts.emptyDesc')} />
            )}

            {contracts && contracts.length > 0 && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contracts.map((c) => (
                        <li key={c.id}>
                            <Link
                                to={`/espace-client/contrats/${c.id}`}
                                className="block rounded-token focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            >
                                <Card padding={5} className="h-full hover:border-primary-border transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-on-surface truncate">{c.vehicle_name}</p>
                                            <p className="text-label-sm font-mono text-text-muted">{c.vehicle_matricule}</p>
                                        </div>
                                        <StatusBadge status={c.statut} />
                                    </div>
                                    <p className="text-sm text-on-surface-variant mt-3">
                                        {formatDate(c.date_sortie)} → {formatDate(c.date_retour_prevue)}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                                        <div>
                                            <p className="text-label-sm text-text-muted">{t('client.contract.total')}</p>
                                            <p className="font-semibold">{formatMoney(c.montant_total)}</p>
                                        </div>
                                        <div>
                                            <p className="text-label-sm text-text-muted">{t('client.contract.rest')}</p>
                                            <p className="font-semibold">{formatMoney(c.reste_a_payer)}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-primary mt-4">{t('client.contracts.open')} →</p>
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
