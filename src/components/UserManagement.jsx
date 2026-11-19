import React, { useState } from 'react';
import PageLoading from './ui/PageLoading';
import { apiErrorText } from '../utils/apiErrorText';
import Table from './ui/Table';
import { Input } from './ui/Input';
import api from '../api';
import useFetchAll from '../hooks/useFetchAll';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Field from './ui/Field';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import PageHeader from './ui/PageHeader';
import { useI18n } from '../i18n/context';

const EMPTY_FORM = { username: '', email: '', firstName: '', lastName: '', role: 'EMPLOYEE', agency: '', password: '', isActive: true };

const ROLE_OPTIONS = [
    { value: 'OWNER', labelKey: 'u.propritaire_agence' },
    { value: 'EMPLOYEE', labelKey: 'u.employ' },
];

const ACTIVE_OPTIONS = [
    { value: 'true', labelKey: 'u.actif' },
    { value: 'false', labelKey: 'u.inactif' },
];

const toForm = (user) => ({
    id: user.id,
    username: user.username || '',
    email: user.email || '',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    role: user.role || 'EMPLOYEE',
    agency: user.agency ? String(user.agency) : '',
    password: '',
    isActive: user.is_active !== false,
});

const toPayload = (form) => {
    const payload = {
        username: form.username,
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        role: form.role,
        agency: form.agency || null,
        is_active: form.isActive,
    };
    if (form.password) payload.password = form.password;
    return payload;
};

const UserManagement = () => {
    const { t } = useI18n();
    const tOpts = (opts) => opts.map((o) => ({ value: o.value, label: t(o.labelKey) }));
    const roleOptions = tOpts(ROLE_OPTIONS);
    const activeOptions = tOpts(ACTIVE_OPTIONS);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: users, loading, refetch: fetchUsers } = useFetchAll('users/');
    const { data: agencies } = useFetchAll('agencies/');

    const openModal = (user = null) => {
        setForm(user ? toForm(user) : EMPTY_FORM);
        setIsEditing(Boolean(user));
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                await api.put(`users/${form.id}/`, toPayload(form));
            } else {
                await api.post('users/', toPayload(form));
            }
            closeModal();
            await fetchUsers();
            toast.success(isEditing ? t('u.utilisateur_mis_jour_avec_succs') : t('u.utilisateur_cr_avec_succs'));
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error(apiErrorText(error, t('u.erreur_lors_de_l_enregistrement__3')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        messageBox.danger(t('u.supprimer_cet_utilisateur'), t('u.supprimer_l_utilisateur'), {
            onConfirm: async () => {
                try {
                    await api.delete(`users/${id}/`);
                    await fetchUsers();
                    toast.success(t('u.utilisateur_supprim_avec_succs'));
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error(t('u.erreur_lors_de_la_suppression'));
                }
            }
        });
    };

    if (loading) {
        return <PageLoading />;
    }

    return (
        <>
            <PageHeader
                eyebrow={t('u.administration_systme')}
                title={t('u.gestion_des_utilisateurs')}
                actions={
                    <Button icon="person_add" size="lg" onClick={() => openModal()}>
                        {t('u.nouvel_utilisateur')}
                    </Button>
                }
            />

            <Table
                caption={t('u.gestion_des_utilisateurs')}
                rows={users}
                emptyTitle={t('u.aucun_utilisateur')}
                emptyDescription={t('u.crez_un_premier_utilisateur_pour')}
                columns={[
                    {
                        key: 'username', label: t('u.utilisateur'),
                        render: (_, user) => (
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center font-bold text-primary shrink-0">
                                    {user.username[0].toUpperCase()}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">{user.username}</p>
                                    <p className="text-label-sm font-normal text-text-muted">{user.email}</p>
                                </div>
                            </div>
                        ),
                    },
                    { key: 'agency_name', label: t('u.agence'), render: (v) => v || t('u.systme_super_admin') },
                    { key: 'role', label: t('u.rle'), render: (v) => roleOptions.find((r) => r.value === v)?.label || v },
                    {
                        key: 'is_active', label: t('u.statut'),
                        render: (v) => <StatusBadge variant={v ? 'success' : 'neutral'} appearance="dot" label={v ? t('u.actif') : t('u.inactif')} />,
                    },
                    {
                        key: 'actions', label: t('u.actions'), align: 'right',
                        render: (_, user) => (
                        <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" iconOnly icon="edit" aria-label={t('u.modifier')} onClick={() => openModal(user)} />
                            <Button variant="ghost" iconOnly icon="delete" aria-label={t('u.supprimer')} onClick={() => handleDelete(user.id)} />
                        </div>
                        ),
                    },
                ]}
            />

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? t('u.modifier_l_utilisateur') : t('u.ajouter_un_utilisateur')}
                labelId="user-modal-title"
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal}>{t('u.annuler')}</Button>
                        <Button type="submit" form="user-form" loading={saving} icon="save">{t('u.enregistrer')}</Button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label={t('u.nom_d_utilisateur')} required>
                            <Input type="text" value={form.username} onChange={(e) => setField('username', e.target.value)} required />
                        </Field>
                        <Field label={t('u.email')}>
                            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label={t('u.prnom')}>
                            <Input type="text" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                        </Field>
                        <Field label={t('u.nom')}>
                            <Input type="text" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                        </Field>
                        <Field label={t('u.agence')}>
                            <Dropdown
                                options={[
                                    { value: '', label: t('u.aucune_super_admin') },
                                    ...agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))
                                ]}
                                value={form.agency || ''}
                                onChange={(v) => setField('agency', v || '')}
                            />
                        </Field>
                        <Field label={t('u.rle')}>
                            <Dropdown
                                options={roleOptions}
                                value={form.role}
                                onChange={(v) => setField('role', v)}
                            />
                        </Field>
                        <Field label={t('u.mot_de_passe')} hint={isEditing ? t('u.laisser_vide_pour_ne_pas_changer') : undefined}>
                            <Input
                               
                                type="password"
                                value={form.password}
                                onChange={(e) => setField('password', e.target.value)}
                                required={!isEditing}
                            />
                        </Field>
                        <Field label={t('u.statut')}>
                            <Dropdown
                                options={activeOptions}
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(v) => setField('isActive', v === 'true')}
                            />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default UserManagement;