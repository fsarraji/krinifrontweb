import React, { useEffect, useState } from 'react';
import api from '../../api';
import { toast } from '../Toast';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorBanner from '../ui/ErrorBanner';
import Field from '../ui/Field';
import FileField from '../ui/FileField';
import { Input } from '../ui/Input';
import PageHeader from '../ui/PageHeader';
import PageLoading from '../ui/PageLoading';
import { useI18n } from '../../i18n/context';

const EDITABLE = ['telephone', 'email', 'adresse', 'ville', 'pays'];

// Mon profil : coordonnées modifiables et documents (CIN/permis) envoyés en multipart.
// Le nom, le CIN et le nom d'utilisateur sont fixés par l'agence et restent affichés seulement.
export default function ClientProfile() {
    const { t } = useI18n();
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({});
    const [files, setFiles] = useState({ scan_cin: null, scan_permis: null });
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [saving, setSaving] = useState(false);

    const retry = () => {
        setError(false);
        setAttempt((n) => n + 1);
    };

    useEffect(() => {
        let cancelled = false;
        api.get('clients/me/')
            .then((res) => {
                if (cancelled) return;
                setProfile(res.data);
                setForm(Object.fromEntries(EDITABLE.map((k) => [k, res.data[k] || ''])));
            })
            .catch(() => !cancelled && setError(true));
        return () => { cancelled = true; };
    }, [attempt]);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body = new FormData();
            EDITABLE.forEach((k) => body.append(k, form[k] ?? ''));
            if (files.scan_cin) body.append('scan_cin', files.scan_cin);
            if (files.scan_permis) body.append('scan_permis', files.scan_permis);
            const res = await api.patch('clients/me/', body, { headers: { 'Content-Type': 'multipart/form-data' } });
            setProfile(res.data);
            setFiles({ scan_cin: null, scan_permis: null });
            toast.success(t('client.profile.saved'));
        } catch (err) {
            const detail = err.response?.data && typeof err.response.data === 'object'
                ? Object.values(err.response.data).flat().join(' ')
                : '';
            toast.error(detail || t('client.profile.saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (error) return <ErrorBanner message={t('client.loadError')} onRetry={retry} />;
    if (!profile) return <PageLoading variant="cards" />;

    return (
        <div className="space-y-6">
            <PageHeader title={t('client.profile.title')} description={t('client.profile.subtitle')} />

            <form id="client-profile-form" onSubmit={submit} className="space-y-6">
                <Card padding={5}>
                    <h2 className="text-label-sm uppercase tracking-wider text-text-muted mb-4">{t('client.profile.identity')}</h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-text-muted">{t('client.profile.username')}</dt>
                            <dd className="font-semibold">{profile.username}</dd>
                        </div>
                        <div>
                            <dt className="text-text-muted">{t('client.profile.name')}</dt>
                            <dd className="font-semibold">{profile.prenom} {profile.nom}</dd>
                        </div>
                        <div>
                            <dt className="text-text-muted">{t('client.profile.cin')}</dt>
                            <dd className="font-semibold font-mono">{profile.cin_passport || '—'}</dd>
                        </div>
                    </dl>
                </Card>

                <Card padding={5}>
                    <h2 className="text-label-sm uppercase tracking-wider text-text-muted mb-4">{t('client.profile.contact')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t('client.profile.phone')}>
                            <Input type="tel" name="telephone" value={form.telephone || ''} onChange={set('telephone')} />
                        </Field>
                        <Field label={t('client.profile.email')}>
                            <Input type="email" name="email" value={form.email || ''} onChange={set('email')} />
                        </Field>
                        <Field label={t('client.profile.address')} className="sm:col-span-2">
                            <Input name="adresse" value={form.adresse || ''} onChange={set('adresse')} />
                        </Field>
                        <Field label={t('client.profile.city')}>
                            <Input name="ville" value={form.ville || ''} onChange={set('ville')} />
                        </Field>
                        <Field label={t('client.profile.country')}>
                            <Input name="pays" value={form.pays || ''} onChange={set('pays')} />
                        </Field>
                    </div>
                </Card>

                <Card padding={5}>
                    <h2 className="text-label-sm uppercase tracking-wider text-text-muted mb-1">{t('client.profile.documents')}</h2>
                    <p className="text-sm text-text-muted mb-4">{t('client.profile.docsHint')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FileField
                            label={t('client.profile.scanCin')}
                            accept="image/*,application/pdf"
                            placeholder={t('client.profile.chooseFile')}
                            value={files.scan_cin}
                            description={profile.scan_cin ? t('client.profile.uploaded') : undefined}
                            onChange={(f) => setFiles((x) => ({ ...x, scan_cin: f }))}
                        />
                        <FileField
                            label={t('client.profile.scanPermis')}
                            accept="image/*,application/pdf"
                            placeholder={t('client.profile.chooseFile')}
                            value={files.scan_permis}
                            description={profile.scan_permis ? t('client.profile.uploaded') : undefined}
                            onChange={(f) => setFiles((x) => ({ ...x, scan_permis: f }))}
                        />
                    </div>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" form="client-profile-form" icon="save" loading={saving}>
                        {t('client.profile.save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
