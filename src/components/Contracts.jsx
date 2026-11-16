import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import CloseContractModal from './CloseContractModal';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { toast } from './Toast';
import StatusBadge from './ui/StatusBadge';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import MetricCard from './ui/MetricCard';
import ExportButton from './ui/ExportButton';
import Modal from './ui/Modal';

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
    const [reloadKey, setReloadKey] = useState(0);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: 'Tous', dot: 'bg-primary' },
        { value: 'RESERVE', label: 'Réservation', dot: 'bg-info' },
        { value: 'EN_COURS', label: 'En cours', dot: 'bg-success' },
        { value: 'TERMINE', label: 'Terminé', dot: 'bg-secondary' },
        { value: 'ANNULE', label: 'Annulé', dot: 'bg-danger' },
    ];

    const handleCloseSuccess = () => {
        setCloseContract(null);
        toast.success('Le contrat a été clôturé avec succès.');
        fetchContracts();
    };

    const EXPORT_COLUMNS = [
        { key: 'id', label: 'ID Contrat' },
        { key: 'client_name', label: 'Nom Client' },
        { key: 'client_prenom', label: 'Prénom Client' },
        { key: 'vehicle_name', label: 'Véhicule' },
        { key: 'vehicle_matricule', label: 'Matricule' },
        { key: 'jours', label: 'Durée (Jours)' },
        { key: 'montant_total', label: 'Montant Total (DH)' },
        { key: 'statut', label: 'Statut Contrat' },
        { key: 'payment_status', label: 'Statut Paiement' },
    ];

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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await fetchAllPages('contracts/');
                if (!cancelled) setContracts(data);
            } catch (error) {
                console.error('Erreur lors de la récupération des contrats', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const fetchContracts = () => setReloadKey((k) => k + 1);

    const handleSearchChange = (value) => { setSearch(value); setCurrentPage(1); };
    const handleFilterChange = (value) => { setActiveFilter(value); setCurrentPage(1); };

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
                <Modal
                    isOpen
                    size="sm"
                    title="Imprimer le Contrat"
                    subtitle="Souhaitez-vous inclure le cachet de l'agence sur ce contrat ?"
                    onClose={() => setPrintContractId(null)}
                    footer={(
                        <>
                            <Button variant="secondary" icon="description" onClick={() => handleDownloadPDF(printContractId, false)}>
                                Sans cachet
                            </Button>
                            <Button icon="verified" onClick={() => handleDownloadPDF(printContractId, true)}>
                                Avec cachet
                            </Button>
                        </>
                    )}
                >
                    <div className="flex flex-col items-center gap-3 py-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 44 }}>print</span>
                        <p className="text-label-md text-center text-on-surface-variant">
                            Le PDF du contrat sera téléchargé avec ou sans cachet de l'agence.
                        </p>
                    </div>
                </Modal>
            )}

            {/* Editorial Header */}
            <PageHeader
                eyebrow="Opérations de Flotte"
                title="Contrats de Location"
                actions={(
                    <>
                        <ExportButton
                            data={filteredContracts}
                            filename="contrats_location"
                            columns={EXPORT_COLUMNS}
                            label="Exporter (CSV)"
                        />
                        <Button icon="add" onClick={() => navigate('/contracts/new')}>Nouveau Contrat</Button>
                    </>
                )}
            />

            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <MetricCard
                    icon="car_rental"
                    iconBg="bg-info-bg"
                    iconColor="text-info"
                    value={activeRentals}
                    label="Contrats Actifs"
                    trend={{ value: '+12%', positive: true }}
                />
                <MetricCard
                    icon="payments"
                    iconBg="bg-secondary-container"
                    iconColor="text-secondary"
                    value={totalRevenue}
                    unit="DH"
                    label="Chiffre d'Affaires"
                    trend={{ value: '+5.4%', positive: true }}
                />
                <MetricCard
                    icon="signature"
                    tone="primary"
                    value={contracts.filter(c => c.statut === 'RESERVE').length}
                    label="Signatures en Attente"
                >
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-white/20">À traiter</span>
                </MetricCard>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
                <SearchFilterBar
                    placeholder="Rechercher (client, matricule, marque)..."
                    search={search}
                    onSearchChange={handleSearchChange}
                    options={FILTER_OPTIONS}
                    filter={activeFilter}
                    onFilterChange={handleFilterChange}
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

