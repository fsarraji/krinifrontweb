# Krini — Frontend (back-office)

React 19 + Vite + Tailwind. Consomme l'API Django (`E:\krini\krini`).

## Démarrage

```bash
cp .env.example .env     # puis ajuster VITE_API_URL
npm install
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (`dist/`) |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest (session, rafraîchissement du token, routes protégées) |

## Architecture

- `src/api.js` — instance axios : jeton `Bearer`, **rafraîchissement automatique sur 401**, déroulage de la pagination DRF, `logout()` (blacklist du refresh token).
- `src/utils/session.js` — tokens JWT, claims, `hasSession()`.
- `src/components/ProtectedRoute.jsx` — garde de routes (session + rôle `OWNER`/`EMPLOYEE`/`SUPERADMIN`) ; `/admin/*` réservé au `SUPERADMIN`.
- `src/components/` — pages et composants métier ; `ui/` pour les briques partagées.
- Pages récentes : `Invoices` (factures/avoirs), `Reports` (rapports + journal de caisse), `Maintenance`, notifications réelles (`NotificationCenter`).

Voir aussi `DESIGN.md` (système visuel) et `FRONTEND.md`.

## Dette connue

- `fetchAllPages` charge des listes entières côté client (clients, véhicules, contrats, paiements) : à remplacer par pagination/filtres serveur.
- Gros composants à découper : `VehicleForm`, `GpsTracking`, `Settings`, `ContractForm` ; `AddClient`/`EditClient` quasi dupliqués.
- Jetons en `localStorage` (exposés en cas de XSS) : un refresh token en cookie HttpOnly demanderait un changement d'API.
- UI uniquement en français, sans i18n/RTL.
