import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import CloseContractModal from './CloseContractModal';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { toast } from './Toast';
import StatusBadge from './ui/StatusBadge';

import { AVATAR_COLORS } from '../utils/avatarColors';

const Contracts = () => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [closeContract, setCloseContract] = useState(null);
    const [printContractId, setPrintContractId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'RESERVE', label: 'Réservation', dot: 'bg-info' },
        { value: 'EN_COURS', label: 'En cours', dot: 'bg-success' },
        { value: 'TERMINE', label: 'Terminé', dot: 'bg-secondary' },
        { value: 'ANNULE', label: 'Annulé', dot: 'bg-danger' },
    ];

    const fetchContracts = async () => {
        try {
            const contracts = await fetchAllPages('contracts/');
            setContracts(contracts);
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
            toast.error("Erreur lors de la génération du PDF.");
        }
    };

    useEffect(() => { fetchContracts(); }, []);

    // Reset to page 1 on filter/search change
    useEffect(() => { setCurrentPage(1); }, [search, activeFilter]);

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

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des opérations...</div>;

    return (
        <div>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card-white w-full max-w-sm rounded-lg shadow-l2 overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center border border-stroke">
                        <div className="w-14 h-14 bg-info-bg rounded-lg flex items-center justify-center mx-auto mb-4 text-primary">
                            <span className="material-symbols-outlined text-2xl">print</span>
                        </div>
                        <h3 className="text-title-lg font-bold text-on-surface mb-1">Imprimer le Contrat</h3>
                        <p className="text-body-sm text-on-surface-variant mb-6 font-medium">Souhaitez-vous inclure le cachet de l'agence sur ce contrat ?</p>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => handleDownloadPDF(printContractId, true)}
                                className="w-full py-2.5 bg-primary hover:bg-primary-deep text-white font-semibold rounded-lg text-label-sm shadow-l1 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Oui, avec Cachet
                            </button>
                            <button
                                onClick={() => handleDownloadPDF(printContractId, false)}
                                className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-lg text-label-sm transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">description</span>
                                Non, sans Cachet
                            </button>
                            <button
                                onClick={() => setPrintContractId(null)}
                                className="w-full py-2 text-on-surface-variant font-medium text-body-sm hover:text-on-surface transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editorial Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Opérations de Flotte</p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>Contrats de Location</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[13px] hover:bg-slate-50 transition-colors"
                        title="Exporter en CSV (Excel)"
                        style={{ color: 'var(--on-surface)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <button
                        onClick={() => navigate('/contracts/new')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--primary-container)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nouveau Contrat
                    </button>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--info-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--info)' }}>car_rental</span>
                    </div>
                    <div>
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{activeRentals}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Contrats Actifs</p>
                    </div>
                    <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>+12%</span>
                </div>

                <div className="p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--secondary-container)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--secondary)' }}>payments</span>
                    </div>
                    <div>
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{totalRevenue} DH</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Chiffre d'Affaires</p>
                    </div>
                    <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>+5.4%</span>
                </div>

                <div className="p-5 flex items-center gap-4" style={{ background: 'var(--primary-container)' }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white/20">
                        <span className="material-symbols-outlined text-[20px] text-white">signature</span>
                    </div>
                    <div>
                        <p className="font-bold text-[22px] leading-tight text-white">{contracts.filter(c => c.statut === 'RESERVE').length}</p>
                        <p className="text-[12px] mt-0.5 text-white/70">Signatures en Attente</p>
                    </div>
                    <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-white/20">À traiter</span>
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
            <div className="overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left">
                        <thead>
                            <tr style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">Client / ID Contrat</th>
                                <th className="px-6 py-4">Véhicule</th>
                                <th className="px-6 py-4">Durée</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Paiement</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                            {paginatedContracts.map((contract, i) => {
                                const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                return (
                                    <tr key={contract.id} className="row hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 font-semibold">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`avatar ${avatarClass}`}>
                                                    {contract.client_initials}
                                                </div>
                                                <div>
                                                    <div className="font-semibold" style={{ color: 'var(--on-surface)' }}>{contract.client_name} {contract.client_prenom}</div>
                                                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>#CTR-{contract.id.toString().padStart(5, '0')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6">
                                            <div className="font-semibold">{contract.vehicle_name}</div>
                                            <div className="font-mono text-[12px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{contract.vehicle_matricule}</div>
                                        </td>
                                        <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                            <div className="text-[13px]">{contract.formatted_dates?.range}</div>
                                            <div className="text-[12px] font-semibold" style={{ color: 'var(--primary-container)' }}>{contract.jours} Jours</div>
                                        </td>
                                        <td className="px-6 font-bold">{contract.montant_total} DH</td>
                                        <td className="px-6">
                                            <StatusBadge status={contract.statut} />
                                        </td>
                                        <td className="px-6">
                                            <StatusBadge
                                                variant={contract.payment_status === 'Paid' ? 'success' : contract.payment_status === 'Partial' ? 'warning' : 'danger'}
                                                label={contract.payment_status === 'Paid' ? 'Payé' : contract.payment_status === 'Partial' ? 'Partiel' : 'Non payé'}
                                            />
                                        </td>
                                        <td className="px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {contract.statut === 'EN_COURS' && (
                                                    <button
                                                        onClick={() => setCloseContract(contract)}
                                                        className="p-2 rounded-token transition-colors"
                                                        style={{ color: 'var(--error-c)', background: 'var(--error-bg)' }}
                                                        title="Clôturer le Contrat"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">lock</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                                                    className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                                                    style={{ color: 'var(--on-surface-variant)' }}
                                                    title="Modifier Contrat"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setPrintContractId(contract.id)}
                                                    className="p-2 rounded-token hover:bg-slate-100 transition-colors"
                                                    style={{ color: 'var(--on-surface-variant)' }}
                                                    title="Générer PDF"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredContracts.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-on-surface-variant">Aucun contrat enregistré.</td>
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

