import { useI18n } from '../i18n/context';
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
import Table from './ui/Table';
import { formatMoney, formatNumber } from '../utils/formatters';

import { AVATAR_COLORS } from '../utils/avatarColors';

const Contracts = () => {
    const { t } = useI18n();
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
        { value: 'ALL', label: t('contracts.filter.all'), dot: 'bg-primary' },
        { value: 'RESERVE', label: t('contracts.filter.reserve'), dot: 'bg-info' },
        { value: 'EN_COURS', label: t('contracts.filter.enCours'), dot: 'bg-success' },
        { value: 'TERMINE', label: t('contracts.filter.termine'), dot: 'bg-secondary' },
        { value: 'ANNULE', label: t('contracts.filter.annule'), dot: 'bg-danger' },
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
        { key: 'montant_total', label: 'Montant Total (MAD)' },
        { key: 'frais_supplementaires', label: 'Frais supplémentaires (MAD)' },
        { key: 'reste_a_payer', label: 'Reste à payer (MAD)' },
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
    const totalRevenue = contracts.reduce((acc, c) => acc + parseFloat(c.montant_total || 0), 0);

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

    if (loading) return <div className="space-y-6"><SkeletonCards count={3} /><SkeletonTable /></div>;

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
                    title={t('contracts.print.title')}
                    subtitle={t('contracts.print.subtitle')}
                    onClose={() => setPrintContractId(null)}
                    footer={(
                        <>
                            <Button variant="secondary" icon="description" onClick={() => handleDownloadPDF(printContractId, false)}>
                                {t('contracts.print.without')}
                            </Button>
                            <Button icon="verified" onClick={() => handleDownloadPDF(printContractId, true)}>
                                {t('contracts.print.with')}
                            </Button>
                        </>
                    )}
                >
                    <div className="flex flex-col items-center gap-3 py-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 44 }}>print</span>
                        <p className="text-label-md text-center text-on-surface-variant">
                            {t('contracts.print.info')}
                        </p>
                    </div>
                </Modal>
            )}

            {/* Editorial Header */}
            <PageHeader
                eyebrow={t('contracts.eyebrow')}
                title={t('contracts.title')}
                actions={(
                    <>
                        <ExportButton
                            data={filteredContracts}
                            filename="contrats_location"
                            columns={EXPORT_COLUMNS}
                            label={t('contracts.exportCsv')}
                        />
                        <Button icon="add" onClick={() => navigate('/contracts/new')}>{t('contracts.new')}</Button>
                    </>
                )}
            />

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    icon="car_rental"
                    iconBg="bg-info-bg"
                    iconColor="text-info"
                    value={activeRentals}
                    label={t('contracts.kpi.active')}
                />
                <MetricCard
                    icon="payments"
                    iconBg="bg-secondary-container"
                    iconColor="text-secondary"
                    value={formatNumber(totalRevenue)}
                    unit="MAD"
                    label={t('contracts.kpi.revenue')}
                />
                <MetricCard
                    icon="signature"
                    tone="primary"
                    value={contracts.filter(c => c.statut === 'RESERVE').length}
                    label={t('contracts.kpi.pending')}
                >
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-white/20">{t('contracts.toProcess')}</span>
                </MetricCard>
            </div>

            {/* Search & Filter */}
            <div className="mb-6">
                <SearchFilterBar
                    placeholder={t('contracts.search')}
                    search={search}
                    onSearchChange={handleSearchChange}
                    options={FILTER_OPTIONS}
                    filter={activeFilter}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Contracts Table */}
            <div className="overflow-hidden">
                <Table
                    caption={t('contracts.caption')}
                    rows={paginatedContracts}
                    emptyTitle={t('contracts.empty')}
                    columns={[
                        {
                            key: 'client_name', label: t('contracts.col.client'),
                            render: (_, contract) => {
                                const idx = paginatedContracts.indexOf(contract);
                                return (
                                    <div className="flex items-center gap-3.5">
                                        <div className={`avatar ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{contract.client_initials}</div>
                                        <div>
                                            <div className="font-semibold text-on-surface">{contract.client_name} {contract.client_prenom}</div>
                                            <div className="text-label-sm font-normal text-text-muted mt-0.5">#CTR-{contract.id.toString().padStart(5, '0')}</div>
                                        </div>
                                    </div>
                                );
                            },
                        },
                        {
                            key: 'vehicle_name', label: t('contracts.col.vehicle'),
                            render: (_, contract) => (
                                <>
                                    <div className="font-semibold">{contract.vehicle_name}</div>
                                    <div className="font-mono text-label-sm text-text-muted">{contract.vehicle_matricule}</div>
                                </>
                            ),
                        },
                        {
                            key: 'jours', label: t('contracts.col.duration'),
                            render: (_, contract) => (
                                <>
                                    <div className="text-label-md text-on-surface-variant">{contract.formatted_dates?.range}</div>
                                    <div className="text-label-sm text-primary">{t('contracts.days', { n: contract.jours })}</div>
                                </>
                            ),
                        },
                        { key: 'montant_total', label: t('contracts.col.amount'), render: (v) => <strong>{formatMoney(v)}</strong> },
                        {
                            key: 'reste_a_payer', label: t('contracts.col.remaining'),
                            render: (v) => (
                                <span className={Number(v) > 0 ? 'font-semibold text-error' : 'text-on-surface-variant'}>
                                    {formatMoney(v ?? 0)}
                                </span>
                            ),
                        },
                        { key: 'statut', label: t('contracts.col.status'), render: (v) => <StatusBadge status={v} /> },
                        {
                            key: 'payment_status', label: t('contracts.col.payment'),
                            render: (v) => (
                                <StatusBadge
                                    variant={v === 'Paid' ? 'success' : v === 'Partial' ? 'warning' : 'danger'}
                                    label={v === 'Paid' ? t('pay.paid') : v === 'Partial' ? t('pay.partial') : t('pay.unpaid')}
                                />
                            ),
                        },
                        {
                            key: 'actions', label: t('contracts.col.actions'), align: 'right',
                            render: (_, contract) => (
                                <div className="flex items-center justify-end gap-1">
                                    {contract.statut === 'EN_COURS' && (
                                        <Button variant="ghost" size="sm" iconOnly icon="lock" className="!text-danger-dark hover:!bg-danger-bg"
                                            aria-label={t('contracts.closeAria', { id: contract.id })} title={t('contracts.close')}
                                            onClick={() => setCloseContract(contract)} />
                                    )}
                                    <Button variant="ghost" size="sm" iconOnly icon="edit"
                                        aria-label={t('contracts.editAria', { id: contract.id })} title={t('contracts.edit')}
                                        onClick={() => navigate(`/contracts/edit/${contract.id}`)} />
                                    <Button variant="ghost" size="sm" iconOnly icon="picture_as_pdf"
                                        aria-label={t('contracts.pdfAria', { id: contract.id })} title={t('contracts.pdf')}
                                        onClick={() => setPrintContractId(contract.id)} />
                                </div>
                            ),
                        },
                    ]}
                />
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

