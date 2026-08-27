import React from 'react';
import { resolveImage } from '../../imageUrl';
import { normalizeVehicleStatut } from '../../utils/vehicleStatus';
import InfoModal, { Row, Section, fmt, fmtNum, fmtDate, OUI_NON } from './InfoModal';

const VehicleInfoModal = ({ isOpen, vehicle, onClose }) => {
    if (!isOpen || !vehicle) return null;

    const status = normalizeVehicleStatut(vehicle.statut);
    const statusInfo = vehicle.is_deleted
        ? { label: 'Supprimé', variant: 'danger' }
        : vehicle.is_archived
            ? { label: 'Archivé', variant: 'neutral' }
            : status === 'Rented'
                ? { label: 'Loué', variant: 'info' }
                : status === 'Maintenance'
                    ? { label: 'Maintenance', variant: 'warning' }
                    : { label: 'Disponible', variant: 'success' };

    return (
        <InfoModal
            isOpen={isOpen}
            onClose={onClose}
            title="Fiche véhicule"
            subtitle={`${vehicle.matricule_actuel || vehicle.matricule} · ${vehicle.marque_name || vehicle.marque} ${vehicle.modele_name || vehicle.modele}`}
        >
            <div className="flex items-center gap-5">
                {vehicle.image ? (
                    <img src={resolveImage(vehicle.image)} alt={vehicle.matricule} className="w-28 h-20 rounded-xl object-cover border border-stroke" />
                ) : (
                    <div className="w-28 h-20 rounded-xl flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
                        <span className="material-symbols-outlined text-[30px]" style={{ color: 'var(--info)' }}>directions_car</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-lg text-on-surface">{vehicle.marque_name || vehicle.marque} {vehicle.modele_name || vehicle.modele}</p>
                    <p className="text-sm font-mono font-bold" style={{ color: 'var(--on-surface-variant)' }}>{vehicle.matricule_actuel || vehicle.matricule}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold"
                        style={{ background: vehicle.is_deleted ? 'var(--error-bg)' : vehicle.is_archived ? 'var(--slate-bg)' : 'var(--success-bg)', color: vehicle.is_deleted ? 'var(--danger)' : vehicle.is_archived ? 'var(--on-surface-variant)' : 'var(--success-dark)' }}>
                        <span className="material-symbols-outlined text-[14px]">{vehicle.is_deleted ? 'delete' : vehicle.is_archived ? 'archive' : 'check_circle'}</span>
                        {statusInfo.label}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Tarif / jour</p>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--primary-container)' }}>{fmtNum(vehicle.prix_par_jour, ' DH')}</p>
                </div>
            </div>

            <Section title="Informations techniques">
                <Row icon="calendar_today" label="Année" value={fmt(vehicle.annee)} />
                <Row icon="local_gas_station" label="Carburant" value={fmt(vehicle.carburant)} />
                <Row icon="speed" label="Kilométrage" value={fmtNum(vehicle.kilometrage, ' km')} />
                <Row icon="route" label="Km loué (contrats)" value={fmtNum(vehicle.km_loue, ' km')} />
                <Row icon="palette" label="Couleur" value={fmt(vehicle.couleur)} />
                <Row icon="build" label="Prochaine vidange" value={fmtNum(vehicle.prochain_vidange_km, ' km')} />
                <Row icon="power" label="Puissance fiscale" value={fmtNum(vehicle.puissance_fiscale, ' CV')} />
                <Row icon="person" label="Chauffeur disponible" value={OUI_NON(vehicle.chauffeur_disponible)} />
                <Row icon="satellite_alt" label="GPS / IMEI" value={fmt(vehicle.gps_imei)} />
                <Row icon="sim_card" label="Carte SIM" value={fmt(vehicle.sim_number)} />
                <Row icon="phone_in_talk" label="Opérateur" value={fmt(vehicle.sim_operator)} />
            </Section>

            <Section title="Circulation">
                <Row icon="badge" label="Matricule provisoire (WW)" value={fmt(vehicle.matricule)} />
                <Row icon="confirmation_number" label="Matricule définitif" value={fmt(vehicle.matricule_definitif)} />
                <Row icon="calendar_today" label="Mise en circulation" value={fmtDate(vehicle.date_mise_en_circulation)} />
                <Row icon="assignment_turned_in" label="Autorisation de circulation" value={fmtDate(vehicle.date_autorisation_circulation)} />
            </Section>

            <Section title="Informations financières">
                <Row icon="sell" label="Prix de location / jour" value={fmtNum(vehicle.prix_par_jour, ' DH')} strong />
                <Row icon="add_road" label="Tarif km supplémentaire" value={fmtNum(vehicle.tarif_km_extra, ' DH/km')} />
            </Section>

            <Section title="Validité">
                <Row icon="verified_user" label="Assurance" value={fmtDate(vehicle.date_assurance)} />
                <Row icon="engineering" label="Visite technique" value={fmtDate(vehicle.date_visite_technique)} />
            </Section>

            {vehicle.is_archived && (
                <Section title="Archive">
                    <Row icon="archive" label="Date de fin de travail" value={fmtDate(vehicle.date_fin_travail)} />
                </Section>
            )}
        </InfoModal>
    );
};

export default VehicleInfoModal;
