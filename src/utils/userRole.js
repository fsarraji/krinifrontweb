/**
 * Decode le token JWT et retourne le rôle de l'utilisateur.
 * Compatible avec les deux méthodes utilisées dans le codebase :
 * - `jwtDecode` (import from 'jwt-decode')
 * - `atob` manuel
 * Retourne une chaîne vide si le token est absent ou invalide.
 */
export const getRole = () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return '';
        return JSON.parse(atob(token.split('.')[1]))?.role || '';
    } catch {
        return '';
    }
};

/**
 * Decode le token JWT et retourne un objet { role, ... } avec toutes les claims.
 * Retourne null si le token est absent ou invalide.
 */
export const decodeToken = () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
};
