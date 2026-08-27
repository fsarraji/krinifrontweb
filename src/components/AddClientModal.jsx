import React, { useState } from 'react';
import api from '../api';

const UNIQUE_FIELDS = {
    cin_passport: 'CIN/passeport',
    email: 'email',
    telephone: 'téléphone',
    permis_conduite: 'permis de conduire',
};

/**
 * Modale de création rapide de client.
 * Utilisée dans ContractForm, ReservationForm, et AddContract.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onClientCreated: (client) => void
 */
const AddClientModal = ({ isOpen, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        email: '',
        telephone: '',
        adresse: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uniqueErrors, setUniqueErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (UNIQUE_FIELDS[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const checkUnique = async (field, value) => {
        if (!value || !value.trim()) {
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
            return;
        }
        try {
            const res = await api.get('clients/check-unique/', {
                params: { field, value: value.trim() }
            });
            setUniqueErrors(prev => ({
                ...prev,
                [field]: res.data.available === false
                    ? `Un client de votre agence utilise déjà cet ${UNIQUE_FIELDS[field]}.`
                    : false
            }));
        } catch {
            setUniqueErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    const fieldClass = (name) => `field ${uniqueErrors[name] ? 'border-danger bg-danger-bg/40' : ''}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duplicates = Object.keys(UNIQUE_FIELDS).filter(k => uniqueErrors[k]);
        if (duplicates.length > 0) {
            setError(`Corrigez d'abord les champs en double : ${duplicates.map(k => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('clients/', formData);
            onClientCreated(response.data);
            onClose();
            setFormData({
                prenom: '', nom: '', cin_passport: '', email: '',
                telephone: '', adresse: '', permis_conduite: '',
                date_delivrance_permis: '', remarques: ''
            });
            setUniqueErrors({});
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden border border-stroke">
                <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--stroke)' }}>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>Nouveau Client Rapide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <div className="p-3 text-xs rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label mb-2">Prénom</label>
                            <input name="prenom" value={formData.prenom} onChange={handleChange} required className="field" placeholder="ex. Adam" />
                        </div>
                        <div>
                            <label className="label mb-2">Nom</label>
                            <input name="nom" value={formData.nom} onChange={handleChange} required className="field" placeholder="ex. Bennett" />
                        </div>
                        <div>
                            <label className="label mb-2">CIN / Passeport</label>
                            <input name="cin_passport" value={formData.cin_passport} onChange={handleChange} onBlur={handleBlurUnique('cin_passport')} required className={fieldClass('cin_passport')} placeholder="ex. AB123456" />
                            {uniqueErrors.cin_passport && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.cin_passport}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="label mb-2">Téléphone</label>
                            <input name="telephone" value={formData.telephone} onChange={handleChange} onBlur={handleBlurUnique('telephone')} required className={fieldClass('telephone')} placeholder="+212 6..." />
                            {uniqueErrors.telephone && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.telephone}
                                </p>
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className="label mb-2">Permis de Conduire</label>
                            <input name="permis_conduite" value={formData.permis_conduite} onChange={handleChange} onBlur={handleBlurUnique('permis_conduite')} required className={fieldClass('permis_conduite')} placeholder="Numéro de permis" />
                            {uniqueErrors.permis_conduite && (
                                <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                    <span className="material-symbols-outlined text-[13px]">error</span>
                                    {uniqueErrors.permis_conduite}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border font-bold text-sm card" style={{ color: 'var(--on-surface-variant)' }}>Annuler</button>
                        <button type="submit" disabled={loading} className="flex-[2] px-4 py-3 rounded-lg text-white font-bold text-sm disabled:opacity-50" style={{ background: 'var(--primary-container)' }}>
                            {loading ? 'Création...' : 'Créer et Sélectionner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
