import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import MetricCard from './ui/MetricCard';

const Dashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState({
        stats: { total_vehicles: 0, available_vehicles: 0, rented_vehicles: 0, active_contracts: 0, total_clients: 0, revenue_this_month: 0 },
        alerts: { insurance_expiring: [], visite_expiring: [] },
        recent_contracts: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('dashboard/');
                setData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération des données", error);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-8">
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse rounded"></div>
                    <div className="h-8 w-72 bg-slate-200 animate-pulse rounded"></div>
                </div>
                <SkeletonCards count={4} />
                <SkeletonTable rows={5} cols={5} />
            </div>
        );
    }

    const totalFleet = data.stats.total_vehicles ?? 0;
    const availableFleet = data.stats.available_vehicles ?? 0;
    const availPercent = totalFleet > 0 ? Math.round((availableFleet / totalFleet) * 100) : 0;
    const activeContracts = data.stats.active_contracts ?? 0;
    const insuranceAlerts = data.alerts?.insurance_expiring || [];
    const visiteAlerts = data.alerts?.visite_expiring || [];
    const totalAlerts = insuranceAlerts.length + visiteAlerts.length;

    return (
        <div>
            {/* Header */}
            <PageHeader
                eyebrow={`Aperçu temps réel — ${data.stats.agency_name || "Votre agence"}`}
                title="Tableau de bord"
                actions={(
                    <Button icon="add" onClick={() => navigate('/contracts/new')}>Nouveau contrat</Button>
                )}
            />

            {/* Metric cards : 4 colonnes strictes comme krini_vantage_fleet.html */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <MetricCard
                    icon="payments"
                    iconBg="bg-info-bg"
                    iconColor="text-info"
                    value={(data.stats.revenue_this_month ?? 0).toLocaleString('fr-FR')}
                    unit="DH"
                    label="Revenu du mois"
                />
                <MetricCard
                    icon="check_circle"
                    iconBg="bg-success-bg"
                    iconColor="text-success"
                    value={availableFleet}
                    unit={`/ ${totalFleet}`}
                    label="Véhicules disponibles"
                >
                    <div className="h-1.5 rounded-full overflow-hidden bg-stroke">
                        <div className="h-full rounded-full bg-success" style={{ width: `${availPercent}%` }} />
                    </div>
                </MetricCard>
                <MetricCard
                    icon="description"
                    iconBg="bg-secondary-container"
                    iconColor="text-secondary"
                    value={activeContracts}
                    label="Contrats actifs"
                />
                <MetricCard
                    icon="warning"
                    tone="danger"
                    value={totalAlerts}
                    label="Alertes échéance"
                >
                    <p className="text-[12px]" style={{ color: 'var(--error-c)', opacity: 0.7 }}>Assurance · visite technique</p>
                </MetricCard>
            </div>

            {/* Grid 3 colonnes : Fleet table (2 col) + Échéances (1 col) */}
            <div className="grid grid-cols-3 gap-6">

                {/* Fleet table */}
                <div className="col-span-2 card rounded-token overflow-hidden shadow-l1">
                    <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--stroke)' }}>
                        <h3 className="font-bold text-[16px]" style={{ color: 'var(--on-surface)' }}>Contrats & État Flotte Récents</h3>
                        <div className="flex items-center gap-2">
                            <StatusBadge status="Available" />
                            <StatusBadge status="Rented" />
                            <StatusBadge status="Maintenance" />
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">Véhicule</th>
                                <th className="px-6 py-3">Durée</th>
                                <th className="px-6 py-3">Statut</th>
                                <th className="px-6 py-3 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                            {data.recent_contracts.map((contract) => (
                                <tr key={contract.id} className="row hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 font-semibold">
                                        {contract.client__nom} {contract.client__prenom}
                                    </td>
                                    <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                        {contract.vehicle__marque} {contract.vehicle__modele}
                                    </td>
                                    <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                        {contract.jours} Jours
                                    </td>
                                    <td className="px-6">
                                        <StatusBadge status={contract.statut} />
                                    </td>
                                    <td className="px-6 text-right font-semibold">
                                        {contract.montant_total} DH
                                    </td>
                                </tr>
                            ))}
                            {data.recent_contracts.length === 0 && (
                                <tr className="row">
                                    <td colSpan="5" className="px-6 text-center text-slate-400">Aucun contrat récent.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Alerts Box */}
                <div className="card rounded-token overflow-hidden flex flex-col shadow-l1">
                    <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--stroke)' }}>
                        <h3 className="font-bold text-[16px]" style={{ color: 'var(--on-surface)' }}>Échéances proches</h3>
                        <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--on-surface-variant)' }}>event</span>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {insuranceAlerts.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-token" style={{ background: 'var(--error-bg)' }}>
                                <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: 'var(--error-c)' }}>verified_user</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface)' }}>
                                        Assurance expire le {alert.date_assurance}
                                    </p>
                                    <p className="text-[12px] mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                                        {alert.marque} ({alert.matricule})
                                    </p>
                                </div>
                            </div>
                        ))}
                        {visiteAlerts.map(alert => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-token" style={{ background: 'var(--warning-bg)' }}>
                                <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: 'var(--warning)' }}>build</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface)' }}>
                                        Visite technique le {alert.date_visite_technique}
                                    </p>
                                    <p className="text-[12px] mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                                        {alert.marque} ({alert.matricule})
                                    </p>
                                </div>
                            </div>
                        ))}
                        {insuranceAlerts.length === 0 && visiteAlerts.length === 0 && (
                            <div className="p-4 rounded-token text-xs font-semibold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                                Tout est opérationnel : aucune alerte d'assurance ou de visite technique.
                            </div>
                        )}
                    </div>
                    <div className="mx-4 mb-4">
                        <Button variant="secondary" className="w-full" onClick={() => navigate('/vehicles')}>
                            Voir toutes les alertes
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;