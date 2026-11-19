import React, { useState } from 'react';
import { apiErrorText } from '../utils/apiErrorText';
import Table from './ui/Table';
import { Input, Textarea } from './ui/Input';
import api from '../api';
import useFetchAll from '../hooks/useFetchAll';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Field from './ui/Field';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import PageHeader from './ui/PageHeader';
import { useI18n } from '../i18n/context';

const EMPTY_FORM = { name: '', address: '', city: '', telephone: '', email: '', rc: '', ice: '', isActive: true };

const toForm = (agency) => ({
    id: agency.id,
    name: agency.nom_agence || '',
    address: agency.adresse || '',
    city: agency.ville || '',
    telephone: agency.telephone || '',
    email: agency.email || '',
    rc: agency.rc || '',
    ice: agency.ice || '',
    isActive: agency.is_active !== false,
});

const toPayload = (form) => ({
    nom_agence: form.name,
    adresse: form.address,
    ville: form.city,
    telephone: form.telephone,
    email: form.email,
    rc: form.rc,
    ice: form.ice,
    is_active: form.isActive,
});

const AgencyManagement = () => {
    const { t } = useI18n();
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: agencies, loading, refetch: fetchAgencies } = useFetchAll('agencies/');

    const openModal = (agency = null) => {
        setForm(agency ? toForm(agency) : EMPTY_FORM);
        setIsEditing(Boolean(agency));
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                await api.put(`agencies/${form.id}/`, toPayload(form));
            } else {
                await api.post('agencies/', toPayload(form));
            }
            closeModal();
            await fetchAgencies();
            toast.success(isEditing ? t('u.agence_mise_jour_avec_succs') : t('u.agence_cre_avec_succs'));
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'agence", error);
            toast.error(apiErrorText(error, t('u.erreur_lors_de_l_enregistrement__2')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        messageBox.danger(t('u.tes_vous_sr_de_vouloir_supprimer_3'), t('u.supprimer_l_agence'), {
            onConfirm: async () => {
                try {
                    await api.delete(`agencies/${id}/`);
                    await fetchAgencies();
                    toast.success(t('u.agence_supprime_avec_succs'));
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error(t('u.erreur_lors_de_la_suppression'));
                }
            }
        });
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
    }

    return (
        <>
            <PageHeader
                eyebrow={t('u.administration_systme')}
                title={t('u.gestion_des_agences')}
                actions={
                    <Button icon="add" size="lg" onClick={() => openModal()}>
                        {t('u.nouvelle_agence')}
                    </Button>
                }
            />

            <Table
                caption={t('u.gestion_des_agences')}
                rows={agencies}
                emptyTitle={t('u.aucune_agence')}
                emptyDescription={t('u.crez_une_premire_agence_pour_com')}
                columns={[
                    {
                        key: 'nom_agence', label: t('u.agence'),
                        render: (_, agency) => (
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-bold text-primary overflow-hidden shrink-0">
                                    {agency.logo
                                        ? <img src={agency.logo} alt="logo" className="w-full h-full object-cover" />
                                        : agency.nom_agence[0]}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">{agency.nom_agence}</p>
                                    <p className="text-label-sm font-normal text-text-muted">ICE: {agency.ice || '-'}{agency.ville ? ` · ${agency.ville}` : ''}</p>
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'email', label: t('u.contact'),
                        render: (_, agency) => (
                            <div>
                                <p className="text-sm font-medium">{agency.email}</p>
                                <p className="text-label-sm font-normal text-text-muted">{agency.telephone}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'is_active', label: t('u.statut'),
                        render: (v) => <StatusBadge variant={v ? 'success' : 'neutral'} appearance="dot" label={v ? t('u.actif') : t('u.inactif')} />,
                    },
                    {
                        key: 'actions', label: t('u.actions'), align: 'right',
                        render: (_, agency) => (
                        <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" iconOnly icon="edit" aria-label={t('u.modifier')} onClick={() => openModal(agency)} />
                            <Button variant="ghost" iconOnly icon="delete" aria-label={t('u.supprimer')} onClick={() => handleDelete(agency.id)} />
                        </div>
                        ),
                    },
                ]}
            />

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? t('u.modifier_l_agence') : t('u.ajouter_une_agence')}
                labelId="agency-modal-title"
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal}>{t('u.annuler')}</Button>
                        <Button type="submit" form="agency-form" loading={saving} icon="save">{t('u.enregistrer')}</Button>
                    </>
                }
            >
                <form id="agency-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label={t('u.nom_de_l_agence')} required>
                            <Input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                        </Field>
                        <Field label={t('u.tlphone')} required>
                            <Input type="text" value={form.telephone} onChange={(e) => setField('telephone', e.target.value)} required />
                        </Field>
                        <Field label={t('u.email')}>
                            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label={t('u.statut')}>
                            <Dropdown
                                options={[{ value: 'true', label: t('u.actif') }, { value: 'false', label: t('u.inactif') }]}
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(v) => setField('isActive', v === 'true')}
                            />
                        </Field>
                        <Field label="RC">
                            <Input type="text" value={form.rc} onChange={(e) => setField('rc', e.target.value)} />
                        </Field>
                        <Field label="ICE">
                            <Input type="text" value={form.ice} onChange={(e) => setField('ice', e.target.value)} />
                        </Field>
                        <Field label={t('u.ville')} className="md:col-span-2">
                            <Input type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                        </Field>
                        <Field label={t('u.adresse')} required className="md:col-span-2">
                            <Textarea value={form.address} onChange={(e) => setField('address', e.target.value)} required />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default AgencyManagement;