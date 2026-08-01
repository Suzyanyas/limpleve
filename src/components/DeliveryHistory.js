import { useState, useEffect } from 'react';
import {
  FaCheckCircle, FaTruck, FaClock, FaBan,
  FaChevronDown, FaChevronUp, FaCalendarAlt,
  FaMapMarkerAlt, FaCreditCard,
} from 'react-icons/fa';
import { getDeliveryRoutesByDate } from '../services/managementService';
import './DeliveryHistory.css';

const todayFortaleza = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());

const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  boleto: 'Boleto',
};

const formatMoney = (v) => `R$ ${parseFloat(v || 0).toFixed(2)}`;

const formatPayment = (method) => {
  if (!method) return '—';
  if (method.startsWith('misto|')) {
    return method
      .replace('misto|', '')
      .split('|')
      .map((p) => {
        const [k, v] = p.split(':');
        return `${PAYMENT_LABELS[k] || k}: R$ ${parseFloat(v).toFixed(2)}`;
      })
      .join(' + ');
  }
  return PAYMENT_LABELS[method] || method;
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Fortaleza',
      })
    : null;

const sum = (list) =>
  list.reduce((acc, r) => acc + parseFloat(r.budgets?.total || 0), 0);

export default function DeliveryHistory({ onBack }) {
  const [date, setDate] = useState(todayFortaleza);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    setExpanded(new Set());
    getDeliveryRoutesByDate(date).then((data) => {
      setRoutes(data);
      setLoading(false);
    });
  }, [date]);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const delivered  = routes.filter((r) => r.status === 'delivered');
  const inProgress = routes.filter((r) => r.status === 'in_progress');
  const pending    = routes.filter((r) => r.status === 'next');
  const cancelled  = routes.filter((r) => r.status === 'cancelled');

  const totalDia = sum([...delivered, ...inProgress, ...pending]);

  // ── Subcomponentes ──────────────────────────────────────────────────────────

  const SectionHeader = ({ icon, label, count, variant }) => (
    <div className={`dh-section-header dh-section-header--${variant}`}>
      <span className="dh-section-icon">{icon}</span>
      <span className="dh-section-label">{label}</span>
      <span className="dh-section-count">{count}</span>
    </div>
  );

  const ItemsTable = ({ items }) => (
    <div className="dh-items">
      <table className="dh-items-table">
        <thead>
          <tr>
            <th>Produto</th>
            <th className="dh-center">Qtd</th>
            <th className="dh-right">Unit.</th>
            <th className="dh-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.product_name}</td>
              <td className="dh-center">{item.quantity}</td>
              <td className="dh-right">{formatMoney(item.unit_price)}</td>
              <td className="dh-right">{formatMoney(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const DeliveredCard = ({ route }) => {
    const b = route.budgets;
    const isOpen = expanded.has(route.id);
    const hasItems = b?.budget_items?.length > 0;
    const entradaValor = parseFloat(b?.entrada_valor || 0);
    const deliveredTime = formatTime(route.delivered_at);
    const address = route.address || b?.delivery_address;

    return (
      <div className="dh-card dh-card--delivered">
        <div className="dh-card-main">
          <div className="dh-card-info">
            <span className="dh-customer">{route.customer_name}</span>
            {deliveredTime && (
              <span className="dh-meta">Entregue às {deliveredTime}</span>
            )}
            {address && (
              <span className="dh-meta">
                <FaMapMarkerAlt className="dh-icon-inline" />
                {address}
              </span>
            )}
            <span className="dh-meta">
              <FaCreditCard className="dh-icon-inline" />
              {formatPayment(b?.payment_method)}
              {entradaValor > 0 &&
                ` — entrada ${formatMoney(entradaValor)}, restante na entrega`}
            </span>
          </div>
          <div className="dh-card-right">
            <span className="dh-total">{formatMoney(b?.total)}</span>
            {hasItems && (
              <button
                className="dh-expand-btn"
                onClick={() => toggleExpand(route.id)}
                aria-label={isOpen ? 'Recolher itens' : 'Ver itens'}
              >
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            )}
          </div>
        </div>
        {isOpen && hasItems && <ItemsTable items={b.budget_items} />}
      </div>
    );
  };

  const ActiveCard = ({ route }) => {
    const b = route.budgets;
    const isOpen = expanded.has(route.id);
    const hasItems = b?.budget_items?.length > 0;
    const address = route.address || b?.delivery_address;
    const entradaValor = parseFloat(b?.entrada_valor || 0);

    let paymentNote = null;
    if (b?.payment_status === 'a_receber') paymentNote = 'a receber na entrega';
    else if (b?.payment_status === 'parcial' && entradaValor > 0)
      paymentNote = `entrada ${formatMoney(entradaValor)}, restante na entrega`;

    return (
      <div className={`dh-card dh-card--${route.status}`}>
        <div className="dh-card-main">
          <div className="dh-card-info">
            <span className="dh-customer">{route.customer_name}</span>
            {address && (
              <span className="dh-meta">
                <FaMapMarkerAlt className="dh-icon-inline" />
                {address}
              </span>
            )}
            <span className="dh-meta">
              <FaCreditCard className="dh-icon-inline" />
              {formatPayment(b?.payment_method)}
              {paymentNote && ` — ${paymentNote}`}
            </span>
          </div>
          <div className="dh-card-right">
            <span className="dh-total">{formatMoney(b?.total)}</span>
            {hasItems && (
              <button
                className="dh-expand-btn"
                onClick={() => toggleExpand(route.id)}
                aria-label={isOpen ? 'Recolher itens' : 'Ver itens'}
              >
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            )}
          </div>
        </div>
        {isOpen && hasItems && <ItemsTable items={b.budget_items} />}
      </div>
    );
  };

  const CancelledCard = ({ route }) => {
    const b = route.budgets;
    return (
      <div className="dh-card dh-card--cancelled">
        <div className="dh-card-main">
          <div className="dh-card-info">
            <span className="dh-customer">{route.customer_name}</span>
          </div>
          <div className="dh-card-right">
            <span className="dh-total dh-total--muted">{formatMoney(b?.total)}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="dh-root">
      <div className="dh-topbar">
        {onBack && (
          <button className="dh-back-btn" onClick={onBack}>
            ← Voltar
          </button>
        )}
        <h2 className="dh-title">Histórico de Entregas</h2>
        <div className="dh-date-wrap">
          <FaCalendarAlt className="dh-cal-icon" />
          <input
            type="date"
            className="dh-date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="dh-summary">
        <div className="dh-summary-card dh-summary-card--total">
          <span className="dh-summary-label">Total do dia</span>
          <span className="dh-summary-value">{formatMoney(totalDia)}</span>
          <span className="dh-summary-sub">
            {delivered.length + inProgress.length + pending.length} entregas
          </span>
        </div>
        <div className="dh-summary-card dh-summary-card--delivered">
          <span className="dh-summary-label">Concluídas</span>
          <span className="dh-summary-value">{formatMoney(sum(delivered))}</span>
          <span className="dh-summary-sub">
            {delivered.length} entrega{delivered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="dh-summary-card dh-summary-card--active">
          <span className="dh-summary-label">Em rota + Pendentes</span>
          <span className="dh-summary-value">
            {formatMoney(sum([...inProgress, ...pending]))}
          </span>
          <span className="dh-summary-sub">
            {inProgress.length + pending.length} entrega
            {inProgress.length + pending.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="dh-summary-card dh-summary-card--cancelled">
          <span className="dh-summary-label">Canceladas</span>
          <span className="dh-summary-value">{formatMoney(sum(cancelled))}</span>
          <span className="dh-summary-sub">
            {cancelled.length} entrega{cancelled.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="dh-loading">Carregando...</div>
      ) : routes.length === 0 ? (
        <div className="dh-empty">Nenhuma entrega encontrada para esta data.</div>
      ) : (
        <div className="dh-sections">
          {delivered.length > 0 && (
            <section className="dh-section">
              <SectionHeader
                icon={<FaCheckCircle />}
                label="Concluídas"
                count={delivered.length}
                variant="delivered"
              />
              {delivered.map((r) => (
                <DeliveredCard key={r.id} route={r} />
              ))}
            </section>
          )}

          {inProgress.length > 0 && (
            <section className="dh-section">
              <SectionHeader
                icon={<FaTruck />}
                label="Em rota"
                count={inProgress.length}
                variant="in-progress"
              />
              {inProgress.map((r) => (
                <ActiveCard key={r.id} route={r} />
              ))}
            </section>
          )}

          {pending.length > 0 && (
            <section className="dh-section">
              <SectionHeader
                icon={<FaClock />}
                label="Pendentes"
                count={pending.length}
                variant="next"
              />
              {pending.map((r) => (
                <ActiveCard key={r.id} route={r} />
              ))}
            </section>
          )}

          {cancelled.length > 0 && (
            <section className="dh-section">
              <SectionHeader
                icon={<FaBan />}
                label="Canceladas"
                count={cancelled.length}
                variant="cancelled"
              />
              {cancelled.map((r) => (
                <CancelledCard key={r.id} route={r} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
