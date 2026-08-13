# KRINI Front — Documentation complète du frontend

Application web **React 19 + Vite + Tailwind CSS** de gestion de flotte automobile (location de véhicules, clients, contrats, réservations, paiements, dépenses, suivi GPS, administration multi-agences SaaS).

---

## 1. Vue d'ensemble

| Élément | Valeur |
|---|---|
| Nom du projet | `car_rental_frontend` |
| Type | SPA (Single Page Application) |
| Langage | JavaScript (JSX) — pas de TypeScript |
| Backend | API Django REST (repos `krini_back`), pagination Django globale |
| API de production | `https://kriniback.onrender.com/api/` (fichier `.env`) |
| Déploiement | Vercel (SPA rewrite vers `index.html`) |
| Langue UI | Français |

---

## 2. Stack technique

### Dépendances (`package.json`)

| Paquet | Version | Rôle |
|---|---|---|
| `react` / `react-dom` | ^19.2.4 | UI |
| `react-router-dom` | ^7.13.2 | Routage |
| `axios` | ^1.14.0 | HTTP client |
| `jwt-decode` | ^4.0.0 | Décodage du JWT (rôle, agence, username) |
| `leaflet` | ^1.9.4 | Carte du suivi GPS |
| `react-select` | ^5.10.2 | Listes déroulantes (wrapper `Dropdown`) |

### Dev

- `vite` ^8.0.1 (build + dev server HMR)
- `tailwindcss` ^3.4.19 + `autoprefixer` + `postcss`
- `eslint` ^9 (plugins `react-hooks`, `react-refresh`)
- `@vitejs/plugin-react`

### Scripts

```bash
npm run dev       # serveur de dev Vite
npm run build     # build de production (dist/)
npm run lint      # ESLint
npm run preview   # prévisualisation du build
```

---

## 3. Structure du projet

```
krini_front/
├── .env                        # VITE_API_URL=https://kriniback.onrender.com/api/
├── index.html                  # point d'entrée HTML (fonts Inter + Material Symbols)
├── vite.config.js              # config build + manualChunks (leaflet, react-select, vendor)
├── tailwind.config.js          # tokens de design (couleurs, ombres, rayons)
├── postcss.config.js           # tailwind + autoprefixer
├── eslint.config.js            # règles ESLint
├── vercel.json                 # rewrites SPA -> index.html
├── public/                     # assets statiques (favicon, etc.)
├── dist/                       # build de production
└── src/
    ├── main.jsx                # bootstrap React
    ├── App.jsx                 # router + lazy loading + containers globaux
    ├── App.css
    ├── index.css               # design system (CSS variables + classes utilitaires)
    ├── api.js                  # instance axios + interceptions + fetchAllPages
    ├── imageUrl.js             # résolution des URLs d'images (relative -> absolue)
    ├── assets/                 # images (diagramme dégâts voiture, hero, ...)
    ├── components/             # pages + composants métier
    ├── components/ui/          # petits composants réutilisables
    └── utils/                  # helpers (CSV, images, constantes clients)
```

---

## 4. Point d'entrée & routage (`src/App.jsx`)

- Tous les composants de page sont chargés **en lazy** (`React.lazy`) avec un `Suspense` affichant un écran « Chargement… ».
- Containers globaux montés une seule fois : `ToastContainer` et `MessageBoxContainer`.
- Routes :

| Route | Composant | Layout |
|---|---|---|
| `/` | redirection vers `/login` | — |
| `/marketplace` | Marketplace (vitrine publique) | — |
| `/login` | Login | — |
| `/dashboard` | Dashboard | Layout |
| `/vehicles` | Vehicles | Layout |
| `/gps` | GpsTracking | Layout |
| `/vehicles/new`, `/vehicles/edit/:id` | VehicleForm | Layout |
| `/clients`, `/clients/add`, `/clients/edit/:id` | Clients / AddClient / EditClient | Layout |
| `/contracts`, `/contracts/new`, `/contracts/edit/:id` | Contracts / ContractForm / EditContract | Layout |
| `/reservations`, `/reservations/new` | Reservations / ReservationForm | Layout |
| `/calendar` | Calendar | Layout |
| `/payments` | Payments | Layout |
| `/expenses` | Expenses | Layout |
| `/admin/agencies`, `/admin/users`, `/admin/subscriptions` | AgencyManagement / UserManagement / Subscriptions | Layout |
| `/settings` | Settings | Layout |
| `*` | NotFound (404) | — |

