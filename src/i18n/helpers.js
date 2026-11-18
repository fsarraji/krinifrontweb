/** Traduit `key`, ou renvoie `fallback` quand la clé n'existe pas (ex. libellé venant de l'API). */
export const translateOr = (t, key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
};
