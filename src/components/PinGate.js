import { useState, useEffect } from 'react';
import { getAppPin, setAppPin } from '../services/managementService';
import './PinGate.css';


export default function PinGate({ onUnlock, onClose }) {
  const [mode, setMode] = useState('loading'); // loading | enter | create | confirm
  const [input, setInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [storedPin, setStoredPin] = useState(null);
  const PIN_LENGTH = 4;

  useEffect(() => {
    getAppPin().then(pin => {
      setStoredPin(pin);
      setMode(pin ? 'enter' : 'create');
    });
  }, []);

  const handleDigit = (d) => {
    setError('');
    if (mode === 'confirm') {
      if (confirm.length < PIN_LENGTH) setConfirm(p => p + d);
    } else {
      if (input.length < PIN_LENGTH) setInput(p => p + d);
    }
  };

  const handleDelete = () => {
    setError('');
    if (mode === 'confirm') {
      setConfirm(p => p.slice(0, -1));
    } else {
      setInput(p => p.slice(0, -1));
    }
  };

  // Teclado físico
  useEffect(() => {
    if (mode === 'loading') return;
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, input, confirm]);

  // Auto-submete quando atingir 4 dígitos
  useEffect(() => {
    if (mode === 'enter' && input.length === PIN_LENGTH) {
      if (input === storedPin) {
        onUnlock();
      } else {
        setError('PIN incorreto');
        setTimeout(() => { setInput(''); setError(''); }, 700);
      }
    }
  }, [input, mode, storedPin, onUnlock]);

  useEffect(() => {
    if (mode === 'create' && input.length === PIN_LENGTH) {
      setConfirm('');
      setMode('confirm');
    }
  }, [input, mode]);

  useEffect(() => {
    if (mode === 'confirm' && confirm.length === PIN_LENGTH) {
      if (confirm === input) {
        setAppPin(input).then(r => {
          if (r.success) {
            onUnlock();
          } else {
            setError('Erro ao salvar PIN');
            setInput(''); setConfirm(''); setMode('create');
          }
        });
      } else {
        setError('PINs não coincidem');
        setTimeout(() => { setConfirm(''); setError(''); setMode('create'); setInput(''); }, 800);
      }
    }
  }, [confirm, input, mode, onUnlock]);

  const dots = (value) =>
    Array.from({ length: PIN_LENGTH }).map((_, i) => (
      <div key={i} className={`pin-dot ${i < value.length ? 'filled' : ''} ${error ? 'error' : ''}`} />
    ));

  const title = mode === 'create' ? 'Criar PIN de acesso'
    : mode === 'confirm' ? 'Confirmar PIN'
    : 'Acesso restrito';

  const subtitle = mode === 'create' ? 'Digite um PIN de 4 dígitos'
    : mode === 'confirm' ? 'Digite o PIN novamente'
    : 'Digite o PIN para continuar';

  if (mode === 'loading') return null;

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div className="pin-modal" onClick={e => e.stopPropagation()}>
        <div className="pin-header">
          <div className="pin-icon">🔐</div>
          <div className="pin-title">{title}</div>
          <div className="pin-subtitle">{subtitle}</div>
        </div>

        <div className="pin-dots">
          {dots(mode === 'confirm' ? confirm : input)}
        </div>

        {error && <div className="pin-error">{error}</div>}

        <div className="pin-pad">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} className="pin-btn" onClick={() => handleDigit(String(d))}>{d}</button>
          ))}
          <button className="pin-btn pin-btn-empty" disabled />
          <button className="pin-btn" onClick={() => handleDigit('0')}>0</button>
          <button className="pin-btn pin-btn-delete" onClick={handleDelete}>⌫</button>
        </div>

        {onClose && (
          <button className="pin-cancel" onClick={onClose}>Cancelar</button>
        )}
      </div>
    </div>
  );
}
