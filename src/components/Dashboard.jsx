import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { jwtDecode } from 'jwt-decode';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';

const Dashboard = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState("");
    const [data, setData] = useState({
        stats: { total_vehicles: 0, available_vehicles: 0, rented_vehicles: 0, active_contracts: 0, total_clients: 0, revenue_this_month: 0 },
        alerts: { insurance_expiring: [], visite_expiring: [] },
        recent_contracts: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role || "");
            } catch (error) {
                console.error("Erreur lecture token", error);
            }
        }

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

    const totalFleet = data.stats.total_vehicles || 26;
    const availableFleet = data.stats.available_vehicles || 18;
    const availPercent = totalFleet > 0 ? Math.round((availableFleet / totalFleet) * 100) : 0;
    const activeContracts = data.stats.active_contracts || 14;
    const insuranceAlerts = data.alerts?.insurance_expiring || [];
    const visiteAlerts = data.alerts?.visite_expiring || [];
    const totalAlerts = insuranceAlerts.length + visiteAlerts.length;

    return (
        <div>
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        Aperçu temps réel — {data.stats.agency_name || "Frères Cherifi Car"}
                    </p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        Tableau de bord
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/contracts/new')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--primary-container)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nouveau contrat
                    </button>
                </div>
            </div>

            {/* Metric cards : 4 colonnes strictes comme krini_vantage_fleet.html */}
            <div className="grid grid-cols-4 gap-6 mb-8">

                {/* Card 1: Revenu */}
                <div className="card rounded-token p-6 shadow-l1">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--info-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--info)' }}>payments</span>
                    </div>
                    <p className="font-bold text-[24px] leading-8" style={{ color: 'var(--on-surface)' }}>
                        {(data.stats.revenue_this_month || 128400).toLocaleString()}{' '}
                        <span className="text-[14px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>DH</span>
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Revenu du mois</p>
                    <div className="flex items-center gap-1 mt-3">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--success)' }}>trending_up</span>
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--success)' }}>+8,2%</span>
                        <span className="text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>vs mois dernier</span>
                    </div>
                </div>

                {/* Card 2: Disponibilité */}
                <div className="card rounded-token p-6 shadow-l1">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--success-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--success)' }}>check_circle</span>
                    </div>
                    <p className="font-bold text-[24px] leading-8" style={{ color: 'var(--on-surface)' }}>
                        {availableFleet}{' '}
                        <span className="text-[14px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>/ {totalFleet}</span>
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Véhicules disponibles</p>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--stroke)' }}>
                        <div className="h-full rounded-full" style={{ width: `${availPercent}%`, background: 'var(--success)' }}></div>
                    </div>
                </div>

                {/* Card 3: Contrats actifs */}
                <div className="card rounded-token p-6 shadow-l1">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--secondary-container)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--secondary)' }}>description</span>
                    </div>
                    <p className="font-bold text-[24px] leading-8" style={{ color: 'var(--on-surface)' }}>{activeContracts}</p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Contrats actifs</p>
                    <div className="flex items-center gap-1 mt-3">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--warning)' }}>3</span>
                        <span className="text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>se terminent sous 48h</span>
                    </div>
                </div>

                {/* Card 4: Alertes */}
                <div className="card rounded-token p-6 shadow-l1" style={{ background: 'var(--error-bg)', borderColor: 'var(--danger-border)' }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ background: '#ffffff' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--error-c)' }}>warning</span>
                    </div>
                    <p className="font-bold text-[24px] leading-8" style={{ color: 'var(--danger-dark)' }}>{totalAlerts}</p>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--error-c)', opacity: 0.8 }}>Alertes échéance</p>
                    <p className="text-[12px] mt-3" style={{ color: 'var(--error-c)', opacity: 0.7 }}>Assurance · visite technique</p>
                </div>
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
                    <button
                        onClick={() => navigate('/vehicles')}
                        className="mx-4 mb-4 py-2.5 rounded-token text-[13px] font-semibold hover:bg-slate-100 transition-colors"
                        style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)', color: 'var(--secondary)' }}
                    >
                        Voir toutes les alertes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;