---

## 5. Couche API (`src/api.js`)

- Instance axios `baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/'`.
- **Intercepteur requête** : ajoute `Authorization: Bearer <access_token>` (lu dans `localStorage`) sur chaque appel.
- **Intercepteur réponse** : « déroule » la pagination Django `{ count, next, previous, results }` en retournant directement le tableau `results`, avec `count`/`next`/`previous` attachés au tableau (compatibles `.map()`, `.length`, etc.).
- `fetchAllPages(url, params)` : suit automatiquement le lien `next` pour récupérer **toutes** les pages d'un endpoint de liste.

### Authentification

- Login (`POST token/`) → stocke `access_token` et `refresh_token` dans `localStorage`.
- Le rôle et le nom d'agence sont lus dans le **payload du JWT** (`jwtDecode`) : `decoded.role`, `decoded.agency_name`, `decoded.username`.
- Rôles gérés : `SUPERADMIN`, `OWNER`, `ADMIN`, `EMPLOYEE`, `USER`, `STAFF`, `AGENCY`. La sidebar filtre les liens selon le rôle.
- Déconnexion : `localStorage.clear()` + redirection vers `/login` (`ui/UserMenu.jsx`).

---

## 6. Design system (`src/index.css` + `tailwind.config.js`)

Design inspiré de Material 3 (« Vantage Fleet »), centré sur des variables CSS :

- **Couleurs** : `--primary (#004ac6)`, `--primary-container (#2563eb)`, `--surface`, `--on-surface`, `--slate-bg (#F8FAFC)`, `--card-white`, `--stroke`, et les statuts `--success/-bg`, `--warning/-bg`, `--info/-bg`, `--danger/-bg`.
- **Classes utilitaires** : `.card`, `.rounded-token` (8px), `.badge`/`.badge-dot`, `.sidebar-link`, `.avatar`, `.input`, `.field`, `.label`, `.step-dot`, `.step-line`, `.check-item`, `.dropzone`, `.gauge-seg`, `.shadow-l1/l2`.
- **Police** : Manrope (icônes Material Symbols).
- **Tailwind** : tokens étendus (`colors`, `boxShadow: l1/l2/soft`, `borderRadius`) alignés sur les variables CSS.

---

## 7. Layout & navigation (`src/components/Layout.jsx`)

- **Sidebar** repliable (280px ↔ 80px, état persistant dans `localStorage`), sections « Opérations » et « Gestion ».
- En-tête : logo + **KRINICAR** + nom de l'agence (issu du token).
- Bas de sidebar : bouton **Notifications** (ouvre `NotificationCenter`) + carte profil (`UserMenu`).
- Les entrées `SUPERADMIN` (`/admin/*`) ne sont visibles que pour les `SUPERADMIN` ; les autres ne sont **pas** visibles pour un `SUPERADMIN`.
- Zone principale : `max-w-[1400px]`, padding 8.

---

## 8. Pages métier

### 8.1 Login (`Login.jsx`)
- Écran partagé : bandeau image (gauche) + formulaire (droite).
- `POST token/` → redirection `/dashboard`. Gestion fine des erreurs (`detail`, `non_field_errors`, 401).

### 8.2 Dashboard (`Dashboard.jsx`)
- `GET dashboard/` → stats globales, alertes (assurance / visite technique), contrats récents.
- 4 cartes KPI : Revenu du mois (DH), Véhicules disponibles (avec barre de progression), Contrats actifs, Alertes d'échéance.
- Tableau « Contrats & État Flotte Récents » + panneau « Échéances proches ».
- Bouton « Nouveau contrat » → `/contracts/new`.

### 8.3 Vehicles — Gestion de flotte (`Vehicles.jsx`)
- `fetchAllPages('vehicles/')` ; filtres : Tous / Disponible / Louée / Maintenance / Archivés (+ « Supprimés » pour SUPERADMIN via `include_deleted`).
- Vues **Tableau** et **Grille**. Recherche (matricule, marque, modèle, carburant). Pagination côté client (10/25/50).
- Menu « ⋮ » par véhicule : Louer (→ `/contracts/new`), Réserver (→ `/reservations/new`), Informations, Éditer, Archiver (modal `ArchiveVehicleModal`), Supprimer (soft delete `PATCH is_deleted=true`), Restaurer.
- Export CSV. 4 KPI : flotte totale, loués, maintenance, tarif moyen/jour.

