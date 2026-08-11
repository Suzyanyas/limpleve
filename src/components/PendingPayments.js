import { useState, useEffect } from 'react';
import {
  FaMoneyBillWave, FaClock, FaChevronDown, FaChevronUp,
  FaCreditCard, FaCalendarAlt, FaStore, FaTruck,
} from 'react-icons/fa';
import { getPendingPayments, confirmBudgetPayment } from '../services/managementService';
import './PendingPayments.css';

const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  boleto: 'Boleto',
};

const formatMoney = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Fortaleza',
  });

const formatPayment = (method) => {
  if (!method) return '—';
  if (method.startsWith('misto|')) {
    return method.replace('misto|', '').split('|').map((p) => {
      const [k, v] = p.split(':');
      return `${PAYMENT_LABELS[k] || k}: R$ ${parseFloat(v).toFixed(2)}`;
    }).join(' + ');
  }
  return PAYMENT_LABELS[method] || method;
};

const pendingValue = (b) => {
  if (b.payment_status === 'parcial') {
    return Math.max(0, parseFloat(b.total || 0) - parseFloat(b.entrada_valor || 0));
  }
  return parseFloat(b.total || 0);
};

const ItemsTable = ({ budgetItems }) => (
  <div className="pp-items">
    <table className="pp-items-table">
      <thead>
        <tr>
          <th>Produto</th>
          <th className="pp-center">Qtd</th>
          <th className="pp-right">Unit.</th>
          <th className="pp-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {budgetItems.map((item, i) => (
          <tr key={i}>
            <td>{item.product_name}</td>
            <td className="pp-center">{item.quantity}</td>
            <td className="pp-right">{formatMoney(item.unit_price)}</td>
            <td className="pp-right">{formatMoney(item.total_price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BudgetCard = ({ budget, isOpen, toggleExpand, openModal }) => {
  const hasItems = budget.budget_items?.length > 0;
  const vPendente = pendingValue(budget);
  const isOnline = budget.sale_type === 'online';

  return (
    <div className="pp-card">
      <div className="pp-card-main">
        <div className="pp-card-info">
          <span className="pp-customer">{budget.customer_name}</span>

          <span className="pp-meta">
            <FaCalendarAlt className="pp-icon-inline" />
            {formatDate(budget.created_at)}
          </span>

          <span className="pp-meta">
            {isOnline
              ? <FaTruck className="pp-icon-inline" />
              : <FaStore className="pp-icon-inline" />}
            {isOnline ? 'Online' : 'Presencial'}
          </span>

          <span className="pp-meta">
            <FaCreditCard className="pp-icon-inline" />
            {formatPayment(budget.payment_method)}
          </span>

          {budget.payment_status === 'parcial' && (
            <span className="pp-meta pp-meta--sub">
              Entrada paga: {formatMoney(budget.entrada_valor)} —
              Restante: {formatMoney(vPendente)}
            </span>
          )}
        </div>

        <div className="pp-card-right">
          <span className="pp-total-label">Total pedido</span>
          <span className="pp-total">{formatMoney(budget.total)}</span>
          <span className="pp-pending">{formatMoney(vPendente)} pendente</span>

          <div className="pp-card-actions">
            {hasItems && (
              <button
                className="pp-expand-btn"
                onClick={() => toggleExpand(budget.id)}
                aria-label={isOpen ? 'Recolher' : 'Ver itens'}
              >
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            )}
            <button
              className="pp-confirm-btn"
              onClick={() => openModal(budget)}
            >
              <FaMoneyBillWave className="pp-btn-icon" />
              Confirmar recebimento
            </button>
          </div>
        </div>
      </div>

      {isOpen && hasItems && <ItemsTable budgetItems={budget.budget_items} />}
    </div>
  );
};

const INITIAL_VISIBLE = 5;

const Section = ({ title, icon, list, variant, expanded, toggleExpand, openModal }) => {
  const [showAll, setShowAll] = useState(false);
  if (list.length === 0) return null;

  const visible = showAll ? list : list.slice(0, INITIAL_VISIBLE);
  const hidden = list.length - INITIAL_VISIBLE;

  return (
    <section className="pp-section">
      <div className={`pp-section-header pp-section-header--${variant}`}>
        <span className="pp-section-icon">{icon}</span>
        <span className="pp-section-label">{title}</span>
        <span className="pp-section-count">{list.length}</span>
      </div>
      {visible.map((b) => (
        <BudgetCard
          key={b.id}
          budget={b}
          isOpen={expanded.has(b.id)}
          toggleExpand={toggleExpand}
          openModal={openModal}
        />
      ))}
      {list.length > INITIAL_VISIBLE && (
        <button
          className="pp-show-more-btn"
          onClick={() => setShowAll((s) => !s)}
        >
          {showAll ? (
            <><FaChevronUp className="pp-btn-icon" /> Ver menos</>
          ) : (
            <><FaChevronDown className="pp-btn-icon" /> Ver mais ({hidden} ocultos)</>
          )}
        </button>
      )}
    </section>
  );
};

export default function PendingPayments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [modal, setModal] = useState(null); // { budget }
  const [paymentForm, setPaymentForm] = useState('dinheiro');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPendingPayments().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openModal = (budget) => {
    setPaymentForm('dinheiro');
    setModal({ budget });
  };

  const handleConfirm = async () => {
    if (!modal) return;
    setSaving(true);
    const { budget } = modal;
    const valor = pendingValue(budget);

    const result = await confirmBudgetPayment({
      budgetId: budget.id,
      valor,
      formaPagamento: paymentForm,
      saleType: budget.sale_type || 'online',
      observacao: `${budget.customer_name} — confirmação manual`,
    });

    if (result.success) {
      setItems((prev) => prev.filter((b) => b.id !== budget.id));
      setModal(null);
    } else {
      alert('Erro ao confirmar pagamento. Tente novamente.');
    }
    setSaving(false);
  };

  const aReceber = items.filter((b) => b.payment_status === 'a_receber');
  const parcial  = items.filter((b) => b.payment_status === 'parcial');

  const totalPendente = items.reduce((acc, b) => acc + pendingValue(b), 0);

  return (
    <div className="pp-root">
      <div className="pp-topbar">
        <h2 className="pp-title">Pagamentos Pendentes</h2>
      </div>

      <div className="pp-summary">
        <div className="pp-summary-card pp-summary-card--count">
          <span className="pp-summary-label">Pendências</span>
          <span className="pp-summary-value">{items.length}</span>
          <span className="pp-summary-sub">
            {aReceber.length} a receber · {parcial.length} parcial
          </span>
        </div>
        <div className="pp-summary-card pp-summary-card--amount">
          <span className="pp-summary-label">Total a receber</span>
          <span className="pp-summary-value">{formatMoney(totalPendente)}</span>
          <span className="pp-summary-sub">soma de todos os valores pendentes</span>
        </div>
      </div>

      {loading ? (
        <div className="pp-loading">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="pp-empty">Nenhum pagamento pendente.</div>
      ) : (
        <div className="pp-sections">
          <Section
            title="A receber"
            icon={<FaClock />}
            list={aReceber}
            variant="a-receber"
            expanded={expanded}
            toggleExpand={toggleExpand}
            openModal={openModal}
          />
          <Section
            title="Pagamento parcial"
            icon={<FaMoneyBillWave />}
            list={parcial}
            variant="parcial"
            expanded={expanded}
            toggleExpand={toggleExpand}
            openModal={openModal}
          />
        </div>
      )}

      {modal && (
        <div className="pp-modal-overlay" onClick={() => setModal(null)}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-title">Confirmar recebimento</div>
            <div className="pp-modal-customer">{modal.budget.customer_name}</div>
            <div className="pp-modal-valor">{formatMoney(pendingValue(modal.budget))}</div>
            <div className="pp-modal-label">
              {modal.budget.payment_status === 'parcial'
                ? 'Valor restante a receber'
                : 'Valor total a receber'}
            </div>

            <div className="pp-modal-section-label">Forma de pagamento</div>
            <div className="pp-modal-payment-options">
              {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`pp-payment-btn ${paymentForm === key ? 'active' : ''}`}
                  onClick={() => setPaymentForm(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pp-modal-actions">
              <button className="pp-modal-cancel" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="pp-modal-confirm"
                onClick={handleConfirm}
                disabled={saving}
              >
                {saving ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
