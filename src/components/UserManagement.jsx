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
            toast.error(t('u.erreur_lors_de_l_enregistrement__3'));
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
        return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
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

            <div className="card rounded-token shadow-l1 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-start border-b border-stroke" style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">{t('u.utilisateur')}</th>
                                <th className="px-6 py-4">{t('u.agence')}</th>
                                <th className="px-6 py-4">{t('u.rle')}</th>
                                <th className="px-6 py-4">{t('u.statut')}</th>
                                <th className="px-6 py-4 text-end">{t('u.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4">
                                        <EmptyState
                                            icon="person_off"
                                            title={t('u.aucun_utilisateur')}
                                            description={t('u.crez_un_premier_utilisateur_pour')}
                                        />
                                    </td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="group hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center font-bold text-primary">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{user.username}</p>
                                                <p className="text-[10px] text-on-surface-variant">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{user.agency_name || t('u.systme_super_admin')}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-semibold text-on-surface-variant">{roleOptions.find((r) => r.value === user.role)?.label || user.role}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge
                                            variant={user.is_active ? 'success' : 'neutral'}
                                            appearance="dot"
                                            label={user.is_active ? t('u.actif') : t('u.inactif')}
                                        />
                                    </td>
                                    <td className="px-6 py-5 text-end">
                                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity justify-end">
                                            <Button variant="ghost" iconOnly icon="edit" aria-label={t('u.modifier')} onClick={() => openModal(user)} />
                                            <Button variant="ghost" iconOnly icon="delete" className="!text-error hover:!bg-error/10" aria-label={t('u.supprimer')} onClick={() => handleDelete(user.id)} />
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
                title={isEditing ? t('u.modifier_l_utilisateur') : t('u.ajouter_un_utilisateur')}
                labelId="user-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>{t('u.annuler')}</Button>
                        <Button type="submit" form="user-form" icon="save">{t('u.enregistrer')}</Button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label={t('u.nom_d_utilisateur')} required>
                            <input className="field w-full" type="text" value={form.username} onChange={(e) => setField('username', e.target.value)} required />
                        </Field>
                        <Field label={t('u.email')}>
                            <input className="field w-full" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label={t('u.prnom')}>
                            <input className="field w-full" type="text" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                        </Field>
                        <Field label={t('u.nom')}>
                            <input className="field w-full" type="text" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
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
                            <input
                                className="field w-full"
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