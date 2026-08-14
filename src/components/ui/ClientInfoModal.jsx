import React from 'react';

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);
const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(String(iso).slice(0, 10));
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const OUI_NON = (v) => (v ? 'Oui' : 'Non');
const SEXE = (v) => (v === 'HOMME' ? 'Homme' : v === 'FEMME' ? 'Femme' : fmt(v));

const Row = ({ icon, label, value, strong }) => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-stroke last:border-0">
        <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--on-surface-variant)', opacity: 0.8 }}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
        </span>
        <span className={`text-[13px] ${strong ? 'font-bold' : 'font-semibold'}`} style={{ color: strong ? 'var(--primary-container)' : 'var(--on-surface)' }}>
            {value}
        </span>
    </div>
);

const Section = ({ title, children }) => (
    <div className="mt-5">
        <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>{title}</p>
        <div className="card rounded-token p-4 shadow-l1">{children}</div>
    </div>
);

const ClientInfoModal = ({ isOpen, client, onClose }) => {
    if (!isOpen || !client) return null;

    const fullName = `${client.prenom || ''} ${client.nom || ''}`.trim();
    const isDeleted = !!client.is_deleted;
    const lastRental = client.last_rental;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold font-headline text-on-surface">Fiche client</h2>
                        <p className="text-sm text-on-surface-variant mt-0.5">{fullName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-surface flex-1">
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
                </div>
            </div>
        </div>
    );
};

export default ClientInfoModal;
