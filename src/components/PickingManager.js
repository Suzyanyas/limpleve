import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getTodayPickingOrders,
  updatePickingStatus,
  deletePickingOrder,
  createDeliveryRoute,
  getTodayDeliveryRoutes,
  createPickingAudit,
  getAppPin,
} from '../services/managementService';
import { supabase } from '../supabaseClient';
import './PickingManager.css';

const PIN_LENGTH = 4;

export default function PickingManager({ onBack, onUpdate, onOpenBudget }) {
  const [pickingOrders, setPickingOrders] = useState([]);
  const [routedBudgetIds, setRoutedBudgetIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Modal PIN
  const [editModal, setEditModal] = useState(null); // { order }
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinValid, setPinValid] = useState(false);

  // Formulário de edição
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [editItems, setEditItems] = useState([]);       // cópia editável dos budget_items
  const [editAddress, setEditAddress] = useState('');
  const [editPayment, setEditPayment] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Valores originais para auditoria
  const [origItems, setOrigItems] = useState([]);
  const [origAddress, setOrigAddress] = useState('');
  const [origPayment, setOrigPayment] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [orders, routes] = await Promise.all([
      getTodayPickingOrders(),
      getTodayDeliveryRoutes(),
    ]);
    setPickingOrders(orders);
    const ids = new Set(
      routes.filter(r => r.status !== 'cancelled').map(r => r.budget_id).filter(Boolean)
    );
    setRoutedBudgetIds(ids);
    setLoading(false);
  };

  // ── Ações de lista ──────────────────────────────────────────────

  const handlePick = async (order) => {
    const result = await updatePickingStatus(order.id, 'picked', 'Sistema');
    if (result.success) {
      toast.success(`${order.customer_name} separado!`);
      loadData(); onUpdate && onUpdate();
    } else {
      toast.error('Erro ao atualizar separação');
    }
  };

  const handleUnpick = async (order) => {
    const result = await updatePickingStatus(order.id, 'pending');
    if (result.success) {
      toast.success('Marcado como pendente');
      loadData(); onUpdate && onUpdate();
    } else {
      toast.error('Erro ao atualizar separação');
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Excluir separação de ${order.customer_name}?`)) return;
    const result = await deletePickingOrder(order.id);
    if (result.success) {
      toast.success('Separação excluída');
      loadData(); onUpdate && onUpdate();
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
      delivery_date: new Date().toISOString().split('T')[0],
    });
    if (result.success) {
      toast.success(`Rota criada para ${order.customer_name}!`);
      setRoutedBudgetIds(prev => new Set([...prev, order.budget_id]));
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao criar rota');
    }
  };

  // ── PIN ─────────────────────────────────────────────────────────

  const openEditModal = (order) => {
    setEditModal({ order });
    setPinInput('');
    setPinError('');
    setPinValid(false);
    setEditItems([]);
    setEditAddress('');
    setEditPayment('');
    setEditNotes('');
    setEditReason('');
  };

  const closeEditModal = () => {
    setEditModal(null);
    setPinInput('');
    setPinError('');
    setPinValid(false);
  };

  const handlePinDigit = (d) => {
    if (pinInput.length >= PIN_LENGTH) return;
    const next = pinInput + d;
    setPinInput(next);
    setPinError('');
    if (next.length === PIN_LENGTH) validatePin(next);
  };

  const handlePinDelete = () => {
    setPinInput(p => p.slice(0, -1));
    setPinError('');
  };

  useEffect(() => {
    if (!editModal || pinValid) return;
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handlePinDigit(e.key);
      else if (e.key === 'Backspace') handlePinDelete();
      else if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModal, pinValid, pinInput]);

  const validatePin = async (entered) => {
    const stored = await getAppPin();
    if (entered === stored) {
      setPinValid(true);
      loadBudgetData(editModal.order);
    } else {
      setPinError('PIN incorreto');
      setTimeout(() => { setPinInput(''); setPinError(''); }, 700);
    }
  };

  // ── Carrega dados do orçamento após PIN correto ──────────────────

  const loadBudgetData = async (order) => {
    if (!order.budget_id) return;
    setBudgetLoading(true);
    try {
      const [{ data: items }, { data: budget }] = await Promise.all([
        supabase.from('budget_items').select('*').eq('budget_id', order.budget_id),
        supabase.from('budgets').select('delivery_address, payment_method, notes').eq('id', order.budget_id).single(),
      ]);

      const itemsCopy = (items || []).map(i => ({ ...i }));
      setEditItems(itemsCopy);
      setOrigItems(JSON.parse(JSON.stringify(itemsCopy)));

      const addr = budget?.delivery_address || '';
      const pay = budget?.payment_method || '';
      const nt = budget?.notes || '';
      setEditAddress(addr);  setOrigAddress(addr);
      setEditPayment(pay);   setOrigPayment(pay);
      setEditNotes(nt);
    } catch {
      toast.error('Erro ao carregar dados do orçamento');
    } finally {
      setBudgetLoading(false);
    }
  };

  // ── Edição de itens ──────────────────────────────────────────────

  const handleItemChange = (idx, field, value) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total_price = parseFloat(updated.quantity || 0) * parseFloat(updated.unit_price || 0);
      return updated;
    }));
  };

  const handleRemoveItem = (idx) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Salvar ───────────────────────────────────────────────────────

  const handleEditSave = async () => {
    if (!editReason.trim()) {
      toast.error('Preencha o motivo da alteração');
      return;
    }
    if (!editModal) return;
    setSaving(true);

    const order = editModal.order;
    const budgetId = order.budget_id;

    try {
      // IDs dos itens originais
      const origIds = new Set(origItems.map(i => i.id));
      const editIds = new Set(editItems.map(i => i.id));

      // Itens removidos
      const removedIds = [...origIds].filter(id => !editIds.has(id));
      for (const id of removedIds) {
        await supabase.from('budget_items').delete().eq('id', id);
      }

      // Itens actualizados
      for (const item of editItems) {
        const qty = parseFloat(item.quantity) || 0;
        const unit = parseFloat(item.unit_price) || 0;
        await supabase.from('budget_items').update({
          quantity: qty,
          unit_price: unit,
          total_price: qty * unit,
        }).eq('id', item.id);
      }

      // Recalcula total e actualiza budget
      const novoTotal = editItems.reduce((sum, i) =>
        sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

      if (budgetId) {
        await supabase.from('budgets').update({
          total: novoTotal,
          delivery_address: editAddress,
          payment_method: editPayment,
          notes: editNotes,
        }).eq('id', budgetId);
      }

      // Auditoria
      await createPickingAudit({
        picking_id: order.id,
        edited_by: 'gestor',
        reason: editReason.trim(),
        old_values: {
          items: origItems,
          delivery_address: origAddress,
          payment_method: origPayment,
        },
        new_values: {
          items: editItems,
          delivery_address: editAddress,
          payment_method: editPayment,
        },
      });

      toast.success('Orçamento atualizado');
      closeEditModal();
      loadData();
      onUpdate && onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // ────────────────────────────────────────────────────────────────

  const pickedOrders = pickingOrders.filter(o => o.status === 'picked');
  const pendingOrders = pickingOrders.filter(o => o.status === 'pending');

  const renderEditBtn = (order) => (
    <button className="btn-edit-pick" onClick={() => openEditModal(order)} title="Editar">✏️</button>
  );

  return (
    <div className="picking-manager">
      <div className="page-header">
        <button className="btn-back" onClick={onBack}>← Voltar</button>
        <h2>Separação</h2>
        <div className="header-icon">📦</div>
      </div>

      <div className="picking-content">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
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
                        <button className="btn-route" onClick={() => handleCreateRoute(order)}>
                          📍 Criar Rota
                        </button>
                      )}
                      {renderEditBtn(order)}
                      <button className="btn-unpick" onClick={() => handleUnpick(order)}>Desfazer</button>
                      <button className="btn-delete-pick" onClick={() => handleDelete(order)} title="Excluir">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                      {renderEditBtn(order)}
                      <button className="btn-pick" onClick={() => handlePick(order)}>Separar</button>
                      <button className="btn-delete-pick" onClick={() => handleDelete(order)} title="Excluir">🗑️</button>
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

      {/* Fase PIN */}
      {editModal && !pinValid && (
        <div className="pin-overlay" onClick={closeEditModal}>
          <div className="pin-modal" onClick={e => e.stopPropagation()}>
            <div className="pin-header">
              <div className="pin-icon">🔐</div>
              <div className="pin-title">Acesso restrito</div>
              <div className="pin-subtitle">
                Editar: <strong style={{ opacity: 1 }}>{editModal.order.customer_name}</strong>
              </div>
            </div>
            <div className="pin-dots">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div key={i} className={`pin-dot ${i < pinInput.length ? 'filled' : ''} ${pinError ? 'error' : ''}`} />
              ))}
            </div>
            {pinError && <div className="pin-error">{pinError}</div>}
            <div className="pin-pad">
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <button key={d} className="pin-btn" onClick={() => handlePinDigit(String(d))}>{d}</button>
              ))}
              <button className="pin-btn pin-btn-empty" disabled />
              <button className="pin-btn" onClick={() => handlePinDigit('0')}>0</button>
              <button className="pin-btn pin-btn-delete" onClick={handlePinDelete}>⌫</button>
            </div>
            <button className="pin-cancel" onClick={closeEditModal}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Fase edição */}
      {editModal && pinValid && (
        <div className="pick-edit-overlay" onClick={closeEditModal}>
          <div className="pick-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="pick-edit-title">✏️ Editar orçamento</div>
            <div className="pick-edit-subtitle">
              <strong>{editModal.order.customer_name}</strong>
              {!editModal.order.budget_id && (
                <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 12 }}>sem orçamento vinculado</span>
              )}
            </div>

            {budgetLoading ? (
              <div className="pick-edit-loading">Carregando dados...</div>
            ) : (
              <>
                {/* Tabela de itens */}
                {editItems.length > 0 && (
                  <div className="pick-edit-field">
                    <label>Itens do pedido</label>
                    <div className="edit-items-table">
                      <div className="edit-items-header">
                        <span className="ei-col-name">Produto</span>
                        <span className="ei-col-num">Qtd</span>
                        <span className="ei-col-num">Preço/un</span>
                        <span className="ei-col-num">Total</span>
                        <span className="ei-col-rm" />
                      </div>
                      {editItems.map((item, idx) => {
                        const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                        return (
                          <div key={item.id} className="edit-items-row">
                            <span className="ei-col-name ei-product-name">
                              {item.product_name || item.product?.name || '—'}
                            </span>
                            <input
                              className="ei-col-num ei-input"
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            />
                            <input
                              className="ei-col-num ei-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                            />
                            <span className="ei-col-num ei-total">R$ {total.toFixed(2)}</span>
                            <button
                              className="ei-col-rm ei-rm-btn"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remover item"
                            >✕</button>
                          </div>
                        );
                      })}
                      <div className="edit-items-total">
                        <span>Novo total:</span>
                        <span>R$ {editItems.reduce((s, i) =>
                          s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Endereço */}
                <div className="pick-edit-field">
                  <label>Endereço de entrega</label>
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="Endereço de entrega"
                  />
                </div>

                {/* Pagamento */}
                <div className="pick-edit-field">
                  <label>Forma de pagamento</label>
                  <input
                    type="text"
                    value={editPayment}
                    onChange={e => setEditPayment(e.target.value)}
                    placeholder="Ex: pix, dinheiro, cartao_credito"
                  />
                </div>

                {/* Observações */}
                <div className="pick-edit-field">
                  <label>Observações</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Observações (opcional)"
                  />
                </div>

                {/* Motivo */}
                <div className="pick-edit-field">
                  <label>Motivo da alteração <span className="required">*</span></label>
                  <textarea
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="Descreva o motivo desta alteração..."
                    rows={3}
                    required
                  />
                </div>

                <div className="pick-edit-actions">
                  <button className="pick-edit-cancel" onClick={closeEditModal}>Cancelar</button>
                  <button
                    className="pick-edit-save"
                    onClick={handleEditSave}
                    disabled={saving || !editReason.trim()}
                  >
                    {saving ? 'Salvando...' : '💾 Salvar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
