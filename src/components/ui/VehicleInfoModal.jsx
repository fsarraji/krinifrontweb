import React from 'react';
import { resolveImage } from '../../imageUrl';
import { normalizeVehicleStatut } from '../../utils/vehicleStatus';
import { fmt, fmtNum, fmtDate, formatMoney, OUI_NON } from '../../utils/formatters';
import InfoModal, { Row, Section } from './InfoModal';
import { useI18n } from '../../i18n/context';

const VehicleInfoModal = ({ isOpen, vehicle, onClose }) => {
    const { t } = useI18n();
    if (!isOpen || !vehicle) return null;

    const status = normalizeVehicleStatut(vehicle.statut);
    const statusInfo = vehicle.is_deleted
        ? { label: t('status.deleted'), variant: 'danger' }
        : vehicle.is_archived
            ? { label: t('status.archived'), variant: 'neutral' }
            : status === 'Rented'
                ? { label: t('status.Rented'), variant: 'info' }
                : status === 'Maintenance'
                    ? { label: t('status.Maintenance'), variant: 'warning' }
                    : { label: t('status.Available'), variant: 'success' };

    return (
        <InfoModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('u.fiche_vhicule')}
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
                    <p className="text-[12px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.tarif_jour')}</p>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--primary-container)' }}>{formatMoney(vehicle.prix_par_jour)}</p>
                </div>
            </div>

            <Section title={t('u.informations_techniques')}>
                <Row icon="calendar_today" label={t('u.anne')} value={fmt(vehicle.annee)} />
                <Row icon="local_gas_station" label={t('u.carburant')} value={fmt(vehicle.carburant)} />
                <Row icon="speed" label={t('u.kilomtrage')} value={fmtNum(vehicle.kilometrage, ` ${t('veh.kmUnit')}`)} />
                <Row icon="route" label={t('u.km_lou_contrats')} value={fmtNum(vehicle.km_loue, ` ${t('veh.kmUnit')}`)} />
                <Row icon="palette" label={t('u.couleur')} value={fmt(vehicle.couleur)} />
                <Row icon="build" label={t('u.prochaine_vidange')} value={fmtNum(vehicle.prochain_vidange_km, ` ${t('veh.kmUnit')}`)} />
                <Row icon="power" label={t('u.puissance_fiscale')} value={fmtNum(vehicle.puissance_fiscale, ' CV')} />
                <Row icon="person" label={t('u.chauffeur_disponible')} value={OUI_NON(vehicle.chauffeur_disponible)} />
                <Row icon="satellite_alt" label={t('u.gps_imei')} value={fmt(vehicle.gps_imei)} />
                <Row icon="sim_card" label={t('u.carte_sim')} value={fmt(vehicle.sim_number)} />
                <Row icon="phone_in_talk" label={t('u.oprateur')} value={fmt(vehicle.sim_operator)} />
            </Section>

            <Section title={t('u.circulation')}>
                <Row icon="badge" label={t('u.matricule_provisoire_ww')} value={fmt(vehicle.matricule)} />
                <Row icon="confirmation_number" label={t('u.matricule_dfinitif')} value={fmt(vehicle.matricule_definitif)} />
                <Row icon="calendar_today" label={t('u.mise_en_circulation')} value={fmtDate(vehicle.date_mise_en_circulation)} />
                <Row icon="assignment_turned_in" label={t('u.autorisation_de_circulation')} value={fmtDate(vehicle.date_autorisation_circulation)} />
            </Section>

            <Section title={t('u.informations_financires')}>
                <Row icon="sell" label={t('u.prix_de_location_jour')} value={formatMoney(vehicle.prix_par_jour)} strong />
                <Row icon="add_road" label={t('u.tarif_km_supplmentaire')} value={`${formatMoney(vehicle.tarif_km_extra)}/km`} />
            </Section>

            <Section title={t('u.validit')}>
                <Row icon="verified_user" label={t('u.assurance')} value={fmtDate(vehicle.date_assurance)} />
                <Row icon="engineering" label={t('u.visite_technique')} value={fmtDate(vehicle.date_visite_technique)} />
            </Section>

            {vehicle.is_archived && (
                <Section title={t('u.archive')}>
                    <Row icon="archive" label={t('u.date_de_fin_de_travail')} value={fmtDate(vehicle.date_fin_travail)} />
                </Section>
            )}
        </InfoModal>
    );
};

export default VehicleInfoModal;