### 8.4 VehicleForm — Ajout/édition véhicule (`VehicleForm.jsx`)
- Assistant **4 étapes** : Identification → Spécifications → Tarification → Validité & Statut.
- `GET brands/`, `GET modelcars/?brand=` (modèles dépendants), `POST/PATCH vehicles/` (multipart, image optimisée via `optimizeImageFile`), `DELETE vehicles/{id}/`.
- Contrôle d'unicité du matricule : `GET vehicles/check-unique/?field=&value=&exclude_id=` (au blur et avant validation).
- Champs : matricule, marque/modèle, année, couleur, carburant, km, prix/jour, chauffeur disponible, statut, assurance, visite technique, prochain vidange, tarif km extra.

### 8.5 GpsTracking — Suivi GPS (`GpsTracking.jsx`, ~1030 lignes)
- Carte **Leaflet** (OpenStreetMap), rafraîchissement auto toutes les **15 s** (`gps/positions/`).
- Panneau flotte (Liste / Détail) : statut dérivé (En mouvement / À l'arrêt / Hors ligne), vitesse, carburant, odomètre, adresse, horodatage.
- `GET gps/positions/` (repli sur `vehicles/` si erreur), `GET gps/history/` (trajet 24 h tracé en polyline), `GET gps/commands/` + `POST gps/commands/` (commande boîtier : couper moteur, SOS, reset…).
- Modal **Dispositifs** : `GET/POST/DELETE gps/devices/`, association/dissociation boîtier↔véhicule (`POST gps/devices/associate/`), dissociation globale.

### 8.6 Clients — Annuaire (`Clients.jsx`)
- `GET clients/` paginé (serveur), recherche **debounce 350 ms**, filtres : Tous / Réguliers / Liste noire / (Supprimés SUPERADMIN).
- KPIs : total, éligibles, liste noire, fiches complètes (avec email).
- Vues tableau/grille, menu ⋮ (Informations via `ClientInfoModal`, Éditer, Supprimer soft, Restaurer), export CSV.

### 8.7 AddClient / EditClient
- `AddClient.jsx` : assistant **4 étapes** (Infos → Adresse → Permis → Documents), upload `scan_cin`/`scan_permis`, vérifications d'unicité (`GET clients/check-unique/`), `POST clients/` multipart.
- `EditClient.jsx` : page unique — modification, **liste noire**, historique des contrats (statistiques : total dépensé, nb locations, fidélité), ré-upload documents, suppression.

### 8.8 Contracts — Contrats de location (`Contracts.jsx`)
- `fetchAllPages('contracts/')`, filtres statut : Tous / Réservation / En cours / Terminé / Annulé.
- KPIs : contrats actifs, chiffre d'affaires, signatures en attente.
- Actions : clôturer (modal `CloseContractModal`), éditer, générer **PDF** (`GET contracts/{id}/print_contract/?with_cachet=true|false`). Export CSV.

### 8.9 ContractForm — Nouveau contrat (`ContractForm.jsx`)
- Assistant **4 étapes** : Véhicule → Client → Période & Tarif → État de sortie & Validation.
- `POST contracts/` puis `PATCH vehicles/{id}/ {statut: 'Rented'}`.
- Calcul de prix live : `diffDays()` (ceil) × prix/jour + surcharge chauffeur (+50 DH/j).
- État de sortie : **FuelGaugeSelector** (`carburant_sortie`, ex. `"2/8"`), **DamageSelector** (`degats_depart` sur schéma voiture), 8 accessoires (roue de secours, cric…), `km_sortie` pré-rempli via GPS (`GET gps/positions/{id}/`).
- `GET public-vehicles/{id}/unavailable-dates/` pour bloquer les dates indisponibles dans `DatePicker`.
- Modal intégré « Nouveau Client Rapide » (ajout de client à la volée).

### 8.10 Reservations — Réservations & demandes (`Reservations.jsx`)
- Onglets **Réservations** / **Demandes Clients** ; deux sources : `reservations/` et `booking-requests/` (fusionnées + tri par `created_at`).
- Confirmation d'une demande → génère un contrat « Réservé » (`POST reservations/{id}/confirm/` ou `booking-requests/{id}/confirm/`), avec création automatique du client si nécessaire (`client_created`).
- Refus → `PATCH {statut: 'CANCELLED'}`.

### 8.11 ReservationForm — Nouvelle réservation (`ReservationForm.jsx`)
- Assistant **3 étapes** : Dates → Véhicule → Client & Paiement.
- Recherche de disponibilité `GET vehicles/available_cars/?start_date=&end_date=`, puis `POST contracts/` avec `statut: 'RESERVE'`.
- Caution éditable uniquement par `OWNER`/`SUPERADMIN`.

### 8.12 Calendar — Planning Gantt (`Calendar.jsx`)
- Vue Gantt mensuel (62 px/jour) : une ligne par véhicule, barres de contrats (En cours = vert, Réservé = indigo), barre Maintenance (rouge), ligne verticale « aujourd'hui ».
- Navigation mois précédent/suivant/Aujourd'hui ; clic sur un contrat → modal détail → modifier.
- Données : `vehicles/` + `contracts/` (filtrage côté client).

### 8.13 Payments — Paiements (`Payments.jsx`)
- `fetchAllPages('payments/')`, filtre par méthode de paiement, recherche (contrat, référence, méthode), total collecté (DH), export CSV.
- Lien vers le contrat associé (`/contracts/edit/{id}`).

### 8.14 Expenses — Dépenses (`Expenses.jsx`)
- `fetchAllPages('expenses/')` + `vehicles/` ; KPIs : total, charges agence, charges flotte.
- Modal d'ajout : type Agence / Véhicule (sélecteur de véhicule), catégories prédéfinies (Salaires, Loyer, Maintenance, Carburant…), `POST expenses/`.

### 8.15 EditContract — Détail/édition contrat (`EditContract.jsx`)
- `GET contracts/{id}/`, `GET payments/?contract=` ; change le statut (`PATCH`), ajoute un paiement (`POST payments/`).
- Barre de progression paiement, résumé financier (total / payé / reste).
- Boutons « Prolonger », « Facture », PDF, « Résilier » : **décoratifs** (sans handler).

### 8.16 Settings — Paramètres agence & compte (`Settings.jsx`)
- Onglets **Agence** / **Compte** ; modifications réservées au `OWNER`/`SUPERADMIN`.
- Agence : coordonnées, **caution** (actif/montant), **kilométrage** (km/jour inclus, tarif km extra + exemple de calcul), **Traccar** (URL, utilisateur, mot de passe, effacement), **marques affichées** (multi-select), **logo + cachet/signature** (upload optimisé).
- API : `GET/PUT agency/settings/`, `GET brands/?all=1`.
- Compte : `GET/PUT users/me/` (profil + changement de mot de passe).

### 8.17 Administration SaaS
- **AgencyManagement** (`admin/agencies`) : CRUD agences — `agencies/` (list + POST/PUT/DELETE), champs : nom, adresse, ville, tel, email, RC, ICE, actif.
- **UserManagement** (`admin/users`) : CRUD utilisateurs — `users/` + `agencies/`, rôles `OWNER`/`EMPLOYEE` (agence vide = Super Admin), mot de passe optionnel en édition.
- **Subscriptions** (`admin/subscriptions`) : CRUD abonnements — `subscriptions/`, plans `GRATUIT/BASIC/PRO/PREMIUM`, statuts `ACTIVE/EXPIRED/SUSPENDED/CANCELLED`, défaut BASIC +30 jours.

### 8.18 Marketplace (public, `Marketplace.jsx`)
- Vitrine publique (sans Layout) : `GET public-vehicles/` (axios direct, sans interceptor).
- Filtres catégorie + prix max (slider), tri, grille de cartes véhicules (image, prix/jour, carburant, agence), bouton « Book Now » (décoratif) et « Sign In » → `/login`.

### 8.19 NotFound (`NotFound.jsx`)
- Page 404 avec lien retour `/dashboard`.

---

## 9. Composants réutilisables

### Composants UI (`src/components/ui/`)
| Composant | Rôle |
|---|---|
| `StatusBadge` | Pilule statut (dot + libellé) — source unique de vérité `STATUS_MAP` (véhicules + contrats + réservations) |
| `MetricCard` | Carte KPI standard (icône, valeur, unité, tendance, tone danger) |
| `DropdownMenu` | Menu contextuel « ⋮ » (portal, auto-flip, fermeture outside/Esc) |
| `UserMenu` | Avatar + nom/rôle/agence + menu Paramètres / Déconnexion |
| `ClientInfoModal` | Fiche client en lecture seule (identité, contact, activité, statut) |
| `VehicleInfoModal` | Fiche véhicule en lecture seule (technique, financier, validités, archive) |
| `ArchiveVehicleModal` | Archivage avec `date_fin_travail` (`PATCH vehicles/{id}/`) |
| `DatePicker` | Sélecteur de date FR (semaine L→D, heures, plages désactivées `disabledRanges`) |
| `Dropdown` | Wrapper `react-select` stylé (émet `.value`) |
| `Skeleton` | Placeholders de chargement (`SkeletonBox`, `SkeletonCards`, `SkeletonTable`) |
| `Pagination` | Barre pagination contrôlée (ellipse, tailles 10/25/50) |
| `SearchFilterBar` | Barre recherche + filtre par pastilles |

### Composants fonctionnels
| Composant | Rôle |
|---|---|
| `Toast` | Système global de toasts (event-bus `LISTENERS`) : `toast.success/error/warning/info`, auto-fermeture 4,5 s |
| `MessageBox` | Modales globales : `messageBox.info/success/error/warning/confirm/danger` (confirm/danger = Promise) |
| `NotificationCenter` | Tiroir notifications : demandes de réservation en attente, alertes assurance/visite (raffraîchi 60 s), activation push navigateur |
| `DamageSelector` | Carte des dégâts : clic sur le schéma voiture (`car_damage_diagram.webp`) → marqueurs numérotés en % de coordonnées + description, type `DEPART`/`RETOUR`, mode `readOnly` |
| `FuelGaugeSelector` | Jauge carburant SVG (E→F, 8 niveaux, `"n/8"`, drag or click) |
| `CloseContractModal` | Retour de véhicule en 4 étapes : recalcul des jours, km supplémentaires (si actif), accessoires manquants, dégâts RETOUR, règlement du solde → `POST contracts/{id}/return_vehicle/` |
| `ActivateReservationModal` | Activation d'une réservation : état de sortie (jauge, dégâts, accessoires) → `PATCH contracts/{id}/` + `PATCH vehicles/{id}/` |
| `Skeleton` | Primitives de chargement |

---

## 10. Utilitaires (`src/utils/`)

- **`exportUtils.js`** — `exportToCSV(data, filename, columns)` : génère un CSV UTF-8 (BOM) séparé par `;`, compatible Excel, téléchargement via Blob. Warning toast si aucune donnée.
- **`imageUtils.js`** — `optimizeImageFile(file)` : redimensionne (max 1600 px) et re-compresse les images côté navigateur avant upload (PNG conservé, JPG/autre → JPEG, SVG/GIF/PDF passés tels quels).
- **`clientConstants.js`** — `SEXE_OPTIONS`, `NATIONALITES` (liste de pays), `cinLabelFor(nationalite)` (« CIN / Passeport » ou « Passport »).
- **`imageUrl.js`** — `resolveImage(img)` : transforme un chemin relatif d'image en URL absolue basée sur l'origine de l'API (retire le suffixe `/api/`).

---

## 11. Optimisations build (`vite.config.js`)

Chunks manuels (`manualChunks`) :
- `leaflet` → chargé uniquement pour `/gps` (à la demande).
- `react-select` → chunk dédié.
- `vendor` → React, React Router, axios (mis en cache).
- Combiné au **lazy loading** des routes, la SPA ne charge que ce dont chaque écran a besoin.

---

## 12. Déploiement

- **Vercel** : `vercel.json` re-écrit toutes les routes vers `index.html` (SPA → le routage client fonctionne).
- Build : `npm run build` (sortie `dist/`).
- Variable d'environnement : `VITE_API_URL` (déjà définie dans `.env` pour l'API de production).

---

## 13. Points d'attention / dette technique

- `CloseContractModal.jsx` utilise une URL **codée en dur** (`http://localhost:8000/api/agency/settings/`) au lieu du client `api` partagé.
- `ContractForm.jsx` et `ReservationForm.jsx` dupliquent chacun un `AddClientModal` interne (factorisation possible).
- Plusieurs boutons d'`EditContract.jsx` (prolonger, facture, PDF, résilier) sont décoratifs.
- `Marketplace.jsx` utilise `axios` brut (sans intercepteur ni token), ce qui est normal pour un endpoint public.
- Pas de TypeScript ni de tests frontend ; le lint est le seul garde-fou (`npm run lint`).
```
