import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AdminLogin.css';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase processa o token do hash automaticamente ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setError('Link inválido ou expirado. Peça um novo convite.');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError('Erro ao definir senha. Tente novamente.');
    } else {
      navigate('/admin', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="admin-login">
      <div className="login-card">
        <div className="login-header">
          <img src="/images/logo-limpleve.png" alt="LimpLeve" className="login-logo" />
          <p className="login-subtitle">Criar senha de acesso</p>
        </div>

        {!ready ? (
          <div className="login-error" style={{ marginTop: 8 }}>
            {error || 'Verificando convite...'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label>Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                autoFocus
              />
            </div>
            <div className="login-field">
              <label>Confirmar senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar senha e entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
