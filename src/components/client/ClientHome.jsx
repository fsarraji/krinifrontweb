import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Card from '../ui/Card';
import ErrorBanner from '../ui/ErrorBanner';
import PageLoading from '../ui/PageLoading';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { useI18n } from '../../i18n/context';
import { getClaims } from '../../utils/session';
import { formatDate } from '../../utils/formatters';

// Accueil du client : contrat en cours (ou à venir) et réservations en attente.
export default function ClientHome() {
    const { t } = useI18n();
    const username = getClaims()?.username || '';
    const [contracts, setContracts] = useState(null);
    const [reservations, setReservations] = useState(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const retry = () => {
        setError(false);
        setAttempt((n) => n + 1);
    };

    useEffect(() => {
        let cancelled = false;
        Promise.all([api.get('clients/me/contracts/'), api.get('reservations/')])
            .then(([c, r]) => {
                if (cancelled) return;
                setContracts(Array.isArray(c.data) ? c.data : []);
                setReservations(Array.isArray(r.data) ? r.data : []);
            })
            .catch(() => !cancelled && setError(true));
        return () => { cancelled = true; };
    }, [attempt]);

    if (error) return <ErrorBanner message={t('client.loadError')} onRetry={retry} />;
    if (!contracts || !reservations) return <PageLoading variant="cards" />;

    const active = contracts.find((c) => c.statut === 'EN_COURS') || contracts.find((c) => c.statut === 'RESERVE');
    const pending = reservations.filter((r) => r.statut === 'PENDING').length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-headline-md font-bold text-on-surface">{t('client.home.title', { name: username })}</h1>
                <p className="text-sm text-on-surface-variant mt-1">{t('client.home.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card padding={5}>
                    <p className="text-label-sm uppercase tracking-wider text-text-muted mb-2">{t('client.home.active')}</p>
                    {active ? (
                        <div className="space-y-2">
                            <p className="font-bold text-on-surface">{active.vehicle_name}</p>
                            <p className="text-sm text-on-surface-variant">
                                {formatDate(active.date_sortie)} → {formatDate(active.date_retour_prevue)}
                            </p>
                            <div className="flex items-center justify-between gap-3 pt-1">
                                <StatusBadge status={active.statut} />
                                <Link to={`/espace-client/contrats/${active.id}`} className="text-sm font-semibold text-primary hover:underline">
                                    {t('client.contracts.open')}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-on-surface-variant">{t('client.home.none')}</p>
                    )}
                </Card>

                <Card padding={5}>
                    <p className="text-label-sm uppercase tracking-wider text-text-muted mb-2">{t('client.home.pending')}</p>
                    <p className="text-3xl font-extrabold text-on-surface">{pending}</p>
                    <div className="mt-3">
                        <Link to="/espace-client/reservations" className="text-sm font-semibold text-primary hover:underline">
                            {t('client.home.viewAll')}
                        </Link>
                    </div>
                </Card>
            </div>

            <div className="flex flex-wrap gap-3">
                <Link to="/espace-client/contrats">
                    <Button variant="outline" icon="description">{t('client.nav.contracts')}</Button>
                </Link>
                <Link to="/espace-client/profil">
                    <Button variant="outline" icon="person">{t('client.nav.profile')}</Button>
                </Link>
            </div>
        </div>
    );
}
