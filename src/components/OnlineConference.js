import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaGlobe, FaMoneyBillWave, FaMobile, FaCreditCard, FaLock, FaChartBar, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import {
  getOnlineSession,
  openCashSession,
  closeCashSession,
  getSessionTransactions,
  getTodaySessions,
  getTodayTransactions,
} from '../services/managementService';
import './OnlineConference.css';

const CEDULAS = [
  { label: 'R$ 200', value: 200 },
  { label: 'R$ 100', value: 100 },
  { label: 'R$ 50',  value: 50  },
  { label: 'R$ 20',  value: 20  },
  { label: 'R$ 10',  value: 10  },
  { label: 'R$ 5',   value: 5   },
  { label: 'R$ 2',   value: 2   },
  { label: 'R$ 1',   value: 1   },
  { label: 'R$ 0,50', value: 0.5  },
  { label: 'R$ 0,25', value: 0.25 },
  { label: 'R$ 0,10', value: 0.1  },
  { label: 'R$ 0,05', value: 0.05 },
];

const EMPTY_CEDULAS = Object.fromEntries(CEDULAS.map(c => [c.value, '']));

const calcSaldo = (cedulas) =>
  CEDULAS.reduce((sum, c) => sum + (parseFloat(cedulas[c.value]) || 0) * c.value, 0);

const formatCurrency = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;

const formatPayment = (forma) => {
  const map = { dinheiro: '💵 Dinheiro', pix: '📱 PIX', cartao_debito: '💳 Débito', cartao_credito: '💳 Crédito', boleto: 'Boleto' };
  if (!forma) return '';
  if (forma.startsWith('misto|')) return '🔀 Misto';
  return map[forma] || forma;
};

const calcBuckets = (txs) => {
  let dinheiro = 0, pix = 0, cartao_debito = 0, cartao_credito = 0, cartao_gen = 0, boleto = 0;
  txs.forEach(t => {
    const fp = t.forma_pagamento || '';
    const valor = parseFloat(t.valor);
    if (fp.startsWith('misto|')) {
      fp.split('|').slice(1).forEach(part => {
        const [forma, raw] = part.split(':');
        const v2 = parseFloat(raw) || 0;
        if (forma === 'dinheiro') dinheiro += v2;
        else if (forma === 'pix') pix += v2;
        else if (forma === 'cartao_debito') cartao_debito += v2;
        else if (forma === 'cartao_credito') cartao_credito += v2;
        else if (forma === 'cartao') cartao_gen += v2;
      });
    } else if (fp === 'dinheiro') dinheiro += valor;
    else if (fp === 'pix') pix += valor;
    else if (fp === 'cartao_debito') cartao_debito += valor;
    else if (fp === 'cartao_credito') cartao_credito += valor;
    else if (fp === 'boleto') boleto += valor;
  });
  return { dinheiro, pix, cartao_debito, cartao_credito, cartao_gen, boleto };
};

const fmtHora = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '--:--';

const fmtForma = (fp) => {
  if (!fp) return '—';
  if (fp === 'dinheiro') return 'Dinheiro';
  if (fp === 'pix') return 'PIX';
  if (fp === 'cartao_debito') return 'Cartão Débito';
  if (fp === 'cartao_credito') return 'Cartão Crédito';
  if (fp.startsWith('misto|')) return 'Misto';
  return fp;
};

