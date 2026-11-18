import React, { useState } from 'react';
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
            toast.error(t('u.erreur_lors_de_l_enregistrement__2'));
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

            <div className="card rounded-token shadow-l1 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-start border-b border-stroke" style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">{t('u.agence')}</th>
                                <th className="px-6 py-4">{t('u.contact')}</th>
                                <th className="px-6 py-4">{t('u.statut')}</th>
                                <th className="px-6 py-4 text-end">{t('u.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {agencies.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4">
                                        <EmptyState
                                            icon="storefront"
                                            title={t('u.aucune_agence')}
                                            description={t('u.crez_une_premire_agence_pour_com')}
                                        />
                                    </td>
                                </tr>
                            ) : agencies.map(agency => (
                                <tr key={agency.id} className="group hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center font-bold text-lg text-primary overflow-hidden">
                                                {agency.logo
                                                    ? <img src={agency.logo} alt="logo" className="w-full h-full object-cover" />
                                                    : agency.nom_agence[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{agency.nom_agence}</p>
                                                <p className="text-[10px] text-on-surface-variant uppercase font-semibold">ICE: {agency.ice || '-'}</p>
                                                {agency.ville && <p className="text-[10px] text-on-surface-variant/60 font-medium">{agency.ville}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{agency.email}</p>
                                        <p className="text-xs text-on-surface-variant">{agency.telephone}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge
                                            variant={agency.is_active ? 'success' : 'neutral'}
                                            appearance="dot"
                                            label={agency.is_active ? t('u.actif') : t('u.inactif')}
                                        />
                                    </td>
                                    <td className="px-6 py-5 text-end">
                                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity justify-end">
                                            <Button variant="ghost" iconOnly icon="edit" aria-label={t('u.modifier')} onClick={() => openModal(agency)} />
                                            <Button variant="ghost" iconOnly icon="delete" className="!text-error hover:!bg-error/10" aria-label={t('u.supprimer')} onClick={() => handleDelete(agency.id)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? t('u.modifier_l_agence') : t('u.ajouter_une_agence')}
                labelId="agency-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>{t('u.annuler')}</Button>
                        <Button type="submit" form="agency-form" icon="save">{t('u.enregistrer')}</Button>
                    </>
                }
            >
                <form id="agency-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label={t('u.nom_de_l_agence')} required>
                            <input className="field w-full" type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                        </Field>
                        <Field label={t('u.tlphone')} required>
                            <input className="field w-full" type="text" value={form.telephone} onChange={(e) => setField('telephone', e.target.value)} required />
                        </Field>
                        <Field label={t('u.email')}>
                            <input className="field w-full" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label={t('u.statut')}>
                            <Dropdown
                                options={[{ value: 'true', label: t('u.actif') }, { value: 'false', label: t('u.inactif') }]}
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(v) => setField('isActive', v === 'true')}
                            />
                        </Field>
                        <Field label="RC">
                            <input className="field w-full" type="text" value={form.rc} onChange={(e) => setField('rc', e.target.value)} />
                        </Field>
                        <Field label="ICE">
                            <input className="field w-full" type="text" value={form.ice} onChange={(e) => setField('ice', e.target.value)} />
                        </Field>
                        <Field label={t('u.ville')} className="md:col-span-2">
                            <input className="field w-full" type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                        </Field>
                        <Field label={t('u.adresse')} required className="md:col-span-2">
                            <textarea className="field w-full min-h-[100px]" value={form.address} onChange={(e) => setField('address', e.target.value)} required />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default AgencyManagement;