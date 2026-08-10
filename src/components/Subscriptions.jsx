import React, { useState, useEffect } from 'react';
import api, { fetchAllPages } from '../api';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';

const PLAN_OPTIONS = [
    { value: 'GRATUIT', label: 'Gratuit' },
    { value: 'BASIC', label: 'Basic' },
    { value: 'PRO', label: 'Pro' },
    { value: 'PREMIUM', label: 'Premium' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'CANCELLED', label: 'Annulé' },
];

const STATUS_STYLES = {
    ACTIVE: 'bg-tertiary-container/20 text-on-tertiary-container',
    EXPIRED: 'bg-error-container/30 text-error',
    SUSPENDED: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
};

const statusLabel = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found ? found.label : status;
};

const planLabel = (plan) => {
    const found = PLAN_OPTIONS.find(p => p.value === plan);
    return found ? found.label : plan;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const plus30ISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
};

const Subscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSub, setCurrentSub] = useState({
        agency: '',
        plan: 'BASIC',
        price: '0.00',
        start_date: todayISO(),
        end_date: plus30ISO(),
        status: 'ACTIVE',
    });

    const fetchSubscriptions = async () => {
        try {
            const subscriptions = await fetchAllPages('subscriptions/');
            setSubscriptions(subscriptions);
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors de la récupération des abonnements", error);
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        try {
            const agencies = await fetchAllPages('agencies/');
            setAgencies(agencies);
        } catch (error) {
            console.error("Erreur lors de la récupération des agences", error);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
        fetchAgencies();
    }, []);

    const resetForm = () => {
        setCurrentSub({
            agency: '',
            plan: 'BASIC',
            price: '0.00',
            start_date: todayISO(),
            end_date: plus30ISO(),
            status: 'ACTIVE',
        });
        setIsEditing(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const data = { ...currentSub };
        if (!data.agency) {
            toast.error("Veuillez sélectionner une agence.");
            return;
        }
        data.agency = Number(data.agency);
        if (!data.price) data.price = '0.00';

        try {
            if (isEditing) {
                await api.put(`subscriptions/${currentSub.id}/`, data);
            } else {
                await api.post('subscriptions/', data);
            }
            setShowModal(false);
            fetchSubscriptions();
            toast.success(isEditing ? 'Abonnement mis à jour avec succès.' : 'Abonnement créé avec succès.');
            resetForm();
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error("Erreur lors de l'enregistrement. Vérifiez les données.");
        }
    };

    const handleEdit = (sub) => {
        setCurrentSub({
            id: sub.id,
            agency: String(sub.agency),
            plan: sub.plan,
            price: String(sub.price),
            start_date: sub.start_date,
            end_date: sub.end_date,
            status: sub.status,
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        messageBox.danger("Supprimer cet abonnement ?", "Supprimer l'abonnement", {
            onConfirm: async () => {
                try {
                    await api.delete(`subscriptions/${id}/`);
                    fetchSubscriptions();
                    toast.success('Abonnement supprimé avec succès.');
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des abonnements...</div>;

    return (
        <>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block font-label">Administration Système</span>
                    <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Gestion des Abonnements</h2>
                    <p className="text-sm text-slate-500 mt-2">Abonnements SaaS des agences (plan, période, prix, statut).</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm editorial-shadow hover:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                    Nouvel Abonnement
                </button>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl editorial-shadow overflow-hidden">
                <div className="p-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-slate-50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Agence</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Plan</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Prix / mois</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Période</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {subscriptions.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-sm text-slate-400">
                                        Aucun abonnement pour le moment.
                                    </td>
                                </tr>
                            )}
                            {subscriptions.map(sub => (
                                <tr key={sub.id} className="group hover:bg-surface-container-low/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {(sub.agency_name || 'A')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{sub.agency_name}</p>
                                                <p className="text-[10px] text-slate-500">Abonnement #{sub.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wide">
                                            {planLabel(sub.plan)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-bold text-on-surface">{Number(sub.price).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{sub.start_date}</p>
                                        <p className="text-[10px] text-slate-500">→ {sub.end_date}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[sub.status] || 'bg-slate-100 text-slate-500'}`}>
                                                {statusLabel(sub.status)}
                                            </span>
                                            {sub.is_current && (
                                                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <button onClick={() => handleEdit(sub)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(sub.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden editorial-shadow">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-headline">{isEditing ? "Modifier l'Abonnement" : "Ajouter un Abonnement"}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Agence</label>
                                    <Dropdown
                                        options={agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))}
                                        value={currentSub.agency}
                                        onChange={(v) => setCurrentSub({ ...currentSub, agency: v })}
                                        isSearchable
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Plan</label>
                                    <Dropdown
                                        options={PLAN_OPTIONS}
                                        value={currentSub.plan}
                                        onChange={(v) => setCurrentSub({ ...currentSub, plan: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Prix mensuel (DH)</label>
                                    <input
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={currentSub.price}
                                        onChange={e => setCurrentSub({ ...currentSub, price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Date de début</label>
                                    <input
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        type="date"
                                        value={currentSub.start_date}
                                        onChange={e => setCurrentSub({ ...currentSub, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Date de fin</label>
                                    <input
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        type="date"
                                        value={currentSub.end_date}
                                        onChange={e => setCurrentSub({ ...currentSub, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Statut</label>
                                    <Dropdown
                                        options={STATUS_OPTIONS}
                                        value={currentSub.status}
                                        onChange={(v) => setCurrentSub({ ...currentSub, status: v })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold editorial-shadow hover:scale-[0.98] transition-all"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Subscriptions;
