import React, { useState } from 'react';
import ErrorBanner from './ui/ErrorBanner';
import { CheckboxInput } from '@astryxdesign/core';
import Card from './ui/Card';
import { translateOr } from '../i18n/helpers';
import api from '../api';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input, Textarea } from './ui/Input';
import Modal from './ui/Modal';
import { VEHICLE_ACCESSORIES } from '../utils/vehicleAccessories';
import { useI18n } from '../i18n/context';

const ActivateReservationModal = ({ isOpen, onClose, contract, onActivated }) => {
    const { t } = useI18n();
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
            setError(t('u.erreur_lors_de_la_validation_veu'));
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
            title={t('u.activation_de_la_rservation')}
            subtitle={t('u.renseignez_l_tat_du_vhicule_au_m')}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>{t('u.annuler')}</Button>
                    <Button type="submit" form="activate-form" size="lg" icon="play_circle" loading={loading}>
                        {loading ? t('u.activation_en_cours') : t('u.activer_le_contrat')}
                    </Button>
                </>
            )}
        >
            <ErrorBanner message={error} className="mb-5" />

            <form id="activate-form" onSubmit={handleSubmit} className="space-y-6">
                <Card padding={6} variant="default">
                    {sectionTitle('speed', t('u.kilomtrage_carburant'))}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label={t('u.kilomtrage_au_dpart')} required>
                            <Input
                                type="number" min="0" required
                                value={formData.km_sortie}
                                onChange={(e) => setFormData({ ...formData, km_sortie: e.target.value })}
                            />
                        </Field>
                        <div>
                            <p className="label mb-2">{t('u.niveau_de_carburant')}</p>
                            <FuelGaugeSelector
                                value={formData.carburant_sortie}
                                onChange={(val) => setFormData({ ...formData, carburant_sortie: val })}
                            />
                        </div>
                    </div>
                </Card>

                <Card padding={6} variant="default">
                    {sectionTitle('checklist', t('u.accessoires_inclus'))}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {VEHICLE_ACCESSORIES.map((item) => (
                            <CheckboxInput key={item.id} label={translateOr(t, `acc.${item.id}`, item.label)} value={Boolean(formData[item.id])} onChange={(c) => setFormData({ ...formData, [item.id]: c })} />
                        ))}
                    </div>
                </Card>

                <Card padding={6} variant="default">
                    {sectionTitle('car_crash', t('u.tat_dgts_au_dpart'))}
                    <DamageSelector
                        damages={formData.damages}
                        onChange={(newDamages) => setFormData({ ...formData, damages: newDamages })}
                        type="DEPART"
                    />
                    <div className="mt-6">
                        <Field label={t('u.observation_gnrale_optionnel')}>
                            <Textarea
                                rows={2}
                                placeholder={t('u.dommages_mineurs_rayures_propret')}
                                value={formData.degats_depart}
                                onChange={(e) => setFormData({ ...formData, degats_depart: e.target.value })}
                            />
                        </Field>
                    </div>
                </Card>
            </form>
        </Modal>
    );
};

export default ActivateReservationModal;
