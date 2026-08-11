import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FaReceipt, FaEdit, FaChevronDown, FaMoneyBillWave, FaMobile, FaCreditCard, FaStore, FaGlobe, FaSun, FaMoon, FaHistory, FaChartBar, FaLock, FaArrowDown, FaCheck, FaExclamationTriangle, FaCircle } from 'react-icons/fa';
import {
  getOpenSession,
  openCashSession,
  closeCashSession,
  getSessionTransactions,
  createCashTransaction,
  deleteCashTransaction,
  getTodaySessions,
  getTodayTransactions,
  updateCashSessionSaldoInicial,
  updateFundoTarde,
  getUltimoFundoTarde,
  getUltimoSaldoFechado,
  updateCashSessionSaldoFinal,
  getSessionsByDate,
  getTransactionsByDate,
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

const formatCedulasDetalhe = (detalhes) => {
  if (!detalhes) return [];
  return CEDULAS
    .filter(c => (parseFloat(detalhes[c.value]) || 0) > 0)
    .map(c => {
      const qtd = parseFloat(detalhes[c.value]);
      return { label: c.label, qtd, total: qtd * c.value };
    });
};

// ─────────────────────────────────────────────
// Barra de status (exibida na lista de orçamentos)
// ─────────────────────────────────────────────
export function CashStatusBar({ onOpen }) {
  const [session, setSession] = useState(undefined); // undefined = carregando

  const load = useCallback(async () => {
    const s = await getOpenSession();
    setSession(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (session === undefined) return null;

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
          <div className="cash-status-label"><FaCircle style={{ color: '#38a169', fontSize: '0.6em', verticalAlign: 'middle' }} /> Caixa {session.turno === 'manha' ? 'Manhã' : 'Tarde'} aberto</div>
        </div>
      </div>
      <button className="cash-status-btn" onClick={onOpen}>Ver caixa</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function CashManager({ onBack, mode = 'presencial' }) {
  const [view, setView] = useState(mode === 'historico' ? 'relatorio' : 'loading');
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [turno, setTurno] = useState(() => {
    const hora = new Date().getHours();
    return hora < 12 ? 'manha' : 'tarde';
  });
  const [cedulas, setCedulas] = useState(EMPTY_CEDULAS);
  const [modal, setModal] = useState(null); // null | 'sangria' | 'despesa' | 'reforco'
  const [modalForm, setModalForm] = useState({ valor: '', categoria: '', observacao: '' });
  const [modalCedulas, setModalCedulas] = useState(EMPTY_CEDULAS);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [ceduasEdit, setCeduasEdit] = useState(EMPTY_CEDULAS);
  const [saldoAberto, setSaldoAberto] = useState(false);
  const [cedulasFundo, setCedulasFundo] = useState(EMPTY_CEDULAS);
  const [fundoSugerido, setFundoSugerido] = useState(null); // { fundo_proximo_turno, fundo_proximo_turno_detalhes }
  const [ultimoSaldo, setUltimoSaldo] = useState(null); // { saldo_final, saldo_final_detalhes }
  const [editingSaldoId, setEditingSaldoId] = useState(null);
  const [editCedulas, setEditCedulas] = useState({});
  const [expandedChannel, setExpandedChannel] = useState({});
  const [reportTab, setReportTab] = useState(mode === 'historico' ? 'historico' : 'presencial');
  const [historicoDate, setHistoricoDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  });
  const [historicoSessions, setHistoricoSessions] = useState(null);
  const [historicoTransactions, setHistoricoTransactions] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

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

  useEffect(() => { if (mode !== 'historico') loadSession(); }, [loadSession, mode]);

  const loadReport = async () => {
    const [sessions, txs] = await Promise.all([getTodaySessions(), getTodayTransactions()]);
    setTodaySessions(sessions);
    setTodayTransactions(txs);
    setView('relatorio');
  };

  const loadHistorico = async (date) => {
    setHistoricoLoading(true);
    const [sessions, txs] = await Promise.all([getSessionsByDate(date), getTransactionsByDate(date)]);
    setHistoricoSessions(sessions);
    setHistoricoTransactions(txs);
    setHistoricoLoading(false);
  };

  // ── Abertura ──
  const handleOpen = async () => {
    setSaving(true);
    const saldo = calcSaldo(cedulas);
    const detalhes = Object.fromEntries(
      Object.entries(cedulas).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const result = await openCashSession(turno, saldo, detalhes);
    if (result.success) {
      toast.success(`Caixa ${turno === 'manha' ? 'Manhã' : 'Tarde'} aberto!`);
      setCedulas(EMPTY_CEDULAS);
      await loadSession();
    } else {
      toast.error('Erro ao abrir caixa');
    }
    setSaving(false);
  };

  // ── Edição do saldo inicial ──
  const handleSaveSaldoInicial = async () => {
    setSaving(true);
    const novoSaldo = calcSaldo(ceduasEdit);
    const detalhes = Object.fromEntries(
      Object.entries(ceduasEdit).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const r = await updateCashSessionSaldoInicial(session.id, novoSaldo, detalhes);
    if (r.success) {
      toast.success('Saldo inicial corrigido!');
      await loadSession();
      setEditandoSaldo(false);
    } else {
      toast.error('Erro ao salvar');
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
    const detalhes = Object.fromEntries(
      Object.entries(cedulas).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const result = await closeCashSession(session.id, saldo, detalhes);
    if (result.success) {
      toast.success('Caixa fechado!');
      setCedulas(EMPTY_CEDULAS);
      if (session.turno === 'tarde') {
        setCedulasFundo(EMPTY_CEDULAS);
        setView('fundo');
      } else {
        await loadReport();
      }
    } else {
      toast.error('Erro ao fechar caixa');
    }
  };

  // ── Fundo de troco (turno tarde) ──
  const handleRegistrarFundo = async () => {
    setSaving(true);
    const valor = calcSaldo(cedulasFundo);
    const detalhes = Object.fromEntries(
      Object.entries(cedulasFundo).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const r = await updateFundoTarde(session.id, valor, detalhes);
    if (r.success) {
      toast.success('Fundo de troco registrado!');
    } else {
      toast.error('Erro ao registrar fundo');
    }
    setSaving(false);
    await loadReport();
  };

  // ── Histórico helpers ──
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  })();
  const reportActiveSessions = reportTab === 'historico' ? (historicoSessions || []) : todaySessions;
  const reportActiveTxs = reportTab === 'historico' ? historicoTransactions : todayTransactions;

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
        <div className="cash-title">CAIXA</div>
        {view === 'sessao' && (
          <button className="cash-report-btn" onClick={loadReport}>
            <FaChartBar /> Relatório
          </button>
        )}
      </div>

      {/* ── SEM CAIXA ABERTO ── */}
      {view === 'sem-caixa' && (
        <div className="cash-open-card">
          <div className="cash-open-title">Nenhum caixa aberto hoje</div>
          <button className="btn-open-cash" onClick={async () => {
            setCedulas(EMPTY_CEDULAS);
            setFundoSugerido(null);
            setUltimoSaldo(null);
            if (turno === 'manha') {
              const fundo = await getUltimoFundoTarde();
              if (fundo?.fundo_proximo_turno_detalhes) {
                setCedulas(Object.fromEntries(Object.entries(fundo.fundo_proximo_turno_detalhes).map(([k, v]) => [k, v || ''])));
                setFundoSugerido(fundo);
                setView('abertura');
                return;
              }
            }
            const ultimo = await getUltimoSaldoFechado();
            if (ultimo?.saldo_final_detalhes) {
              setCedulas(Object.fromEntries(Object.entries(ultimo.saldo_final_detalhes).map(([k, v]) => [k, v || ''])));
              setUltimoSaldo(ultimo);
            }
            setView('abertura');
          }}>
            Abrir Caixa
          </button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={loadReport}>
            <FaChartBar /> Ver relatório do dia
          </button>
        </div>
      )}

      {/* ── ABERTURA ── */}
      {view === 'abertura' && (
        <div className="cash-open-card">
          <div className="cash-open-title">Abertura de Caixa</div>
          {fundoSugerido && turno === 'manha' && (
            <div style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid #60a5fa', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#93c5fd' }}>
              💡 Fundo de troco sugerido da sessão anterior: <strong>{formatCurrency(fundoSugerido.fundo_proximo_turno)}</strong>. Edite as quantidades se necessário.
            </div>
          )}
          {ultimoSaldo && !fundoSugerido && (
            <div style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid #34d399', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#6ee7b7' }}>
              <FaHistory size={12} style={{ marginRight: 6 }} /> Último saldo fechado: <strong>{formatCurrency(ultimoSaldo.saldo_final)}</strong>. Edite as quantidades se necessário.
            </div>
          )}
          <div className="turno-toggle">
            <button className={`turno-btn ${turno === 'manha' ? 'active' : ''}`} onClick={async () => {
              setTurno('manha');
              setCedulas(EMPTY_CEDULAS);
              setFundoSugerido(null);
              setUltimoSaldo(null);
              const fundo = await getUltimoFundoTarde();
              if (fundo?.fundo_proximo_turno_detalhes) {
                setCedulas(Object.fromEntries(Object.entries(fundo.fundo_proximo_turno_detalhes).map(([k, v]) => [k, v || ''])));
                setFundoSugerido(fundo);
                return;
              }
              const ultimo = await getUltimoSaldoFechado();
              if (ultimo?.saldo_final_detalhes) {
                setCedulas(Object.fromEntries(Object.entries(ultimo.saldo_final_detalhes).map(([k, v]) => [k, v || ''])));
                setUltimoSaldo(ultimo);
              }
            }}><FaSun size={13} style={{ marginRight: 5 }} />Manhã</button>
            <button className={`turno-btn ${turno === 'tarde' ? 'active' : ''}`} onClick={async () => {
              setTurno('tarde');
              setCedulas(EMPTY_CEDULAS);
              setFundoSugerido(null);
              setUltimoSaldo(null);
              const ultimo = await getUltimoSaldoFechado();
              if (ultimo?.saldo_final_detalhes) {
                setCedulas(Object.fromEntries(Object.entries(ultimo.saldo_final_detalhes).map(([k, v]) => [k, v || ''])));
                setUltimoSaldo(ultimo);
              }
            }}><FaMoon size={13} style={{ marginRight: 5 }} />Tarde</button>
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
              {session.turno === 'manha' ? <><FaSun size={13} style={{ marginRight: 5 }} />Caixa Manhã</> : <><FaMoon size={13} style={{ marginRight: 5 }} />Caixa Tarde</>} • aberto às {new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="cash-session-saldo-label">saldo esperado</div>
            <div className="cash-session-saldo">{formatCurrency(saldoEsperado)}</div>
            <div className="cash-session-grid">
              <div className="cash-session-stat">
                <details className="saldo-inicial-details" open={saldoAberto} onToggle={e => setSaldoAberto(e.currentTarget.open)} style={{ width: '100%' }}>
                  <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', listStyle: 'none' }}>
                    <span className="cash-session-stat-label">Inicial</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="cash-session-stat-value">{formatCurrency(session.saldo_inicial)}</span>
                      <FaChevronDown size={11} className="saldo-chevron" />
                    </span>
                  </summary>
                  <div className="cedulas-pills">
                    {formatCedulasDetalhe(session.saldo_inicial_detalhes).map((item, i) => (
                      <span key={i} className="cedula-pill">
                        <span className="cedula-pill-label">{item.label}</span>
                        <span className="cedula-pill-qty">×{item.qtd}</span>
                      </span>
                    ))}
                  </div>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#fff', marginTop: 4, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 500, width: '100%' }}
                    onClick={() => { setCeduasEdit(Object.fromEntries(Object.entries(session.saldo_inicial_detalhes || {}).map(([k, v]) => [k, v || '']))); setEditandoSaldo(true); }}
                  ><FaEdit size={12} /> Corrigir cédulas</button>
                </details>
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
            <button className="cash-action-btn reforco" onClick={() => setModal('reforco')}><FaMoneyBillWave /> Reforço</button>
            <button className="cash-action-btn sangria" onClick={() => setModal('sangria')}><FaArrowDown /> Sangria</button>
            <button className="cash-action-btn despesa" onClick={() => setModal('despesa')}><FaReceipt size={13} /> Despesa</button>
            <button className="cash-action-btn fechar" onClick={() => {
  const detalhes = session?.saldo_inicial_detalhes;
  setCedulas(detalhes
    ? Object.fromEntries(Object.entries(detalhes).map(([k, v]) => [k, v || '']))
    : EMPTY_CEDULAS
  );
  setView('fechamento');
}}><FaLock /> Fechar</button>
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
          <div className="cash-open-title"><FaLock /> Fechar Caixa - Conte o dinheiro.</div>
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
              {Math.abs(saldoContado - saldoEsperado) < 0.01 ? <FaCheck style={{ marginLeft: 4 }} /> : <FaExclamationTriangle style={{ marginLeft: 4 }} />}
            </span>
          </div>
          <button className="btn-close-cash" onClick={handleClose}>Confirmar Fechamento</button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={() => setView('sessao')}>
            Voltar
          </button>
        </div>
      )}

      {/* ── FUNDO DE TROCO (pós-fechamento tarde) ── */}
      {view === 'fundo' && (
        <div className="cash-open-card">
          <div className="cash-open-title"><FaMoneyBillWave /> Fundo de Troco</div>
          <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: 14, textAlign: 'center' }}>
            Conte o dinheiro que vai ficar para abertura de amanhã.
          </div>
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
                      type="number" className="cedula-input" min="0"
                      value={cedulasFundo[c.value]}
                      onChange={e => setCedulasFundo(prev => ({ ...prev, [c.value]: e.target.value }))}
                    />
                  </td>
                  <td className="cedula-total">{formatCurrency((parseFloat(cedulasFundo[c.value]) || 0) * c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cash-saldo-total">
            <span className="cash-saldo-label">Total do fundo</span>
            <span className="cash-saldo-value">{formatCurrency(calcSaldo(cedulasFundo))}</span>
          </div>
          <button className="btn-open-cash" onClick={handleRegistrarFundo} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar fundo'}
          </button>
          <button className="cash-modal-cancel" style={{ width: '100%', marginTop: 10 }} onClick={loadReport}>
            Pular
          </button>
        </div>
      )}

      {/* ── RELATÓRIO ── */}
      {view === 'relatorio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode !== 'historico' && (
            <button className="cash-modal-cancel" onClick={() => session ? setView('sessao') : setView('sem-caixa')}>
              ← Voltar
            </button>
          )}

          {/* ── Seletor de data (só Histórico) ── */}
          {reportTab === 'historico' && (
            <div className="cash-historico-picker">
              <input
                type="date"
                className="cash-historico-date"
                value={historicoDate}
                max={yesterdayStr}
                onChange={e => setHistoricoDate(e.target.value)}
              />
              <button
                className="btn-open-cash"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                onClick={() => loadHistorico(historicoDate)}
                disabled={historicoLoading}
              >
                {historicoLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          )}

          {reportTab !== 'historico' && todaySessions.length === 0 ? (
            <div className="cash-empty">Nenhum caixa aberto hoje.</div>
          ) : reportTab === 'historico' && historicoSessions === null ? (
            <div className="cash-empty" style={{ color: '#aaa' }}>Selecione uma data e clique em Buscar.</div>
          ) : reportActiveSessions.length === 0 ? (
            <div className="cash-empty">Nenhum caixa encontrado nesta data.</div>
          ) : (
            reportActiveSessions.map(s => {
              const txs = reportActiveTxs.filter(t => t.session_id === s.id);
              const vendaTxs = txs.filter(t => t.tipo === 'venda');
              const v  = vendaTxs.reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const sg = txs.filter(t => t.tipo === 'sangria').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const dp = txs.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + parseFloat(t.valor), 0);
              const rf = txs.filter(t => t.tipo === 'reforco').reduce((acc, t) => acc + parseFloat(t.valor), 0);

              const presencialTxs = vendaTxs.filter(t => t.sale_type === 'presencial' || !t.sale_type);
              const onlineTxs     = vendaTxs.filter(t => t.sale_type === 'online');
              const calcBuckets = txs => {
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
                      else if (forma === 'cartao') cartao_gen += v2; // misto salva sem _debito/_credito
                    });
                  } else if (fp === 'dinheiro') dinheiro += valor;
                  else if (fp === 'pix') pix += valor;
                  else if (fp === 'cartao_debito') cartao_debito += valor;
                  else if (fp === 'cartao_credito') cartao_credito += valor;
                  else if (fp === 'boleto') boleto += valor;
                });
                return { dinheiro, pix, cartao_debito, cartao_credito, cartao_gen, boleto };
              };
              const bPresencial = calcBuckets(presencialTxs);
              const bOnline     = calcBuckets(onlineTxs);
              const vDinheiro   = calcBuckets(vendaTxs).dinheiro;

              const saldoEsperadoRelatorio = parseFloat(s.saldo_inicial || 0) + vDinheiro + rf - sg - dp;
              const diff = s.saldo_final != null ? s.saldo_final - saldoEsperadoRelatorio : null;

              const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
              const fmtHora = (ts) => ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '--:--';
              const fmtForma = (fp) => {
                if (!fp) return '—';
                if (fp === 'dinheiro') return 'Dinheiro';
                if (fp === 'pix') return 'PIX';
                if (fp === 'cartao_debito') return 'Cartão Débito';
                if (fp === 'cartao_credito') return 'Cartão Crédito';
                if (fp === 'boleto') return 'Boleto';
                if (fp.startsWith('misto|')) return 'Misto';
                return fp;
              };

              return (
                <div key={s.id} className="cash-report-card">

                  {/* 1. Cabeçalho */}
                  <div className="cash-report-title">
                    {s.turno === 'manha' ? 'Manhã' : 'Tarde'}
                    {' '}
                    <span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#888' }}>
                      {fmt(s.opened_at)}{s.closed_at ? ` – ${fmt(s.closed_at)}` : ' – aberto'}
                    </span>
                  </div>

                  {/* 2. Saldo inicial expansível */}
                  <div className="cash-report-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <details>
                      <summary style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', listStyle: 'none' }}>
                        <span>Saldo inicial ▸</span><span>{formatCurrency(s.saldo_inicial)}</span>
                      </summary>
                      <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4, lineHeight: 1.7 }}>
                        {formatCedulasDetalhe(s.saldo_inicial_detalhes).map((item, i) => (
                          <div key={i}>{item.label} × {item.qtd} = {formatCurrency(item.total)}</div>
                        ))}
                      </div>
                    </details>
                  </div>

                  {/* 3. Movimentações */}
                  <div className="cash-report-row positivo"><span>Vendas</span><span>+{formatCurrency(v)}</span></div>
                  {(() => {
                    const bTotal = calcBuckets(vendaTxs);
                    const linhas = [
                      { label: 'Dinheiro',       valor: bTotal.dinheiro },
                      { label: 'PIX',             valor: bTotal.pix },
                      { label: 'Cartão Débito',   valor: bTotal.cartao_debito },
                      { label: 'Cartão Crédito',  valor: bTotal.cartao_credito },
                      { label: 'Cartão',          valor: bTotal.cartao_gen },
                      { label: 'Boleto',          valor: bTotal.boleto },
                    ].filter(l => l.valor > 0);
                    if (linhas.length === 0) return null;
                    return (
                      <div style={{ paddingLeft: 14, borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginBottom: 2, paddingTop: 4, paddingBottom: 4 }}>
                        {linhas.map(l => (
                          <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', padding: '1px 0' }}>
                            <span>{l.label}</span>
                            <span>{formatCurrency(l.valor)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {rf > 0 && <div className="cash-report-row positivo"><span>Reforços</span><span>+{formatCurrency(rf)}</span></div>}
                  {sg > 0 && <div className="cash-report-row negativo"><span>Sangrias</span><span>−{formatCurrency(sg)}</span></div>}
                  {dp > 0 && <div className="cash-report-row negativo"><span>Despesas</span><span>−{formatCurrency(dp)}</span></div>}

                  {/* 4. Por canal — expansível */}
                  {[
                    { key: 'presencial', txs: presencialTxs, b: bPresencial, icon: <FaStore size={12} />, label: 'Presencial' },
                    { key: 'online',     txs: onlineTxs,     b: bOnline,     icon: <FaGlobe size={12} />, label: 'Online' },
                  ].filter(ch => ch.txs.length > 0).map(ch => {
                    const expanded = expandedChannel[s.id] === ch.key;
                    return (
                      <div key={ch.key}>
                        <div className="cash-report-row" style={{ marginTop: 12, fontWeight: 700, fontSize: '0.82rem', color: '#888' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{ch.icon} {ch.label}</span>
                        </div>
                        <button
                          onClick={() => setExpandedChannel(prev => ({ ...prev, [s.id]: expanded ? null : ch.key }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#888', padding: '2px 0 6px', display: 'block' }}
                        >
                          {expanded ? 'Ocultar ▲' : `Ver vendas ▼ (${ch.txs.length})`}
                        </button>
                        {expanded && (
                          <div style={{ borderLeft: '2px solid #333', paddingLeft: 8, marginBottom: 4 }}>
                            {ch.txs.map((t, i) => (
                              <div key={t.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#bbb', padding: '2px 0' }}>
                                <span>{fmtHora(t.created_at)} · {t.budgets?.customer_name || t.observacao || '—'} · {fmtForma(t.forma_pagamento)}</span>
                                <span style={{ whiteSpace: 'nowrap', marginLeft: 8 }}>{formatCurrency(parseFloat(t.valor))}</span>
                              </div>
                            ))}
                            <div style={{ borderTop: '1px solid #333', marginTop: 6, paddingTop: 4 }}>
                              {ch.b.dinheiro > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FaMoneyBillWave size={11} /> Dinheiro</span>
                                  <span>{formatCurrency(ch.b.dinheiro)}</span>
                                </div>
                              )}
                              {ch.b.pix > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FaMobile size={11} /> PIX</span>
                                  <span>{formatCurrency(ch.b.pix)}</span>
                                </div>
                              )}
                              {ch.b.cartao_debito > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FaCreditCard size={11} /> Cartão Débito</span>
                                  <span>{formatCurrency(ch.b.cartao_debito)}</span>
                                </div>
                              )}
                              {ch.b.cartao_credito > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FaCreditCard size={11} /> Cartão Crédito</span>
                                  <span>{formatCurrency(ch.b.cartao_credito)}</span>
                                </div>
                              )}
                              {ch.b.cartao_gen > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FaCreditCard size={11} /> Cartão</span>
                                  <span>{formatCurrency(ch.b.cartao_gen)}</span>
                                </div>
                              )}
                              {ch.b.boleto > 0 && (
                                <div className="cash-report-row" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                  <span>Boleto</span>
                                  <span>{formatCurrency(ch.b.boleto)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 6. Fechamento */}
                  {s.status === 'fechado' && (
                    <>
                      <div className="cash-report-row" style={{ marginTop: 12, fontWeight: 700, fontSize: '0.82rem', color: '#888' }}>
                        <span>Fechamento</span>
                      </div>
                      <div className="cash-report-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Saldo esperado</span><span>{formatCurrency(saldoEsperadoRelatorio)}</span>
                        </div>
                        <div style={{ paddingLeft: 14, borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, paddingBottom: 4 }}>
                          {[
                            { label: 'Saldo inicial',        valor: parseFloat(s.saldo_inicial || 0), prefix: '' },
                            { label: '+ Vendas (dinheiro)',  valor: vDinheiro,                        prefix: '+' },
                            { label: '+ Reforços',           valor: rf,                               prefix: '+', hide: rf === 0 },
                            { label: '− Sangrias',           valor: sg,                               prefix: '−', hide: sg === 0 },
                            { label: '− Despesas',           valor: dp,                               prefix: '−', hide: dp === 0 },
                          ].filter(l => !l.hide).map(l => (
                            <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', padding: '1px 0' }}>
                              <span>{l.label}</span>
                              <span>{formatCurrency(l.valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {editingSaldoId === s.id ? (
                        <div style={{ marginTop: 8 }}>
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
                                      type="number" className="cedula-input" min="0"
                                      value={editCedulas[c.value] ?? ''}
                                      onChange={e => setEditCedulas(prev => ({ ...prev, [c.value]: e.target.value }))}
                                    />
                                  </td>
                                  <td className="cedula-total">{formatCurrency((parseFloat(editCedulas[c.value]) || 0) * c.value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="cash-saldo-total" style={{ marginBottom: 8 }}>
                            <span className="cash-saldo-label">Total contado</span>
                            <span className="cash-saldo-value">{formatCurrency(calcSaldo(editCedulas))}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-open-cash" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }} onClick={async () => {
                              const novoTotal = calcSaldo(editCedulas);
                              const detalhes = Object.fromEntries(Object.entries(editCedulas).map(([k, v]) => [k, parseFloat(v) || 0]));
                              const r = await updateCashSessionSaldoFinal(s.id, novoTotal, detalhes);
                              if (r.success) {
                                toast.success('Saldo atualizado!');
                                setEditingSaldoId(null);
                                const [sessions, txs] = await Promise.all([getTodaySessions(), getTodayTransactions()]);
                                setTodaySessions(sessions);
                                setTodayTransactions(txs);
                              } else {
                                toast.error('Erro ao salvar');
                              }
                            }}>Salvar</button>
                            <button className="cash-modal-cancel" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }} onClick={() => setEditingSaldoId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="cash-report-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <details>
                            <summary style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', listStyle: 'none' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                Saldo contado ▸
                                <button
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', padding: 0, display: 'flex', alignItems: 'center' }}
                                  onClick={e => { e.preventDefault(); setEditingSaldoId(s.id); setEditCedulas(Object.fromEntries(Object.entries(s.saldo_final_detalhes || EMPTY_CEDULAS).map(([k, v]) => [k, v || '']))); }}
                                ><FaEdit size={12} /></button>
                              </span>
                              <span>{formatCurrency(s.saldo_final)}</span>
                            </summary>
                            {s.saldo_final_detalhes && (
                              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4, lineHeight: 1.7 }}>
                                {formatCedulasDetalhe(s.saldo_final_detalhes).map((item, i) => (
                                  <div key={i}>{item.label} × {item.qtd} = {formatCurrency(item.total)}</div>
                                ))}
                              </div>
                            )}
                          </details>
                        </div>
                      )}
                      {diff !== null && editingSaldoId !== s.id && (
                        <div className="cash-report-row">
                          <span>Diferença</span>
                          <span style={{ color: diff >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* 7. Fundo de troco (só turno tarde) */}
                  {s.turno === 'tarde' && s.fundo_proximo_turno > 0 && (
                    <>
                      <div className="cash-report-row" style={{ marginTop: 12, fontWeight: 700, fontSize: '0.82rem', color: '#888' }}>
                        <span>Fundo de troco</span>
                      </div>
                      <div className="cash-report-row">
                        <span>Para abertura de amanhã</span><span>{formatCurrency(s.fundo_proximo_turno)}</span>
                      </div>
                    </>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MODAL EDITAR SALDO INICIAL ── */}
      {editandoSaldo && (
        <div className="cash-modal-overlay" onClick={() => setEditandoSaldo(false)}>
          <div className="cash-modal" onClick={e => e.stopPropagation()}>
            <div className="cash-modal-title">Corrigir saldo inicial</div>
            <table className="cedulas-table">
              <thead><tr><th>Cédula/Moeda</th><th>Qtd</th><th>Total</th></tr></thead>
              <tbody>
                {CEDULAS.map(c => (
                  <tr key={c.value}>
                    <td className="cedula-label">{c.label}</td>
                    <td>
                      <input
                        type="number" className="cedula-input" min="0"
                        value={ceduasEdit[c.value]}
                        onChange={e => setCeduasEdit(prev => ({ ...prev, [c.value]: e.target.value }))}
                      />
                    </td>
                    <td className="cedula-total">{formatCurrency((parseFloat(ceduasEdit[c.value]) || 0) * c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cash-saldo-total">
              <span className="cash-saldo-label">Novo total</span>
              <span className="cash-saldo-value">{formatCurrency(calcSaldo(ceduasEdit))}</span>
            </div>
            <div className="cash-modal-actions">
              <button className="cash-modal-cancel" onClick={() => setEditandoSaldo(false)}>Cancelar</button>
              <button className="cash-modal-confirm" onClick={handleSaveSaldoInicial} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SANGRIA / DESPESA / REFORÇO ── */}
      {modal && (
        <div className="cash-modal-overlay" onClick={() => { setModal(null); setModalCedulas(EMPTY_CEDULAS); }}>
          <div className="cash-modal" onClick={e => e.stopPropagation()}>
            <div className="cash-modal-title">
              {modal === 'sangria' ? <><FaArrowDown /> Registrar Sangria</>
                : modal === 'despesa' ? <><FaReceipt size={14} /> Registrar Despesa</>
                : <><FaMoneyBillWave /> Reforço de Caixa</>}
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
