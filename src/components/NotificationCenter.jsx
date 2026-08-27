import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';

const NotificationCenter = ({ isOpen, onClose, onCountChange }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState('ALL');
    const [pushPermission, setPushPermission] = useState(() => {
        return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
    });

    const fetchNotifications = useCallback(async () => {
        try {
            const [dashRes, requestsRes, reservationsRes] = await Promise.all([
                api.get('dashboard/'),
                api.get('booking-requests/?statut=PENDING'),
                api.get('reservations/?statut=PENDING'),
            ]);

            const alerts = dashRes.data?.alerts || { insurance_expiring: [], visite_expiring: [] };
            const pendingRequests = Array.isArray(requestsRes.data)
                ? requestsRes.data
                : (requestsRes.data?.results || []);
            const pendingReservations = Array.isArray(reservationsRes.data)
                ? reservationsRes.data
                : (reservationsRes.data?.results || []);

            const items = [];

            // 1. Pending Booking Requests
            pendingRequests.forEach(req => {
                items.push({
                    id: `req-${req.id}`,
                    type: 'REQUEST',
                    category: 'Demande Client',
                    title: `Nouvelle demande de réservation #${req.id}`,
                    subtitle: `${req.client_name || req.nom} — ${req.vehicle_name || 'Véhicule'}`,
                    date: req.created_at || req.date_sortie,
                    icon: 'event_note',
                    color: 'bg-primary-light text-primary-deep ring-primary-border/30',
                    link: '/reservations',
                });
            });

            // 2. Pending Client Reservations (créées depuis le compte client)
            pendingReservations.forEach(req => {
                items.push({
                    id: `res-${req.id}`,
                    type: 'REQUEST',
                    category: 'Réservation Client',
                    title: `Nouvelle réservation client #${req.id}`,
                    subtitle: `${req.client_name || 'Client'} — ${req.vehicle_name || 'Véhicule'}`,
                    date: req.created_at || req.date_sortie,
                    icon: 'event_note',
                    color: 'bg-primary-light text-primary-deep ring-primary-border/30',
                    link: '/reservations',
                });
            });

            // 2. Insurance Alerts
            (alerts.insurance_expiring || []).forEach(ins => {
                items.push({
                    id: `ins-${ins.id}`,
                    type: 'INSURANCE',
                    category: 'Échéance Assurance',
                    title: `Assurance expirante : ${ins.marque || 'Véhicule'}`,
                    subtitle: `Matricule ${ins.matricule} — Expire le ${ins.date_assurance}`,
                    date: ins.date_assurance,
                    icon: 'verified_user',
                    color: 'bg-danger-bg text-danger-dark ring-danger-bg',
                    link: `/vehicles/edit/${ins.id}`,
                });
            });

            // 3. Technical Visit Alerts
            (alerts.visite_expiring || []).forEach(vis => {
                items.push({
                    id: `vis-${vis.id}`,
                    type: 'TECHNICAL',
                    category: 'Visite Technique',
                    title: `Visite technique à prévoir : ${vis.marque || 'Véhicule'}`,
                    subtitle: `Matricule ${vis.matricule} — Date : ${vis.date_visite_technique}`,
                    date: vis.date_visite_technique,
                    icon: 'build',
                    color: 'bg-warning-bg text-warning-dark ring-warning-bg',
                    link: `/vehicles/edit/${vis.id}`,
                });
            });

            setNotifications(items);
            if (onCountChange) onCountChange(items.length);
        } catch (err) {
            console.error("Erreur lors de la récupération des notifications", err);
        } finally {
            setLoading(false);
        }
    }, [onCountChange]);

    useEffect(() => {
        fetchNotifications();
        // Refresh notifications every 60 seconds only while the panel is open
        if (!isOpen) return;
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [isOpen, fetchNotifications]);

    const requestWebPush = async () => {
        if (!('Notification' in window)) {
            toast.warning("Votre navigateur ne supporte pas les notifications Web.");
            return;
        }
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
            new Notification("Notifications Krinicar Activées 🚀", {
                body: "Vous recevrez désormais les alerte de réservations et d'assurance en temps réel.",
                icon: "/favicon.ico"
            });
        }
    };

    const filteredItems = notifications.filter(item => {
        if (filterTab === 'REQUESTS') return item.type === 'REQUEST';
        if (filterTab === 'ALERTS') return item.type === 'INSURANCE' || item.type === 'TECHNICAL';
        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-md shadow-primary-border/40">
                            <span className="material-symbols-outlined text-xl">notifications_active</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-900">Centre de Notifications</h3>
                            <p className="text-xs text-slate-500 font-medium">{notifications.length} alerte{notifications.length !== 1 ? 's' : ''} en temps réel</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Web Push Banner */}
                {pushPermission !== 'granted' && (
                    <div className="bg-primary-light border-b border-primary-light p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                            <p className="text-xs font-semibold text-primary-deep">Activer les notifications navigateur ?</p>
                        </div>
                        <button
                            onClick={requestWebPush}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                        >
                            Activer
                        </button>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex bg-slate-100 p-1 mx-6 mt-4 rounded-xl border border-slate-200 shrink-0">
                    <button
                        onClick={() => setFilterTab('ALL')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Toutes ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('REQUESTS')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'REQUESTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Demandes ({notifications.filter(n => n.type === 'REQUEST').length})
                    </button>
                    <button
                        onClick={() => setFilterTab('ALERTS')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${filterTab === 'ALERTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Flotte ({notifications.filter(n => n.type !== 'REQUEST').length})
                    </button>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="text-center py-12 font-bold text-primary">Chargement des notifications...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
                            <p>Aucune notification pour le moment.</p>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    onClose();
                                    navigate(item.link);
                                }}
                                className="bg-white border border-slate-200 hover:border-primary-border hover:shadow-md p-4 rounded-2xl transition-all cursor-pointer group flex items-start gap-3.5"
                            >
                                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center font-bold text-sm ring-1 shrink-0`}>
                                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{item.category}</span>
                                        {item.date && (
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(item.date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors mt-0.5">{item.title}</h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1 truncate">{item.subtitle}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg self-center">chevron_right</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button
                        onClick={fetchNotifications}
                        className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span> Actualiser les notifications
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
