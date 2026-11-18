/**
 * Extrait de l'URL `next` d'une page DRF le chemin relatif à la racine de l'API
 * (ex. « https://api.exemple.com/api/contracts/?page=2 » -> « contracts/?page=2 »).
 *
 * Pourquoi : DRF renvoie une URL ABSOLUE, construite avec l'hôte vu par le serveur. La
 * suivre telle quelle (1) contourne le proxy de développement et déclenche une erreur CORS
 * depuis localhost, (2) peut passer en http:// derrière un proxy HTTPS (contenu mixte).
 * Une URL sans segment « /api/ » est renvoyée inchangée.
 */
export const apiPathFromUrl = (url) => {
    if (!url) return url;
    try {
        const parsed = new URL(url, 'http://placeholder.invalid');
        const marker = '/api/';
        const index = parsed.pathname.indexOf(marker);
        if (index === -1) return url;
        return `${parsed.pathname.slice(index + marker.length)}${parsed.search}`;
    } catch {
        return url;
    }
};
