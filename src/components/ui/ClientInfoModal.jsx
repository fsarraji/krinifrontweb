import React from 'react';
import InfoModal, { Row, Section, fmt, fmtDate, OUI_NON } from './InfoModal';

const SEXE = (v) => (v === 'HOMME' ? 'Homme' : v === 'FEMME' ? 'Femme' : fmt(v));

const ClientInfoModal = ({ isOpen, client, onClose }) => {
    if (!isOpen || !client) return null;

    const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    const isDeleted = !!client.is_deleted;
    const lastRental = client.last_rental;

    return (
        <InfoModal
            isOpen={isOpen}
            onClose={onClose}
            title="Fiche client"
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
                        {isDeleted ? 'Supprimé' : client.liste_noire ? 'Liste noire' : 'Actif'}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>Contrats</p>
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--primary-container)' }}>{client.contrats_count ?? 0}</p>
                </div>
            </div>

            <Section title="Identité">
                <Row icon="badge" label="CIN / Passeport" value={fmt(client.cin_passport)} />
                <Row icon="event_available" label="Expiration CIN" value={fmtDate(client.date_expiration_cin)} />
                <Row icon="face" label="Sexe" value={SEXE(client.sexe)} />
                <Row icon="public" label="Nationalité" value={fmt(client.nationalite)} />
                <Row icon="directions_car" label="N° permis de conduire" value={fmt(client.permis_conduite)} />
                <Row icon="event" label="Délivrance permis" value={fmtDate(client.date_delivrance_permis)} />
            </Section>

            <Section title="Contact">
                <Row icon="phone" label="Téléphone" value={fmt(client.telephone)} strong />
                <Row icon="email" label="Email" value={fmt(client.email)} />
                <Row icon="location_city" label="Ville" value={fmt(client.ville)} />
                <Row icon="map" label="Pays" value={fmt(client.pays)} />
                <Row icon="home" label="Adresse" value={fmt(client.adresse)} />
            </Section>

            <Section title="Divers">
                <Row icon="block" label="Liste noire" value={OUI_NON(client.liste_noire)} />
                <Row icon="notes" label="Remarques" value={fmt(client.remarques)} />
            </Section>

            <Section title="Activité">
                <Row icon="receipt_long" label="Nombre de contrats" value={fmt(client.contrats_count ?? 0)} strong />
                <Row icon="directions_car" label="Dernier véhicule loué" value={lastRental ? lastRental.vehicle : '—'} />
                <Row icon="event" label="Date dernier contrat" value={lastRental ? lastRental.date : '—'} />
            </Section>
        </InfoModal>
    );
};

export default ClientInfoModal;
