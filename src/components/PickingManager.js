import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getTodayPickingOrders,
  updatePickingStatus,
  deletePickingOrder,
  createDeliveryRoute,
  getTodayDeliveryRoutes
} from '../services/managementService';
import './PickingManager.css';

export default function PickingManager({ onBack, onUpdate, onOpenBudget }) {
  const [pickingOrders, setPickingOrders] = useState([]);
  const [routedBudgetIds, setRoutedBudgetIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [orders, routes] = await Promise.all([
      getTodayPickingOrders(),
      getTodayDeliveryRoutes()
    ]);
    setPickingOrders(orders);
    // Conjunto de budget_ids que já têm rota (exceto canceladas)
    const ids = new Set(
      routes
        .filter(r => r.status !== 'cancelled')
        .map(r => r.budget_id)
        .filter(Boolean)
    );
    setRoutedBudgetIds(ids);
    setLoading(false);
  };

  const handlePick = async (order) => {
    const result = await updatePickingStatus(order.id, 'picked', 'Sistema');

    if (result.success) {
      toast.success(`${order.customer_name} separado!`);
      loadData();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao atualizar separação');
    }
  };

  const handleUnpick = async (order) => {
    const result = await updatePickingStatus(order.id, 'pending');

    if (result.success) {
      toast.success('Marcado como pendente');
      loadData();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao atualizar separação');
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Excluir separação de ${order.customer_name}?`)) return;
    const result = await deletePickingOrder(order.id);
    if (result.success) {
      toast.success('Separação excluída');
      loadData();
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao excluir');
    }
  };

  const handleCreateRoute = async (order) => {
    const result = await createDeliveryRoute({
      budget_id: order.budget_id || null,
      customer_name: order.customer_name,
      customer_code: order.customer_code || null,
      address: '',
      status: 'next',
      delivery_date: new Date().toISOString().split('T')[0]
    });

    if (result.success) {
      toast.success(`Rota criada para ${order.customer_name}!`);
      setRoutedBudgetIds(prev => new Set([...prev, order.budget_id]));
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao criar rota');
    }
  };

  const pickedOrders = pickingOrders.filter(o => o.status === 'picked');
  const pendingOrders = pickingOrders.filter(o => o.status === 'pending');

  return (
    <div className="picking-manager">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <h2>Separação</h2>
        <div className="header-icon">
          📦
        </div>
      </div>

      <div className="picking-content">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
            {/* Separados */}
            {pickedOrders.length > 0 && (
              <div className="picking-section picked-section">
                {pickedOrders.map(order => (
                  <div key={order.id} className="picking-item picked">
                    <div className="item-info">
                      <span className="checkbox checked">✓</span>
                      <span
                        className={`customer-name${onOpenBudget && order.budget_id ? ' customer-name-link' : ''}`}
                        onClick={() => onOpenBudget && order.budget_id && onOpenBudget(order.budget_id)}
                      >{order.customer_name}</span>
                    </div>
                    <div className="item-actions">
                      {routedBudgetIds.has(order.budget_id) ? (
                        <span className="badge-routed">📍 Em Rota</span>
                      ) : (
                        <button
                          className="btn-route"
                          onClick={() => handleCreateRoute(order)}
                        >
                          📍 Criar Rota
                        </button>
                      )}
                      <button
                        className="btn-unpick"
                        onClick={() => handleUnpick(order)}
                      >
                        Desfazer
                      </button>
                      <button
                        className="btn-delete-pick"
                        onClick={() => handleDelete(order)}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pendentes */}
            {pendingOrders.length > 0 && (
              <div className="picking-section pending-section">
                {pendingOrders.map(order => (
                  <div key={order.id} className="picking-item pending">
                    <div className="item-info">
                      <span className="checkbox">☐</span>
                      <span
                        className={`customer-name${onOpenBudget && order.budget_id ? ' customer-name-link' : ''}`}
                        onClick={() => onOpenBudget && order.budget_id && onOpenBudget(order.budget_id)}
                      >{order.customer_name}</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn-pick"
                        onClick={() => handlePick(order)}
                      >
                        Separar
                      </button>
                      <button
                        className="btn-delete-pick"
                        onClick={() => handleDelete(order)}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pickingOrders.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>Nenhuma ordem de separação</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
