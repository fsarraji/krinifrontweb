import { apiErrorText } from '../utils/apiErrorText';
import ErrorBanner from './ui/ErrorBanner';
import React, { useState } from 'react';
import api from '../api';
import { UNIQUE_FIELDS, UNIQUE_MSG, checkUnique as apiCheckUnique } from '../utils/clientUniqueness';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input } from './ui/Input';
import Modal from './ui/Modal';
import { useI18n } from '../i18n/context';

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
    const { t } = useI18n();
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
            setError(t('u.corrigez_d_abord_les_champs_en_d', { fields: duplicates.map((k) => UNIQUE_FIELDS[k]).join(', ') }));
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
            setError(apiErrorText(err, t('u.une_erreur_est_survenue_2')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={t('u.nouveau_client_rapide')}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose}>{t('u.annuler')}</Button>
                    <Button type="submit" form="quick-client-form" loading={loading}>{t('u.crer_et_slectionner')}</Button>
                </>
            )}
        >
            <form id="quick-client-form" onSubmit={handleSubmit} className="space-y-5">
                <ErrorBanner message={error} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={t('u.prnom')} required>
                        <Input name="prenom" value={formData.prenom} onChange={handleChange} required placeholder={t('u.ex_adam')} />
                    </Field>
                    <Field label={t('u.nom')} required>
                        <Input name="nom" value={formData.nom} onChange={handleChange} required placeholder={t('u.ex_bennett')} />
                    </Field>
                    <Field label={t('u.cin_passeport')} required error={uniqueErrors.cin_passport || undefined}>
                        <Input
                            name="cin_passport" value={formData.cin_passport} onChange={handleChange}
                            onBlur={handleBlurUnique('cin_passport')} required placeholder={t('u.ex_ab123456')}
                            invalid={Boolean(uniqueErrors.cin_passport)}
                        />
                    </Field>
                    <Field label={t('u.tlphone')} required error={uniqueErrors.telephone || undefined}>
                        <Input
                            name="telephone" value={formData.telephone} onChange={handleChange}
                            onBlur={handleBlurUnique('telephone')} required placeholder="+212 6..."
                            invalid={Boolean(uniqueErrors.telephone)}
                        />
                    </Field>
                    <Field label={t('u.permis_de_conduire')} required className="sm:col-span-2" error={uniqueErrors.permis_conduite || undefined}>
                        <Input
                            name="permis_conduite" value={formData.permis_conduite} onChange={handleChange}
                            onBlur={handleBlurUnique('permis_conduite')} required placeholder={t('u.numro_de_permis')}
                            invalid={Boolean(uniqueErrors.permis_conduite)}
                        />
                    </Field>
                </div>
            </form>
        </Modal>
    );
};

export default AddClientModal;
