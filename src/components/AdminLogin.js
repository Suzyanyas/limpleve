import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AdminLogin.css';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('SUPABASE AUTH ERROR:', error.name, error.status, error.message);
      setError('Email ou senha incorretos.');
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-header">
          <img src="/images/logo-limpleve.png" alt="LimpLeve" className="login-logo" />
          <p className="login-subtitle">Painel de Gestão</p>
        </div>

        <form onSubmit={doLogin} className="login-form" noValidate>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
