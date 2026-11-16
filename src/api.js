import axios from 'axios';
import { clearSession, getAccessToken, getRefreshToken, setTokens } from './utils/session';

// إعداد الرابط الأساسي للباكند
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({ baseURL });

// هذا الإعداد يضيف الـ Token تلقائياً لأي طلب ترسله لكي لا تضطر لكتابته كل مرة
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Le backend Django utilise la pagination globale (PageNumberPagination).
// Les endpoints de liste renvoient donc { count, next, previous, results }.
// On déroule automatiquement .results pour que les composants reçoivent bien un tableau,
// tout en gardant count/next/previous accrochés au tableau (aucun composant n'est cassé,
// .map()/.filter()/.length continuent de fonctionner).
const unwrapPagination = (response) => {
    if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        Array.isArray(response.data.results)
    ) {
        const { results, count, next, previous } = response.data;
        results.count = count;
        results.next = next;
        results.previous = previous;
        response.data = results;
    }
    return response;
};

// --- Rafraîchissement automatique du token d'accès -------------------------
// Une seule requête de refresh à la fois : les autres 401 attendent son résultat.
let refreshPromise = null;

const refreshAccessToken = () => {
    if (!refreshPromise) {
        const refresh = getRefreshToken();
        if (!refresh) return Promise.reject(new Error('no refresh token'));
        // axios « nu » : évite de repasser par nos intercepteurs (boucle infinie).
        refreshPromise = axios
            .post(`${baseURL}token/refresh/`, { refresh })
            .then(({ data }) => {
                setTokens({ access: data.access, refresh: data.refresh });
                return data.access;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

const redirectToLogin = () => {
    clearSession();
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

api.interceptors.response.use(unwrapPagination, async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('token/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
        original._retry = true;
        try {
            const access = await refreshAccessToken();
            original.headers.Authorization = `Bearer ${access}`;
            return api(original);
        } catch {
            redirectToLogin();
        }
    }
    return Promise.reject(error);
});

// Déconnexion : invalide le refresh token côté serveur puis nettoie la session.
export const logout = async () => {
    const refresh = getRefreshToken();
    try {
        if (refresh) await axios.post(`${baseURL}token/blacklist/`, { refresh });
    } catch {
        // Hors-ligne ou token déjà invalide : on déconnecte quand même localement.
    }
    redirectToLogin();
};

// Suit automatiquement le lien `next` de la pagination Django pour récupérer
// toutes les pages d'un endpoint de liste.
export const fetchAllPages = async (url, params = {}) => {
    let response = await api.get(url, { params });
    let results = [...response.data];
    let nextUrl = response.data.next;
    while (nextUrl) {
        response = await api.get(nextUrl);
        results = results.concat(response.data);
        nextUrl = response.data.next;
    }
    return results;
};

export default api;
