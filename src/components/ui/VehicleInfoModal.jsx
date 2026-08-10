import React from 'react';
import { resolveImage } from '../../imageUrl';

const fmt = (v, suffix = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`);
const fmtNum = (v, suffix = '') => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('fr-FR')}${suffix}`);
const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(String(iso).slice(0, 10));
    if (isNaN(d.getTime())) return String(iso).slice(0, 10);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const OUI_NON = (v) => (v ? 'Oui' : 'Non');

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

const VehicleInfoModal = ({ isOpen, vehicle, onClose }) => {
    if (!isOpen || !vehicle) return null;

    const statusInfo = vehicle.is_deleted
        ? { label: 'Supprimé', variant: 'danger' }
        : vehicle.is_archived
            ? { label: 'Archivé', variant: 'neutral' }
            : { label: vehicle.statut === 'Available' ? 'Disponible' : vehicle.statut === 'Rented' ? 'Loué' : 'Maintenance', variant: vehicle.statut === 'Available' ? 'success' : vehicle.statut === 'Rented' ? 'info' : 'warning' };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold font-headline text-on-surface">Fiche véhicule</h2>
                        <p className="text-sm text-on-surface-variant mt-0.5">{vehicle.matricule} · {vehicle.marque_name || vehicle.marque} {vehicle.modele_name || vehicle.modele}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-surface flex-1">
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
                            <p className="text-sm font-mono font-bold" style={{ color: 'var(--on-surface-variant)' }}>{vehicle.matricule}</p>
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold"
                                style={{ background: vehicle.is_deleted ? 'var(--error-bg)' : vehicle.is_archived ? 'var(--slate-bg)' : 'var(--success-bg)', color: vehicle.is_deleted ? 'var(--danger)' : vehicle.is_archived ? 'var(--on-surface-variant)' : '#166534' }}>
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
                        <Row icon="person" label="Chauffeur disponible" value={OUI_NON(vehicle.chauffeur_disponible)} />
                        <Row icon="satellite_alt" label="GPS / IMEI" value={fmt(vehicle.gps_imei)} />
                        <Row icon="sim_card" label="Carte SIM" value={fmt(vehicle.sim_number)} />
                        <Row icon="phone_in_talk" label="Opérateur" value={fmt(vehicle.sim_operator)} />
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
                </div>
            </div>
        </div>
    );
};

export default VehicleInfoModal;
