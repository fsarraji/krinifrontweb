import React, { useState } from 'react';
import api from '../../api';
import { toast } from '../Toast';

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
            console.error("Erreur archivage", err);
            setError(err.response?.data?.detail || "Impossible d'archiver le véhicule.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold font-headline text-on-surface">Archiver le véhicule</h2>
                        <p className="text-sm text-on-surface-variant mt-0.5">{vehicle.matricule} · {vehicle.marque_name || vehicle.marque} {vehicle.modele_name || vehicle.modele}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--info-bg)' }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--info)' }}>info</span>
                        <p className="text-sm font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                            Le véhicule sera retiré de la flotte active. Indiquez la date de fin de travail pour l'archiver.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--error-bg)' }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--danger)' }}>error</span>
                            <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1.5" htmlFor="date_fin_travail">
                            Date de fin de travail *
                        </label>
                        <input
                            id="date_fin_travail"
                            type="date"
                            value={date}
                            min={today}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-token text-sm font-medium border border-stroke focus:outline-none focus:ring-2"
                            style={{ background: 'var(--card-white)', color: 'var(--on-surface)' }}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-token text-sm font-bold card shadow-l1 transition-colors hover:bg-slate-50"
                            style={{ color: 'var(--on-surface-variant)' }}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2.5 rounded-token text-sm font-bold text-white shadow-l1 transition-opacity hover:opacity-90 flex items-center gap-2"
                            style={{ background: 'var(--primary-container)' }}
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                            Archiver
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ArchiveVehicleModal;
