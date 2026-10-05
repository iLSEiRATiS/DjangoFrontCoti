import { useEffect, useState } from 'react';
import { FaLock, FaScrewdriverWrench, FaTriangleExclamation, FaUserShield } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../context/StoreConfigContext';
import api from '../lib/api';
import logo from '../assets/logo-coti-optimized.webp';
import './MaintenanceGate.css';

const isInternalUser = (user) => Boolean(
  user && (user.isStaff || user.is_staff || user.isSuperuser || user.is_superuser || ['admin', 'operator'].includes(user.role))
);

function LoadingScreen() {
  return (
    <main className="maintenance-screen maintenance-screen--loading" aria-live="polite">
      <img className="maintenance-logo" src={logo} alt="Coti Store" />
      <span className="maintenance-loader" aria-hidden="true" />
      <p>Preparando la tienda...</p>
    </main>
  );
}

function TeamAccess({ onSuccess }) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api.auth.login({ email, password });
      if (!isInternalUser(result.user)) {
        setError('Esta cuenta no tiene acceso durante el mantenimiento.');
        return;
      }
      onSuccess(result);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="maintenance-team-access" aria-label="Acceso del equipo">
      <button className="maintenance-team-toggle" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <FaUserShield aria-hidden="true" />
        Acceso del equipo
      </button>
      {expanded && (
        <form className="maintenance-login-form" onSubmit={submit}>
          <label htmlFor="maintenance-email">Correo</label>
          <input id="maintenance-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="maintenance-password">Contrasena</label>
          <input id="maintenance-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="maintenance-login-error" role="alert">{error}</p>}
          <button className="maintenance-login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      )}
    </section>
  );
}

function MaintenanceScreen({ title, message, onLogin }) {
  return (
    <main className="maintenance-screen">
      <div className="maintenance-orbit maintenance-orbit--one" aria-hidden="true" />
      <div className="maintenance-orbit maintenance-orbit--two" aria-hidden="true" />
      <div className="maintenance-content">
        <img className="maintenance-logo" src={logo} alt="Coti Store" />
        <div className="maintenance-mark" aria-hidden="true"><FaScrewdriverWrench /></div>
        <p className="maintenance-status"><FaLock aria-hidden="true" /> Tienda temporalmente pausada</p>
        <h1>{title}</h1>
        <p className="maintenance-message">{message}</p>
        <div className="maintenance-note"><FaTriangleExclamation aria-hidden="true" /> No hace falta hacer nada: volveremos a estar disponibles pronto.</div>
        <TeamAccess onSuccess={onLogin} />
      </div>
    </main>
  );
}

function MaintenanceBanner() {
  return (
    <aside className="maintenance-banner" role="status">
      <FaScrewdriverWrench aria-hidden="true" />
      <span><strong>Modo mantenimiento activo.</strong> La tienda esta bloqueada para clientes.</span>
    </aside>
  );
}

export default function MaintenanceGate({ children }) {
  const { config, loading: configLoading } = useStoreConfig();
  const { user, loading: authLoading, login } = useAuth();
  const maintenanceActive = Boolean(config?.maintenanceMode);
  const internalUser = isInternalUser(user);

  useEffect(() => {
    document.body.classList.toggle('maintenance-banner-visible', maintenanceActive && internalUser);
    return () => document.body.classList.remove('maintenance-banner-visible');
  }, [maintenanceActive, internalUser]);

  if (configLoading || authLoading) return <LoadingScreen />;
  if (maintenanceActive && !internalUser) {
    return <MaintenanceScreen title={config.maintenanceTitle} message={config.maintenanceMessage} onLogin={login} />;
  }
  return <>{maintenanceActive && <MaintenanceBanner />}{children}</>;
}
