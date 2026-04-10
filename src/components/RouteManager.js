import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getAllDeliveryRoutes,
  updateDeliveryRouteStatus
} from '../services/managementService';
import './RouteManager.css';

export default function RouteManager({ onBack, onUpdate }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState(null);

  const toggleSummary = (routeId) => {
    setExpandedRoute(prev => prev === routeId ? null : routeId);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    const data = await getAllDeliveryRoutes();
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
    const result = await updateDeliveryRouteStatus(route.id, 'delivered');
    
    if (result.success) {
      toast.success(`Entrega concluída para ${route.customer_name}!`);
      loadRoutes();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao concluir entrega');
    }
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

  const renderSummary = (route) => {
    const items = route.budgets?.budget_items;
    const total = route.budgets?.total;
    const payment = route.budgets?.payment_method;
    const address = route.budgets?.delivery_address || route.address;
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
          {payment && <span className="summary-payment">{payment}</span>}
          {total && <span className="summary-total">Total: R$ {parseFloat(total).toFixed(2)}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="route-manager">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <h2>Rota</h2>
        <div className="header-icon">
          📍
        </div>
      </div>

      <div className="route-content">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
            {/* Próximas Rotas */}
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
                        </div>
                        {route.address && (
                          <div className="route-address">{route.address}</div>
                        )}
                      </div>
                      <div className="route-actions">
                        {route.budgets?.budget_items?.length > 0 && (
                          <button
                            className="btn-summary"
                            onClick={() => toggleSummary(route.id)}
                          >
                            {expandedRoute === route.id ? '▲' : '▼'} Pedido
                          </button>
                        )}
                        <button
                          className="btn-start"
                          onClick={() => handleStartRoute(route)}
                        >
                          Iniciar
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelRoute(route)}
                        >
                          ✕
                        </button>
                      </div>
                      {expandedRoute === route.id && renderSummary(route)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rotas em Andamento */}
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
                        </div>
                        {route.address && (
                          <div className="route-address">{route.address}</div>
                        )}
                      </div>
                      <div className="route-actions">
                        {route.budgets?.budget_items?.length > 0 && (
                          <button
                            className="btn-summary"
                            onClick={() => toggleSummary(route.id)}
                          >
                            {expandedRoute === route.id ? '▲' : '▼'} Pedido
                          </button>
                        )}
                        <button
                          className="btn-complete"
                          onClick={() => handleCompleteRoute(route)}
                        >
                          ✓ Concluir
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelRoute(route)}
                        >
                          ✕
                        </button>
                      </div>
                      {expandedRoute === route.id && renderSummary(route)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rotas Concluídas */}
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
                        <button
                          className="btn-summary small"
                          onClick={() => toggleSummary(route.id)}
                        >
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
    </div>
  );
}
