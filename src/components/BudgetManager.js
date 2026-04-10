import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getAllCustomers,
  getAllBudgets,
  createCustomer,
  updateCustomer,
  createBudget,
  updateBudget,
  updateBudgetStatus,
  deleteBudget,
  getBudgetById,
  createPickingOrder,
  createDeliveryRoute
} from '../services/managementService';
import { getAllProducts, createProduct } from '../services/productService';
import { supabase } from '../supabaseClient';
import './BudgetManager.css';

export default function BudgetManager({ onBack, initialBudget, openNew, onUpdate, onApproved }) {
  const [view, setView] = useState((initialBudget || openNew) ? 'form' : 'list'); // list, form, detail, romaneio
  const [budgets, setBudgets] = useState([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product: null,
    quantity: 1,
    unit_price: 0,
    total_price: 0
  });
  const [manualProductMode, setManualProductMode] = useState(true);
  const [manualProductName, setManualProductName] = useState('');
  const [manualProductPrice, setManualProductPrice] = useState('');
  const [budgetData, setBudgetData] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(null); // null | { name, whatsapp }

  useEffect(() => {
    loadData();
    if (!initialBudget) loadBudgetsList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBudgetsList = async () => {
    setBudgetsLoading(true);
    const data = await getAllBudgets();
    setBudgets(data);
    setBudgetsLoading(false);
  };

  const resetForm = () => {
    setBudgetData(null);
    setSelectedCustomer(null);
    setItems([]);
    setCustomerFilter('');
    setCustomerWhatsapp('');
    setDeliveryAddress('');
    setPaymentMethod('');
    setCreatingCustomer(null);
  };

  const loadBudgetDetail = async (budgetId) => {
    const budget = await getBudgetById(budgetId);
    if (budget) {
      setBudgetData(budget);
      setDeliveryAddress(budget.delivery_address || '');
      setPaymentMethod(budget.payment_method || '');
      const customer = customers.find(c => c.id === budget.customer_id);
      setSelectedCustomer(customer || { name: budget.customer_name, code: budget.customer_code });
      setCustomerWhatsapp(customer?.whatsapp || '');
      if (budget.budget_items) {
        setItems(budget.budget_items.map(item => ({
          product: { id: item.product_id, name: item.product_name },
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })));
      }
      setView('detail');
    } else {
      toast.error('Orçamento não encontrado');
      resetForm();
      loadBudgetsList();
      setView('list');
    }
  };

  const handleOpenBudget = (budget) => loadBudgetDetail(budget.id);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.customer-search-wrapper') && !e.target.closest('.customer-chip')) {
        setShowCustomerDropdown(false);
      }
      if (!e.target.closest('.product-select-container')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (initialBudget) {
      loadBudgetDetail(initialBudget.id);
    }
  }, [initialBudget]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    const [customersData, productsData] = await Promise.all([
      getAllCustomers(),
      getAllProducts()
    ]);
    setCustomers(customersData);
    setProducts(productsData.filter(p => p.isAvailable));
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerFilter(customer.name);
    setCustomerWhatsapp(customer.whatsapp || '');
    setShowCustomerDropdown(false);
  };

  const handleQuickAddCustomer = () => {
    if (!customerFilter.trim()) return;
    setCreatingCustomer({ name: customerFilter.trim(), whatsapp: '' });
    setShowCustomerDropdown(false);
  };

  const handleConfirmCreate = async () => {
    if (!creatingCustomer?.name.trim()) return;
    const code = creatingCustomer.name.split(' ')[0] + ' ' + Math.floor(1000 + Math.random() * 9000);
    const payload = { name: creatingCustomer.name.trim(), code };
    if (creatingCustomer.whatsapp) payload.whatsapp = creatingCustomer.whatsapp;

    const result = await createCustomer(payload);
    if (result.success) {
      setCustomers(prev => [...prev, result.data]);
      setSelectedCustomer(result.data);
      setCustomerWhatsapp(creatingCustomer.whatsapp || '');
      toast.success('Cliente criado!');
    } else {
      setSelectedCustomer({ name: creatingCustomer.name, code });
      toast.error('Erro ao salvar cliente, usando localmente');
    }
    setCreatingCustomer(null);
    setCustomerFilter('');
  };

  const handleWhatsappBlur = async () => {
    if (!selectedCustomer?.id) return;
    if (customerWhatsapp === (selectedCustomer.whatsapp || '')) return;
    await updateCustomer(selectedCustomer.id, { whatsapp: customerWhatsapp });
    setSelectedCustomer(prev => ({ ...prev, whatsapp: customerWhatsapp }));
  };


  const handleSelectProduct = (product) => {
    // Se já está na lista, só aumenta a quantidade
    const existingIndex = items.findIndex(i => i.product?.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
        total_price: updated[existingIndex].unit_price * (updated[existingIndex].quantity + 1)
      };
      setItems(updated);
    } else {
      setItems(prev => [...prev, {
        product,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price
      }]);
    }
    setProductFilter('');
    setCurrentItem({ product: null, quantity: 1, unit_price: 0, total_price: 0 });
    setShowProductDropdown(false);
  };

  const handleQuantityChange = (quantity) => {
    const qty = parseInt(quantity) || 0;
    setCurrentItem({
      ...currentItem,
      quantity: qty,
      total_price: currentItem.unit_price * qty
    });
  };

  const handleAddItem = async () => {
    let productToAdd;

    if (manualProductMode) {
      if (!manualProductName.trim()) {
        toast.error('Digite o nome do produto');
        return;
      }
      if (!manualProductPrice || parseFloat(manualProductPrice) <= 0) {
        toast.error('Digite um preço válido');
        return;
      }

      const price = parseFloat(manualProductPrice);
      const trimmedName = manualProductName.trim();

      // Verifica se já existe produto com esse nome (case insensitive)
      const existing = products.find(
        p => p.name?.toLowerCase() === trimmedName.toLowerCase()
      );

      let savedProduct = existing;

      if (!existing) {
        // Salva no banco silenciosamente
        const result = await createProduct({
          name: trimmedName,
          price,
          isAvailable: true
        });
        if (result.success && result.data?.[0]) {
          savedProduct = result.data[0];
          setProducts(prev => [...prev, savedProduct]);
        } else {
          // Usa localmente mesmo sem salvar
          savedProduct = { id: 'manual_' + Date.now(), name: trimmedName, price };
        }
      }

      productToAdd = {
        product: savedProduct,
        quantity: currentItem.quantity,
        unit_price: price,
        total_price: price * currentItem.quantity
      };

      setManualProductName('');
      setManualProductPrice('');
    } else {
      if (!currentItem.product) {
        toast.error('Selecione um produto');
        return;
      }
      productToAdd = { ...currentItem };
    }

    if (currentItem.quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setItems([...items, productToAdd]);
    setCurrentItem({
      product: null,
      quantity: 1,
      unit_price: 0,
      total_price: 0
    });
    setProductFilter('');
    toast.success('Produto adicionado!');
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success('Item removido');
  };

  const handleUpdateItemQuantity = (index, newQuantity) => {
    const qty = parseInt(newQuantity) || 1;
    if (qty < 1) return;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: qty,
      total_price: updatedItems[index].unit_price * qty
    };
    setItems(updatedItems);
  };

  const handleIncreaseQuantity = (index) => {
    const updatedItems = [...items];
    const newQty = updatedItems[index].quantity + 1;
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQty,
      total_price: updatedItems[index].unit_price * newQty
    };
    setItems(updatedItems);
  };

  const handleDecreaseQuantity = (index) => {
    const updatedItems = [...items];
    if (updatedItems[index].quantity <= 1) return;
    
    const newQty = updatedItems[index].quantity - 1;
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQty,
      total_price: updatedItems[index].unit_price * newQty
    };
    setItems(updatedItems);
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    const price = parseFloat(newPrice) || 0;
    if (price < 0) return;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      unit_price: price,
      total_price: price * updatedItems[index].quantity
    };
    setItems(updatedItems);
  };

  const handleUpdateItemName = (index, newName) => {
    if (!newName.trim()) return;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      product: {
        ...updatedItems[index].product,
        name: newName
      }
    };
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
  };

  const buildItemsToSave = () => items.map(item => {
    const rawId = item.product.id;
    const numericId = typeof rawId === 'number' ? rawId : parseFloat(rawId);
    return {
      product_id: isNaN(numericId) ? null : numericId,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    };
  });

  const handleSaveBudget = async () => {
    if (!selectedCustomer) { toast.error('Selecione um cliente'); return; }
    if (items.length === 0) { toast.error('Adicione pelo menos um produto'); return; }

    const budgetPayload = {
      customer_id: selectedCustomer.id || null,
      customer_name: selectedCustomer.name,
      customer_code: selectedCustomer.code || null,
      total: calculateTotal(),
      status: 'draft',
      delivery_address: deliveryAddress,
      payment_method: paymentMethod
    };

    const itemsToSave = buildItemsToSave();

    if (budgetData) {
      // Editar orçamento existente
      const result = await updateBudget(budgetData.id, budgetPayload, itemsToSave);
      if (result.success) {
        setBudgetData(prev => ({ ...prev, ...budgetPayload }));
        toast.success('Orçamento atualizado!');
        setView('detail');
        onUpdate && onUpdate();
      } else {
        toast.error('Erro ao atualizar orçamento');
      }
    } else {
      // Novo orçamento
      const result = await createBudget(budgetPayload, itemsToSave);
      if (result.success) {
        setBudgetData(result.data);
        toast.success('Orçamento salvo!');
        setView('detail');
        onUpdate && onUpdate();
      } else {
        toast.error('Erro ao salvar orçamento');
      }
    }
  };

  const handleApprove = async () => {
    if (!budgetData) return;

    if (!deliveryAddress.trim()) {
      toast.error('Preencha o endereço de entrega antes de aprovar');
      setView('form');
      return;
    }

    // 1. Aprovar orçamento
    const result = await updateBudgetStatus(budgetData.id, 'confirmed');
    if (!result.success) {
      toast.error('Erro ao aprovar orçamento');
      return;
    }
    setBudgetData(prev => ({ ...prev, status: 'confirmed' }));
    onUpdate && onUpdate();

    // 2. Enviar para separação (silencioso se já existir)
    const { data: existing } = await supabase
      .from('picking')
      .select('id')
      .eq('budget_id', budgetData.id)
      .limit(1);

    if (!existing || existing.length === 0) {
      await createPickingOrder({
        budget_id: budgetData.id,
        customer_name: budgetData.customer_name,
        customer_code: budgetData.customer_code,
        status: 'pending'
      });
    }

    // 3. Ir para romaneio, imprimir e após impressão ir para Separação
    setView('romaneio');
    setTimeout(() => {
      const afterPrint = () => {
        window.removeEventListener('afterprint', afterPrint);
        onApproved && onApproved();
      };
      window.addEventListener('afterprint', afterPrint);
      window.print();
    }, 400);
  };

  const handleDeleteBudget = async () => {
    if (!budgetData) return;
    if (!window.confirm(`Excluir orçamento de ${budgetData.customer_name}? Esta ação não pode ser desfeita.`)) return;
    const result = await deleteBudget(budgetData.id);
    if (result.success) {
      toast.success('Orçamento excluído');
      onUpdate && onUpdate();
      resetForm();
      loadBudgetsList();
      setView('list');
    } else {
      toast.error('Erro ao excluir orçamento');
    }
  };

  const handleSendWhatsapp = () => {
    const number = customerWhatsapp.replace(/\D/g, '');
    if (!number) {
      toast.error('Número de WhatsApp não informado');
      return;
    }

    const date = budgetData?.created_at
      ? new Date(budgetData.created_at).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

    const itemsText = items
      .map(item => `• ${item.product?.name} x${item.quantity} = R$ ${(parseFloat(item.unit_price) * item.quantity).toFixed(2)}`)
      .join('\n');

    const lines = [
      `*Orçamento LimpLeve*`,
      ``,
      `Cliente: ${selectedCustomer?.name}`,
      `Data: ${date}`,
      ``,
      `*Pedido:*`,
      itemsText,
      ``,
      `*Total: R$ ${calculateTotal().toFixed(2)}*`,
    ];

    if (deliveryAddress) lines.push(``, `Endereço: ${deliveryAddress}`);
    if (paymentMethod) lines.push(`Pagamento: ${paymentMethod}`);

    const message = encodeURIComponent(lines.join('\n'));
    const fullNumber = number.startsWith('55') ? number : `55${number}`;
    window.open(`https://wa.me/${fullNumber}?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateRoute = async () => {
    const customerName = budgetData?.customer_name || selectedCustomer?.name;
    const customerCode = budgetData?.customer_code || selectedCustomer?.code;

    if (!customerName) {
      toast.error('Selecione um cliente para criar a rota');
      return;
    }

    // Verificar se já existe rota para este orçamento
    if (budgetData?.id) {
      const { data: existing } = await supabase
        .from('delivery_routes')
        .select('id')
        .eq('budget_id', budgetData.id)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('Este orçamento já tem uma rota criada');
        return;
      }
    }

    const result = await createDeliveryRoute({
      budget_id: budgetData?.id || null,
      customer_name: customerName,
      customer_code: customerCode,
      address: deliveryAddress,
      status: 'next',
      delivery_date: new Date().toISOString().split('T')[0]
    });

    if (result.success) {
      toast.success('Rota criada com sucesso!');
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao criar rota');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerFilter.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(customerFilter.toLowerCase()))
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productFilter.toLowerCase())
  );

  const handleSendToPicking = async () => {
    if (!budgetData) return;

    // Verificar se já existe separação para este orçamento
    const { data: existing } = await supabase
      .from('picking')
      .select('id, status')
      .eq('budget_id', budgetData.id)
      .limit(1);

    if (existing && existing.length > 0) {
      const status = existing[0].status === 'pending' ? 'pendente' : 'separado';
      toast.error(`Este orçamento já está na separação (${status})`);
      return;
    }

    const result = await createPickingOrder({
      budget_id: budgetData.id,
      customer_name: budgetData.customer_name,
      customer_code: budgetData.customer_code,
      status: 'pending'
    });

    if (result.success) {
      toast.success('Enviado para separação!');
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao enviar para separação');
    }
  };

  if (view === 'list') {
    const statusLabel = { draft: 'Rascunho', confirmed: 'Aprovado', delivered: 'Entregue', cancelled: 'Cancelado' };
    const statusClass = { draft: 'st-draft', confirmed: 'st-confirmed', delivered: 'st-delivered', cancelled: 'st-cancelled' };

    return (
      <div className="budget-manager">
        <div className="form-breadcrumb">
          <button className="breadcrumb-back" onClick={onBack}>←</button>
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-current">Orçamentos</span>
          </nav>
          <button className="btn-new-budget" onClick={() => { resetForm(); setView('form'); }}>
            + Novo
          </button>
        </div>

        {budgetsLoading ? (
          <div className="list-loading">Carregando...</div>
        ) : budgets.length === 0 ? (
          <div className="list-empty">
            <div className="list-empty-icon">📋</div>
            <p>Nenhum orçamento ainda</p>
            <button className="btn-primary" onClick={() => { resetForm(); setView('form'); }}>Criar primeiro orçamento</button>
          </div>
        ) : (
          <div className="budgets-list">
            {budgets.map(b => (
              <div key={b.id} className="budget-list-item" onClick={() => handleOpenBudget(b)}>
                <div className="bli-left">
                  <span className="bli-customer">{b.customer_name}</span>
                  <span className="bli-date">{new Date(b.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="bli-right">
                  <span className="bli-total">R$ {parseFloat(b.total).toFixed(2)}</span>
                  <span className={`bli-status ${statusClass[b.status] || 'st-draft'}`}>
                    {statusLabel[b.status] || b.status}
                  </span>
                  <button
                    className="bli-delete"
                    title="Excluir"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Excluir orçamento de ${b.customer_name}?`)) {
                        deleteBudget(b.id).then(r => {
                          if (r.success) { toast.success('Excluído!'); loadBudgetsList(); onUpdate && onUpdate(); }
                          else toast.error('Erro ao excluir');
                        });
                      }
                    }}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail') {
    const total = calculateTotal();
    const date = budgetData?.created_at
      ? new Date(budgetData.created_at).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    const isConfirmed = budgetData?.status === 'confirmed';

    return (
      <div className="budget-manager">
        <div className="form-breadcrumb">
          <button className="breadcrumb-back" onClick={() => { loadBudgetsList(); setView('list'); }}>←</button>
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-parent" onClick={() => { loadBudgetsList(); setView('list'); }}>Orçamentos</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{budgetData?.customer_name || 'Detalhe'}</span>
          </nav>
        </div>

        <div className="detail-card">
          <div className="detail-header">
            <div className="detail-customer">{budgetData?.customer_name}</div>
            <div className="detail-header-right">
              <div className="detail-date">{date}</div>
              <span className={`status-badge-detail ${isConfirmed ? 'confirmed' : 'draft'}`}>
                {isConfirmed ? '✅ Aprovado' : '📝 Rascunho'}
              </span>
            </div>
          </div>

          <div className="detail-items">
            {items.map((item, index) => (
              <div key={index} className="detail-item-row">
                <span className="detail-item-name">{item.product?.name}</span>
                <span className="detail-item-qty">x{item.quantity} <span className="detail-item-unit">R$ {parseFloat(item.unit_price).toFixed(2)}/un</span></span>
                <span className="detail-item-price">R$ {(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="detail-total">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          {budgetData?.delivery_address && (
            <div className="detail-info">
              <span className="detail-info-label">Endereço</span>
              <span>{budgetData.delivery_address}</span>
            </div>
          )}
          {budgetData?.payment_method && (
            <div className="detail-info">
              <span className="detail-info-label">Pagamento</span>
              <span>{budgetData.payment_method}</span>
            </div>
          )}
        </div>

        {!isConfirmed ? (
          /* Ações do orçamento em rascunho */
          <div className="detail-actions">
            <button className="detail-action-btn edit" onClick={() => setView('form')}>
              <span className="action-icon">✏️</span>
              <span>Editar</span>
            </button>
            <button className="detail-action-btn whatsapp" onClick={handleSendWhatsapp}>
              <span className="action-icon">📱</span>
              <span>Enviar para Cliente</span>
            </button>
            <button className="detail-action-btn approve" onClick={handleApprove}>
              <span className="action-icon">✅</span>
              <span>Cliente Aprovou</span>
            </button>
            <button className="detail-action-btn delete" onClick={handleDeleteBudget}>
              <span className="action-icon">🗑️</span>
              <span>Excluir</span>
            </button>
          </div>
        ) : (
          /* Ações do romaneio aprovado */
          <div className="detail-actions">
            <button className="detail-action-btn romaneio" onClick={() => setView('romaneio')}>
              <span className="action-icon">🖨️</span>
              <span>Imprimir Romaneio</span>
            </button>
            <button className="detail-action-btn picking" onClick={handleSendToPicking}>
              <span className="action-icon">📦</span>
              <span>Enviar para Separação</span>
            </button>
            <button className="detail-action-btn route" onClick={handleCreateRoute}>
              <span className="action-icon">📍</span>
              <span>Criar Rota</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'romaneio') {
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return (
      <div className="budget-manager romaneio-view">
        {/* Barra de navegação - não imprime */}
        <div className="form-breadcrumb no-print">
          <button className="breadcrumb-back" onClick={() => setView('form')}>←</button>
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-current">Romaneio</span>
          </nav>
        </div>

        {/* Preview do cupom - o que vai imprimir */}
        <div className="receipt-wrapper">
          <div className="receipt">
            {/* Logo */}
            <div className="receipt-logo">
              <img src="/images/logo-limpleve.png" alt="LimpLeve" />
            </div>

            <div className="receipt-date">{dateStr}</div>
            <div className="receipt-divider">- - - - - - - - - - - - - - - -</div>

            {/* Itens */}
            <div className="receipt-items">
              {items.length > 0 ? items.map((item, i) => {
                const qty = parseFloat(item.quantity || 1);
                const unit = parseFloat(item.unit_price || 0);
                const total = qty * unit;
                return (
                  <div key={i} className="receipt-item">
                    <span className="ri-qty-name">{qty} {item.product?.name || 'Produto'}</span>
                    <span className="ri-prices">R${unit.toFixed(2)}/UN - R${total.toFixed(2)}</span>
                  </div>
                );
              }) : <div className="receipt-item">Nenhum produto</div>}
            </div>

            <div className="receipt-divider">- - - - - - - - - - - - - - - -</div>

            {/* Nome */}
            <div className="receipt-field">
              <span className="rf-label">NOME:</span>
              <span className="rf-value">{(selectedCustomer?.name || '').toUpperCase()}</span>
            </div>

            {/* Endereço */}
            <div className="receipt-field-block">
              <div className="rf-label">ENDEREÇO:</div>
              <textarea
                className="receipt-textarea no-print"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Digite o endereço de entrega"
                rows="3"
              />
              <div className="rf-value print-only">{deliveryAddress}</div>
            </div>

            <div className="receipt-divider">- - - - - - - - - - - - - - - -</div>

            {/* Pagamento */}
            <div className="receipt-field-block">
              <div className="rf-label">PAGAMENTO:</div>
              <div className="receipt-total">R$ {calculateTotal().toFixed(2)}</div>
              <input
                className="receipt-input no-print"
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Ex: PIX, Dinheiro, Cartão..."
              />
              <div className="rf-value print-only">{paymentMethod}</div>
            </div>
          </div>

          {/* Botões de ação - não imprime */}
          <div className="romaneio-actions no-print">
            <button className="btn-print" onClick={handlePrint}>Imprimir</button>
            <button className="btn-whatsapp" onClick={handleSendWhatsapp}>📱 WhatsApp</button>
            <button className="btn-route" onClick={handleCreateRoute}>Criar Rota</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-manager">
      {/* Cabeçalho breadcrumb */}
      <div className="form-breadcrumb">
        <button className="breadcrumb-back" onClick={() => { loadBudgetsList(); setView('list'); }}>←</button>
        <nav className="breadcrumb-nav">
          <span className="breadcrumb-parent" onClick={() => { loadBudgetsList(); setView('list'); }}>Orçamentos</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{budgetData ? 'Editar' : 'Novo'}</span>
        </nav>
      </div>

      <div className="budget-form">
        {/* Cliente */}
        <div className="form-section">
          <label className="section-label">Cliente</label>

          {selectedCustomer ? (
            /* Cliente selecionado — chip */
            <div className="customer-chip">
              <div className="chip-avatar">👤</div>
              <div className="chip-info">
                <span className="chip-name">{selectedCustomer.name}</span>
              </div>
              <div className="chip-whatsapp">
                <span className="chip-wp-icon">📱</span>
                <input
                  type="tel"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  onBlur={handleWhatsappBlur}
                  placeholder="WhatsApp"
                  className="chip-wp-input"
                />
              </div>
              <button
                className="chip-clear"
                onClick={() => { setSelectedCustomer(null); setCustomerFilter(''); setCustomerWhatsapp(''); }}
              >✕</button>
            </div>
          ) : (
            /* Busca de cliente */
            <div className="customer-search-wrapper">
              <div className="customer-search-box">
                <button
                  className="search-icon-btn"
                  onClick={() => setShowCustomerDropdown(true)}
                  tabIndex={-1}
                >🔍</button>
                <input
                  type="text"
                  value={customerFilter}
                  onChange={(e) => { setCustomerFilter(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Buscar ou criar cliente..."
                  className="customer-search-input"
                />
                {customerFilter && (
                  <button className="search-clear-btn" onClick={() => { setCustomerFilter(''); setShowCustomerDropdown(false); }}>✕</button>
                )}
              </div>

              {showCustomerDropdown && (
                <div className="customer-dropdown">
                  {filteredCustomers.length > 0
                    ? filteredCustomers.map(c => (
                        <div key={c.id} className="customer-option" onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}>
                          <span className="option-name">{c.name}</span>
                          <span className="option-meta">
                            {c.code && <span className="option-code">{c.code}</span>}
                            {c.whatsapp && <span className="option-wp">📱 {c.whatsapp}</span>}
                          </span>
                        </div>
                      ))
                    : !customerFilter && <div className="customer-option empty">Nenhum cliente cadastrado ainda</div>
                  }
                  {customerFilter && !filteredCustomers.find(c => c.name.toLowerCase() === customerFilter.trim().toLowerCase()) && (
                    <div className="customer-option create" onMouseDown={(e) => { e.preventDefault(); handleQuickAddCustomer(); }}>
                      <span className="create-icon">+</span>
                      Criar <strong>"{customerFilter}"</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Mini-form de criação com WhatsApp */}
              {creatingCustomer && (
                <div className="create-customer-form">
                  <div className="create-form-title">Novo cliente</div>
                  <input
                    className="create-form-input"
                    value={creatingCustomer.name}
                    onChange={(e) => setCreatingCustomer(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do cliente"
                  />
                  <input
                    className="create-form-input"
                    value={creatingCustomer.whatsapp}
                    onChange={(e) => setCreatingCustomer(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="📱 WhatsApp (ex: 88999999999)"
                    type="tel"
                    autoFocus
                  />
                  <div className="create-form-actions">
                    <button className="create-form-cancel" onMouseDown={() => setCreatingCustomer(null)}>Cancelar</button>
                    <button className="create-form-save" onMouseDown={handleConfirmCreate}>Salvar</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabela de Produtos */}
        <div className="form-section">
          <div className="products-header">
            <label>Produtos</label>
            <div className="product-mode-toggle">
              <button
                className={`toggle-btn ${!manualProductMode ? 'active' : ''}`}
                onClick={() => setManualProductMode(false)}
              >
                📦 Catálogo
              </button>
              <button
                className={`toggle-btn ${manualProductMode ? 'active' : ''}`}
                onClick={() => setManualProductMode(true)}
              >
                ✏️ Manual
              </button>
            </div>
          </div>
          
          <div className="products-table">
            <div className="table-header">
              <div className="col-product">Produto</div>
              <div className="col-quantity">Quant</div>
              <div className="col-price">Valor unt</div>
              <div className="col-total">Valor</div>
              <div className="col-action"></div>
            </div>

            {/* Items adicionados */}
            {items.map((item, index) => (
              <div key={index} className="table-row">
                <div className="col-product">
                  <input
                    type="text"
                    value={item.product?.name || ''}
                    onChange={(e) => handleUpdateItemName(index, e.target.value)}
                    className="product-name-input"
                    placeholder="Nome do produto"
                  />
                </div>
                <div className="col-quantity">
                  <div className="quantity-controls">
                    <button 
                      className="qty-btn"
                      onClick={() => handleDecreaseQuantity(index)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemQuantity(index, e.target.value)}
                      min="1"
                      className="quantity-input-inline"
                    />
                    <button 
                      className="qty-btn"
                      onClick={() => handleIncreaseQuantity(index)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-price">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                    step="0.01"
                    min="0"
                    className="price-input-inline"
                  />
                </div>
                <div className="col-total">R$ {parseFloat(item.total_price).toFixed(2)}</div>
                <div className="col-action">
                  <button 
                    className="btn-remove"
                    onClick={() => handleRemoveItem(index)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {/* Linha para adicionar novo produto */}
            <div className="table-row add-row">
              {manualProductMode ? (
                <>
                  <div className="col-product">
                    <input
                      type="text"
                      value={manualProductName}
                      onChange={(e) => setManualProductName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && manualProductPrice && handleAddItem()}
                      placeholder="Nome do produto..."
                      className="product-input"
                    />
                  </div>
                  <div className="col-quantity">
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      min="1"
                      className="quantity-input"
                    />
                  </div>
                  <div className="col-price">
                    <input
                      type="number"
                      value={manualProductPrice}
                      onChange={(e) => setManualProductPrice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && manualProductName.trim() && handleAddItem()}
                      onBlur={() => manualProductName.trim() && manualProductPrice && handleAddItem()}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="price-input"
                    />
                  </div>
                  <div className="col-total">
                    R$ {(parseFloat(manualProductPrice || 0) * currentItem.quantity).toFixed(2)}
                  </div>
                  <div className="col-action">
                    <button
                      className="btn-add"
                      onClick={handleAddItem}
                      disabled={!manualProductName.trim() || !manualProductPrice}
                    >
                      +
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-product">
                    <div className="product-select-container">
                      <input
                        type="text"
                        value={productFilter}
                        onChange={(e) => {
                          setProductFilter(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        placeholder="Selecione do catálogo..."
                        className="product-input"
                      />
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div className="dropdown-list product-dropdown">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              className="dropdown-item"
                              onClick={() => handleSelectProduct(product)}
                            >
                              {product.name} - R$ {product.price.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-quantity">
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      min="1"
                      className="quantity-input"
                    />
                  </div>
                  <div className="col-price">
                    {currentItem.unit_price > 0 ? `R$ ${currentItem.unit_price.toFixed(2)}` : '—'}
                  </div>
                  <div className="col-total">
                    {currentItem.total_price > 0 ? `R$ ${currentItem.total_price.toFixed(2)}` : '—'}
                  </div>
                  <div className="col-action" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="form-section total-section">
          <div className="total-label">Total</div>
          <div className="total-value">R$ {calculateTotal().toFixed(2)}</div>
        </div>

        {/* Endereço */}
        <div className="form-section">
          <label className="section-label">Endereço de entrega</label>
          <textarea
            className="address-input"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Rua, número, bairro..."
            rows={2}
          />
        </div>

        {/* Forma de pagamento */}
        <div className="form-section">
          <label className="section-label">Forma de pagamento</label>
          <input
            type="text"
            className="payment-input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Ex: Dinheiro, PIX, Cartão..."
          />
        </div>

        {/* Botões de ação */}
        <div className="form-actions">
          <button
            className="btn-secondary"
            onClick={() => budgetData ? setView('detail') : onBack()}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleSaveBudget}
            disabled={!selectedCustomer || items.length === 0}
          >
            {budgetData ? 'Salvar Alterações' : 'Salvar Orçamento'}
          </button>
        </div>

        {/* Footer Icons */}
        <div className="form-footer-icons">
          <button className="icon-btn">📤</button>
          <button className="icon-btn">🔗</button>
          <button className="icon-btn">💬</button>
        </div>
      </div>
    </div>
  );
}
