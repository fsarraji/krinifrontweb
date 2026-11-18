import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import Button from './ui/Button';
import Field from './ui/Field';
import { Input } from './ui/Input';
import { hasSession, setTokens } from '../utils/session';
import LanguageSwitcher from './ui/LanguageSwitcher';
import { useI18n } from '../i18n/context';

const FEATURES = [
    { icon: 'directions_car', labelKey: 'login.feature1' },
    { icon: 'receipt_long', labelKey: 'login.feature2' },
    { icon: 'bar_chart', labelKey: 'login.feature3' },
];

const loginErrorMessage = (err, t) => {
    if (!err.response) return t('login.error.noServer');
    const data = err.response.data;
    if (data?.detail) return data.detail;
    if (data?.non_field_errors?.length) return data.non_field_errors[0];
    if (err.response.status === 401) return t('login.error.badCredentials');
    return t('login.error.generic', { status: err.response.status });
};

// Champ avec icône à gauche (et action optionnelle à droite).
const IconInput = ({ icon, right, className = '', ...props }) => (
    <div className="relative">
        <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-text-disabled text-[18px] pointer-events-none" aria-hidden="true">
            {icon}
        </span>
        <Input className={`ps-10 ${right ? 'pe-11' : ''} ${className}`} {...props} />
        {right}
    </div>
);

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useI18n();

    // Déjà connecté : inutile de revoir l'écran de connexion.
    if (hasSession()) return <Navigate to="/dashboard" replace />;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('token/', { username, password });
            setTokens({ access: data.access, refresh: data.refresh });
            navigate('/dashboard');
        } catch (err) {
            setError(loginErrorMessage(err, t));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-app-bg font-sans">
            {/* Panneau de marque (desktop) */}
            <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center px-16 py-12 bg-gradient-to-br from-indigo-950 via-primary-deep to-primary">
                <div
                    className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]"
                    aria-hidden="true"
                />
                <div className="relative z-10 max-w-[480px] w-full flex flex-col gap-9">
                    <span className="inline-flex items-center gap-2.5 self-start rounded-full bg-white/10 border border-white/15 px-4 py-2 text-label-lg font-medium text-white backdrop-blur">
                        <span className="w-2 h-2 rounded-full bg-primary-border shadow-[0_0_12px_var(--primary-border)]" aria-hidden="true" />
                        {t('login.tagline')}
                    </span>

                    <div>
                        <h1 className="text-headline-lg text-white font-extrabold leading-tight">
                            {t('login.headline1')}<br />{t('login.headline2')}
                        </h1>
                        <p className="text-body-md text-white/70 mt-3">
                            {t('login.subtitle')}
                        </p>
                    </div>

                    <ul className="flex flex-col gap-2.5">
                        {FEATURES.map((f) => (
                            <li key={f.icon} className="flex items-start gap-3 rounded-xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                                <span className="w-9 h-9 rounded-token bg-white/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-primary-border text-[20px]" aria-hidden="true">{f.icon}</span>
                                </span>
                                <span className="text-sm font-medium text-white/85 leading-relaxed">{t(f.labelKey)}</span>
                            </li>
                        ))}
                    </ul>

                    <p className="text-label-sm uppercase tracking-widest text-white/40">Kricar Agency © {new Date().getFullYear()}</p>
                </div>
            </section>

            {/* Formulaire */}
            <section className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-8 relative overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-border/25 blur-[72px] pointer-events-none" aria-hidden="true" />
                <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full bg-blue-600/10 blur-[72px] pointer-events-none" aria-hidden="true" />

                <div className="absolute top-4 end-4 z-20">
                    <LanguageSwitcher compact />
                </div>

                <div className="relative z-10 w-full max-w-[440px] bg-white/90 backdrop-blur border border-stroke rounded-2xl p-8 sm:p-10 shadow-l2">
                    <div className="flex items-center gap-3 mb-7">
                        <img src="/logo.png" alt="" width={44} height={44} className="object-contain" />
                        <div>
                            <p className="text-xl font-extrabold tracking-tight text-on-surface">
                                KRICAR <span className="text-primary">Agency</span>
                            </p>
                            <p className="text-label-sm uppercase tracking-wider text-text-disabled">{t('login.workspace')}</p>
                        </div>
                    </div>

                    <div className="mb-7">
                        <p className="text-label-sm uppercase tracking-widest text-primary mb-1.5">{t('login.authorization')}</p>
                        <h1 className="text-3xl font-extrabold text-on-surface leading-tight">{t('login.welcome')}</h1>
                        <p className="text-sm font-medium text-text-muted mt-2">{t('login.welcomeSub')}</p>
                    </div>

                    {error && (
                        <div role="alert" className="mb-5 flex items-start gap-2 rounded-token border-s-4 border-danger bg-danger-bg px-4 py-3 text-sm font-semibold text-danger-dark">
                            <span className="material-symbols-outlined text-[18px] mt-px" aria-hidden="true">error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate={false}>
                        <Field label={t('login.username')} required>
                            <IconInput
                                icon="person"
                                name="username"
                                type="text"
                                placeholder={t('login.usernamePlaceholder')}
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </Field>

                        <Field label={t('login.password')} required>
                            <IconInput
                                icon="lock"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                right={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-token text-text-disabled hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                        aria-pressed={showPassword}
                                    >
                                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                }
                            />
                        </Field>

                        <Button type="submit" size="lg" loading={loading} className="w-full" id="login-submit">
                            {loading ? t('login.signingIn') : t('login.signIn')}
                        </Button>
                    </form>

                    <p className="text-center mt-6 text-xs font-medium text-text-disabled">
                        {t('login.restricted')}
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Login;
