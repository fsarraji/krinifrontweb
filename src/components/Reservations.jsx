import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import CloseContractModal from './CloseContractModal';
import ActivateReservationModal from './ActivateReservationModal';

const REQUEST_STATUS_META = {
    PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    CONFIRMED: { label: 'Confirmée', className: 'bg-green-50 text-green-700' },
    CANCELLED: { label: 'Annulée', className: 'bg-red-50 text-red-600' },
};

const Reservations = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState('demandes');
    const [contracts, setContracts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMsg, setSuccessMsg] = useState('');
    const [busyId, setBusyId] = useState(null);

    const fetchAll = async () => {
        try {
            const [contractsRes, requestsRes] = await Promise.all([
                api.get('contracts/?page_size=500'),
                api.get('reservations/?page_size=500'),
            ]);
            const contractData = contractsRes.data?.results ?? contractsRes.data ?? [];
            const requestData = requestsRes.data?.results ?? requestsRes.data ?? [];
            setContracts(Array.isArray(contractData) ? contractData : []);
            setRequests(Array.isArray(requestData) ? requestData : []);
            setLoading(false);
        } catch (error) {
            console.error('Erreur lors de la récupération des réservations', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    const openActivateModal = (contract) => {
        setSelectedContract(contract);
        setIsActivateModalOpen(true);
    };

    const handleActivated = () => {
        setSuccessMsg('🚀 La réservation a été activée ! Le véhicule est maintenant loué.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchAll();
    };

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirmer cette demande de réservation ? Un contrat (Réservé) sera créé.')) return;
        setBusyId(id);
        try {
            await api.post(`reservations/${id}/confirm/`, {});
            setSuccessMsg('✅ Réservation confirmée. Le contrat en statut Réservé a été créé.');
            setTimeout(() => setSuccessMsg(''), 5000);
            fetchAll();
        } catch (error) {
            console.error("Erreur lors de la confirmation", error);
            alert(error.response?.data?.detail || "Erreur lors de la confirmation de la réservation.");
        } finally {
            setBusyId(null);
        }
    };

    const handleRefuse = async (id) => {
        if (!window.confirm('Refuser cette demande de réservation ?')) return;
        setBusyId(id);
        try {
            await api.patch(`reservations/${id}/`, { statut: 'CANCELLED' });
            fetchAll();
        } catch (error) {
            console.error("Erreur lors du refus", error);
            alert(error.response?.data?.detail || "Erreur lors du refus de la réservation.");
        } finally {
            setBusyId(null);
        }
    };

    const handleDownloadPDF = async (id) => {
        try {
            const response = await api.get(`contracts/${id}/print_reservation_receipt/`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Recu_Reservation_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erreur lors du téléchargement du PDF", error);
            alert("Erreur lors de la génération du PDF.");
        }
    };

    const reservations = contracts.filter(c => c.statut === 'RESERVE');
    const pendingRequests = requests.filter(r => r.statut === 'PENDING');

    const paymentStyles = {
        'Paid': 'bg-tertiary-container/20 text-on-tertiary-fixed-variant',
        'Partial': 'bg-secondary-container text-on-secondary-container',
        'Unpaid': 'bg-error-container text-on-error-container',
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des réservations...</div>;

    return (
        <div className="p-0">
            {successMsg && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                </div>
            )}

            {/* Editorial Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex flex-col">
                    <span className="font-label text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-1">Opérations de Flotte</span>
                    <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Réservations</h1>
                </div>
                <button
                    onClick={() => navigate('/reservations/new')}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:bg-primary/95 transition-all mt-1"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouvelle Réservation
                </button>
            </div>

            {/* KPI Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">Demandes Clients à Valider</span>
                        <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-lg">mark_email_unread</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-amber-600">{pendingRequests.length}</div>
                    <p className="text-xs text-slate-400 mt-2">En attente de validation par l'agence</p>
                </div>
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">Réservations en Attente</span>
                        <span className="material-symbols-outlined text-secondary bg-secondary/5 p-2 rounded-lg">event_note</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-secondary">{reservations.length}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => setTab('demandes')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'demandes' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    Demandes Clients
                    {pendingRequests.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{pendingRequests.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setTab('reservations')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'reservations' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    Réservations en Attente
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{reservations.length}</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-50">
                <div className="overflow-x-auto">
                    {tab === 'demandes' ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Véhicule</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Dates Demandées</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Prix / Jour</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Statut</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {requests.map(request => {
                                    const meta = REQUEST_STATUS_META[request.statut] || REQUEST_STATUS_META.PENDING;
                                    const busy = busyId === request.id;
                                    return (
                                        <tr key={request.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-headline font-bold text-primary">
                                                        {(request.client_name || '?').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-headline font-bold text-slate-900 text-sm">{request.client_name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">#RES-{request.id.toString().padStart(5, '0')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-body font-semibold text-sm">{request.vehicle_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-slate-900 font-medium">{request.formatted_dates?.range}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-headline font-bold text-sm text-primary">{request.prix_par_jour} DH</td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {request.statut === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleRefuse(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        >
                                                            Refuser
                                                        </button>
                                                        <button
                                                            onClick={() => handleConfirm(request.id)}
                                                            disabled={busy}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                        >
                                                            {busy ? '...' : 'Confirmer'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Aucune demande de réservation client.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client / ID</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Véhicule</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Dates de Réservation</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Montant Total</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Paiement</th>
                                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold text-right">Actions rapides</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reservations.map(contract => (
                                    <tr key={contract.id} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-headline font-bold text-primary">
                                                    {contract.client_initials}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-headline font-bold text-slate-900 text-sm">{contract.client_name} {contract.client_prenom}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">#RES-{contract.id.toString().padStart(5, '0')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-body font-semibold text-sm">{contract.vehicle_name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{contract.vehicle_matricule}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-slate-900 font-medium">{contract.formatted_dates.range}</span>
                                                <span className="text-slate-500 italic">{contract.jours} Jours</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-headline font-bold text-sm text-primary">{contract.montant_total} DH</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStyles[contract.payment_status]}`}>
                                                {contract.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openActivateModal(contract)}
                                                    className="p-2 text-green-500 hover:text-green-700 transition-colors bg-green-50 rounded-lg"
                                                    title="Activer la Réservation (Transformer en Location En Cours)"
                                                >
                                                    <span className="material-symbols-outlined text-lg">play_circle</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    title="Modifier la Réservation"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(contract.id)}
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                    title="Générer PDF de la Réservation"
                                                >
                                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reservations.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-slate-400">Aucune réservation en attente.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ActivateReservationModal
                isOpen={isActivateModalOpen}
                onClose={() => setIsActivateModalOpen(false)}
                contract={selectedContract}
                onActivated={handleActivated}
            />
        </div>
    );
};

export default Reservations;
