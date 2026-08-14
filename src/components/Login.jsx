import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('token/', {
                username,
                password
            });

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);

            navigate('/dashboard');

        } catch (err) {
            if (!err.response) {
                setError("Impossible de se connecter au serveur, réessayez plus tard.");
            } else if (err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else if (err.response.data && err.response.data.non_field_errors && err.response.data.non_field_errors.length) {
                setError(err.response.data.non_field_errors[0]);
            } else if (err.response.status === 401) {
                setError("Nom d'utilisateur ou mot de passe incorrect !");
            } else {
                setError("Une erreur est survenue (" + err.response.status + ")");
            }
        }
    };

    return (
        <div className="min-h-screen bg-app-bg flex">
            {/* Left Side: Image Banner */}
            <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-on-surface">
                <img
                    alt="Luxury Car Interior"
                    className="h-full w-full object-cover opacity-60"
                    src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface via-on-surface/40 to-transparent"></div>
                <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Logo Kricar Agency" className="w-10 h-10 object-contain" />
                        <span className="text-2xl font-extrabold tracking-tight">
                            <span style={{ color: '#000000' }}>Kricar</span>{' '}
                            <span style={{ color: 'var(--primary)' }}>Agency</span>
                        </span>
                    </div>
                    <div className="max-w-md space-y-4">
                        <h2 className="text-display text-white">Le standard de précision pour la gestion de flotte.</h2>
                        <p className="text-surface-container-high text-body-md leading-relaxed">Plateforme intelligente dédiée aux gestionnaires modernes de parc automobile.</p>
                    </div>
                    <div className="text-surface-container-low text-label-sm font-bold uppercase tracking-widest">
                        Kricar Agency © 2026
                    </div>
                </div>
            </section>

            {/* Right Side: Login Form */}
            <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
                <div className="w-full max-w-md space-y-8 bg-card-white border border-stroke p-8 rounded-lg shadow-l1">
                    {/* Header Section */}
                    <header className="space-y-2">
                        <div className="lg:hidden flex items-center gap-3 mb-6">
                            <img src="/logo.svg" alt="Logo Kricar Agency" className="w-10 h-10 object-contain" />
                            <span className="text-2xl font-extrabold text-on-surface tracking-tight">
                                <span style={{ color: '#000000' }}>Kricar</span>{' '}
                                <span style={{ color: 'var(--primary)' }}>Agency</span>
                            </span>
                        </div>
                        <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-widest">Autorisation</p>
                        <h1 className="text-headline-lg text-on-surface">Bienvenue</h1>
                        <p className="text-body-sm font-medium text-on-surface-variant">Accédez à votre espace de gestion de flotte</p>
                    </header>

                    {error && (
                        <div className="bg-danger-bg border-l-4 border-danger text-danger p-4 rounded-lg text-body-sm font-semibold">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1.5" htmlFor="username">
                                Nom d'utilisateur
                            </label>
                            <input
                                className="input-field block w-full px-4 py-3 bg-card-white placeholder-on-surface-variant/50 text-body-md font-semibold transition-all"
                                id="username"
                                name="username"
                                placeholder="Nom d'utilisateur"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-label-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1.5" htmlFor="password">
                                Mot de passe
                            </label>
                            <input
                                className="input-field block w-full px-4 py-3 bg-card-white placeholder-on-surface-variant/50 text-body-md font-semibold transition-all"
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            className="w-full bg-primary hover:bg-primary-deep text-white py-3.5 rounded-lg font-semibold text-label-sm shadow-l1 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                            type="submit"
                        >
                            <span>Se connecter</span>
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
};

export default Login;