const VEHICLE_STATUS_KEYS = ['Available', 'Rented', 'Maintenance'];

// Normalise le statut d'un véhicule, insensible à la casse et aux espaces.
// Retourne la valeur canonique ('Available' | 'Rented' | 'Maintenance') ou null.
export function normalizeVehicleStatut(statut) {
  const s = String(statut ?? '').trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  return VEHICLE_STATUS_KEYS.find((k) => k.toLowerCase() === lower) || null;
}
