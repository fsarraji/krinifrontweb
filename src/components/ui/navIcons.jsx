// Les composants de navigation Astryx attendent des composants SVG pour `icon`.
// L'application utilise Material Symbols (par nom) : on fabrique un composant stable par nom.
const cache = new Map();

export const materialIcon = (name) => {
    if (!cache.has(name)) {
        const MaterialIcon = () => (
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
                {name}
            </span>
        );
        MaterialIcon.displayName = `MaterialIcon(${name})`;
        cache.set(name, MaterialIcon);
    }
    return cache.get(name);
};
