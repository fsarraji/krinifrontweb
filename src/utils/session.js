// Gestion centralisée de la session (tokens JWT).
export const STAFF_ROLES = ['OWNER', 'EMPLOYEE', 'SUPERADMIN'];
export const CLIENT_ROLE = 'CLIENT';
// Page d'accueil selon le rôle : le personnel va au tableau de bord, le client à son espace.
export const homePathFor = (role) => (role === CLIENT_ROLE ? '/espace-client' : '/dashboard');

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = ({ access, refresh }) => {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
};

// Efface la session locale en conservant les préférences d'interface.
export const clearSession = () => {
    const collapsed = localStorage.getItem('sidebar_collapsed');
    localStorage.clear();
    if (collapsed !== null) localStorage.setItem('sidebar_collapsed', collapsed);
};

const decode = (token) => {
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
};

export const getClaims = () => {
    const token = getAccessToken();
    return token ? decode(token) : null;
};

// Vrai si le token d'accès est absent/illisible. Un token expiré reste « valide »
// ici : l'intercepteur axios le rafraîchira tant que le refresh token est bon.
export const hasSession = () => Boolean(getClaims() && getRefreshToken());
