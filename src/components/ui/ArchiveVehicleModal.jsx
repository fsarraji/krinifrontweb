import React, { useState } from 'react';
import api from '../../api';
import { toast } from '../Toast';
import Button from './Button';
import Field from './Field';
import { Input } from './Input';
import Modal from './Modal';

const ArchiveVehicleModal = ({ isOpen, vehicle, onClose, onArchived }) => {
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !vehicle) return null;

    const today = new Date().toISOString().slice(0, 10);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date) {
            setError('Indiquez la date de fin de travail.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.patch(`vehicles/${vehicle.id}/`, { is_archived: true, date_fin_travail: date });
            toast.success('Véhicule archivé.');
            onArchived();
            onClose();
        } catch (err) {
            console.error('Erreur archivage', err);
            setError(err.response?.data?.detail || "Impossible d'archiver le véhicule.");
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="md"
            title="Archiver le véhicule"
            subtitle={`${vehicle.matricule} · ${vehicle.marque_name || vehicle.marque} ${vehicle.modele_name || vehicle.modele}`}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button type="submit" form="archive-vehicle-form" loading={loading}>Archiver</Button>
                </>
            )}
        >
            <form id="archive-vehicle-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start gap-3 rounded-token p-4 bg-info-bg">
                    <span className="material-symbols-outlined text-[20px] text-info" aria-hidden="true">info</span>
                    <p className="text-sm font-medium text-on-surface-variant">
                        Le véhicule sera retiré de la flotte active. Indiquez la date de fin de travail pour l'archiver.
                    </p>
                </div>

                {error && (
                    <div role="alert" className="flex items-start gap-3 rounded-token p-4 bg-danger-bg">
                        <span className="material-symbols-outlined text-[20px] text-danger" aria-hidden="true">error</span>
                        <p className="text-sm font-medium text-danger-dark">{error}</p>
                    </div>
                )}

                <Field label="Date de fin de travail" required>
                    <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
                </Field>
            </form>
        </Modal>
    );
};

export default ArchiveVehicleModal;
