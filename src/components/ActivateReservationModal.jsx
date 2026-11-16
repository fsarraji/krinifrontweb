import React, { useState } from 'react';
import api from '../api';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { VEHICLE_ACCESSORIES } from '../utils/vehicleAccessories';

const ActivateReservationModal = ({ isOpen, onClose, contract, onActivated }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        km_sortie: contract?.vehicle_details?.kilometrage || 0,
        carburant_sortie: '2/8',
        degats_depart: '',
        damages: [],
        roue_secours: false,
        cric: false,
        manivelle: false,
        gilet: false,
        triangle: false,
        extincteur: false,
        papiers: false,
        cles: true,
        statut: 'EN_COURS',
    });

    if (!isOpen || !contract) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.patch(`contracts/${contract.id}/`, formData);
            if (contract.vehicle) {
                try {
                    await api.patch(`vehicles/${contract.vehicle}/`, { statut: 'Rented' });
                } catch (vErr) {
                    console.error('Erreur lors du changement de statut du véhicule', vErr);
                }
            }
            onActivated();
            onClose();
        } catch (err) {
            console.error("Erreur lors de l'activation", err);
            setError('Erreur lors de la validation. Veuillez vérifier les informations.');
            setLoading(false);
        }
    };

    const sectionTitle = (icon, text) => (
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">{icon}</span>
            {text}
        </h3>
    );

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="xl"
            title="Activation de la réservation"
            subtitle="Renseignez l'état du véhicule au moment précis du départ."
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button type="submit" form="activate-form" size="lg" icon="play_circle" loading={loading}>
                        {loading ? 'Activation en cours…' : 'Activer le contrat'}
                    </Button>
                </>
            )}
        >
            {error && (
                <div role="alert" className="mb-6 bg-danger-bg text-danger-dark p-4 rounded-token border border-danger-border flex gap-3 items-center">
                    <span className="material-symbols-outlined" aria-hidden="true">error</span>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <form id="activate-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="bg-white p-6 rounded-token border border-stroke">
                    {sectionTitle('speed', 'Kilométrage & carburant')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Kilométrage au départ" required>
                            <Input
                                type="number" min="0" required
                                value={formData.km_sortie}
                                onChange={(e) => setFormData({ ...formData, km_sortie: e.target.value })}
                            />
                        </Field>
                        <div>
                            <p className="label mb-2">Niveau de carburant</p>
                            <FuelGaugeSelector
                                value={formData.carburant_sortie}
                                onChange={(val) => setFormData({ ...formData, carburant_sortie: val })}
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 rounded-token border border-stroke">
                    {sectionTitle('checklist', 'Accessoires inclus')}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {VEHICLE_ACCESSORIES.map((item) => (
                            <label
                                key={item.id}
                                className={`p-3 rounded-token border flex items-center gap-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-primary/30 ${formData[item.id] ? 'border-primary bg-primary-light text-primary' : 'border-stroke text-text-muted hover:bg-surface-hover'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={Boolean(formData[item.id])}
                                    onChange={() => setFormData({ ...formData, [item.id]: !formData[item.id] })}
                                />
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                    {formData[item.id] ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                <span className="text-xs font-bold">{item.label}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <section className="bg-white p-6 rounded-token border border-stroke">
                    {sectionTitle('car_crash', 'État & dégâts au départ')}
                    <DamageSelector
                        damages={formData.damages}
                        onChange={(newDamages) => setFormData({ ...formData, damages: newDamages })}
                        type="DEPART"
                    />
                    <div className="mt-6">
                        <Field label="Observation générale (optionnel)">
                            <Textarea
                                rows={2}
                                placeholder="Dommages mineurs, rayures, propreté…"
                                value={formData.degats_depart}
                                onChange={(e) => setFormData({ ...formData, degats_depart: e.target.value })}
                            />
                        </Field>
                    </div>
                </section>
            </form>
        </Modal>
    );
};

export default ActivateReservationModal;
