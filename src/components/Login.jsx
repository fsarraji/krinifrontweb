import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
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

            const decodedToken = jwtDecode(access);
            console.log("Utilisateur :", decodedToken.username);
            console.log("Agence :", decodedToken.agency_name);
            console.log("Rôle :", decodedToken.role);

            navigate('/dashboard');

        } catch (err) {
            if (!err.response) {
                setError("Erreur de connexion : Vérifiez que le serveur Django est bien lancé sur le port 8000.");
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
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Side: Image Banner */}
            <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
                <img
                    alt="Luxury Car Interior"
                    className="h-full w-full object-cover opacity-60"
                    src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                            <span className="material-symbols-outlined text-2xl">directions_car</span>
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight">KRINI</span>
                    </div>
                    <div className="max-w-md space-y-4">
                        <h2 className="text-3xl font-extrabold tracking-tight leading-tight">Le standard de précision pour la gestion de flotte.</h2>
                        <p className="text-slate-300 text-sm font-medium leading-relaxed">Plateforme intelligente dédiée aux gestionnaires modernes de parc automobile.</p>
                    </div>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        KRINI Flotte © 2026
                    </div>
                </div>
            </section>

            {/* Right Side: Login Form */}
            <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
                <div className="w-full max-w-md space-y-8 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
                    {/* Header Section */}
                    <header className="space-y-2">
                        <div className="lg:hidden flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
                                <span className="material-symbols-outlined text-2xl">directions_car</span>
                            </div>
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">KRINI</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Autorisation</p>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bienvenue</h1>
                        <p className="text-xs font-medium text-slate-500">Accédez à votre espace de gestion de flotte</p>
                    </header>

                    {error && (
                        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5" htmlFor="username">
                                Nom d'utilisateur
                            </label>
                            <input
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold shadow-sm transition-all"
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5" htmlFor="password">
                                Mot de passe
                            </label>
                            <input
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold shadow-sm transition-all"
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
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
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