import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import StatusBadge from './ui/StatusBadge';
import MenuButton from './ui/MenuButton';
import ClientInfoModal from './ui/ClientInfoModal';
import { messageBox } from './MessageBox';
import { toast } from './Toast';

const PAGE_SIZE_DEFAULT = 10;

import { AVATAR_COLORS } from '../utils/avatarColors';
import { getRole } from '../utils/userRole';

const getInitials = (prenom, nom) => {
    const first = (prenom || '').charAt(0) || '';
    const second = (nom || '').charAt(0) || '';
    return (first + second).toUpperCase() || '?';
};

const Clients = () => {
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
        { value: 'ALL', label: 'Tous les clients', dot: 'bg-primary' },
        { value: 'REGULAR', label: 'Clients réguliers', dot: 'bg-success' },
        { value: 'BLACKLIST', label: 'Liste noire', dot: 'bg-danger' },
        ...(isSuperAdmin ? [{ value: 'DELETED', label: 'Supprimés', dot: 'bg-secondary' }] : []),
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

    const handleExport = () => {
        exportToCSV(
            allClients.length ? allClients : clients,
            'annuaire_clients',
            [
                { key: 'prenom', label: 'Prénom' },
                { key: 'nom', label: 'Nom' },
                { key: 'telephone', label: 'Téléphone' },
                { key: 'email', label: 'Email' },
                { key: 'cin_passport', label: 'CIN / Passeport' },
                { key: 'date_expiration_cin', label: 'Expiration CIN' },
                { key: 'permis_conduite', label: 'Permis de conduire' },
                { key: 'nationalite', label: 'Nationalité' },
                { key: 'sexe', label: 'Sexe' },
                { key: 'ville', label: 'Ville' },
                { key: 'pays', label: 'Pays' },
                { key: 'liste_noire', label: 'Liste Noire' },
            ]
        );
    };

    const handleDelete = (c) => {
        messageBox.danger(
            `Le client ${c.prenom} ${c.nom} sera retiré de l'annuaire et ne sera plus visible. Il pourra être restauré par le super admin.`,
            'Confirmer la suppression',
            {
                confirmText: 'Supprimer',
                onConfirm: async () => {
                    try {
                        await api.patch(`clients/${c.id}/`, { is_deleted: true });
                        toast.success('Client supprimé.');
                        fetchClients(page);
                        fetchAllClientsStats();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || 'Impossible de supprimer le client.');
                    }
                },
            }
        );
    };

    const handleRestore = (c) => {
        messageBox.confirm(
            `Restaurer le client ${c.prenom} ${c.nom} ? Il réapparaîtra dans l'annuaire.`,
            'Restaurer le client',
            {
                confirmText: 'Restaurer',
                onConfirm: async () => {
                    try {
                        await api.patch(`clients/${c.id}/`, { is_deleted: false });
                        toast.success('Client restauré.');
                        fetchClients(page);
                        fetchAllClientsStats();
                    } catch (err) {
                        toast.error(err.response?.data?.detail || 'Impossible de restaurer le client.');
                    }
                },
            }
        );
    };

    const buildMenuItems = (c) => {
        const items = [
            { key: 'info', icon: 'info', label: 'Informations', onClick: () => setInfoClient(c) },
        ];
        if (c.is_deleted) {
            items.push({ key: 'restaurer', icon: 'unarchive', label: 'Restaurer', color: 'var(--success)', onClick: () => handleRestore(c) });
        } else {
            items.push({ key: 'editer', icon: 'edit', label: 'Éditer', onClick: () => navigate(`/clients/edit/${c.id}`) });
            items.push({ key: 'supprimer', icon: 'delete', label: 'Supprimer', color: 'var(--danger)', destructive: true, onClick: () => handleDelete(c) });
        }
        return items;
    };

    const ClientStatus = ({ client }) => (
        client.is_deleted ? (
            <StatusBadge variant="danger" label="Supprimé" />
        ) : client.liste_noire ? (
            <StatusBadge variant="danger" label="LISTE NOIRE" />
        ) : (
            <StatusBadge variant="success" label="ACTIF" />
        )
    );

    return (
        <div>
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Annuaire & Portefeuille</p>
                    <h2 className="font-bold text-[32px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>Gestion des Clients</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[13px] card hover:bg-slate-50 transition-colors shadow-l1"
                        title="Exporter en CSV (Excel)"
                        style={{ color: 'var(--on-surface)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>Exporter (CSV)</span>
                    </button>
                    <Link
                        to="/clients/add"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-token font-semibold text-[14px] text-white hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--primary-container)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        <span>Nouveau Client</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="card rounded-token p-5 shadow-l1 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--info-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--info)' }}>group</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{totalCount}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Total Clients</p>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--success-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--success)' }}>verified_user</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{activeCount}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Clients Éligibles</p>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--error-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--error-c)' }}>block</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{blacklistedCount}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Liste Noire</p>
                    </div>
                </div>

                <div className="card rounded-token p-5 shadow-l1 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--secondary-container)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--secondary)' }}>badge</span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-[22px] leading-tight" style={{ color: 'var(--on-surface)' }}>{withEmailCount}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Fiches Complètes</p>
                    </div>
                </div>
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
                <div className="flex-1">
                    <SearchFilterBar
                        placeholder="Rechercher (nom, prénom, CIN, téléphone, permis)..."
                        search={search}
                        onSearchChange={setSearch}
                        options={FILTER_OPTIONS}
                        filter={filterMode}
                        onFilterChange={setFilterMode}
                    />
                </div>

                {/* View switcher */}
                <div className="flex items-center p-1 rounded-token shrink-0" style={{ background: 'var(--slate-bg)', border: '1px solid var(--stroke)' }}>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-token text-[13px] font-semibold transition-all ${
                            viewMode === 'table'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: viewMode === 'table' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">table_rows</span>
                        Tableau
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-token text-[13px] font-semibold transition-all ${
                            viewMode === 'grid'
                                ? 'card text-on-surface shadow-sm'
                                : 'hover:bg-slate-100'
                        }`}
                        style={{ color: viewMode === 'grid' ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
                    >
                        <span className="material-symbols-outlined text-[18px]">grid_view</span>
                        Grille
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="card rounded-token overflow-hidden shadow-l1 flex flex-col">
                {loading ? (
                    <div className="p-16 text-center font-bold" style={{ color: 'var(--primary-container)' }}>Chargement de l'annuaire clients...</div>
                ) : clients.length === 0 ? (
                    <div className="p-16 text-center font-medium flex flex-col items-center gap-2" style={{ color: 'var(--on-surface-variant)' }}>
                        <span className="material-symbols-outlined text-4xl" style={{ opacity: 0.4 }}>person_off</span>
                        <p>Aucun client trouvé dans l'annuaire.</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'var(--slate-bg)' }}>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Téléphone & Email</th>
                                    <th className="px-6 py-4">CIN / Passeport</th>
                                    <th className="px-6 py-4">Permis</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-[14px]" style={{ color: 'var(--on-surface)' }}>
                                {clients.map((client, i) => {
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={client.id} className="row hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 font-semibold">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`avatar ${client.is_deleted ? 'bg-slate-100 text-slate-500 ring-slate-100' : avatarClass}`}>
                                                        {getInitials(client.prenom, client.nom)}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/clients/edit/${client.id}`}
                                                            className="font-semibold hover:underline"
                                                            style={{ color: 'var(--on-surface)' }}
                                                        >
                                                            {client.prenom} {client.nom}
                                                        </Link>
                                                        {(client.ville || client.pays) && (
                                                            <p className="text-[12px] mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{client.ville}{client.pays ? `, ${client.pays}` : ''}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                                <div className="text-[14px] font-medium">{client.telephone}</div>
                                                {client.email ? (
                                                    <div className="text-[12px] truncate max-w-[200px]" style={{ opacity: 0.7 }}>{client.email}</div>
                                                ) : (
                                                    <div className="text-[12px] italic" style={{ opacity: 0.4 }}>Pas d'email</div>
                                                )}
                                            </td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                                <span className="font-mono text-[12px] font-bold">{client.cin_passport}</span>
                                            </td>
                                            <td className="px-6" style={{ color: 'var(--on-surface-variant)' }}>
                                                <span className="font-mono text-[12px]">{client.permis_conduite || '—'}</span>
                                            </td>
                                            <td className="px-6">
                                                <ClientStatus client={client} />
                                            </td>
                                            <td className="px-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <MenuButton item={client} items={buildMenuItems(client)} menuId={menuId} setMenuId={setMenuId} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                                                    <h3 className="text-title-lg text-on-surface group-hover:text-primary transition-colors">
                                                        {client.prenom} {client.nom}
                                                    </h3>
                                                    <p className="text-body-sm text-on-surface-variant font-medium">#{client.cin_passport}</p>
                                                </div>
                                            </div>
                                            <ClientStatus client={client} />
                                        </div>

                                        <div className="space-y-2 text-body-sm text-on-surface-variant border-t border-stroke pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">call</span> Téléphone:
                                                </span>
                                                <span className="font-semibold text-on-surface">{client.telephone}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">badge</span> Permis:
                                                </span>
                                                <span className="font-mono font-semibold text-on-surface">{client.permis_conduite || '—'}</span>
                                            </div>
                                            {client.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-on-surface-variant/70 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">mail</span> Email:
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
                                                Gérer la fiche <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