export default function OnlineConference({ onBack }) {
  const [view, setView] = useState('loading'); // loading | sem-caixa | sessao | fechamento | relatorio
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cedulas, setCedulas] = useState(EMPTY_CEDULAS);
  const [saving, setSaving] = useState(false);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);

  const loadSession = useCallback(async () => {
    const s = await getOnlineSession();
    setSession(s);
    if (s) {
      const txs = await getSessionTransactions(s.id);
      setTransactions(txs);
      setView('sessao');
    } else {
      setView('sem-caixa');
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  const loadReport = async () => {
    const [sessions, txs] = await Promise.all([
      getTodaySessions('online'),
      getTodayTransactions(),
    ]);
    setTodaySessions(sessions);
    setTodayTransactions(txs);
    setView('relatorio');
  };

  const handleOpen = async () => {
    setSaving(true);
    const result = await openCashSession('online', 0, {}, 'online');
    if (result.success) {
      toast.success('Caixa Online aberto!');
      await loadSession();
    } else {
      toast.error('Erro ao abrir caixa online');
    }
    setSaving(false);
  };

  const handleClose = async () => {
    const saldo = calcSaldo(cedulas);
    const detalhes = Object.fromEntries(
      Object.entries(cedulas).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const result = await closeCashSession(session.id, saldo, detalhes);
    if (result.success) {
      toast.success('Caixa Online fechado!');
      setCedulas(EMPTY_CEDULAS);
      await loadReport();
    } else {
      toast.error('Erro ao fechar caixa');
    }
  };

  // Cálculos da sessão activa
  const vendaTxs = transactions.filter(t => t.tipo === 'venda');
  const totalVendas = vendaTxs.reduce((s, t) => s + parseFloat(t.valor), 0);
  const buckets = calcBuckets(vendaTxs);
  const dinheiroEsperado = buckets.dinheiro;
  const saldoContado = calcSaldo(cedulas);
  const diff = saldoContado - dinheiroEsperado;

  if (view === 'loading') {
    return <div className="oc-manager"><div className="cash-empty">Carregando...</div></div>;
  }

  return (
    <div className="oc-manager">

      {/* ── HEADER ── */}
      <div className="cash-header">
        <button className="cash-back-btn" onClick={onBack}>←</button>
        <div className="cash-title">
          <FaGlobe size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          CAIXA ONLINE
        </div>
        {view === 'sessao' && (
          <button className="cash-report-btn" onClick={loadReport}>
            <FaChartBar /> Relatório
          </button>
        )}
      </div>

      {/* ── SEM SESSÃO ── */}
      {view === 'sem-caixa' && (
        <div className="cash-open-card">
          <div className="cash-open-title">
            <FaGlobe style={{ marginRight: 8 }} /> Caixa Online
          </div>
          <p className="oc-hint-text">
            Nenhuma sessão online aberta hoje. Ao abrir, todas as vendas online pagas serão registradas neste caixa automaticamente.
          </p>
          <button className="oc-btn-open" onClick={handleOpen} disabled={saving}>
            {saving ? 'Abrindo...' : 'Abrir Caixa Online'}
          </button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={loadReport}>
            <FaChartBar /> Ver relatório do dia
          </button>
        </div>
      )}

      {/* ── SESSÃO ACTIVA ── */}
      {view === 'sessao' && session && (
        <div className="cash-session-panel">

          <div className="oc-session-header">
            <div className="cash-session-title">
              <FaGlobe size={12} style={{ marginRight: 5 }} />
              Caixa Online • aberto às {fmtHora(session.opened_at)}
            </div>
            <div className="cash-session-saldo-label">total de vendas online</div>
            <div className="cash-session-saldo">{formatCurrency(totalVendas)}</div>

            <div className="oc-buckets">
              {buckets.dinheiro > 0 && (
                <div className="oc-bucket-item">
                  <span className="oc-bucket-label"><FaMoneyBillWave size={11} /> Dinheiro</span>
                  <span className="oc-bucket-value">{formatCurrency(buckets.dinheiro)}</span>
                </div>
              )}
              {buckets.pix > 0 && (
                <div className="oc-bucket-item">
                  <span className="oc-bucket-label"><FaMobile size={11} /> PIX</span>
                  <span className="oc-bucket-value">{formatCurrency(buckets.pix)}</span>
                </div>
              )}
              {(buckets.cartao_debito + buckets.cartao_credito + buckets.cartao_gen) > 0 && (
                <div className="oc-bucket-item">
                  <span className="oc-bucket-label"><FaCreditCard size={11} /> Cartão</span>
                  <span className="oc-bucket-value">
                    {formatCurrency(buckets.cartao_debito + buckets.cartao_credito + buckets.cartao_gen)}
                  </span>
                </div>
              )}
              {buckets.boleto > 0 && (
                <div className="oc-bucket-item">
                  <span className="oc-bucket-label">Boleto</span>
                  <span className="oc-bucket-value">{formatCurrency(buckets.boleto)}</span>
                </div>
              )}
            </div>
          </div>

          <button
            className="cash-action-btn fechar"
            style={{ width: '100%', padding: '14px' }}
            onClick={() => { setCedulas(EMPTY_CEDULAS); setView('fechamento'); }}
          >
            <FaLock style={{ marginRight: 6 }} /> Fechar Caixa Online
          </button>

          <div className="cash-transactions-card">
            <div className="cash-transactions-title">
              Vendas online do turno ({vendaTxs.length})
            </div>
            {vendaTxs.length === 0 ? (
              <div className="cash-empty">Nenhuma venda online registrada ainda</div>
            ) : (
              vendaTxs.slice().reverse().map(tx => (
                <div key={tx.id} className="cash-transaction-item">
                  <div className="cash-tx-left">
                    <span className="cash-tx-name">
                      {tx.observacao || tx.budgets?.customer_name || 'Venda online'}
                    </span>
                    <span className="cash-tx-meta">
                      {fmtHora(tx.created_at)}
                      {tx.forma_pagamento && ` • ${formatPayment(tx.forma_pagamento)}`}
                    </span>
                  </div>
                  <div className="cash-tx-right">
                    <span className="cash-tx-value venda">+{formatCurrency(tx.valor)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── FECHAMENTO ── */}
      {view === 'fechamento' && session && (
        <div className="cash-open-card">
          <div className="cash-open-title">
            <FaLock style={{ marginRight: 6 }} /> Fechar Caixa Online
          </div>
          <p className="oc-hint-text">
            Conte o dinheiro trazido pelos entregadores e informe as cédulas abaixo.
          </p>

          {dinheiroEsperado > 0 && (
            <div className="oc-dinheiro-esperado">
              <FaMoneyBillWave size={13} />
              <span>
                Dinheiro esperado das entregas: <strong>{formatCurrency(dinheiroEsperado)}</strong>
              </span>
            </div>
          )}

          <table className="cedulas-table">
            <thead>
              <tr><th>Cédula/Moeda</th><th>Qtd</th><th>Total</th></tr>
            </thead>
            <tbody>
              {CEDULAS.map(c => (
                <tr key={c.value}>
                  <td className="cedula-label">{c.label}</td>
                  <td>
                    <input
                      type="number"
                      className="cedula-input"
                      min="0"
                      value={cedulas[c.value]}
                      onChange={e => setCedulas(prev => ({ ...prev, [c.value]: e.target.value }))}
                    />
                  </td>
                  <td className="cedula-total">
                    {formatCurrency((parseFloat(cedulas[c.value]) || 0) * c.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {dinheiroEsperado > 0 && (
            <>
              <div className="cash-close-diff">
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Dinheiro esperado</div>
                  <div style={{ fontWeight: 800 }}>{formatCurrency(dinheiroEsperado)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>Contado</div>
                  <div style={{ fontWeight: 800 }}>{formatCurrency(saldoContado)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem' }}>Diferença: </span>
                <span className={Math.abs(diff) < 0.01 ? 'diff-ok' : 'diff-warn'}>
                  {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                  {Math.abs(diff) < 0.01
                    ? <FaCheck style={{ marginLeft: 4 }} />
                    : <FaExclamationTriangle style={{ marginLeft: 4 }} />}
                </span>
              </div>
            </>
          )}

          <button className="btn-close-cash" onClick={handleClose}>
            Confirmar Fechamento
          </button>
          <button
            className="cash-modal-cancel"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => setView('sessao')}
          >
            Voltar
          </button>
        </div>
      )}

      {/* ── RELATÓRIO ── */}
      {view === 'relatorio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            className="cash-modal-cancel"
            onClick={() => session ? setView('sessao') : setView('sem-caixa')}
          >
            ← Voltar
          </button>

          {todaySessions.length === 0 ? (
            <div className="cash-empty">Nenhuma sessão online aberta hoje.</div>
          ) : (
            todaySessions.map(s => {
              const txs = todayTransactions.filter(t => t.session_id === s.id);
              const vTxs = txs.filter(t => t.tipo === 'venda');
              const total = vTxs.reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const b = calcBuckets(vTxs);
              const dinEsperado = b.dinheiro;
              const dinContado = s.saldo_final ?? null;
              const diffRel = dinContado !== null ? dinContado - dinEsperado : null;

              const fmtSessao = (ts) =>
                ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

              return (
                <div key={s.id} className="cash-report-card">

                  {/* Cabeçalho */}
                  <div className="cash-report-title">
                    <FaGlobe size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Caixa Online
                    <span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#888', marginLeft: 8 }}>
                      {fmtSessao(s.opened_at)}
                      {s.closed_at ? ` – ${fmtSessao(s.closed_at)}` : ' – aberto'}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="cash-report-row positivo">
                    <span>Total de vendas online</span>
                    <span>+{formatCurrency(total)}</span>
                  </div>

                  {/* Breakdown por forma de pagamento */}
                  {b.dinheiro > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaMoneyBillWave size={11} /> Dinheiro
                      </span>
                      <span>{formatCurrency(b.dinheiro)}</span>
                    </div>
                  )}
                  {b.pix > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaMobile size={11} /> PIX
                      </span>
                      <span>{formatCurrency(b.pix)}</span>
                    </div>
                  )}
                  {b.cartao_debito > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaCreditCard size={11} /> Cartão Débito
                      </span>
                      <span>{formatCurrency(b.cartao_debito)}</span>
                    </div>
                  )}
                  {b.cartao_credito > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaCreditCard size={11} /> Cartão Crédito
                      </span>
                      <span>{formatCurrency(b.cartao_credito)}</span>
                    </div>
                  )}
                  {b.cartao_gen > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FaCreditCard size={11} /> Cartão
                      </span>
                      <span>{formatCurrency(b.cartao_gen)}</span>
                    </div>
                  )}
                  {b.boleto > 0 && (
                    <div className="cash-report-row" style={{ fontSize: '0.82rem', paddingLeft: 14 }}>
                      <span>Boleto</span>
                      <span>{formatCurrency(b.boleto)}</span>
                    </div>
                  )}

                  {/* Lista de vendas expansível */}
                  {vTxs.length > 0 && (
                    <details style={{ marginTop: 12 }}>
                      <summary className="oc-details-summary">
                        Ver vendas ({vTxs.length}) ▼
                      </summary>
                      <div className="oc-vendas-list">
                        {vTxs.map((t, i) => (
                          <div key={t.id || i} className="oc-venda-row">
                            <span>
                              {fmtHora(t.created_at)}
                              {' · '}
                              {t.budgets?.customer_name || t.observacao || '—'}
                              {' · '}
                              {fmtForma(t.forma_pagamento)}
                            </span>
                            <span className="oc-venda-valor">
                              {formatCurrency(parseFloat(t.valor))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Conferência do dinheiro (só se sessão fechada e havia vendas em dinheiro) */}
                  {s.status === 'fechado' && dinEsperado > 0 && (
                    <>
                      <div className="cash-report-row" style={{ marginTop: 14, fontWeight: 700, fontSize: '0.82rem', color: '#888', borderBottom: 'none' }}>
                        <span>Conferência do dinheiro</span>
                      </div>
                      <div className="cash-report-row">
                        <span>Dinheiro esperado</span>
                        <span>{formatCurrency(dinEsperado)}</span>
                      </div>
                      <div className="cash-report-row">
                        <span>Dinheiro contado</span>
                        <span>{formatCurrency(dinContado)}</span>
                      </div>
                      {diffRel !== null && (
                        <div className="cash-report-row">
                          <span>Diferença</span>
                          <span style={{ color: diffRel >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {diffRel >= 0 ? '+' : ''}{formatCurrency(diffRel)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
}
