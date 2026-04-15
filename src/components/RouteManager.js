import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getTodayDeliveryRoutes,
  updateDeliveryRouteStatus,
  updateBudgetStatus,
  getOpenSession,
  createCashTransaction
} from '../services/managementService';
import './RouteManager.css';

const PAYMENT_LABELS = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 PIX',
  cartao_debito: '💳 Débito',
  cartao_credito: '💳 Crédito',
  boleto: 'Boleto',
};

export default function RouteManager({ onBack, onUpdate }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { route, valorRestante }
  const [paymentForm, setPaymentForm] = useState('dinheiro');
  const [saving, setSaving] = useState(false);

  const toggleSummary = (routeId) => {
    setExpandedRoute(prev => prev === routeId ? null : routeId);
  };

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    setLoading(true);
    const data = await getTodayDeliveryRoutes();
    setRoutes(data);
    setLoading(false);
  };

  const handleStartRoute = async (route) => {
    const result = await updateDeliveryRouteStatus(route.id, 'in_progress');
    if (result.success) {
      toast.success(`Rota iniciada para ${route.customer_name}!`);
      loadRoutes();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao iniciar rota');
    }
  };

  const handleCompleteRoute = async (route) => {
    const budget = route.budgets;
    const paymentStatus = budget?.payment_status || 'pago';

    if (paymentStatus === 'pago') {
      // Já foi ao caixa na aprovação — conclui direto
      await concluirEntrega(route);
    } else if (paymentStatus === 'a_receber') {
      // Abre modal para receber o valor total
      setPaymentForm('dinheiro');
      setPaymentModal({ route, valorRestante: parseFloat(budget?.total || 0) });
    } else if (paymentStatus === 'parcial') {
      // Abre modal para receber o restante
      const total = parseFloat(budget?.total || 0);
      const entrada = parseFloat(budget?.entrada_valor || 0);
      const restante = Math.max(0, total - entrada);
      setPaymentForm('dinheiro');
      setPaymentModal({ route, valorRestante: restante });
    }
  };

  const concluirEntrega = async (route) => {
    const result = await updateDeliveryRouteStatus(route.id, 'delivered');
    if (result.success) {
      // Atualiza o orçamento para entregue, removendo-o das telas operacionais
      if (route.budgets?.id) {
        await updateBudgetStatus(route.budgets.id, 'delivered');
      }
      toast.success(`Entrega concluída para ${route.customer_name}!`);
      loadRoutes();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao concluir entrega');
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    setSaving(true);

    const { route, valorRestante } = paymentModal;
    const budget = route.budgets;

    // Lança no caixa
    const session = await getOpenSession();
    await createCashTransaction({
      session_id: session?.id || null,
      budget_id: budget?.id || null,
      tipo: 'venda',
      valor: valorRestante,
      forma_pagamento: paymentForm,
      sale_type: 'online',
      payment_status: 'pago',
      observacao: `${route.customer_name} — recebimento na entrega`,
    });

    if (!session) {
      toast('Pagamento registrado sem turno aberto', { icon: '⚠️' });
    }

    // Conclui a entrega
    await concluirEntrega(route);
    setPaymentModal(null);
    setSaving(false);
  };

  const handleCancelRoute = async (route) => {
    const result = await updateDeliveryRouteStatus(route.id, 'cancelled');
    if (result.success) {
      toast.success('Rota cancelada');
      loadRoutes();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao cancelar rota');
    }
  };

  const nextRoutes = routes.filter(r => r.status === 'next');
  const inProgressRoutes = routes.filter(r => r.status === 'in_progress');
  const deliveredRoutes = routes.filter(r => r.status === 'delivered');

  const renderPaymentBadge = (route) => {
    const ps = route.budgets?.payment_status;
    if (!ps || ps === 'pago') return null;
    if (ps === 'a_receber') return <span className="payment-badge a-receber">⏳ A receber</span>;
    if (ps === 'parcial') {
      const total = parseFloat(route.budgets?.total || 0);
      const entrada = parseFloat(route.budgets?.entrada_valor || 0);
      const restante = Math.max(0, total - entrada);
      return <span className="payment-badge parcial">🔄 Restante: R$ {restante.toFixed(2)}</span>;
    }
    return null;
  };

  const renderSummary = (route) => {
    const items = route.budgets?.budget_items;
    const total = parseFloat(route.budgets?.total || 0);
    const payment = route.budgets?.payment_method;
    const ps = route.budgets?.payment_status;
    const entradaValor = parseFloat(route.budgets?.entrada_valor || 0);
    const entradaMethod = route.budgets?.entrada_method;
    const address = route.budgets?.delivery_address || route.address;

    const pmLabels = {
      dinheiro: 'Dinheiro', pix: 'PIX',
      cartao_debito: 'Débito', cartao_credito: 'Crédito',
      boleto: 'Boleto',
    };
    const pmFormatted = payment?.startsWith('misto|')
      ? payment.replace('misto|', '').split('|').map(p => {
          const [k, v] = p.split(':');
          return `${pmLabels[k] || k}: R$ ${parseFloat(v).toFixed(2)}`;
        }).join(' + ')
      : (pmLabels[payment] || payment || '');

    if (!items || items.length === 0) return null;
    return (
      <div className="route-summary">
        {address && (
          <div className="summary-address">
            <span className="summary-address-label">📍 Endereço:</span>
            <span className="summary-address-value">{address}</span>
          </div>
        )}
        <table className="summary-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.product_name}</td>
                <td className="center">{item.quantity}</td>
                <td className="center">R$ {parseFloat(item.unit_price).toFixed(2)}</td>
                <td className="right">R$ {parseFloat(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="summary-footer">
          <div className="summary-payment-detail">
            {ps === 'parcial' ? (
              <>
                <span className="summary-payment">Pagamento parcial</span>
                <span className="summary-payment-sub">Valor pago: R$ {entradaValor.toFixed(2)} ({pmLabels[entradaMethod] || entradaMethod || pmFormatted})</span>
                <span className="summary-payment-sub restante">Restante: R$ {Math.max(0, total - entradaValor).toFixed(2)} na entrega</span>
              </>
            ) : ps === 'a_receber' ? (
              <span className="summary-payment restante">A receber</span>
            ) : (
              <span className="summary-payment">{pmFormatted}</span>
            )}
          </div>
          {total > 0 && <span className="summary-total">Total: R$ {total.toFixed(2)}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="route-manager">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <h2>Rota</h2>
        <div className="header-icon">📍</div>
      </div>

      <div className="route-content">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
            {nextRoutes.length > 0 && (
              <div className="route-section">
                <div className="section-header next">
                  <span className="status-icon">🔴</span>
                  <h3>Próxima rota</h3>
                </div>
                <div className="routes-list">
                  {nextRoutes.map(route => (
                    <div key={route.id} className="route-item next">
                      <div className="route-info">
                        <div className="route-customer">
                          <span className="customer-name">{route.customer_name}</span>
                          {route.budgets?.customers?.whatsapp && (
                            <span className="customer-code">📱 {route.budgets.customers.whatsapp}</span>
                          )}
                          {renderPaymentBadge(route)}
                        </div>
                        {route.address && <div className="route-address">{route.address}</div>}
                      </div>
                      <div className="route-actions">
                        {route.budgets?.budget_items?.length > 0 && (
                          <button className="btn-summary" onClick={() => toggleSummary(route.id)}>
                            {expandedRoute === route.id ? '▲' : '▼'} Pedido
                          </button>
                        )}
                        <button className="btn-start" onClick={() => handleStartRoute(route)}>Iniciar</button>
                        <button className="btn-cancel" onClick={() => handleCancelRoute(route)}>✕</button>
                      </div>
                      {expandedRoute === route.id && renderSummary(route)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inProgressRoutes.length > 0 && (
              <div className="route-section">
                <div className="section-header in-progress">
                  <span className="status-icon">🟢</span>
                  <h3>Em rota</h3>
                </div>
                <div className="routes-list">
                  {inProgressRoutes.map(route => (
                    <div key={route.id} className="route-item in-progress">
                      <div className="route-info">
                        <div className="route-customer">
                          <span className="customer-name">{route.customer_name}</span>
                          {route.budgets?.customers?.whatsapp && (
                            <span className="customer-code">📱 {route.budgets.customers.whatsapp}</span>
                          )}
                          {renderPaymentBadge(route)}
                        </div>
                        {route.address && <div className="route-address">{route.address}</div>}
                      </div>
                      <div className="route-actions">
                        {route.budgets?.budget_items?.length > 0 && (
                          <button className="btn-summary" onClick={() => toggleSummary(route.id)}>
                            {expandedRoute === route.id ? '▲' : '▼'} Pedido
                          </button>
                        )}
                        <button className="btn-complete" onClick={() => handleCompleteRoute(route)}>
                          ✓ Concluir
                        </button>
                        <button className="btn-cancel" onClick={() => handleCancelRoute(route)}>✕</button>
                      </div>
                      {expandedRoute === route.id && renderSummary(route)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveredRoutes.length > 0 && (
              <div className="route-section">
                <div className="section-header delivered">
                  <span className="status-icon">✅</span>
                  <h3>Concluídas</h3>
                </div>
                <div className="routes-list">
                  {deliveredRoutes.map(route => (
                    <div key={route.id} className="route-item delivered">
                      <div className="route-info">
                        <div className="route-customer">
                          <span className="customer-name">{route.customer_name}</span>
                          {route.customer_code && (
                            <span className="customer-code">{route.customer_code}</span>
                          )}
                          <span className="status-badge">✓</span>
                        </div>
                        {route.delivered_at && (
                          <div className="route-time">
                            Entregue: {new Date(route.delivered_at).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>
                      {route.budgets?.budget_items?.length > 0 && (
                        <button className="btn-summary small" onClick={() => toggleSummary(route.id)}>
                          {expandedRoute === route.id ? '▲' : '▼'} Pedido
                        </button>
                      )}
                      {expandedRoute === route.id && renderSummary(route)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {routes.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📍</div>
                <p>Nenhuma rota cadastrada</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de recebimento na entrega */}
      {paymentModal && (
        <div className="rm-modal-overlay" onClick={() => setPaymentModal(null)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-modal-title">💰 Receber pagamento</div>
            <div className="rm-modal-customer">{paymentModal.route.customer_name}</div>
            <div className="rm-modal-valor">
              R$ {paymentModal.valorRestante.toFixed(2)}
            </div>
            <div className="rm-modal-label">
              {paymentModal.route.budgets?.payment_status === 'parcial'
                ? 'Valor restante a receber na entrega'
                : 'Valor total a receber'}
            </div>

            <div className="rm-modal-section-label">Forma de pagamento</div>
            <div className="rm-payment-options">
              {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`rm-payment-btn ${paymentForm === key ? 'active' : ''}`}
                  onClick={() => setPaymentForm(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="rm-modal-actions">
              <button className="rm-btn-cancel" onClick={() => setPaymentModal(null)}>Cancelar</button>
              <button className="rm-btn-confirm" onClick={handleConfirmPayment} disabled={saving}>
                {saving ? 'Registrando...' : '✓ Confirmar recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
