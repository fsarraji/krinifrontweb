import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { jwtDecode } from 'jwt-decode';
import { SkeletonCards, SkeletonTable } from './Skeleton';

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

    const statusLabels = {
        'RESERVE': { label: 'Réservé', class: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' },
        'EN_COURS': { label: 'En cours', class: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
        'TERMINE': { label: 'Terminé', class: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
        'ANNULE': { label: 'Annulé', class: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' },
    };

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

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Aperçu Général</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Intelligence de Flotte — {data.stats.agency_name || "Mon Agence"}
                    </h2>
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm">Temps Réel</button>
                </div>
            </div>

            {/* Bento Grid KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* KPI 1: Revenue */}
                <div className="col-span-1 lg:col-span-2 bg-indigo-600 p-8 rounded-2xl text-white relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-lg shadow-indigo-200/50">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Revenu Mensuel</p>
                            <span className="material-symbols-outlined text-white/40 text-2xl">payments</span>
                        </div>
                        <h3 className="text-4xl font-extrabold mt-4 tracking-tight">{(data.stats.revenue_this_month || 0).toLocaleString()} DH</h3>
                    </div>
                    <div className="relative z-10 flex items-center gap-2 mt-4">
                        <span className="text-emerald-300 font-bold flex items-center bg-white/10 px-2.5 py-1 rounded-lg text-xs">
                            <span className="material-symbols-outlined text-sm mr-1">trending_up</span> +8.2%
                        </span>
                        <span className="text-indigo-100/70 text-xs font-medium">vs mois dernier</span>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* KPI 2: Available Vehicles */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Véhicules Disponibles</p>
                            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl">directions_car</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-slate-900">{data.stats.available_vehicles} / {data.stats.total_vehicles}</h3>
                    </div>
                    <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${data.stats.total_vehicles > 0 ? (data.stats.available_vehicles / data.stats.total_vehicles) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* KPI 3: Active Contracts */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contrats Actifs</p>
                            <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-xl">description</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-slate-900">{data.stats.active_contracts}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">Locations en cours actuellement</p>
                </div>
            </div>

            {/* Performance & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Alerts */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-rose-600">
                                <span className="material-symbols-outlined">warning</span>
                                <h4 className="text-lg font-extrabold text-slate-900">Alertes Maintenance & Échéances Flotte</h4>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {data.alerts?.insurance_expiring?.map(alert => (
                                <div key={alert.id} className="p-4 bg-rose-50/50 border-l-4 border-rose-500 rounded-xl flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest block mb-1">Assurance Expirante</span>
                                        <p className="text-xs text-slate-700 font-semibold">{alert.marque} ({alert.matricule}) — Expire le {alert.date_assurance}</p>
                                    </div>
                                    <button onClick={() => navigate(`/vehicles/edit/${alert.id}`)} className="text-xs font-bold text-rose-600 flex items-center gap-1 hover:underline">
                                        Renouveler <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            ))}
                            {data.alerts?.visite_expiring?.map(alert => (
                                <div key={alert.id} className="p-4 bg-indigo-50/50 border-l-4 border-indigo-500 rounded-xl flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest block mb-1">Visite Technique</span>
                                        <p className="text-xs text-slate-700 font-semibold">{alert.marque} ({alert.matricule}) — Prévue le {alert.date_visite_technique}</p>
                                    </div>
                                    <button onClick={() => navigate(`/vehicles/edit/${alert.id}`)} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                                        Programmer <span className="material-symbols-outlined text-sm">event</span>
                                    </button>
                                </div>
                            ))}
                            {(!data.alerts?.insurance_expiring || data.alerts.insurance_expiring.length === 0) &&
                             (!data.alerts?.visite_expiring || data.alerts.visite_expiring.length === 0) && (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">check_circle</span> Tout est opérationnel : aucune alerte d'assurance ou de visite technique.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200/50">
                        <h4 className="font-extrabold text-lg mb-4">Gestion Rapide</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/vehicles/new')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                                <span className="material-symbols-outlined text-xl">directions_car</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider">+ Véhicule</span>
                            </button>
                            <button onClick={() => navigate('/clients/add')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                                <span className="material-symbols-outlined text-xl">person_add</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider">+ Client</span>
                            </button>
                            <button onClick={() => navigate('/contracts/new')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                                <span className="material-symbols-outlined text-xl">description</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider">+ Contrat</span>
                            </button>
                            <button onClick={() => navigate('/expenses')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all">
                                <span className="material-symbols-outlined text-xl">receipt_long</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider">+ Dépense</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contrats Récents</h4>
                    <button onClick={() => navigate('/contracts')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Voir tout</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Véhicule</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Durée</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Valeur</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {data.recent_contracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3.5">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm ring-1 ring-indigo-100">
                                                {contract.client__nom ? contract.client__nom[0] : ''}{contract.client__prenom ? contract.client__prenom[0] : ''}
                                            </div>
                                            <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {contract.client__nom} {contract.client__prenom}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                                        {contract.vehicle__marque} {contract.vehicle__modele}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                        {contract.jours} Jours
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                        {contract.montant_total} DH
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${statusLabels[contract.statut]?.class || 'bg-slate-100 text-slate-600'}`}>
                                            {statusLabels[contract.statut]?.label || contract.statut}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.recent_contracts.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">Aucun contrat récent.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;