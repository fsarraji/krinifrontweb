import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { useI18n } from '../i18n/context';
import { Link, useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';
import MenuButton from './ui/MenuButton';
import ClientInfoModal from './ui/ClientInfoModal';
import { messageBox } from './MessageBox';
import { toast } from './Toast';
import PageHeader from './ui/PageHeader';
import Button from './ui/Button';
import MetricCard from './ui/MetricCard';
import ExportButton from './ui/ExportButton';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';
import Table from './ui/Table';

const PAGE_SIZE_DEFAULT = 10;

import { AVATAR_COLORS } from '../utils/avatarColors';
import { getRole } from '../utils/userRole';

const getInitials = (prenom, nom) => {
    const first = (prenom || '').charAt(0) || '';
    const second = (nom || '').charAt(0) || '';
    return (first + second).toUpperCase() || '?';
};

const Clients = () => {
    const { t: tr } = useI18n();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [allClients, setAllClients] = useState([]); // for stats calculation
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterMode, setFilterMode] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [count, setCount] = useState(0);

    const [menuId, setMenuId] = useState(null);
    const [infoClient, setInfoClient] = useState(null);
    const requestSeq = useRef(0);

    const isSuperAdmin = getRole() === 'SUPERADMIN';

    const FILTER_OPTIONS = [
        { value: 'ALL', label: tr('clients.filter.all'), dot: 'bg-primary' },
        { value: 'REGULAR', label: tr('clients.filter.regular'), dot: 'bg-success' },
        { value: 'BLACKLIST', label: tr('clients.filter.blacklist'), dot: 'bg-danger' },
        ...(isSuperAdmin ? [{ value: 'DELETED', label: tr('clients.filter.deleted'), dot: 'bg-secondary' }] : []),
    ];

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filterMode]);

    // Fetch overall stats once or on update
    const fetchAllClientsStats = async () => {
        try {
            const data = await fetchAllPages('clients/', { page_size: 1000 });
            setAllClients(data);
        } catch (err) {
            console.error("Erreur stats clients", err);
        }
    };

    const fetchClients = useCallback(async (p) => {
        const seq = ++requestSeq.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('page_size', String(pageSize));
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (filterMode === 'BLACKLIST') params.set('liste_noire', 'true');
            if (filterMode === 'REGULAR') params.set('liste_noire', 'false');
            if (filterMode === 'DELETED') {
                params.set('include_deleted', '1');
                params.set('is_deleted', 'true');
            }

            const response = await api.get(`clients/?${params.toString()}`);
            if (seq !== requestSeq.current) return; // ignore une réponse périmée

            const data = response.data;
            const results = Array.isArray(data) ? data : (data.results || []);
            setClients(results);
            // data est déjà le tableau "results" (l'intercepteur attache count dessus),
            // donc on lit data.count pour le vrai total, sinon on retombe sur la page courante.
            setCount(data.count ?? results.length);

            // Si la page courante n'existe plus (ex. suppression sur la dernière page),
            // on rebascule sur la dernière page valide.
            if (results.length === 0 && p > 1 && (data.count ?? results.length) > 0) {
                setPage(Math.max(1, Math.ceil((data.count ?? results.length) / pageSize)));
                return;
            }
            setPage(p);
        } catch (error) {
            if (seq !== requestSeq.current) return;
            console.error("Erreur lors de la récupération des clients", error);
            setClients([]);
            setCount(0);
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, [debouncedSearch, filterMode, pageSize]);

    useEffect(() => {
        fetchAllClientsStats();
    }, []);

    useEffect(() => {
        fetchClients(page);
    }, [fetchClients, page]);

    // KPI Metrics calculation
    const totalCount = allClients.length || count;
    const blacklistedCount = allClients.filter(c => c.liste_noire).length;
    const activeCount = totalCount - blacklistedCount;
    const withEmailCount = allClients.filter(c => c.email).length;

    const EXPORT_COLUMNS = [
        { key: 'prenom', label: tr('u.prnom') },
        { key: 'nom', label: tr('u.nom') },
        { key: 'telephone', label: tr('u.tlphone') },
        { key: 'email', label: tr('u.email') },
        { key: 'cin_passport', label: tr('u.cin_passeport') },
        { key: 'date_expiration_cin', label: tr('u.expiration_cin') },
        { key: 'permis_conduite', label: tr('u.permis_de_conduire') },
        { key: 'nationalite', label: tr('u.nationalit') },
        { key: 'sexe', label: tr('u.sexe') },
        { key: 'ville', label: tr('u.ville') },
        { key: 'pays', label: tr('u.pays') },
        { key: 'liste_noire', label: tr('u.liste_noire_2') },
    ];

    const handleDelete = (c) => {
        messageBox.danger(
            tr('u.le_client_sera_retir_de_l_annuai', { name: `${c.prenom} ${c.nom}` }),
            tr('u.confirmer_la_suppression'),
            {
                confirmText: tr('clients.menu.delete'),
                onConfirm: async () => {
                    try {
                        await api.patch(`clients/${c.id}/`, { is_deleted: true });
                        toast.success(tr('u.client_supprim'));
                        fetchClients(page);
                        fetchAllClientsStats();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || tr('u.impossible_de_supprimer_le_clien'));
                    }
                },
            }
        );
    };

    const handleRestore = (c) => {
        messageBox.confirm(
            tr('u.restaurer_le_client_il_rapparatr', { name: `${c.prenom} ${c.nom}` }),
            tr('u.restaurer_le_client'),
            {
                confirmText: tr('clients.menu.restore'),
                onConfirm: async () => {
                    try {
                        await api.patch(`clients/${c.id}/`, { is_deleted: false });
                        toast.success(tr('u.client_restaur'));
                        fetchClients(page);
                        fetchAllClientsStats();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || tr('u.impossible_de_restaurer_le_clien'));
                    }
                },
            }
        );
    };

    const buildMenuItems = (c) => {
        const items = [
            { key: 'info', icon: 'info', label: tr('clients.menu.info'), onClick: () => setInfoClient(c) },
        ];
        if (c.is_deleted) {
            items.push({ key: 'restaurer', icon: 'unarchive', label: tr('clients.menu.restore'), color: 'var(--success)', onClick: () => handleRestore(c) });
        } else {
            items.push({ key: 'editer', icon: 'edit', label: tr('clients.menu.edit'), onClick: () => navigate(`/clients/edit/${c.id}`) });
            items.push({ key: 'supprimer', icon: 'delete', label: tr('clients.menu.delete'), color: 'var(--danger)', destructive: true, onClick: () => handleDelete(c) });
        }
        return items;
    };

    const ClientStatus = ({ client }) => (
        client.is_deleted ? (
            <StatusBadge variant="danger" label={tr('clients.status.deleted')} />
        ) : client.liste_noire ? (
            <StatusBadge variant="danger" label={tr('clients.status.blacklist')} />
        ) : (
            <StatusBadge variant="success" label={tr('clients.status.active')} />
        )
    );

    return (
        <div>
            {/* Header */}
            <PageHeader
                eyebrow={tr('clients.eyebrow')}
                title={tr('clients.title')}
                actions={(
                    <>
                        <ExportButton
                            data={allClients.length ? allClients : clients}
                            filename="annuaire_clients"
                            columns={EXPORT_COLUMNS}
                            label={tr('contracts.exportCsv')}
                        />
                        <Button icon="person_add" onClick={() => navigate('/clients/add')}>
                            {tr('clients.new')}
                        </Button>
                    </>
                )}
            />

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <MetricCard icon="group" iconBg="bg-info-bg" iconColor="text-info" value={totalCount} label={tr('clients.kpi.total')} />
                <MetricCard icon="verified_user" iconBg="bg-success-bg" iconColor="text-success" value={activeCount} label={tr('clients.kpi.eligible')} />
                <MetricCard icon="block" tone="danger" value={blacklistedCount} label={tr('clients.kpi.blacklist')} />
                <MetricCard icon="badge" iconBg="bg-secondary-container" iconColor="text-secondary" value={withEmailCount} label={tr('clients.kpi.complete')} />
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
                <div className="flex-1">
                    <SearchFilterBar
                        placeholder={tr('clients.search')}
                        search={search}
                        onSearchChange={setSearch}
                        options={FILTER_OPTIONS}
                        filter={filterMode}
                        onFilterChange={setFilterMode}
                    />
                </div>

                {/* View switcher */}
                <div className="shrink-0">
                    <SegmentedControl label={tr('clients.view.table')} value={viewMode} onChange={setViewMode}>
                        <SegmentedControlItem value="table" icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>table_rows</span>} label={tr('clients.view.table')} />
                        <SegmentedControlItem value="grid" icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>grid_view</span>} label={tr('clients.view.grid')} />
                    </SegmentedControl>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="card rounded-token overflow-hidden shadow-l1 flex flex-col">
                {loading ? (
                    <div className="p-16 flex items-center justify-center"><Spinner size={28} /></div>
                ) : clients.length === 0 ? (
                    <EmptyState icon="person_off" title={tr('clients.empty')} />
                ) : viewMode === 'table' ? (
                    <Table
                        className="!border-0 !rounded-none flex-1"
                        caption={tr('clients.caption')}
                        rows={clients}
                        columns={[
                            {
                                key: 'nom', label: tr('clients.col.client'),
                                render: (_, client) => {
                                    const i = clients.indexOf(client);
                                    return (
                                        <div className="flex items-center gap-3.5">
                                            <div className={`avatar ${client.is_deleted ? 'bg-slate-100 text-slate-500 ring-slate-100' : AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                                                {getInitials(client.prenom, client.nom)}
                                            </div>
                                            <div>
                                                <Link to={`/clients/edit/${client.id}`} className="font-semibold text-on-surface hover:underline">
                                                    {client.prenom} {client.nom}
                                                </Link>
                                                {(client.ville || client.pays) && (
                                                    <p className="text-label-sm font-normal text-text-muted mt-0.5">{client.ville}{client.pays ? `, ${client.pays}` : ''}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                },
                            },
                            {
                                key: 'telephone', label: tr('clients.col.contact'), className: 'text-on-surface-variant',
                                render: (v, client) => (
                                    <>
                                        <div className="font-medium">{v}</div>
                                        {client.email ? (
                                            <div className="text-label-sm truncate max-w-[200px] opacity-70">{client.email}</div>
                                        ) : (
                                            <div className="text-label-sm italic opacity-50">{tr('clients.noEmail')}</div>
                                        )}
                                    </>
                                ),
                            },
                            { key: 'cin_passport', label: tr('clients.col.cin'), className: 'text-on-surface-variant', render: (v) => <span className="font-mono text-label-sm font-bold">{v}</span> },
                            { key: 'permis_conduite', label: tr('clients.col.license'), className: 'text-on-surface-variant', render: (v) => <span className="font-mono text-label-sm">{v || '—'}</span> },
                            { key: 'statut', label: tr('clients.col.status'), render: (_, client) => <ClientStatus client={client} /> },
                            {
                                key: 'actions', label: tr('clients.col.actions'), align: 'right',
                                render: (_, client) => (
                                    <div className="flex items-center justify-end gap-1">
                                        <MenuButton item={client} items={buildMenuItems(client)} menuId={menuId} setMenuId={setMenuId} />
                                    </div>
                                ),
                            },
                        ]}
                    />
                ) : (
                    /* Grid View */
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map((client, i) => {
                            const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                            return (
                                <div
                                    key={client.id}
                                    className="bg-card-white rounded-lg p-5 border border-stroke hover:shadow-l2 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${client.is_deleted ? 'bg-slate-100 text-slate-500 ring-slate-100' : avatarClass}`}>
                                                    {getInitials(client.prenom, client.nom)}
                                                </div>
                                                <div>
                                                    <h3 className="text-label-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                                                        {client.prenom} {client.nom}
                                                    </h3>
                                                    <p className="text-label-md text-on-surface-variant">#{client.cin_passport}</p>
                                                </div>
                                            </div>
                                            <ClientStatus client={client} />
                                        </div>

                                        <div className="space-y-2 text-label-md text-on-surface-variant border-t border-stroke pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">call</span> {tr('clients.card.phone')}
                                                </span>
                                                <span className="font-semibold text-on-surface">{client.telephone}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">badge</span> {tr('clients.card.license')}
                                                </span>
                                                <span className="font-mono font-semibold text-on-surface">{client.permis_conduite || '—'}</span>
                                            </div>
                                            {client.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">mail</span> {tr('clients.card.email')}
                                                    </span>
                                                    <span className="font-medium text-on-surface truncate max-w-[150px]">{client.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-stroke flex items-center justify-between">
                                        {!client.is_deleted ? (
                                            <Link
                                                to={`/clients/edit/${client.id}`}
                                                className="text-label-sm font-bold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                                            >
                                                {tr('clients.card.manage')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </Link>
                                        ) : <span />}
                                        <MenuButton item={client} items={buildMenuItems(client)} menuId={menuId} setMenuId={setMenuId} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Footer */}
                {count > 0 && (
                    <Pagination
                        currentPage={page}
                        totalItems={count}
                        pageSize={pageSize}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    />
                )}
            </div>

            <ClientInfoModal isOpen={!!infoClient} client={infoClient} onClose={() => setInfoClient(null)} />
        </div>
    );
};

export default Clients;
