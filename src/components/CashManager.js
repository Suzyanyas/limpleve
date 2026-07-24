import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaReceipt } from 'react-icons/fa';
import {
  getOpenSession,
  openCashSession,
  closeCashSession,
  getSessionTransactions,
  createCashTransaction,
  deleteCashTransaction,
  getTodaySessions,
  getTodayTransactions
} from '../services/managementService';
import './CashManager.css';

const CEDULAS = [
  { label: 'R$ 200', value: 200 },
  { label: 'R$ 100', value: 100 },
  { label: 'R$ 50', value: 50 },
  { label: 'R$ 20', value: 20 },
  { label: 'R$ 10', value: 10 },
  { label: 'R$ 5', value: 5 },
  { label: 'R$ 2', value: 2 },
  { label: 'R$ 1', value: 1 },
  { label: 'R$ 0,50', value: 0.5 },
  { label: 'R$ 0,25', value: 0.25 },
  { label: 'R$ 0,10', value: 0.1 },
  { label: 'R$ 0,05', value: 0.05 },
];

const EMPTY_CEDULAS = Object.fromEntries(CEDULAS.map(c => [c.value, '']));

const calcSaldo = (cedulas) =>
  CEDULAS.reduce((sum, c) => sum + (parseFloat(cedulas[c.value]) || 0) * c.value, 0);

const formatCurrency = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;

const formatPayment = (forma) => {
  const map = {
    dinheiro: '💵 Dinheiro',
    pix: '📱 PIX',
    cartao_debito: '💳 Débito',
    cartao_credito: '💳 Crédito',
    boleto: 'Boleto',
  };
  if (!forma) return '';
  if (forma.startsWith('misto|')) return '🔀 Misto';
  return map[forma] || forma;
};

