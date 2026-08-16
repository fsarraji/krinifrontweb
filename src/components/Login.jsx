import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

/* ── Styles injectés en JS pour éviter Tailwind CDN dans Vite ── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .kricar-login-root {
    font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  .kricar-grid-bg {
    background-color: #f8fafc;
    background-image:
      linear-gradient(rgba(37,99,235,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37,99,235,.045) 1px, transparent 1px);
    background-size: 42px 42px;
  }

  .kricar-glass {
    background: rgba(255,255,255,.78);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  @keyframes kricar-float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-12px); }
  }
  .kricar-float { animation: kricar-float 7s ease-in-out infinite; }

  @keyframes kricar-fade-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kricar-fade-in { animation: kricar-fade-in .55s ease both; }

  .kricar-input {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box;
  }
  .kricar-input::placeholder { color: #94a3b8; }
  .kricar-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,.15);
  }

  .kricar-btn {
    width: 100%;
    padding: 14px 0;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #fff;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: .02em;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(37,99,235,.35);
    transition: transform .18s, box-shadow .18s, background .18s;
  }
  .kricar-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(37,99,235,.40);
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  }
  .kricar-btn:disabled { opacity: .65; cursor: not-allowed; }

  .kricar-btn-spinner {
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: kricar-spin .7s linear infinite;
  }
  @keyframes kricar-spin { to { transform: rotate(360deg); } }

  .kricar-error {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    color: #b91c1c;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 600;
    animation: kricar-fade-in .3s ease both;
  }

  .kricar-brand-panel {
    background: linear-gradient(135deg, #172554 0%, #1e40af 55%, #2563eb 100%);
    position: relative;
    overflow: hidden;
    display: none;
  }
  @media (min-width: 1024px) { .kricar-brand-panel { display: flex; } }

  .kricar-dots-bg {
    position: absolute; inset: 0; opacity: .10;
    background-image: radial-gradient(circle at 20% 20%, white 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .kricar-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border-radius: 9999px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.16);
    padding: 8px 18px;
    font-size: 13.5px;
    font-weight: 500;
    color: #fff;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .kricar-badge-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #93c5fd;
    box-shadow: 0 0 12px rgba(147,197,253,.9);
    flex-shrink: 0;
  }

  .kricar-feature-card {
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .kricar-feature-icon {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: rgba(255,255,255,.12);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .kricar-right-panel {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }
  @media (min-width: 1024px) { .kricar-right-panel { width: 50%; min-height: unset; } }

  .kricar-form-card {
    width: 100%;
    max-width: 440px;
    background: rgba(255,255,255,.90);
    border: 1.5px solid #e2e8f0;
    border-radius: 20px;
    padding: 40px 36px;
    box-shadow: 0 25px 70px -20px rgba(30,64,175,.18);
    box-sizing: border-box;
    position: relative;
    z-index: 1;
  }

  .kricar-label {
    display: block;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #64748b;
    margin-bottom: 6px;
  }
`;

/* ── Logo from public/logo.png ── */
const KricarLogo = ({ size = 40 }) => (
  <img src="/logo.png" alt="KRICAR" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
);

/* ── Feature pill for brand panel ── */
const FeaturePill = ({ icon, label }) => (
  <div className="kricar-feature-card">
    <div className="kricar-feature-icon">
      <span className="material-symbols-outlined" style={{ color: '#93c5fd', fontSize: 20 }}>{icon}</span>
    </div>
    <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{label}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
const Login = () => {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('token/', { username, password });
      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError("Impossible de se connecter au serveur, réessayez plus tard.");
      } else if (err.response.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response.data?.non_field_errors?.length) {
        setError(err.response.data.non_field_errors[0]);
      } else if (err.response.status === 401) {
        setError("Nom d'utilisateur ou mot de passe incorrect !");
      } else {
        setError(`Une erreur est survenue (${err.response.status})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="kricar-login-root" style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>

        {/* ── LEFT: Brand Panel ── */}
        <section
          className="kricar-brand-panel"
          style={{ flex: '0 0 50%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 64px' }}
        >
          <div className="kricar-dots-bg" />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 36 }}>

            {/* Badge */}
            <div>
              <span className="kricar-badge">
                <span className="kricar-badge-dot" />
                Gestion intelligente de votre agence
              </span>
            </div>


            {/* Headline */}
            <div>
              <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
                Le standard de précision<br />pour votre agence.
              </h1>
              <p style={{ color: 'rgba(255,255,255,.70)', fontSize: 15, lineHeight: 1.6, margin: '12px 0 0' }}>
                Plateforme intelligente dédiée aux gestionnaires modernes de parc automobile.
              </p>
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FeaturePill icon="directions_car" label="Gestion complète de flotte en temps réel" />
              <FeaturePill icon="receipt_long"   label="Contrats & réservations automatisés" />
              <FeaturePill icon="bar_chart"       label="Tableaux de bord & rapports financiers" />
            </div>

            {/* Footer */}
            <div style={{ color: 'rgba(255,255,255,.40)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Kricar Agency © 2026
            </div>
          </div>
        </section>

        {/* ── RIGHT: Login Form ── */}
        <section className="kricar-grid-bg kricar-right-panel">
          {/* Decorative blobs */}
          <div style={{
            position: 'absolute', top: -160, left: -160,
            width: 384, height: 384, borderRadius: '50%',
            background: 'rgba(147,197,253,.25)', filter: 'blur(72px)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -160, right: -160,
            width: 480, height: 480, borderRadius: '50%',
            background: 'rgba(96,165,250,.15)', filter: 'blur(72px)', pointerEvents: 'none',
          }} />

          <div className="kricar-form-card kricar-glass kricar-fade-in">

            {/* Logo + brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <KricarLogo size={44} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-.01em' }}>
                  KRICAR <span style={{ color: '#2563eb' }}>Agency</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Espace de gestion
                </div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 6px' }}>
                Autorisation
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Bienvenue</h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '8px 0 0', fontWeight: 500 }}>
                Accédez à votre espace de gestion de flotte
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="kricar-error" style={{ marginBottom: 20 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>error</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Username */}
              <div>
                <label className="kricar-label" htmlFor="username">Nom d'utilisateur</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', fontSize: 18, pointerEvents: 'none',
                  }}>person</span>
                  <input
                    className="kricar-input"
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Votre nom d'utilisateur"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="kricar-label" htmlFor="password">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', fontSize: 18, pointerEvents: 'none',
                  }}>lock</span>
                  <input
                    className="kricar-input"
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 42, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      display: 'flex', alignItems: 'center', padding: 4,
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button className="kricar-btn" type="submit" id="login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="kricar-btn-spinner" />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              Accès réservé aux utilisateurs autorisés
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Login;