import React, { useEffect, useState } from 'react';
import api from '../../api';
import { toast } from '../Toast';
import { messageBox } from '../MessageBox';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import PageHeader from '../ui/PageHeader';
import PageLoading from '../ui/PageLoading';
import StatusBadge from '../ui/StatusBadge';
import { useI18n } from '../../i18n/context';
import { formatDate, formatMoney } from '../../utils/formatters';

// Mes réservations. Seule une réservation en attente peut être annulée par le client
// (le serveur le vérifie aussi).
export default function ClientReservations() {
    const { t } = useI18n();
    const [items, setItems] = useState(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [busyId, setBusyId] = useState(null);

    const retry = () => {
        setError(false);
        setAttempt((n) => n + 1);
    };

    useEffect(() => {
        let cancelled = false;
        api.get('reservations/')
            .then((res) => !cancelled && setItems(Array.isArray(res.data) ? res.data : []))
            .catch(() => !cancelled && setError(true));
        return () => { cancelled = true; };
    }, [attempt]);

    const cancel = async (reservation) => {
        const ok = await messageBox.ask(t('client.reservations.cancelConfirm'), t('client.reservations.cancel'), {
            destructive: true,
            confirmText: t('client.reservations.cancel'),
        });
        if (ok !== true) return;
        setBusyId(reservation.id);
        try {
            await api.post(`reservations/${reservation.id}/cancel/`);
            toast.success(t('client.reservations.cancelled'));
            setItems((prev) => prev.map((r) => (r.id === reservation.id ? { ...r, statut: 'CANCELLED' } : r)));
        } catch {
            toast.error(t('client.reservations.cancelError'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t('client.reservations.title')} description={t('client.reservations.subtitle')} />

            {error && <ErrorBanner message={t('client.loadError')} onRetry={retry} />}
            {!error && !items && <PageLoading variant="cards" />}

            {items && items.length === 0 && <EmptyState icon="event_busy" title={t('client.reservations.empty')} />}

            {items && items.length > 0 && (
                <ul className="space-y-3">
                    {items.map((r) => (
                        <li key={r.id}>
                            <Card padding={5}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-on-surface">{r.vehicle_name}</p>
                                        <p className="text-sm text-on-surface-variant mt-1">
                                            {formatDate(r.date_sortie)} → {formatDate(r.date_retour_prevue)}
                                        </p>
                                        <p className="text-sm text-on-surface-variant mt-1">
                                            {r.agency_name} · {formatMoney(r.prix_par_jour)} / j
                                        </p>
                                    </div>
                                    <StatusBadge status={r.statut} />
                                </div>
                                {r.statut === 'PENDING' && (
                                    <div className="mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon="close"
                                            loading={busyId === r.id}
                                            disabled={busyId !== null}
                                            onClick={() => cancel(r)}
                                        >
                                            {t('client.reservations.cancel')}
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