// ─────────────────────────────────────────────
// Barra de status (exibida na lista de orçamentos)
// ─────────────────────────────────────────────
export function CashStatusBar({ onOpen }) {
  const [session, setSession] = useState(undefined); // undefined = carregando
  const [transactions, setTransactions] = useState([]);

  const load = useCallback(async () => {
    const s = await getOpenSession();
    setSession(s);
    if (s) {
      const txs = await getSessionTransactions(s.id);
      setTransactions(txs);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (session === undefined) return null;

  const vendas = transactions.filter(t => t.tipo === 'venda').reduce((s, t) => s + parseFloat(t.valor), 0);
  const reforcos = transactions.filter(t => t.tipo === 'reforco').reduce((s, t) => s + parseFloat(t.valor), 0);
  const saidas = transactions.filter(t => t.tipo !== 'venda' && t.tipo !== 'reforco').reduce((s, t) => s + parseFloat(t.valor), 0);
  const saldoAtual = parseFloat(session?.saldo_inicial || 0) + vendas + reforcos - saidas;

  if (!session) {
    return (
      <div className="cash-status-bar">
        <div className="cash-status-left">
          <div className="cash-status-dot closed" />
          <div>
            <div className="cash-status-label">Caixa fechado</div>
          </div>
        </div>
        <button className="cash-status-btn" onClick={onOpen}>Abrir Caixa</button>
      </div>
    );
  }

  return (
    <div className="cash-status-bar">
      <div className="cash-status-left">
        <div className="cash-status-dot" />
        <div>
          <div className="cash-status-label">🟢 Caixa {session.turno === 'manha' ? 'Manhã' : 'Tarde'} aberto</div>
          <div className="cash-status-turno">Saldo esperado: {formatCurrency(saldoAtual)}</div>
        </div>
      </div>
      <div className="cash-status-amounts">
        <div className="cash-status-amount">
          <span>💵 Dinheiro</span>
          <span>{formatCurrency(transactions.filter(t => t.tipo === 'venda' && t.forma_pagamento === 'dinheiro').reduce((s, t) => s + parseFloat(t.valor), 0))}</span>
        </div>
        <div className="cash-status-amount">
          <span>📱 PIX</span>
          <span>{formatCurrency(transactions.filter(t => t.tipo === 'venda' && t.forma_pagamento === 'pix').reduce((s, t) => s + parseFloat(t.valor), 0))}</span>
        </div>
        <div className="cash-status-amount">
          <span>💳 Cartão</span>
          <span>{formatCurrency(transactions.filter(t => t.tipo === 'venda' && (t.forma_pagamento === 'cartao_debito' || t.forma_pagamento === 'cartao_credito')).reduce((s, t) => s + parseFloat(t.valor), 0))}</span>
        </div>
      </div>
      <button className="cash-status-btn" onClick={onOpen}>Ver caixa</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function CashManager({ onBack }) {
  const [view, setView] = useState('loading'); // loading, sem-caixa, abertura, sessao, fechamento, relatorio
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [turno, setTurno] = useState('manha');
  const [cedulas, setCedulas] = useState(EMPTY_CEDULAS);
  const [modal, setModal] = useState(null); // null | 'sangria' | 'despesa' | 'reforco'
  const [modalForm, setModalForm] = useState({ valor: '', categoria: '', observacao: '' });
  const [modalCedulas, setModalCedulas] = useState(EMPTY_CEDULAS);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadSession = useCallback(async () => {
    const s = await getOpenSession();
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
    const [sessions, txs] = await Promise.all([getTodaySessions(), getTodayTransactions()]);
    setTodaySessions(sessions);
    setTodayTransactions(txs);
    setView('relatorio');
  };

  // ── Abertura ──
  const handleOpen = async () => {
    setSaving(true);
    const saldo = calcSaldo(cedulas);
    const result = await openCashSession(turno, saldo, cedulas);
    if (result.success) {
      toast.success(`Caixa ${turno === 'manha' ? 'Manhã' : 'Tarde'} aberto!`);
      setCedulas(EMPTY_CEDULAS);
      await loadSession();
    } else {
      toast.error('Erro ao abrir caixa');
    }
    setSaving(false);
  };

  // ── Sangria / Despesa / Reforço ──
  const handleModalConfirm = async () => {
    const valor = modal === 'reforco' ? calcSaldo(modalCedulas) : parseFloat(modalForm.valor);
    if (!valor || valor <= 0) {
      toast.error(modal === 'reforco' ? 'Informe ao menos uma cédula' : 'Informe o valor');
      return;
    }
    setSaving(true);
    const result = await createCashTransaction({
      session_id: session.id,
      tipo: modal,
      valor,
      categoria_despesa: modal === 'despesa' ? modalForm.categoria : null,
      observacao: modalForm.observacao || null,
    });
    if (result.success) {
      const labels = { sangria: 'Sangria registrada!', despesa: 'Despesa registrada!', reforco: 'Reforço registrado!' };
      toast.success(labels[modal] || 'Registrado!');
      const txs = await getSessionTransactions(session.id);
      setTransactions(txs);
      setModal(null);
      setModalForm({ valor: '', categoria: '', observacao: '' });
      setModalCedulas(EMPTY_CEDULAS);
    } else {
      toast.error('Erro ao registrar');
    }
    setSaving(false);
  };

  // ── Fechamento ──
  const handleClose = async () => {
    const saldo = calcSaldo(cedulas);
    const result = await closeCashSession(session.id, saldo);
    if (result.success) {
      toast.success('Caixa fechado!');
      setCedulas(EMPTY_CEDULAS);
      await loadReport();
    } else {
      toast.error('Erro ao fechar caixa');
    }
  };

  // ── Cálculos do turno ──
  const vendas = transactions.filter(t => t.tipo === 'venda').reduce((s, t) => s + parseFloat(t.valor), 0);
  const sangrias = transactions.filter(t => t.tipo === 'sangria').reduce((s, t) => s + parseFloat(t.valor), 0);
  const despesas = transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + parseFloat(t.valor), 0);
  const reforcos = transactions.filter(t => t.tipo === 'reforco').reduce((s, t) => s + parseFloat(t.valor), 0);
  const saldoEsperado = parseFloat(session?.saldo_inicial || 0) + vendas + reforcos - sangrias - despesas;
  const saldoContado = calcSaldo(cedulas);

  // ─────────────── RENDER ───────────────

  if (view === 'loading') return <div className="cash-empty">Carregando...</div>;

  return (
    <div className="cash-manager">
      <div className="cash-header">
        <button className="cash-back-btn" onClick={onBack}>←</button>
        <div className="cash-title">💰 Caixa</div>
        {view === 'sessao' && (
          <button className="cash-report-btn" onClick={loadReport}>
            📊 Relatório
          </button>
        )}
      </div>

      {/* ── SEM CAIXA ABERTO ── */}
      {view === 'sem-caixa' && (
        <div className="cash-open-card">
          <div className="cash-open-title">Nenhum caixa aberto hoje</div>
          <button className="btn-open-cash" onClick={() => setView('abertura')}>
            Abrir Caixa
          </button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={loadReport}>
            📊 Ver relatório do dia
          </button>
        </div>
      )}

      {/* ── ABERTURA ── */}
      {view === 'abertura' && (
        <div className="cash-open-card">
          <div className="cash-open-title">Abertura de Caixa</div>
          <div className="turno-toggle">
            <button className={`turno-btn ${turno === 'manha' ? 'active' : ''}`} onClick={() => setTurno('manha')}>🌅 Manhã</button>
            <button className={`turno-btn ${turno === 'tarde' ? 'active' : ''}`} onClick={() => setTurno('tarde')}>🌇 Tarde</button>
          </div>
          <table className="cedulas-table">
            <thead>
              <tr>
                <th>Cédula/Moeda</th>
                <th>Qtd</th>
                <th>Total</th>
              </tr>
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
          <div className="cash-saldo-total">
            <span className="cash-saldo-label">Total em caixa</span>
            <span className="cash-saldo-value">{formatCurrency(calcSaldo(cedulas))}</span>
          </div>
          <button className="btn-open-cash" onClick={handleOpen} disabled={saving}>
            {saving ? 'Abrindo...' : `Abrir Caixa ${turno === 'manha' ? 'Manhã' : 'Tarde'}`}
          </button>
        </div>
      )}

      {/* ── SESSÃO ATIVA ── */}
      {view === 'sessao' && session && (
        <div className="cash-session-panel">
          <div className="cash-session-header">
            <div className="cash-session-title">
              {session.turno === 'manha' ? '🌅 Caixa Manhã' : '🌇 Caixa Tarde'} • aberto às {new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="cash-session-saldo-label">saldo esperado</div>
            <div className="cash-session-saldo">{formatCurrency(saldoEsperado)}</div>
            <div className="cash-session-grid">
              <div className="cash-session-stat">
                <span className="cash-session-stat-label">Inicial</span>
                <span className="cash-session-stat-value">{formatCurrency(session.saldo_inicial)}</span>
              </div>
              <div className="cash-session-stat">
                <span className="cash-session-stat-label">Vendas</span>
                <span className="cash-session-stat-value">{formatCurrency(vendas)}</span>
              </div>
              {reforcos > 0 && (
                <div className="cash-session-stat">
                  <span className="cash-session-stat-label">Reforços</span>
                  <span className="cash-session-stat-value reforco-value">{formatCurrency(reforcos)}</span>
                </div>
              )}
              <div className="cash-session-stat">
                <span className="cash-session-stat-label">Saídas</span>
                <span className="cash-session-stat-value">{formatCurrency(sangrias + despesas)}</span>
              </div>
            </div>
          </div>

          <div className="cash-quick-actions">
            <button className="cash-action-btn reforco" onClick={() => setModal('reforco')}>💵 Reforço</button>
            <button className="cash-action-btn sangria" onClick={() => setModal('sangria')}>💸 Sangria</button>
            <button className="cash-action-btn despesa" onClick={() => setModal('despesa')}><FaReceipt size={13} /> Despesa</button>
            <button className="cash-action-btn fechar" onClick={() => { setCedulas(EMPTY_CEDULAS); setView('fechamento'); }}>🔒 Fechar</button>
          </div>

          <div className="cash-transactions-card">
            <div className="cash-transactions-title">Movimentações do turno</div>
            {transactions.length === 0 ? (
              <div className="cash-empty">Nenhuma movimentação ainda</div>
            ) : (
              transactions.slice().reverse().map(tx => (
                <div key={tx.id} className="cash-transaction-item">
                  <div className="cash-tx-left">
                    <span className="cash-tx-name">
                      {tx.tipo === 'venda'
                        ? tx.observacao || 'Venda'
                        : tx.tipo === 'reforco'
                          ? tx.observacao || 'Reforço de caixa'
                          : tx.categoria_despesa || tx.observacao || (tx.tipo === 'sangria' ? 'Sangria' : 'Despesa')}
                    </span>
                    <span className="cash-tx-meta">
                      {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {tx.tipo === 'venda' && tx.forma_pagamento && ` • ${formatPayment(tx.forma_pagamento)}`}
                      {tx.sale_type && ` • ${tx.sale_type === 'presencial' ? 'Presencial' : 'Online'}`}
                    </span>
                  </div>
                  <div className="cash-tx-right">
                    <span className={`cash-tx-value ${tx.tipo}`}>
                      {tx.tipo === 'venda' || tx.tipo === 'reforco' ? '+' : '−'}{formatCurrency(tx.valor)}
                    </span>
                    <button
                      className="cash-tx-delete"
                      title="Excluir"
                      onClick={async () => {
                        if (!window.confirm('Excluir esta movimentação?')) return;
                        const r = await deleteCashTransaction(tx.id);
                        if (r.success) { toast.success('Excluído'); loadSession(); }
                        else toast.error('Erro ao excluir');
                      }}
                    >🗑️</button>
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
          <div className="cash-open-title">🔒 Fechar Caixa - Conte o dinheiro.</div>
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
                  <td className="cedula-total">{formatCurrency((parseFloat(cedulas[c.value]) || 0) * c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cash-close-diff">
            <div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>Saldo esperado</div>
              <div style={{ fontWeight: 800 }}>{formatCurrency(saldoEsperado)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>Contado</div>
              <div style={{ fontWeight: 800 }}>{formatCurrency(saldoContado)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem' }}>Diferença: </span>
            <span className={Math.abs(saldoContado - saldoEsperado) < 0.01 ? 'diff-ok' : 'diff-warn'}>
              {saldoContado >= saldoEsperado ? '+' : ''}{formatCurrency(saldoContado - saldoEsperado)}
              {Math.abs(saldoContado - saldoEsperado) < 0.01 ? ' ✓' : ' ⚠️'}
            </span>
          </div>
          <button className="btn-close-cash" onClick={handleClose}>Confirmar Fechamento</button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={() => setView('sessao')}>
            Voltar
          </button>
        </div>
      )}

      {/* ── RELATÓRIO ── */}
      {view === 'relatorio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button className="cash-modal-cancel" onClick={() => session ? setView('sessao') : setView('sem-caixa')}>
            ← Voltar
          </button>
          {todaySessions.length === 0 ? (
            <div className="cash-empty">Nenhum caixa aberto hoje.</div>
          ) : (
            todaySessions.map(s => {
              const txs = todayTransactions.filter(t => t.session_id === s.id);
              const v = txs.filter(t => t.tipo === 'venda').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const sg = txs.filter(t => t.tipo === 'sangria').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const dp = txs.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const rf = txs.filter(t => t.tipo === 'reforco').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const dinheiro = txs.filter(t => t.tipo === 'venda' && t.forma_pagamento === 'dinheiro').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const pix = txs.filter(t => t.tipo === 'venda' && t.forma_pagamento === 'pix').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const cartao = txs.filter(t => t.tipo === 'venda' && (t.forma_pagamento === 'cartao_debito' || t.forma_pagamento === 'cartao_credito')).reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const presencial = txs.filter(t => t.tipo === 'venda' && t.sale_type === 'presencial').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const online = txs.filter(t => t.tipo === 'venda' && t.sale_type === 'online').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              return (
                <div key={s.id} className="cash-report-card">
                  <div className="cash-report-title">
                    {s.turno === 'manha' ? '🌅 Manhã' : '🌇 Tarde'} {s.status === 'aberto' ? '🟢 Aberto' : '🔴 Fechado'} • {new Date(s.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="cash-report-row"><span>Saldo inicial</span><span>{formatCurrency(s.saldo_inicial)}</span></div>
                  <div className="cash-report-row positivo"><span>Vendas</span><span>+{formatCurrency(v)}</span></div>
                  {rf > 0 && <div className="cash-report-row positivo"><span>💵 Reforços</span><span>+{formatCurrency(rf)}</span></div>}
                  {sg > 0 && <div className="cash-report-row negativo"><span>Sangrias</span><span>−{formatCurrency(sg)}</span></div>}
                  {dp > 0 && <div className="cash-report-row negativo"><span>Despesas</span><span>−{formatCurrency(dp)}</span></div>}
                  {s.saldo_final != null && <div className="cash-report-row"><span>Saldo final contado</span><span>{formatCurrency(s.saldo_final)}</span></div>}
                  <div className="cash-report-row" style={{ marginTop: 12, fontWeight: 700, fontSize: '0.82rem', color: '#888' }}>
                    <span>Por forma</span>
                  </div>
                  {dinheiro > 0 && <div className="cash-report-row"><span>💵 Dinheiro</span><span>{formatCurrency(dinheiro)}</span></div>}
                  {pix > 0 && <div className="cash-report-row"><span>📱 PIX</span><span>{formatCurrency(pix)}</span></div>}
                  {cartao > 0 && <div className="cash-report-row"><span>💳 Cartão</span><span>{formatCurrency(cartao)}</span></div>}
                  <div className="cash-report-row" style={{ marginTop: 12, fontWeight: 700, fontSize: '0.82rem', color: '#888' }}>
                    <span>Por canal</span>
                  </div>
                  {presencial > 0 && <div className="cash-report-row"><span>🏪 Presencial</span><span>{formatCurrency(presencial)}</span></div>}
                  {online > 0 && <div className="cash-report-row"><span>📱 Online</span><span>{formatCurrency(online)}</span></div>}
                  <div className="cash-report-row total"><span>Total vendas</span><span>{formatCurrency(v)}</span></div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODAL SANGRIA / DESPESA / REFORÇO ── */}
      {modal && (
        <div className="cash-modal-overlay" onClick={() => { setModal(null); setModalCedulas(EMPTY_CEDULAS); }}>
          <div className="cash-modal" onClick={e => e.stopPropagation()}>
            <div className="cash-modal-title">
              {modal === 'sangria' ? '💸 Registrar Sangria'
                : modal === 'despesa' ? <><FaReceipt size={14} /> Registrar Despesa</>
                : '💵 Reforço de Caixa'}
            </div>
            {modal === 'reforco' ? (
              <>
                <div className="cash-modal-hint">
                  Dinheiro adicional inserido no caixa para troco ou reposição.
                </div>
                <table className="cedulas-table">
                  <thead>
                    <tr>
                      <th>Cédula/Moeda</th>
                      <th>Qtd</th>
                      <th>Total</th>
                    </tr>
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
                            value={modalCedulas[c.value]}
                            onChange={e => setModalCedulas(prev => ({ ...prev, [c.value]: e.target.value }))}
                          />
                        </td>
                        <td className="cedula-total">
                          {formatCurrency((parseFloat(modalCedulas[c.value]) || 0) * c.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cash-saldo-total">
                  <span className="cash-saldo-label">Total do reforço</span>
                  <span className="cash-saldo-value">{formatCurrency(calcSaldo(modalCedulas))}</span>
                </div>
              </>
            ) : (
              <div className="cash-modal-field">
                <label>Valor</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={modalForm.valor}
                  onChange={e => setModalForm(p => ({ ...p, valor: e.target.value }))}
                  autoFocus
                />
              </div>
            )}
            {modal === 'despesa' && (
              <div className="cash-modal-field">
                <label>Categoria</label>
                <select value={modalForm.categoria} onChange={e => setModalForm(p => ({ ...p, categoria: e.target.value }))}>
                  <option value="">Selecione...</option>
                  <option value="Combustível">Combustível</option>
                  <option value="Embalagem">Embalagem</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Material">Material</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            )}
            <div className="cash-modal-field">
              <label>Observação</label>
              <textarea
                rows={2}
                placeholder={modal === 'reforco' ? 'Ex: reforço para troco...' : 'Descrição...'}
                value={modalForm.observacao}
                onChange={e => setModalForm(p => ({ ...p, observacao: e.target.value }))}
              />
            </div>
            <div className="cash-modal-actions">
              <button className="cash-modal-cancel" onClick={() => { setModal(null); setModalCedulas(EMPTY_CEDULAS); }}>Cancelar</button>
              <button
                className={`cash-modal-confirm ${modal === 'reforco' ? 'reforco' : ''}`}
                onClick={handleModalConfirm}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
