import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';
import Pagination from './Pagination';
import exportToCSV from '../utils/exportUtils';
import { SkeletonCards, SkeletonTable } from './Skeleton';

const PAGE_SIZE_DEFAULT = 10;

const AVATAR_COLORS = [
    'bg-indigo-50 text-indigo-700 ring-indigo-100',
    'bg-purple-50 text-purple-700 ring-purple-100',
    'bg-amber-50 text-amber-700 ring-amber-100',
    'bg-pink-50 text-pink-700 ring-pink-100',
    'bg-cyan-50 text-cyan-700 ring-cyan-100',
    'bg-emerald-50 text-emerald-700 ring-emerald-100',
];

const getInitials = (prenom, nom) => {
    const first = (prenom || '').charAt(0) || '';
    const second = (nom || '').charAt(0) || '';
    return (first + second).toUpperCase() || '?';
};

const FILTER_OPTIONS = [
    { value: 'ALL', label: 'Tous les clients', dot: 'bg-indigo-600' },
    { value: 'REGULAR', label: 'Clients réguliers', dot: 'bg-emerald-500' },
    { value: 'BLACKLIST', label: 'Liste noire', dot: 'bg-rose-500' },
];

const Clients = () => {
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
            const res = await api.get('clients/?page_size=1000');
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setAllClients(data);
        } catch (err) {
            console.error("Erreur stats clients", err);
        }
    };

    const fetchClients = useCallback(async (p) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('page_size', String(pageSize));
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (filterMode === 'BLACKLIST') params.set('liste_noire', 'true');
            if (filterMode === 'REGULAR') params.set('liste_noire', 'false');

            const response = await api.get(`clients/?${params.toString()}`);
            const data = response.data;
            const results = Array.isArray(data) ? data : (data.results || []);
            setClients(results);
            setCount(Array.isArray(data) ? results.length : (data.count ?? results.length));
            setPage(p);
        } catch (error) {
            console.error("Erreur lors de la récupération des clients", error);
            setClients([]);
            setCount(0);
        } finally {
            setLoading(false);
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
                { key: 'permis_conduite', label: 'Permis de conduire' },
                { key: 'nationalite', label: 'Nationalité' },
                { key: 'sexe', label: 'Sexe' },
                { key: 'ville', label: 'Ville' },
                { key: 'pays', label: 'Pays' },
                { key: 'liste_noire', label: 'Liste Noire' },
            ]
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Annuaire & Portefeuille</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gestion des Clients</h2>
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
                    <Link
                        to="/clients/add"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        <span>Nouveau Client</span>
                    </Link>
                </div>
            </div>

            {/* KPI Architecture (Compact Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">group</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Total Clients</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{totalCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">verified_user</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Clients Éligibles</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{activeCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">block</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Liste Noire</p>
                            <p className="text-xl font-extrabold text-rose-650 mt-1 leading-none">{blacklistedCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between h-20">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-xl">badge</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Fiches Complètes</p>
                            <p className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{withEmailCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
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
                <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <span className="material-symbols-outlined text-base">table_rows</span>
                        Tableau
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <span className="material-symbols-outlined text-base">grid_view</span>
                        Grille
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="p-16 text-center font-bold text-indigo-600">Chargement de l'annuaire clients...</div>
                ) : clients.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-medium flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">person_off</span>
                        <p>Aucun client trouvé dans l'annuaire.</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Téléphone & Email</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">CIN / Passeport</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Permis de Conduire</th>
                                    <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                    <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {clients.map((client, i) => {
                                    const avatarClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`w-10 h-10 rounded-xl ${avatarClass} flex items-center justify-center font-bold text-sm ring-1 shrink-0`}>
                                                        {getInitials(client.prenom, client.nom)}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            to={`/clients/edit/${client.id}`}
                                                            className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors"
                                                        >
                                                            {client.prenom} {client.nom}
                                                        </Link>
                                                        {client.nationalite && (
                                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{client.nationalite}{client.sexe ? ` · ${client.sexe === 'HOMME' ? 'Homme' : client.sexe === 'FEMME' ? 'Femme' : client.sexe}` : ''}</p>
                                                        )}
                                                        {(client.ville || client.pays) && (
                                                            <p className="text-[11px] text-slate-300 font-medium">{client.ville}{client.pays ? `, ${client.pays}` : ''}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm text-slate-400">call</span>
                                                    {client.telephone}
                                                </div>
                                                {client.email ? (
                                                    <div className="text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">
                                                        {client.email}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-300 italic mt-0.5">Pas d'email</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                                                    {client.cin_passport}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-xs font-semibold text-slate-600">
                                                    {client.permis_conduite || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {client.liste_noire ? (
                                                    <span className="px-3 py-1 inline-flex text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-600/20">
                                                        LISTE NOIRE
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 inline-flex text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                                                        ACTIF
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <Link
                                                    to={`/clients/edit/${client.id}`}
                                                    className="inline-flex items-center gap-1.5 p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                                    title="Modifier le profil client"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
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
                                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl ${avatarClass} flex items-center justify-center font-bold text-sm ring-1 shrink-0`}>
                                                    {getInitials(client.prenom, client.nom)}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {client.prenom} {client.nom}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-medium">#{client.cin_passport}</p>
                                                </div>
                                            </div>
                                            {client.liste_noire && (
                                                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 shrink-0">
                                                    NOIRE
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">call</span> Téléphone:
                                                </span>
                                                <span className="font-semibold">{client.telephone}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">badge</span> Permis:
                                                </span>
                                                <span className="font-mono font-semibold">{client.permis_conduite || '—'}</span>
                                            </div>
                                            {client.email && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">mail</span> Email:
                                                    </span>
                                                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{client.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                                        <Link
                                            to={`/clients/edit/${client.id}`}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                                        >
                                            Gérer la fiche <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
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
        </div>
    );
};

export default Clients;
