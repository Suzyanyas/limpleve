import { useState } from 'react';
import { getAppPin, setAppPin } from '../services/managementService';
import toast from 'react-hot-toast';
import './PinSettings.css';

const PIN_LENGTH = 4;

export default function PinSettings() {
  const [step, setStep] = useState('current'); // current | new | confirm
  const [current, setCurrent] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeValue = step === 'current' ? current : step === 'new' ? newPin : confirmPin;
  const setActive = step === 'current' ? setCurrent : step === 'new' ? setNewPin : setConfirmPin;

  const handleDigit = (d) => {
    setError('');
    if (activeValue.length < PIN_LENGTH) setActive(p => p + d);
  };

  const handleDelete = () => {
    setError('');
    setActive(p => p.slice(0, -1));
  };

  const handleNext = async () => {
    if (step === 'current') {
      setSaving(true);
      const stored = await getAppPin();
      setSaving(false);
      if (current === stored) {
        setStep('new');
        setError('');
      } else {
        setError('PIN atual incorreto');
        setCurrent('');
      }
    } else if (step === 'new') {
      if (newPin.length < PIN_LENGTH) { setError(`PIN deve ter ${PIN_LENGTH} dígitos`); return; }
      setStep('confirm');
      setError('');
    } else {
      if (confirmPin !== newPin) {
        setError('PINs não coincidem');
        setConfirmPin('');
        setStep('new');
        setNewPin('');
        return;
      }
      setSaving(true);
      const r = await setAppPin(newPin);
      setSaving(false);
      if (r.success) {
        toast.success('PIN alterado com sucesso!');
        setCurrent(''); setNewPin(''); setConfirmPin('');
        setStep('current');
      } else {
        toast.error('Erro ao salvar PIN');
      }
    }
  };

  const titles = {
    current: 'PIN atual',
    new: 'Novo PIN',
    confirm: 'Confirmar novo PIN',
  };

  const dots = (value) =>
    Array.from({ length: PIN_LENGTH }).map((_, i) => (
      <div key={i} className={`ps-dot ${i < value.length ? 'filled' : ''} ${error && step !== 'confirm' ? 'error' : ''}`} />
    ));

  return (
    <div className="pin-settings">
      <div className="ps-card">
        <div className="ps-title">🔐 Alterar PIN de acesso</div>
        <div className="ps-steps">
          {['current', 'new', 'confirm'].map((s, i) => (
            <div key={s} className={`ps-step ${step === s ? 'active' : i < ['current','new','confirm'].indexOf(step) ? 'done' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>

        <div className="ps-label">{titles[step]}</div>
        <div className="ps-dots">{dots(activeValue)}</div>
        {error && <div className="ps-error">{error}</div>}

        <div className="ps-pad">
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} className="ps-btn" onClick={() => handleDigit(String(d))}>{d}</button>
          ))}
          <button className="ps-btn ps-btn-empty" disabled />
          <button className="ps-btn" onClick={() => handleDigit('0')}>0</button>
          <button className="ps-btn ps-btn-delete" onClick={handleDelete}>⌫</button>
        </div>

        <button
          className="ps-confirm-btn"
          onClick={handleNext}
          disabled={activeValue.length < PIN_LENGTH || saving}
        >
          {saving ? 'Verificando...' : step === 'confirm' ? 'Salvar PIN' : 'Próximo →'}
        </button>
      </div>
    </div>
  );
}
