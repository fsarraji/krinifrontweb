import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import CloseContractModal from './CloseContractModal';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { toast } from './Toast';

const AVATAR_COLORS = [
    'bg-indigo-50 text-indigo-700 ring-indigo-100',
    'bg-purple-50 text-purple-700 ring-purple-100',
    'bg-amber-50 text-amber-700 ring-amber-100',
    'bg-pink-50 text-pink-700 ring-pink-100',
    'bg-cyan-50 text-cyan-700 ring-cyan-100',
    'bg-emerald-50 text-emerald-700 ring-emerald-100',
];

const Contracts = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [closeContract, setCloseContract] = useState(null);
    const [printContractId, setPrintContractId] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-indigo-600' },
        { value: 'RESERVE', label: 'Réservation', dot: 'bg-blue-500' },
        { value: 'EN_COURS', label: 'En cours', dot: 'bg-emerald-500' },
        { value: 'TERMINE', label: 'Terminé', dot: 'bg-slate-400' },
        { value: 'ANNULE', label: 'Annulé', dot: 'bg-rose-500' },
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
        toast.success('Le contrat a été clôturé avec succès.');
        fetchContracts();
    };

    const handleExport = () => {
        exportToCSV(
            filteredContracts,
            'contrats_location',
            [
                { key: 'id', label: 'ID Contrat' },
                { key: 'client_name', label: 'Nom Client' },
                { key: 'client_prenom', label: 'Prénom Client' },
                { key: 'vehicle_name', label: 'Véhicule' },
                { key: 'vehicle_matricule', label: 'Matricule' },
                { key: 'jours', label: 'Durée (Jours)' },
                { key: 'montant_total', label: 'Montant Total (DH)' },
                { key: 'statut', label: 'Statut Contrat' },
                { key: 'payment_status', label: 'Statut Paiement' },
            ]
        );
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

    useEffect(() => { fetchContracts(); }, []);

    // Reset to page 1 on filter/search change
    useEffect(() => { setCurrentPage(1); }, [search, activeFilter]);

    const statusStyles = {
        'EN_COURS': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        'TERMINE': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
        'RESERVE': 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
        'ANNULE': 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
    };

    const statusLabels = {
        'EN_COURS': 'En cours',
        'TERMINE': 'Terminé',
        'RESERVE': 'Réservé',
        'ANNULE': 'Annulé',
    };

    const paymentStyles = {
        'Paid': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        'Partial': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
        'Unpaid': 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
    };

    const activeRentals = contracts.filter(c => c.statut === 'EN_COURS').length;
    const totalRevenue = contracts.reduce((acc, c) => acc + parseFloat(c.montant_total || 0), 0).toLocaleString();

    const filteredContracts = contracts
        .filter(c => activeFilter === 'ALL' || c.statut === activeFilter)
        .filter(c => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return [c.client_name, c.client_prenom, c.vehicle_matricule, c.vehicle_name, String(c.id)]
                .filter(Boolean)
                .some(v => v.toLowerCase().includes(q));
        });

    const paginatedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (loading) return <div className="text-center mt-20 font-bold text-indigo-600">Chargement des opérations...</div>;

    return (
        <div className="flex flex-col gap-6">
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
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 ring-1 ring-indigo-100">
                            <span className="material-symbols-outlined text-2xl">print</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Imprimer le Contrat</h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium">Souhaitez-vous inclure le cachet de l'agence sur ce contrat ?</p>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => handleDownloadPDF(printContractId, true)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200/50 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Oui, avec Cachet
                            </button>
                            <button
                                onClick={() => handleDownloadPDF(printContractId, false)}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">description</span>
                                Non, sans Cachet
                            </button>
                            <button
                                onClick={() => setPrintContractId(null)}
                                className="w-full py-2 text-slate-400 font-medium text-xs hover:text-slate-600 transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {successMsg && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    {successMsg}
                </div>
            )}

            {/* Editorial Header */}
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Opérations de Flotte</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contrats de Location</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                        title="Exporter en CSV (Excel)"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <button
                        onClick={() => navigate('/contracts/new')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nouveau Contrat
                    </button>
                </div>
            </div>

            {/* KPI Architecture (Compact Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-lg text-lg ring-1 ring-indigo-100">car_rental</span>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrats Actifs</p>
                            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{activeRentals}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +12%
                    </div>
                </div>

                <div className="bg-white border border-slate-200 px-5 py-3 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-indigo-600 bg-indigo-50 p-2 rounded-lg text-lg ring-1 ring-indigo-100">payments</span>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chiffre d'Affaires</p>
                            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{totalRevenue} DH</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +5.4%
                    </div>
                </div>

                <div className="bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-sm flex items-center justify-between relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                        <span className="material-symbols-outlined text-white p-2 bg-white/10 rounded-lg text-lg">signature</span>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Signatures en Attente</p>
                            <p className="text-lg font-extrabold mt-0.5">{contracts.filter(c => c.statut === 'RESERVE').length}</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold bg-white/10 px-2.5 py-0.5 rounded-full text-indigo-100 relative z-10">À traiter</span>
                </div>
            </div>

            {/* Search & Filter */}
            <div>
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
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client / ID Contrat</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Véhicule</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Durée</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Montant</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Paiement</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {paginatedContracts.map((contract, i) => {
                                const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                return (
                                    <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-xl ${avatarClass} flex items-center justify-center font-bold text-sm ring-1`}>
                                                    {contract.client_initials}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{contract.client_name} {contract.client_prenom}</div>
                                                    <div className="text-xs text-slate-500 font-medium mt-0.5">#CTR-{contract.id.toString().padStart(5, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-slate-900">{contract.vehicle_name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{contract.vehicle_matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-800">{contract.formatted_dates?.range}</div>
                                            <div className="text-xs font-semibold text-indigo-600 mt-0.5">{contract.jours} Jours</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{contract.montant_total} DH</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${statusStyles[contract.statut]}`}>
                                                {statusLabels[contract.statut] || contract.statut}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-[11px] leading-5 font-bold rounded-full ${paymentStyles[contract.payment_status]}`}>
                                                {contract.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {contract.statut === 'EN_COURS' && (
                                                    <button
                                                        onClick={() => setCloseContract(contract)}
                                                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                                        title="Clôturer le Contrat"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">lock</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                    title="Modifier Contrat"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setPrintContractId(contract.id)}
                                                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                    title="Générer PDF"
                                                >
                                                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredContracts.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-slate-400">Aucun contrat enregistré.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredContracts.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </div>
        </div>
    );
};

export default Contracts;
