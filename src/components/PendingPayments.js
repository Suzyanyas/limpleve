import { useState, useEffect } from 'react';
import {
  FaMoneyBillWave, FaClock, FaChevronDown, FaChevronUp,
  FaCreditCard, FaCalendarAlt, FaStore, FaTruck, FaCheck,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getPendingPayments, confirmBudgetPayment, confirmBudgetPaymentBatchMarkOnly, ceFortaleza } from '../services/managementService';
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

const BudgetCard = ({ budget, isOpen, toggleExpand, openModal, isSelected, onToggleSelect }) => {
  const hasItems = budget.budget_items?.length > 0;
  const vPendente = pendingValue(budget);
  const isOnline = budget.sale_type === 'online';

  return (
    <div className={`pp-card${isSelected ? ' pp-card--selected' : ''}`}>
      <div className="pp-card-main">
        <div
          className={`pp-checkbox${isSelected ? ' pp-checkbox--checked' : ''}`}
          onClick={() => onToggleSelect(budget.id)}
        >
          {isSelected && <FaCheck />}
        </div>

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

const Section = ({ title, icon, list, variant, expanded, toggleExpand, openModal, selectedIds, onToggleSelect, onSelectAllSection }) => {
  const [showAll, setShowAll] = useState(false);
  if (list.length === 0) return null;

  const visible = showAll ? list : list.slice(0, INITIAL_VISIBLE);
  const hidden = list.length - INITIAL_VISIBLE;
  const allSelected = list.length > 0 && list.every((b) => selectedIds.has(b.id));

  return (
    <section className="pp-section">
      <div className={`pp-section-header pp-section-header--${variant}`}>
        <span className="pp-section-icon">{icon}</span>
        <span className="pp-section-label">{title}</span>
        <span className="pp-section-count">{list.length}</span>
        <button
          className={`pp-select-all-btn${allSelected ? ' pp-select-all-btn--active' : ''}`}
          onClick={() => onSelectAllSection(list, !allSelected)}
        >
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>
      {visible.map((b) => (
        <BudgetCard
          key={b.id}
          budget={b}
          isOpen={expanded.has(b.id)}
          toggleExpand={toggleExpand}
          openModal={openModal}
          isSelected={selectedIds.has(b.id)}
          onToggleSelect={onToggleSelect}
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

const SALE_TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
];

const DATE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: '7 dias' },
  { value: '30dias', label: '30 dias' },
];

export default function PendingPayments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState('dinheiro');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [filterSaleType, setFilterSaleType] = useState('todos');
  const [filterDate, setFilterDate] = useState('todos');

  const fetchItems = async () => {
    const data = await getPendingPayments();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onToggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onSelectAllSection = (sectionList, select) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      sectionList.forEach((b) => select ? next.add(b.id) : next.delete(b.id));
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
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(budget.id); return n; });
      setModal(null);
      toast.success('Pagamento confirmado!');
    } else {
      toast.error('Erro ao confirmar pagamento.');
    }
    setSaving(false);
  };

  const handleBatchConfirm = async () => {
    setBatchConfirming(true);
    const ids = Array.from(selectedIds);
    const result = await confirmBudgetPaymentBatchMarkOnly(ids);
    if (result.success) {
      toast.success(`${result.count} pagamento(s) confirmado(s)`);
      setSelectedIds(new Set());
      await fetchItems();
    } else {
      toast.error('Erro ao confirmar pagamentos: ' + (result.error || ''));
    }
    setBatchConfirming(false);
  };

  const todayStr = ceFortaleza(new Date());
  const d7 = new Date(); d7.setDate(d7.getDate() - 7);
  const d7Str = ceFortaleza(d7);
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const d30Str = ceFortaleza(d30);

  const filtered = items.filter((b) => {
    if (filterSaleType !== 'todos' && b.sale_type !== filterSaleType) return false;
    if (filterDate !== 'todos') {
      const bDate = ceFortaleza(new Date(b.created_at));
      if (filterDate === 'hoje' && bDate !== todayStr) return false;
      if (filterDate === '7dias' && bDate < d7Str) return false;
      if (filterDate === '30dias' && bDate < d30Str) return false;
    }
    return true;
  });

  const aReceber = filtered.filter((b) => b.payment_status === 'a_receber');
  const parcial  = filtered.filter((b) => b.payment_status === 'parcial');
  const totalPendente = filtered.reduce((acc, b) => acc + pendingValue(b), 0);

  return (
    <div className="pp-root">
      <div className="pp-topbar">
        <h2 className="pp-title">Pagamentos Pendentes</h2>
      </div>

      {items.length > 0 && (
        <div className="pp-notice-banner">
          Você tem pagamentos pendentes a confirmar
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="pp-batch-bar">
          <span className="pp-batch-count">{selectedIds.size} selecionado(s)</span>
          <button
            className="pp-batch-btn"
            onClick={handleBatchConfirm}
            disabled={batchConfirming}
          >
            <FaCheck className="pp-btn-icon" />
            {batchConfirming ? 'Confirmando...' : 'Confirmar recebimento'}
          </button>
        </div>
      )}

      <div className="pp-filters">
        <div className="pp-filter-group">
          <span className="pp-filter-label">Tipo</span>
          <div className="pp-filter-options">
            {SALE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`pp-filter-btn${filterSaleType === opt.value ? ' active' : ''}`}
                onClick={() => setFilterSaleType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pp-filter-group">
          <span className="pp-filter-label">Período</span>
          <div className="pp-filter-options">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`pp-filter-btn${filterDate === opt.value ? ' active' : ''}`}
                onClick={() => setFilterDate(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pp-summary">
        <div className="pp-summary-card pp-summary-card--count">
          <span className="pp-summary-label">Pendências</span>
          <span className="pp-summary-value">{filtered.length}</span>
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
      ) : filtered.length === 0 ? (
        <div className="pp-empty">
          {items.length === 0
            ? 'Nenhum pagamento pendente.'
            : 'Nenhum resultado com os filtros atuais.'}
        </div>
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
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAllSection={onSelectAllSection}
          />
          <Section
            title="Pagamento parcial"
            icon={<FaMoneyBillWave />}
            list={parcial}
            variant="parcial"
            expanded={expanded}
            toggleExpand={toggleExpand}
            openModal={openModal}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAllSection={onSelectAllSection}
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
