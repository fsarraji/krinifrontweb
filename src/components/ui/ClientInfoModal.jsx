import React from 'react';
import { fmt, fmtDate, OUI_NON } from '../../utils/formatters';
import InfoModal, { Row, Section } from './InfoModal';
import { useI18n } from '../../i18n/context';


const ClientInfoModal = ({ isOpen, client, onClose }) => {
    const { t } = useI18n();
    if (!isOpen || !client) return null;

    const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    const isDeleted = !!client.is_deleted;
    const lastRental = client.last_rental;

    return (
        <InfoModal
            isOpen={isOpen}
            onClose={onClose}
            title={t('u.fiche_client')}
            subtitle={fullName}
        >
            <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isDeleted ? 'var(--slate-bg)' : client.liste_noire ? 'var(--error-bg)' : 'var(--info-bg)' }}>
                    <span className="material-symbols-outlined text-[34px]" style={{ color: isDeleted ? 'var(--on-surface-variant)' : client.liste_noire ? 'var(--danger)' : 'var(--info)' }}>
                        {isDeleted ? 'person_off' : 'person'}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-lg text-on-surface">{fullName}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>{fmt(client.telephone)}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold"
                        style={{ background: isDeleted ? 'var(--error-bg)' : client.liste_noire ? 'var(--error-bg)' : 'var(--success-bg)', color: isDeleted ? 'var(--danger)' : client.liste_noire ? 'var(--danger)' : 'var(--success-dark)' }}>
                        <span className="material-symbols-outlined text-[14px]">{isDeleted ? 'delete' : client.liste_noire ? 'block' : 'verified_user'}</span>
                        {isDeleted ? t('status.deleted') : client.liste_noire ? t('clients.filter.blacklist') : t('u.actif')}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{t('u.contrats')}</p>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--primary-container)' }}>{client.contrats_count ?? 0}</p>
                </div>
            </div>

            <Section title={t('u.identit')}>
                <Row icon="badge" label={t('u.cin_passeport')} value={fmt(client.cin_passport)} />
                <Row icon="event_available" label={t('u.expiration_cin')} value={fmtDate(client.date_expiration_cin)} />
                <Row icon="face" label={t('u.sexe')} value={client.sexe === 'HOMME' ? t('u.homme') : client.sexe === 'FEMME' ? t('u.femme') : fmt(client.sexe)} />
                <Row icon="public" label={t('u.nationalit')} value={fmt(client.nationalite)} />
                <Row icon="directions_car" label={t('u.n_permis_de_conduire')} value={fmt(client.permis_conduite)} />
                <Row icon="event" label={t('u.dlivrance_permis')} value={fmtDate(client.date_delivrance_permis)} />
            </Section>

            <Section title={t('u.contact')}>
                <Row icon="phone" label={t('u.tlphone')} value={fmt(client.telephone)} strong />
                <Row icon="email" label={t('u.email')} value={fmt(client.email)} />
                <Row icon="location_city" label={t('u.ville')} value={fmt(client.ville)} />
                <Row icon="map" label={t('u.pays')} value={fmt(client.pays)} />
                <Row icon="home" label={t('u.adresse')} value={fmt(client.adresse)} />
            </Section>

            <Section title={t('u.divers')}>
                <Row icon="block" label={t('u.liste_noire')} value={OUI_NON(client.liste_noire)} />
                <Row icon="notes" label={t('u.remarques')} value={fmt(client.remarques)} />
            </Section>

            <Section title={t('u.activit')}>
                <Row icon="receipt_long" label={t('u.nombre_de_contrats')} value={fmt(client.contrats_count ?? 0)} strong />
                <Row icon="directions_car" label={t('u.dernier_vhicule_lou')} value={lastRental ? lastRental.vehicle : '—'} />
                <Row icon="event" label={t('u.date_dernier_contrat')} value={lastRental ? lastRental.date : '—'} />
            </Section>
        </InfoModal>
    );
};

export default ClientInfoModal;
