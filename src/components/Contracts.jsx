import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import CloseContractModal from './CloseContractModal';
import SearchFilterBar from './SearchFilterBar';

const Contracts = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [closeContract, setCloseContract] = useState(null);
    const [printContractId, setPrintContractId] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'EN_COURS', 'RESERVE', 'TERMINE', 'ANNULE'
    const [search, setSearch] = useState('');

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'RESERVE', label: 'Réservation', dot: 'bg-secondary-container' },
        { value: 'EN_COURS', label: 'En cours', dot: 'bg-tertiary-container' },
        { value: 'TERMINE', label: 'Terminé', dot: 'bg-surface-container-highest' },
        { value: 'ANNULE', label: 'Annulé', dot: 'bg-error' },
    ];

    const fetchContracts = async () => {
        try {
            const response = await api.get('contracts/');
            setContracts(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Erreur lors de la récupération des contrats', error);
            setLoading(false);
        }
    };

    const handleCloseSuccess = () => {
        setCloseContract(null);
        setSuccessMsg('✅ Le contrat a été clôturé avec succès.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchContracts();
    };

    const handleDownloadPDF = async (id, withCachet) => {
        try {
            setPrintContractId(null);
            const response = await api.get(`contracts/${id}/print_contract/?with_cachet=${withCachet}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Contrat_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Erreur lors du téléchargement du PDF", error);
            alert("Erreur lors de la génération du PDF.");
        }
    };

    useEffect(() => {
        fetchContracts();
    }, []);

    const statusStyles = {
        'EN_COURS': 'bg-tertiary-container text-on-tertiary-container',
        'TERMINE': 'bg-surface-container-highest text-on-surface-variant',
        'RESERVE': 'bg-secondary-container text-on-secondary-container',
        'ANNULE': 'bg-error-container text-on-error-container',
    };

    const statusLabels = {
        'EN_COURS': 'En cours',
        'TERMINE': 'Terminé',
        'RESERVE': 'Réservé',
        'ANNULE': 'Annulé',
    };

    const paymentStyles = {
        'Paid': 'bg-tertiary-container/20 text-on-tertiary-fixed-variant',
        'Partial': 'bg-secondary-container text-on-secondary-container',
        'Unpaid': 'bg-error-container text-on-error-container',
    };

    // Calcul des KPIs (simplifié)
    const activeRentals = contracts.filter(c => c.statut === 'EN_COURS').length;
    const totalRevenue = contracts.reduce((acc, c) => acc + parseFloat(c.montant_total || 0), 0).toLocaleString();

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des opérations...</div>;

    return (
        <div className="p-0">
            {/* Close Contract Modal */}
            {closeContract && (
                <CloseContractModal
                    contract={closeContract}
                    onClose={() => setCloseContract(null)}
                    onSuccess={handleCloseSuccess}
                />
            )}

            {/* Print Contract Modal */}
            {printContractId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                            <span className="material-symbols-outlined text-3xl">print</span>
                        </div>
                        <h3 className="text-xl font-bold font-headline text-slate-900 mb-2">Imprimer le Contrat</h3>
                        <p className="text-sm text-slate-500 mb-6">Souhaitez-vous inclure le cachet de l'agence sur ce contrat ?</p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => handleDownloadPDF(printContractId, true)}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Oui, avec Cachet
                            </button>
                            <button 
                                onClick={() => handleDownloadPDF(printContractId, false)}
                                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">description</span>
                                Non, sans Cachet
                            </button>
                            <button 
                                onClick={() => setPrintContractId(null)}
                                className="w-full py-2 mt-2 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
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
                    <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Contrats de Location</h1>
                </div>
                <button 
                    onClick={() => navigate('/contracts/new')}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:bg-primary/95 transition-all mt-1"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouveau Contrat
                </button>
            </div>

            {/* KPI Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">Contrats Actifs</span>
                        <span className="material-symbols-outlined text-primary bg-primary/5 p-2 rounded-lg">car_rental</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-primary">{activeRentals}</div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
                        <span className="text-[10px] text-slate-400">vs mois dernier</span>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                        <span className="font-label text-xs text-slate-500 font-bold uppercase tracking-wider">Chiffre d'Affaires</span>
                        <span className="material-symbols-outlined text-primary bg-primary/5 p-2 rounded-lg">payments</span>
                    </div>
                    <div className="font-headline text-4xl font-bold text-primary">{totalRevenue} DH</div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+5.4%</span>
                        <span className="text-[10px] text-slate-400">période actuelle</span>
                    </div>
                </div>
                <div className="col-span-12 md:col-span-4 bg-primary text-white p-6 rounded-xl border-none relative overflow-hidden shadow-lg shadow-primary/20">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-label text-xs text-blue-100 font-bold uppercase tracking-wider">Signatures en Attente</span>
                            <span className="material-symbols-outlined text-white p-2 bg-white/10 rounded-lg">signature</span>
                        </div>
                        <div className="font-headline text-4xl font-bold">14</div>
                        <p className="text-xs text-blue-200 mt-2">Nécessite une action immédiate</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
                <SearchFilterBar
                    placeholder="Rechercher (client, matricule, marque)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={FILTER_OPTIONS}
                    filter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </div>

            {/* Contracts Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Client / ID Contrat</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Véhicule</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Durée</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Montant</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Statut</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Paiement</th>
                                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-extrabold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {contracts
                                .filter(c => activeFilter === 'ALL' || c.statut === activeFilter)
                                .filter(c => {
                                    const q = search.trim().toLowerCase();
                                    if (!q) return true;
                                    return [c.client_name, c.client_prenom, c.vehicle_matricule, c.vehicle_name, String(c.id)]
                                        .filter(Boolean)
                                        .some(v => v.toLowerCase().includes(q));
                                })
                                .map(contract => (
                                <tr key={contract.id} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center font-headline font-bold text-primary">
                                                {contract.client_initials}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-headline font-bold text-slate-900 text-sm">{contract.client_name} {contract.client_prenom}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">#CTR-{contract.id.toString().padStart(5, '0')}</span>
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[contract.statut]}`}>
                                            {statusLabels[contract.statut]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStyles[contract.payment_status]}`}>
                                            {contract.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {contract.statut === 'EN_COURS' && (
                                                <button
                                                    onClick={() => setCloseContract(contract)}
                                                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                                    title="Clôturer le Contrat"
                                                >
                                                    <span className="material-symbols-outlined text-lg">lock</span>
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                className="p-2 text-slate-400 hover:text-primary transition-colors" 
                                                title="Modifier Contrat"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button 
                                                onClick={() => setPrintContractId(contract.id)}
                                                className="p-2 text-slate-400 hover:text-primary transition-colors" 
                                                title="Générer PDF"
                                            >
                                                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-primary transition-colors" title="Paiement">
                                                <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {contracts.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-400">Aucun contrat enregistré.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Analytics & Actions */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-headline text-lg font-bold text-primary">Activité de Location</h3>
                        <span className="text-xs font-semibold text-slate-400">Aperçu Hebdomadaire</span>
                    </div>
                    <div className="bg-white h-64 rounded-xl flex items-end justify-between p-8 gap-4 border border-slate-50 shadow-sm">
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '60%' }}></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '45%' }}></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '85%' }}></div>
                        <div className="flex-1 bg-primary rounded-t-lg relative group transition-all" style={{ height: '100%' }}></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '55%' }}></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '40%' }}></div>
                        <div className="flex-1 bg-primary/10 rounded-t-lg relative group transition-all" style={{ height: '70%' }}></div>
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <h3 className="font-headline text-lg font-bold text-primary mb-4">Actions Urgentes</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl flex items-start gap-4 border border-red-100">
                            <div className="bg-red-600 text-white p-2 rounded-lg">
                                <span className="material-symbols-outlined text-lg">warning</span>
                            </div>
                            <div>
                                <h4 className="font-headline font-bold text-sm text-red-900">Retard de Retour</h4>
                                <p className="text-xs text-red-600 opacity-80 mt-1">Contrat #CTR-00122 - 4 jours de retard</p>
                                <button className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-red-700 bg-white px-3 py-1.5 rounded-lg border border-red-200">Contacter le Client</button>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-4 border border-blue-100">
                            <div className="bg-primary text-white p-2 rounded-lg">
                                <span className="material-symbols-outlined text-lg">calendar_clock</span>
                            </div>
                            <div>
                                <h4 className="font-headline font-bold text-sm text-primary">Fin Demain</h4>
                                <p className="text-xs text-blue-600 opacity-80 mt-1">Toyota Hilux - Client: Heavy Lift Corp</p>
                                <button className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-primary bg-white px-3 py-1.5 rounded-lg border border-blue-200">Préparer l'Inspection</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contracts;
