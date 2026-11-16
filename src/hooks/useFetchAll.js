import { useEffect, useState } from 'react';
import { fetchAllPages } from '../api';

/**
 * Hook de chargement paginé (toutes pages) d'un endpoint de liste.
 *
 * - Chargement automatique au montage (et à chaque changement d'URL).
 * - `refetch()` relance le chargement (à appeler après une mutation).
 * - Évite la règle react-hooks/set-state-in-effect : les setState sont
 *   exécutés dans des callbacks asynchrones, pas directement dans l'effet.
 *
 * Exemple :
 *   const { data: agencies, loading, refetch: fetchAgencies } = useFetchAll('agencies/');
 */
const useFetchAll = (url) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await fetchAllPages(url);
                if (!cancelled) setData(result);
            } catch (error) {
                console.error(`Erreur lors de la récupération de ${url}`, error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [url, reloadKey]);

    const refetch = () => {
        setLoading(true);
        setReloadKey(key => key + 1);
    };

    return { data, loading, refetch };
};

export default useFetchAll;