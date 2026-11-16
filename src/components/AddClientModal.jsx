import React, { useState } from 'react';
import api from '../api';
import { UNIQUE_FIELDS, UNIQUE_MSG, checkUnique as apiCheckUnique } from '../utils/clientUniqueness';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input } from './ui/Input';
import Modal from './ui/Modal';

const EMPTY = {
    prenom: '',
    nom: '',
    cin_passport: '',
    email: '',
    telephone: '',
    adresse: '',
    permis_conduite: '',
    date_delivrance_permis: '',
    remarques: '',
};

/**
 * Modale de création rapide de client.
 * Utilisée dans ContractForm et ReservationForm.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onClientCreated: (client) => void
 */
const AddClientModal = ({ isOpen, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uniqueErrors, setUniqueErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (UNIQUE_FIELDS[name]) {
            setUniqueErrors((prev) => ({ ...prev, [name]: false }));
        }
    };

    const checkUnique = async (field, value) => {
        const available = await apiCheckUnique({ field, value });
        setUniqueErrors((prev) => ({ ...prev, [field]: available ? false : UNIQUE_MSG(field) }));
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duplicates = Object.keys(UNIQUE_FIELDS).filter((k) => uniqueErrors[k]);
        if (duplicates.length > 0) {
            setError(`Corrigez d'abord les champs en double : ${duplicates.map((k) => UNIQUE_FIELDS[k]).join(', ')}`);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('clients/', formData);
            onClientCreated(response.data);
            onClose();
            setFormData(EMPTY);
            setUniqueErrors({});
        } catch (err) {
            console.error('Error creating client:', err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : 'Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title="Nouveau client rapide"
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button type="submit" form="quick-client-form" loading={loading}>Créer et sélectionner</Button>
                </>
            )}
        >
            <form id="quick-client-form" onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div role="alert" className="p-3 text-xs rounded-token bg-danger-bg text-danger-dark">{error}</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Prénom" required>
                        <Input name="prenom" value={formData.prenom} onChange={handleChange} required placeholder="ex. Adam" />
                    </Field>
                    <Field label="Nom" required>
                        <Input name="nom" value={formData.nom} onChange={handleChange} required placeholder="ex. Bennett" />
                    </Field>
                    <Field label="CIN / Passeport" required error={uniqueErrors.cin_passport || undefined}>
                        <Input
                            name="cin_passport" value={formData.cin_passport} onChange={handleChange}
                            onBlur={handleBlurUnique('cin_passport')} required placeholder="ex. AB123456"
                            invalid={Boolean(uniqueErrors.cin_passport)}
                        />
                    </Field>
                    <Field label="Téléphone" required error={uniqueErrors.telephone || undefined}>
                        <Input
                            name="telephone" value={formData.telephone} onChange={handleChange}
                            onBlur={handleBlurUnique('telephone')} required placeholder="+212 6..."
                            invalid={Boolean(uniqueErrors.telephone)}
                        />
                    </Field>
                    <Field label="Permis de conduire" required className="sm:col-span-2" error={uniqueErrors.permis_conduite || undefined}>
                        <Input
                            name="permis_conduite" value={formData.permis_conduite} onChange={handleChange}
                            onBlur={handleBlurUnique('permis_conduite')} required placeholder="Numéro de permis"
                            invalid={Boolean(uniqueErrors.permis_conduite)}
                        />
                    </Field>
                </div>
            </form>
        </Modal>
    );
};

export default AddClientModal;
