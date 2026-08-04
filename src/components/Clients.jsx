import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import SearchFilterBar from './SearchFilterBar';

const PAGE_SIZE = 10;

const getInitials = (prenom, nom) => {
    const first = (prenom || '').charAt(0) || '';
    const second = (nom || '').charAt(0) || '';
    return (first + second).toUpperCase() || '?';
};

const FILTER_OPTIONS = [
    { value: false, label: 'Tous', dot: 'bg-primary' },
    { value: true, label: 'Liste noire', dot: 'bg-error' },
];

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [blacklisted, setBlacklisted] = useState(false);
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, blacklisted]);

    const fetchClients = useCallback(async (p) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('page_size', String(PAGE_SIZE));
            if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
            if (blacklisted) params.set('liste_noire', 'true');
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
    }, [debouncedSearch, blacklisted]);

    useEffect(() => {
        fetchClients(1);
    }, [fetchClients]);

    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const goPrev = () => { if (page > 1) fetchClients(page - 1); };
    const goNext = () => { if (page < totalPages) fetchClients(page + 1); };

    return (
        <div className="p-0 max-w-2xl mx-auto">
            <div className="mb-6">
                <SearchFilterBar
                    placeholder="Rechercher (nom, prénom, CIN, téléphone)..."
                    search={search}
                    onSearchChange={setSearch}
                    options={FILTER_OPTIONS}
                    filter={blacklisted}
                    onFilterChange={setBlacklisted}
                />
            </div>

            {/* Client List */}
            {loading ? (
                <div className="text-center mt-16 font-bold text-primary">Chargement de l'annuaire clients...</div>
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {clients.map(client => (
                            <Link
                                key={client.id}
                                to={`/clients/edit/${client.id}`}
                                className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-outline-variant/30 flex items-center gap-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center font-headline-md font-bold shrink-0">
                                    {getInitials(client.prenom, client.nom)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-headline-md text-body-lg text-on-surface truncate">{client.prenom} {client.nom}</h3>
                                        {client.liste_noire && (
                                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-error bg-error-container/60 px-2 py-0.5 rounded-full">Liste noire</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col text-body-md font-body-md text-on-surface-variant mt-0.5">
                                        <span className="truncate">{client.telephone}</span>
                                        <span className="text-xs text-outline">{client.cin_passport}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {clients.length === 0 && (
                            <div className="text-center text-on-surface-variant py-16">Aucun client trouvé dans l'annuaire.</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {count > 0 && (
                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-body-md text-on-surface-variant font-medium">
                                Affichage de <span className="font-bold text-on-surface">{count}</span> clients
                            </p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={goPrev}
                                        disabled={page <= 1}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                                    </button>
                                    <span className="text-label-sm font-bold text-on-surface px-2">{page} / {totalPages}</span>
                                    <button
                                        onClick={goNext}
                                        disabled={page >= totalPages}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Floating Action Button (FAB) */}
            <Link
                to="/clients/add"
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary-container text-on-primary rounded-2xl shadow-lg flex items-center justify-center hover:bg-primary transition-colors duration-200 z-40 active:scale-95"
            >
                <span className="material-symbols-outlined text-3xl">add</span>
            </Link>
        </div>
    );
};

export default Clients;
