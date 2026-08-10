import axios from 'axios';

// إعداد الرابط الأساسي للباكند
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/',
});

// هذا الإعداد يضيف الـ Token تلقائياً لأي طلب ترسله لكي لا تضطر لكتابته كل مرة
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
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
api.interceptors.response.use(
    (response) => {
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
    },
    (error) => {
        return Promise.reject(error);
    }
);

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