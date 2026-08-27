import React, { useState } from 'react';
import api from '../api';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';
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
        statut: 'EN_COURS'
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
                    console.error("Erreur lors du changement de statut du véhicule", vErr);
                }
            }
            onActivated();
            onClose();
        } catch (err) {
            console.error("Erreur lors de l'activation", err);
            setError("Erreur lors de la validation. Veuillez vérifier les informations.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Activation de la Réservation</h2>
                        <p className="text-sm text-on-surface-variant mt-1">Renseignez l'état du véhicule au moment précis du départ.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant">close</span>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-surface flex-1">
                    {error && (
                        <div className="mb-6 bg-error/10 text-error p-4 rounded-xl border border-error/20 flex gap-3 items-center">
                            <span className="material-symbols-outlined">error</span>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form id="activate-form" onSubmit={handleSubmit} className="space-y-8">
                        {/* Section 1: Vehicle Basics */}
                        <section className="bg-white p-6 rounded-xl border border-outline-variant/30">
                            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">speed</span>
                                Kilométrage & Carburant
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-3 ml-1">Kilos au Départ</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">KM</span>
                                        <input 
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 text-base font-bold focus:ring-2 focus:ring-primary/20" 
                                            type="number" 
                                            value={formData.km_sortie}
                                            onChange={(e) => setFormData({...formData, km_sortie: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <label className="block text-xs uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Niveau de Carburant</label>
                                    <FuelGaugeSelector 
                                        value={formData.carburant_sortie}
                                        onChange={(val) => setFormData({...formData, carburant_sortie: val})}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Accessories */}
                        <section className="bg-white p-6 rounded-xl border border-outline-variant/30">
                            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">checklist</span>
                                Accessoires Inclus
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {VEHICLE_ACCESSORIES.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => setFormData({...formData, [item.id]: !formData[item.id]})}
                                        className={`p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${formData[item.id] ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {formData[item.id] ? 'check_box' : 'check_box_outline_blank'}
                                        </span>
                                        <span className="text-xs font-bold">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Section 3: Damages */}
                        <section className="bg-white p-6 rounded-xl border border-outline-variant/30">
                            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">car_crash</span>
                                État & Dégâts au Départ
                            </h3>
                            <DamageSelector 
                                damages={formData.damages}
                                onChange={(newDamages) => setFormData({...formData, damages: newDamages})}
                                type="DEPART"
                            />
                            <div className="mt-6">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Observation Générale (Optionnel)</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" 
                                    placeholder="Dommages mineurs, rayures, propreté..." 
                                    rows="2"
                                    value={formData.degats_depart}
                                    onChange={(e) => setFormData({...formData, degats_depart: e.target.value})}
                                ></textarea>
                            </div>
                        </section>

                    </form>
                </div>

                <div className="p-6 border-t border-outline-variant/30 bg-white flex gap-4 shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-colors text-slate-600"
                    >
                        Annuler
                    </button>
                    <button 
                        form="activate-form"
                        type="submit" 
                        disabled={loading} 
                        className="flex-1 bg-primary text-white py-3 rounded-xl font-headline font-bold text-lg hover:bg-primary/90 transition-transform hover:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin hidden">progress_activity</span>}
                        <span className="material-symbols-outlined">play_circle</span>
                        {loading ? 'Activation en cours...' : 'Activer le Contrat'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivateReservationModal;
