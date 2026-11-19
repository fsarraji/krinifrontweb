import React, { useState } from 'react';
import ErrorBanner from './ErrorBanner';
import api from '../../api';
import { toast } from '../Toast';
import Button from './Button';
import Field from './Field';
import { Input } from './Input';
import Modal from './Modal';
import { useI18n } from '../../i18n/context';

const ArchiveVehicleModal = ({ isOpen, vehicle, onClose, onArchived }) => {
    const { t } = useI18n();
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !vehicle) return null;

    const today = new Date().toISOString().slice(0, 10);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date) {
            setError(t('u.indiquez_la_date_de_fin_de_trava'));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.patch(`vehicles/${vehicle.id}/`, { is_archived: true, date_fin_travail: date });
            toast.success(t('u.vhicule_archiv'));
            onArchived();
            onClose();
        } catch (err) {
            console.error('Erreur archivage', err);
            setError(err.response?.data?.detail || t('u.impossible_d_archiver_le_vhicule'));
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="md"
            title={t('u.archiver_le_vhicule')}
            subtitle={`${vehicle.matricule} · ${vehicle.marque_name || vehicle.marque} ${vehicle.modele_name || vehicle.modele}`}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>{t('u.annuler')}</Button>
                    <Button type="submit" form="archive-vehicle-form" loading={loading}>{t('u.archiver')}</Button>
                </>
            )}
        >
            <form id="archive-vehicle-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start gap-3 rounded-token p-4 bg-info-bg">
                    <span className="material-symbols-outlined text-[20px] text-info" aria-hidden="true">info</span>
                    <p className="text-sm font-medium text-on-surface-variant">
                        {t('u.le_vhicule_sera_retir_de_la_flot')}
                    </p>
                </div>

                <ErrorBanner message={error} />

                <Field label={t('u.date_de_fin_de_travail')} required>
                    <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
                </Field>
            </form>
        </Modal>
    );
};

export default ArchiveVehicleModal;
