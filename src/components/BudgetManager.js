import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { FaThumbtack, FaReceipt, FaEdit, FaTrash, FaPrint, FaDownload, FaBoxOpen, FaSearch, FaPen, FaStore, FaGlobe, FaMoneyBillWave, FaMobile, FaCreditCard, FaRandom, FaCheckCircle, FaClock, FaHourglassHalf } from 'react-icons/fa';
import {
  getAllCustomers,
  getTodayBudgets,
  createCustomer,
  updateCustomer,
  createBudget,
  updateBudget,
  updateBudgetStatus,
  updateBudgetPaymentStatus,
  updateBudgetManterOrcamento,
  deleteBudget,
  getBudgetById,
  createPickingOrder,
  createDeliveryRoute,
  getOpenSession,
  getOnlineSession,
  createCashTransaction,
  confirmBudgetPayment
} from '../services/managementService';
import { getAllProducts } from '../services/productService';
import { supabase } from '../supabaseClient';
import CashManager from './CashManager';
import PinGate from './PinGate';
import './BudgetManager.css';

const CONFIRM_PAYMENT_LABELS = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 PIX',
  cartao_debito: '💳 Débito',
  cartao_credito: '💳 Crédito',
  boleto: 'Boleto',
};

export default function BudgetManager({ onBack, initialBudget, openNew, onUpdate, onApproved }) {
  const [view, setView] = useState((initialBudget || openNew) ? 'form' : 'list'); // list, form, detail, romaneio, caixa
  const [showPinGate, setShowPinGate] = useState(false);
  const [showDeletePinGate, setShowDeletePinGate] = useState(false);
  const [postSaleModal, setPostSaleModal] = useState(null); // { budget } após venda presencial
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
  const [paymentStatus, setPaymentStatus] = useState('pago');
  const [entradaValue, setEntradaValue] = useState('');
  const [entradaMethod, setEntradaMethod] = useState('dinheiro');
  const [saleType, setSaleType] = useState('presencial');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [mistoValues, setMistoValues] = useState({ dinheiro: '', pix: '', cartao: '' });
  const [trocoRecebido, setTrocoRecebido] = useState('');
  const [notes, setNotes] = useState('');
  const [manterOrcamento, setManterOrcamento] = useState(false);
  const [paymentConfirmModal, setPaymentConfirmModal] = useState(false);
  const [confirmPaymentForm, setConfirmPaymentForm] = useState('dinheiro');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generatingSale, setGeneratingSale] = useState(false);
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(-1);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(null); // null | { name, whatsapp }
  const [hasPicking, setHasPicking] = useState(false);
  const [hasRoute, setHasRoute] = useState(false);
  const [trocoSaving, setTrocoSaving] = useState(false);
  const [trocoOnlineLancadoValor, setTrocoOnlineLancadoValor] = useState(null);
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [quickExpenseValor, setQuickExpenseValor] = useState('');
  const [quickExpenseObs, setQuickExpenseObs] = useState('');
  const [quickExpenseSaving, setQuickExpenseSaving] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('valor');
  const finalizarBtnRef = useRef(null);
  const productNameInputRef = useRef(null);

  useEffect(() => {
    if (postSaleModal) {
      setTimeout(() => finalizarBtnRef.current?.focus(), 50);
    }
  }, [postSaleModal]);

  useEffect(() => {
    loadData();
    if (!initialBudget) loadBudgetsList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBudgetsList = async () => {
    setBudgetsLoading(true);
    const data = await getTodayBudgets();
    setBudgets(data);
    setBudgetsLoading(false);
  };

  const handleLancarTrocoOnline = async () => {
    setTrocoSaving(true);
    const session = await getOnlineSession();
    if (!session) {
      toast.error('Abra o caixa online antes de lançar o troco do online');
      setTrocoSaving(false);
      return;
    }
    const troco = parseFloat(trocoRecebido) - calculateTotal();
    const result = await createCashTransaction({
      session_id: session.id,
      tipo: 'despesa',
      valor: troco,
      categoria_despesa: 'Troco Online',
      observacao: 'Troco do online',
    });
    if (result.success) {
      toast.success('Troco do online lançado como despesa!');
      setTrocoOnlineLancadoValor(troco.toFixed(2));
    } else {
      toast.error('Erro ao lançar troco');
    }
    setTrocoSaving(false);
  };

  const handleOpenQuickExpense = async () => {
    const session = await getOpenSession();
    if (!session) {
      toast.error('Abra o caixa antes de lançar uma despesa');
      return;
    }
    setQuickExpenseValor('');
    setQuickExpenseObs('');
    setShowQuickExpenseModal(true);
  };

  const handleConfirmQuickExpense = async () => {
    const valor = parseFloat(quickExpenseValor);
    if (!valor || valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    setQuickExpenseSaving(true);
    const session = await getOpenSession();
    if (!session) {
      toast.error('Abra o caixa antes de lançar uma despesa');
      setQuickExpenseSaving(false);
      setShowQuickExpenseModal(false);
      return;
    }
    const result = await createCashTransaction({
      session_id: session.id,
      tipo: 'despesa',
      valor,
      categoria_despesa: 'Despesa rápida',
      observacao: quickExpenseObs.trim() || 'Despesa rápida',
    });
    if (result.success) {
      toast.success('Despesa lançada!');
      setShowQuickExpenseModal(false);
      setQuickExpenseValor('');
      setQuickExpenseObs('');
    } else {
      toast.error('Erro ao lançar despesa');
    }
    setQuickExpenseSaving(false);
  };

  const resetForm = () => {
    setBudgetData(null);
    setSelectedCustomer(null);
    setItems([]);
    setCustomerFilter('');
    setCustomerWhatsapp('');
    setDeliveryAddress('');
    setPaymentMethod('');
    setPaymentStatus('pago');
    setEntradaValue('');
    setEntradaMethod('dinheiro');
    setSaleType('presencial');
    setHasDelivery(false);
    setMistoValues({ dinheiro: '', pix: '', cartao: '' });
    setTrocoRecebido('');
    setNotes('');
    setManterOrcamento(false);
    setCreatingCustomer(null);
  };

  const loadBudgetDetail = async (budgetId) => {
    const budget = await getBudgetById(budgetId);
    if (budget) {
      setBudgetData(budget);
      setDeliveryAddress(budget.delivery_address || '');
      const pm = budget.payment_method || '';
      if (pm.startsWith('misto|')) {
        setPaymentMethod('misto');
        const parsed = { dinheiro: '', pix: '', cartao: '' };
        pm.split('|').slice(1).forEach(part => {
          const [key, val] = part.split(':');
          if (key in parsed) parsed[key] = val;
        });
        setMistoValues(parsed);
      } else {
        setPaymentMethod(pm);
      }
      setPaymentStatus(budget.payment_status || 'pago');
      setSaleType(budget.sale_type || 'presencial');
      setHasDelivery((budget.sale_type || 'presencial') === 'presencial' && !!(budget.delivery_address || '').trim());
      setNotes(budget.notes || '');
      setManterOrcamento(!!budget.manter_orcamento);
      setDiscount(budget.discount || 0);
      setDiscountType(budget.discount_type || 'valor');
      const local = customers.find(c => c.id === budget.customer_id);
      const joined = budget.customers;
      let customer = (local || joined) ? { ...(local || {}), ...(joined || {}) } : null;
      const hasPhone = () => customer?.phone || customer?.whatsapp;
      if (!hasPhone() && budget.customer_id) {
        const { data: freshCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', budget.customer_id)
          .maybeSingle();
        if (freshCustomer) customer = { ...(customer || {}), ...freshCustomer };
      }
      if (!hasPhone() && budget.customer_code) {
        const { data: byCode } = await supabase
          .from('customers')
          .select('*')
          .eq('code', budget.customer_code)
          .maybeSingle();
        if (byCode) customer = { ...(customer || {}), ...byCode };
      }
      if (!hasPhone() && budget.customer_name) {
        const { data: byName } = await supabase
          .from('customers')
          .select('*')
          .eq('name', budget.customer_name)
          .maybeSingle();
        if (byName) customer = { ...(customer || {}), ...byName };
      }
      setSelectedCustomer(customer || { name: budget.customer_name, code: budget.customer_code });
      setCustomerWhatsapp(customer?.whatsapp || customer?.phone || '');
      if (budget.budget_items) {
        setItems(budget.budget_items.map(item => ({
          product: { id: item.product_id, name: item.product_name },
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })));
      }

      // Verifica se já tem separação e/ou rota para este orçamento
      const [pickingRes, routeRes] = await Promise.all([
        supabase.from('picking').select('id').eq('budget_id', budgetId).limit(1),
        supabase.from('delivery_routes').select('id').eq('budget_id', budgetId).neq('status', 'cancelled').limit(1)
      ]);
      setHasPicking((pickingRes.data?.length ?? 0) > 0);
      setHasRoute((routeRes.data?.length ?? 0) > 0);

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
    setCustomerWhatsapp(customer.phone || customer.whatsapp || '');
    // Preenche endereço salvo no cadastro do cliente (pode ser editado no orçamento)
    setDeliveryAddress(customer.address || '');
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
      const errMsg = result.error?.message || '';
      if (result.error?.code === '23505' && errMsg.includes('customers_code_key')) {
        // Colisão no código aleatório — tenta de novo com outro código
        const newCode = creatingCustomer.name.trim().split(' ')[0] + ' ' + Math.floor(1000 + Math.random() * 9000);
        const retry = await createCustomer({ ...payload, code: newCode });
        if (retry.success) {
          setCustomers(prev => [...prev, retry.data]);
          setSelectedCustomer(retry.data);
          setCustomerWhatsapp(creatingCustomer.whatsapp || '');
          toast.success('Cliente criado!');
        } else {
          toast.error('Erro ao criar cliente.');
        }
      } else if (result.error?.code === '23505' && errMsg.includes('customers_name_key')) {
        const name = creatingCustomer.name.trim().toLowerCase();
        const all = await getAllCustomers();
        const found = all.find(c => c.name.trim().toLowerCase() === name);
        if (found) {
          setCustomers(prev => prev.some(c => c.id === found.id) ? prev : [...prev, found]);
          setSelectedCustomer(found);
          setCustomerWhatsapp(found.phone || found.whatsapp || creatingCustomer.whatsapp || '');
          setDeliveryAddress(found.address || '');
          toast.success('Cliente já cadastrado, selecionado automaticamente.');
        } else {
          toast.error('Cliente duplicado mas não encontrado. Tente buscar pelo nome.');
        }
      } else {
        toast.error('Erro ao criar cliente.');
      }
    }
    setCreatingCustomer(null);
    setCustomerFilter('');
  };

  const handleWhatsappBlur = async () => {
    if (!selectedCustomer?.id) return;
    if (customerWhatsapp === (selectedCustomer.phone || '')) return;
    await updateCustomer(selectedCustomer.id, { phone: customerWhatsapp });
    setSelectedCustomer(prev => ({ ...prev, phone: customerWhatsapp }));
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

      // Item avulso nunca vira produto do catálogo público — só entra no orçamento.
      const savedProduct = existing || { id: 'manual_' + Date.now(), name: trimmedName, price };

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
    toast.success('Item adicionado ao orçamento!');
    setTimeout(() => productNameInputRef.current?.focus(), 50);
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

  const calculateSubtotal = () =>
    items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const d = parseFloat(discount) || 0;
    const deducao = discountType === 'percentual' ? sub * d / 100 : d;
    return Math.max(0, sub - deducao);
  };

  const formatPaymentMethodPlain = () => {
    const labels = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Cartao Debito',
      cartao_credito: 'Cartao Credito',
      boleto: 'Boleto',
    };
    if (paymentMethod === 'misto') {
      const parts = [];
      if (parseFloat(mistoValues.dinheiro) > 0) parts.push(`Dinheiro R$${parseFloat(mistoValues.dinheiro).toFixed(2)}`);
      if (parseFloat(mistoValues.pix) > 0) parts.push(`PIX R$${parseFloat(mistoValues.pix).toFixed(2)}`);
      if (parseFloat(mistoValues.cartao) > 0) parts.push(`Cartao R$${parseFloat(mistoValues.cartao).toFixed(2)}`);
      return parts.length > 0 ? parts.join(' + ') : 'Misto';
    }
    return labels[paymentMethod] || paymentMethod;
  };

  const buildPaymentMethodToSave = () => {
    if (paymentMethod === 'misto') {
      const parts = [];
      if (parseFloat(mistoValues.dinheiro) > 0) parts.push(`dinheiro:${parseFloat(mistoValues.dinheiro).toFixed(2)}`);
      if (parseFloat(mistoValues.pix) > 0) parts.push(`pix:${parseFloat(mistoValues.pix).toFixed(2)}`);
      if (parseFloat(mistoValues.cartao) > 0) parts.push(`cartao:${parseFloat(mistoValues.cartao).toFixed(2)}`);
      return `misto|${parts.join('|')}`;
    }
    return paymentMethod;
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

  const persistCustomerWhatsapp = async () => {
    if (!selectedCustomer?.id) return;
    const current = selectedCustomer.phone || selectedCustomer.whatsapp || '';
    if (!customerWhatsapp || customerWhatsapp === current) return;
    await updateCustomer(selectedCustomer.id, { phone: customerWhatsapp });
    setSelectedCustomer(prev => ({ ...prev, phone: customerWhatsapp }));
  };

  const handleSaveBudget = async () => {
    if (!selectedCustomer) { toast.error('Selecione um cliente'); return; }
    if (items.length === 0) { toast.error('Adicione pelo menos um produto'); return; }
    if (!buildPaymentMethodToSave()) { toast.error('Selecione a forma de pagamento'); return; }
    if (!paymentStatus) { toast.error('Selecione o status de pagamento'); return; }
    await persistCustomerWhatsapp();

    const budgetPayload = {
      customer_id: selectedCustomer.id || null,
      customer_name: selectedCustomer.name,
      customer_code: selectedCustomer.code || null,
      total: calculateTotal(),
      status: 'draft',
      delivery_address: (saleType === 'online' || (saleType === 'presencial' && hasDelivery)) ? deliveryAddress : '',
      payment_method: buildPaymentMethodToSave(),
      sale_type: saleType,
      payment_status: paymentStatus,
      entrada_valor: paymentStatus === 'parcial' ? parseFloat(entradaValue) || 0 : null,
      entrada_method: paymentStatus === 'parcial' ? entradaMethod : null,
      notes: notes,
      manter_orcamento: manterOrcamento,
      discount: parseFloat(discount) || 0,
      discount_type: discountType
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

  const handleGenerateSale = async () => {
    if (generatingSale) return;
    if (saleType !== 'presencial' && !selectedCustomer) { toast.error('Selecione um cliente'); return; }
    if (items.length === 0) { toast.error('Adicione pelo menos um produto'); return; }
    if (!paymentMethod) { toast.error('Selecione a forma de pagamento'); return; }
    if (saleType === 'presencial' && hasDelivery && !deliveryAddress.trim()) { toast.error('Preencha o endereço de entrega'); return; }

    setGeneratingSale(true);
    try {
      await handleGenerateSaleInner();
    } finally {
      setGeneratingSale(false);
    }
  };

  const handleGenerateSaleInner = async () => {
    await persistCustomerWhatsapp();

    const customerForSale = selectedCustomer || { id: null, name: 'GERAL', code: null };

    // 1. Salva o orçamento
    const budgetPayload = {
      customer_id: customerForSale.id || null,
      customer_name: customerForSale.name,
      customer_code: customerForSale.code || null,
      total: calculateTotal(),
      status: 'confirmed',
      delivery_address: (saleType === 'online' || (saleType === 'presencial' && hasDelivery)) ? deliveryAddress : '',
      payment_method: buildPaymentMethodToSave(),
      sale_type: saleType,
      payment_status: paymentStatus,
      entrada_valor: paymentStatus === 'parcial' ? parseFloat(entradaValue) || 0 : null,
      entrada_method: paymentStatus === 'parcial' ? entradaMethod : null,
      notes: notes,
      manter_orcamento: manterOrcamento,
      discount: parseFloat(discount) || 0,
      discount_type: discountType
    };
    const itemsToSave = buildItemsToSave();
    let savedBudget = budgetData;

    if (!budgetData) {
      const result = await createBudget(budgetPayload, itemsToSave);
      if (!result.success) { toast.error('Erro ao salvar orçamento'); return; }
      savedBudget = result.data;
      setBudgetData(result.data);
    } else {
      const result = await updateBudget(budgetData.id, budgetPayload, itemsToSave);
      if (!result.success) { toast.error('Erro ao atualizar orçamento'); return; }
      await updateBudgetStatus(budgetData.id, 'confirmed');
      setBudgetData(prev => ({ ...prev, ...budgetPayload }));
    }

    // 2. Cria ordem de separação (apenas para vendas online; presencial cria no modal pós-venda se solicitado)
    if (saleType !== 'presencial') {
      const { data: existing } = await supabase
        .from('picking')
        .select('id')
        .eq('budget_id', savedBudget.id)
        .limit(1);
      if (!existing || existing.length === 0) {
        await createPickingOrder({
          budget_id: savedBudget.id,
          customer_name: savedBudget.customer_name || customerForSale.name,
          customer_code: savedBudget.customer_code || customerForSale.code,
          status: 'pending'
        });
      }
    }

    // 3. Lança no caixa se payment_status === 'pago' ou 'parcial'
    if (paymentStatus !== 'a_receber') {
      const session = saleType === 'online'
        ? await getOnlineSession()
        : await getOpenSession();
      const valorLancado = paymentStatus === 'parcial'
        ? parseFloat(entradaValue) || 0
        : calculateTotal();
      const txResult = await createCashTransaction({
        session_id: session?.id || null,
        budget_id: savedBudget.id,
        tipo: 'venda',
        valor: valorLancado,
        forma_pagamento: paymentStatus === 'parcial' ? entradaMethod : buildPaymentMethodToSave(),
        sale_type: saleType,
        payment_status: paymentStatus,
        entrada_valor: paymentStatus === 'parcial' ? parseFloat(entradaValue) || 0 : null,
        entrada_method: paymentStatus === 'parcial' ? entradaMethod : null,
        observacao: customerForSale.name
      });

      if (!txResult.success) {
        // Venda foi salva, mas o dinheiro não entrou no caixa — reverte pra a_receber
        // pra não ficar marcado como pago sem transação correspondente.
        await updateBudgetPaymentStatus(savedBudget.id, 'a_receber');
        setBudgetData(prev => ({ ...prev, payment_status: 'a_receber' }));
        toast.error('Venda salva, mas houve erro ao lançar no caixa. Pagamento marcado como pendente — confirme manualmente depois.');
      } else {
        toast.success(session ? 'Venda registrada no caixa!' : 'Venda registrada (sem turno aberto)');
      }
    }

    onUpdate && onUpdate();

    if (saleType === 'presencial') {
      // Presencial: pergunta o que fazer após a venda
      setBudgetData(savedBudget);
      setPostSaleModal({ budget: savedBudget });
    } else {
      // Online: vai direto ao romaneio e imprime
      setView('romaneio');
      setTimeout(() => {
        const afterPrint = () => {
          window.removeEventListener('afterprint', afterPrint);
          onApproved && onApproved();
        };
        window.addEventListener('afterprint', afterPrint);
        window.print();
      }, 400);
    }
  };

  const handleApprove = async () => {
    if (!budgetData) return;
    if (approving) return;

    if ((saleType === 'online' || (saleType === 'presencial' && hasDelivery)) && !deliveryAddress.trim()) {
      toast.error('Preencha o endereço de entrega antes de aprovar');
      setView('form');
      return;
    }

    setApproving(true);
    try {
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
    } finally {
      setApproving(false);
    }
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

  const handleDownloadRomaneio = async () => {
    const element = document.querySelector('.receipt-whatsapp');
    if (!element) {
      toast.error('Elemento não encontrado para captura');
      return;
    }

    const loadingToast = toast.loading('Gerando imagem...');

    try {
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1080,
      });

      const link = document.createElement('a');
      const customerName = (selectedCustomer?.name || budgetData?.customer_name || 'romaneio')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const dateISO = new Date().toISOString().slice(0, 10);
      link.download = `romaneio-${customerName}-${dateISO}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();

      toast.success('Imagem baixada! Partilhe manualmente.', { id: loadingToast });
    } catch {
      toast.error('Erro ao gerar imagem do romaneio', { id: loadingToast });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderReceiptWhatsapp = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return (
      <div className="receipt-whatsapp" aria-hidden="true">
        {/* Header: logo + data */}
        <div className="rw-header">
          <img src="/images/logo-limpleve.png" alt="LimpLeve" className="rw-logo" />
          <div className="rw-date">{dateStr}</div>
        </div>

        {/* Itens */}
        <div className="rw-items">
          {items.length > 0 ? items.map((item, i) => {
            const qty = parseFloat(item.quantity || 1);
            const unit = parseFloat(item.unit_price || 0);
            const total = qty * unit;
            return (
              <div key={i} className="rw-item">
                <div className="rw-item-left">
                  <span className="rw-item-qty">{qty}x</span>
                  <span className="rw-item-name">{item.product?.name || 'Produto'}</span>
                </div>
                <div className="rw-item-right">
                  <span className="rw-item-unit">R$ {unit.toFixed(2)}/un</span>
                  <span className="rw-item-total">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            );
          }) : (
            <div className="rw-item">
              <div className="rw-item-left">
                <span className="rw-item-name">Nenhum produto</span>
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        {(parseFloat(discount) || 0) > 0 && (
          <div className="rw-total-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af' }}>
              <span>SUBTOTAL</span><span>R$ {calculateSubtotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#f87171' }}>
              <span>DESCONTO</span>
              <span>− R$ {(discountType === 'percentual' ? calculateSubtotal() * (parseFloat(discount) || 0) / 100 : parseFloat(discount) || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="rw-total-box">
          <span className="rw-total-label">TOTAL</span>
          <span className="rw-total-value">R$ {calculateTotal().toFixed(2)}</span>
        </div>

        {/* Info cliente */}
        <div className="rw-info-box">
          <div className="rw-info-nome">
            NOME: {(selectedCustomer?.name || budgetData?.customer_name || '').toUpperCase()}
          </div>
          {deliveryAddress && (
            <div className="rw-info-row-txt">ENDEREÇO: {deliveryAddress}</div>
          )}
          {paymentMethod && (
            <div className="rw-info-row-txt">PAGAMENTO: {formatPaymentMethodPlain()}</div>
          )}
          {paymentStatus === 'pago' && (
            <div className="rw-info-row-txt" style={{ fontWeight: 700, color: '#16a34a' }}>STATUS: PAGO</div>
          )}
          {paymentStatus === 'parcial' && (
            <div className="rw-info-restante">
              RESTANTE: R$ {Math.max(0, calculateTotal() - (parseFloat(entradaValue) || 0)).toFixed(2)} na entrega
            </div>
          )}
          {paymentStatus === 'a_receber' && (
            <div className="rw-info-restante">
              A RECEBER: R$ {calculateTotal().toFixed(2)}
            </div>
          )}
          {notes && (
            <div className="rw-info-row-txt" style={{ marginTop: 8 }}>OBS: {notes}</div>
          )}
        </div>

        {/* Rodapé */}
        <div className="rw-footer">Limp Leve • limpleve.com.br</div>
      </div>
    );
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
      setHasRoute(true);
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
      setHasPicking(true);
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao enviar para separação');
    }
  };

  const handleConfirmBudgetPayment = async () => {
    if (!budgetData) return;
    setConfirmingPayment(true);

    const total = calculateTotal();
    const valor = budgetData.payment_status === 'parcial'
      ? Math.max(0, total - parseFloat(budgetData.entrada_valor || 0))
      : total;

    const result = await confirmBudgetPayment({
      budgetId: budgetData.id,
      valor,
      formaPagamento: confirmPaymentForm,
      saleType: budgetData.sale_type || 'presencial',
      observacao: `${budgetData.customer_name} — pagamento confirmado`,
    });

    if (result.success) {
      if (!result.hadSession) toast('Pagamento registrado sem turno aberto', { icon: '⚠️' });
      toast.success('Pagamento confirmado!');
      setBudgetData(prev => ({ ...prev, payment_status: 'pago' }));
      setPaymentStatus('pago');
      setPaymentConfirmModal(false);
      onUpdate && onUpdate();
    } else {
      toast.error('Erro ao confirmar pagamento');
    }
    setConfirmingPayment(false);
  };

  if (view === 'list') {
    const statusLabel = { draft: 'Rascunho', confirmed: 'Aprovado', delivered: 'Entregue', cancelled: 'Cancelado' };
    const statusClass = { draft: 'st-draft', confirmed: 'st-confirmed', delivered: 'st-delivered', cancelled: 'st-cancelled' };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return (
      <div className="budget-manager">
        <div className="form-breadcrumb">
          <button className="breadcrumb-back" onClick={onBack}>←</button>
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-current">Orçamentos</span>
          </nav>
          <button type="button" className="btn-quick-expense" onClick={handleOpenQuickExpense} title="Lançar despesa rápida">
            <FaReceipt size={12} /> Despesa
          </button>
          <button className="btn-new-budget" onClick={() => { resetForm(); setView('form'); }}>
            + Novo
          </button>
        </div>

        <div className="list-content">
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
                  <span className="bli-date">
                    {new Date(b.created_at).toLocaleDateString('pt-BR')} · {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bli-right">
                  <span className="bli-total">R$ {parseFloat(b.total).toFixed(2)}</span>
                  {b.manter_orcamento && new Date(b.created_at) < todayStart && (
                    <button
                      className="bli-pinned"
                      title="Clique para desfixar"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateBudgetManterOrcamento(b.id, false).then(r => {
                          if (r.success) { toast.success('Orçamento desfixado'); loadBudgetsList(); }
                          else toast.error('Erro ao desfixar orçamento');
                        });
                      }}
                    >
                      Fixado
                    </button>
                  )}
                  <span className={`bli-status ${statusClass[b.status] || 'st-draft'}`}>
                    {statusLabel[b.status] || b.status}
                  </span>
                  <div className="bli-icon-row">
                    <button
                      className={`bli-pin-toggle ${b.manter_orcamento ? 'active' : ''}`}
                      title={b.manter_orcamento ? 'Clique para desmarcar "Manter orçamento"' : 'Clique para marcar "Manter orçamento"'}
                      onClick={(e) => {
                        e.stopPropagation();
                        const novoValor = !b.manter_orcamento;
                        updateBudgetManterOrcamento(b.id, novoValor).then(r => {
                          if (r.success) { toast.success(novoValor ? 'Orçamento marcado para manter' : 'Orçamento desmarcado'); loadBudgetsList(); }
                          else toast.error('Erro ao atualizar orçamento');
                        });
                      }}
                    >
                      <FaThumbtack size={13} />
                    </button>
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
              </div>
            ))}
          </div>
        )}
        </div>

        {showPinGate && (
          <PinGate
            onUnlock={() => { setShowPinGate(false); setView('caixa'); }}
            onClose={() => setShowPinGate(false)}
          />
        )}

        {showQuickExpenseModal && (
          <div className="cash-modal-overlay" onClick={() => setShowQuickExpenseModal(false)}>
            <div className="cash-modal" onClick={e => e.stopPropagation()}>
              <div className="cash-modal-title"><FaReceipt size={14} /> Lançar despesa rápida</div>
              <div className="cash-modal-field">
                <label>Valor</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={quickExpenseValor}
                  onChange={e => setQuickExpenseValor(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="cash-modal-field">
                <label>Observação / motivo</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Compra de sacola"
                  value={quickExpenseObs}
                  onChange={e => setQuickExpenseObs(e.target.value)}
                />
              </div>
              <div className="cash-modal-actions">
                <button className="cash-modal-cancel" onClick={() => setShowQuickExpenseModal(false)}>Cancelar</button>
                <button
                  className="cash-modal-confirm"
                  onClick={handleConfirmQuickExpense}
                  disabled={quickExpenseSaving}
                >
                  {quickExpenseSaving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
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

          {(parseFloat(budgetData?.discount) || 0) > 0 && (
            <>
              <div className="detail-total" style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.85rem' }}>
                <span>Subtotal</span>
                <span>R$ {calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="detail-total" style={{ color: '#f87171', fontWeight: 400, fontSize: '0.85rem' }}>
                <span>Desconto{budgetData.discount_type === 'percentual' ? ` (${budgetData.discount}%)` : ''}</span>
                <span>− R$ {(budgetData.discount_type === 'percentual' ? calculateSubtotal() * budgetData.discount / 100 : budgetData.discount).toFixed(2)}</span>
              </div>
            </>
          )}
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
          {budgetData?.payment_method && (() => {
            const ps = budgetData.payment_status;
            const pm = budgetData.payment_method;
            const pmLabels = {
              dinheiro: 'Dinheiro', pix: 'PIX',
              cartao_debito: 'Débito', cartao_credito: 'Crédito',
              boleto: 'Boleto',
            };
            const pmFormatted = pm.startsWith('misto|')
              ? pm.replace('misto|', '').split('|').map(p => {
                  const [k, v] = p.split(':');
                  return `${pmLabels[k] || k}: R$ ${parseFloat(v).toFixed(2)}`;
                }).join(' + ')
              : (pmLabels[pm] || pm);

            return (
              <div className="detail-info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span className="detail-info-label">Pagamento</span>
                {ps === 'parcial' ? (
                  <>
                    <span>Pagamento parcial</span>
                    <span style={{ fontSize: '0.82rem', color: '#555' }}>
                      Valor pago: R$ {parseFloat(budgetData.entrada_valor || 0).toFixed(2)} ({pmLabels[budgetData.entrada_method] || budgetData.entrada_method || pmFormatted})
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>
                      Restante: R$ {Math.max(0, total - parseFloat(budgetData.entrada_valor || 0)).toFixed(2)} na entrega
                    </span>
                  </>
                ) : ps === 'a_receber' ? (
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>A receber</span>
                ) : (
                  <span>{pmFormatted}</span>
                )}
              </div>
            );
          })()}
        </div>

        {!isConfirmed ? (
          /* Ações do orçamento em rascunho */
          <div className="detail-actions">
            <div className="detail-actions-row">
              <button className="detail-action-btn edit" onClick={() => setView('form')}>
                <span>Editar</span>
              </button>
              <button className="detail-action-btn delete" onClick={handleDeleteBudget}>
                <span>Excluir</span>
              </button>
            </div>
            <div className="detail-actions-row">
              <button className="detail-action-btn whatsapp" onClick={() => setView('romaneio')}>
                <span>Baixar Romaneio</span>
              </button>
              <button className="detail-action-btn download" onClick={handleDownloadRomaneio}>
                <span>Baixar Imagem</span>
              </button>
            </div>
            <button className="detail-action-btn approve" onClick={handleApprove} disabled={approving}>
              <span>{approving ? 'Aprovando...' : 'Cliente Aprovou'}</span>
            </button>
          </div>
        ) : (
          /* Ações do romaneio aprovado */
          <div className="detail-actions">
            <div className="detail-actions-row">
              <button className="detail-action-btn edit" onClick={() => setView('form')}>
                <FaEdit className="action-icon" size={16} />
                <span>Editar</span>
              </button>
              <button className="detail-action-btn delete" onClick={() => setShowDeletePinGate(true)}>
                <FaTrash className="action-icon" size={16} />
                <span>Excluir</span>
              </button>
            </div>
            {(!budgetData?.payment_method || !budgetData?.payment_status) && (
              <div className="payment-required-alert">
                ⚠️ Preencha a <strong>forma de pagamento</strong> e o <strong>status do pagamento</strong> para continuar.
              </div>
            )}
            <div className="detail-actions-row">
              <button
                className="detail-action-btn romaneio"
                onClick={() => {
                  if (!budgetData?.payment_method || !budgetData?.payment_status) {
                    toast.error('Preencha a forma e o status de pagamento antes de imprimir o romaneio');
                    return;
                  }
                  setView('romaneio');
                }}
              >
                <FaPrint className="action-icon" size={18} />
                <span>Imprimir Romaneio</span>
              </button>
              <button className="detail-action-btn download" onClick={handleDownloadRomaneio}>
                <FaDownload className="action-icon" size={18} />
                <span>Baixar Imagem</span>
              </button>
            </div>
            {!hasPicking && (
              <button
                className="detail-action-btn picking"
                onClick={() => {
                  if (!budgetData?.payment_method || !budgetData?.payment_status) {
                    toast.error('Preencha a forma e o status de pagamento antes de enviar para separação');
                    return;
                  }
                  handleSendToPicking();
                }}
              >
                <FaBoxOpen className="action-icon" size={18} />
                <span>Enviar para Separação</span>
              </button>
            )}
            {hasPicking && !hasRoute && (
              <button
                className="detail-action-btn route"
                onClick={() => {
                  if (!budgetData?.payment_method || !budgetData?.payment_status) {
                    toast.error('Preencha a forma e o status de pagamento antes de criar rota');
                    return;
                  }
                  handleCreateRoute();
                }}
              >
                <span className="action-icon">📍</span>
                <span>Criar Rota</span>
              </button>
            )}
            {hasPicking && <span className="badge-already">📦 Em Separação</span>}
            {hasRoute && <span className="badge-already">📍 Rota criada</span>}
            {(budgetData?.payment_status === 'a_receber' || budgetData?.payment_status === 'parcial') && budgetData?.status !== 'draft' && !hasRoute && (
              <button
                className="detail-action-btn pay"
                onClick={() => {
                  if (budgetData?.status === 'draft') {
                    toast.error('Aprove o orçamento antes de confirmar o pagamento');
                    return;
                  }
                  setConfirmPaymentForm('dinheiro');
                  setPaymentConfirmModal(true);
                }}
              >
                <span className="action-icon">💰</span>
                <span>Marcar como Pago</span>
              </button>
            )}
          </div>
        )}

        {paymentConfirmModal && (
          <div className="rm-modal-overlay" onClick={() => setPaymentConfirmModal(false)}>
            <div className="rm-modal" onClick={e => e.stopPropagation()}>
              <div className="rm-modal-title">💰 Confirmar pagamento</div>
              <div className="rm-modal-customer">{budgetData?.customer_name}</div>
              <div className="rm-modal-valor">
                R$ {(budgetData?.payment_status === 'parcial'
                  ? Math.max(0, calculateTotal() - parseFloat(budgetData?.entrada_valor || 0))
                  : calculateTotal()
                ).toFixed(2)}
              </div>
              <div className="rm-modal-label">
                {budgetData?.payment_status === 'parcial' ? 'Valor restante a receber' : 'Valor total a receber'}
              </div>

              <div className="rm-modal-section-label">Forma de pagamento</div>
              <div className="rm-payment-options">
                {Object.entries(CONFIRM_PAYMENT_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`rm-payment-btn ${confirmPaymentForm === key ? 'active' : ''}`}
                    onClick={() => setConfirmPaymentForm(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="rm-modal-actions">
                <button className="rm-btn-cancel" onClick={() => setPaymentConfirmModal(false)}>Cancelar</button>
                <button className="rm-btn-confirm" onClick={handleConfirmBudgetPayment} disabled={confirmingPayment}>
                  {confirmingPayment ? 'Registrando...' : '✓ Confirmar recebimento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {renderReceiptWhatsapp()}

        {showDeletePinGate && (
          <PinGate
            onUnlock={() => { setShowDeletePinGate(false); handleDeleteBudget(); }}
            onClose={() => setShowDeletePinGate(false)}
          />
        )}
      </div>
    );
  }

  if (view === 'caixa') {
    return <CashManager onBack={() => setView('list')} />;
  }

  if (view === 'romaneio') {
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return (
      <div className="budget-manager romaneio-view">
        {/* Barra de navegação - não imprime */}
        <div className="form-breadcrumb no-print">
          <button className="breadcrumb-back" onClick={() => setView(budgetData?.status === 'confirmed' ? 'form' : 'detail')}>←</button>
          <nav className="breadcrumb-nav">
            <span className="breadcrumb-current">Romaneio</span>
          </nav>
        </div>

        {/* Preview do cupom - o que vai imprimir */}
        <div className="receipt-wrapper">
          <div className="receipt">
            {/* Logo */}
            <div className="receipt-logo">
              <img src="/images/limpleveromaneio.png" alt="LimpLeve" />
            </div>

            <div className="receipt-date">{dateStr}</div>
            <div className="receipt-divider" />

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

            <div className="receipt-divider" />

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

            <div className="receipt-divider" />

            {/* Pagamento */}
            <div className="receipt-field-block">
              <div className="rf-label">PAGAMENTO:</div>
              <div className="receipt-total">R$ {calculateTotal().toFixed(2)}</div>
              {paymentMethod && (
                <div className="rf-value"><span style={{ fontWeight: 700 }}>Forma de Pagamento: </span>{formatPaymentMethodPlain()}</div>
              )}
              {paymentStatus === 'pago' && (
                <div className="rf-value" style={{ fontWeight: 700, color: '#16a34a' }}>Status: PAGO</div>
              )}
              {paymentStatus === 'pago' && (paymentMethod === 'dinheiro' || (paymentMethod === 'misto' && parseFloat(mistoValues.dinheiro) > 0)) && parseFloat(trocoRecebido) > 0 && (
                <>
                  <div className="rf-value">Recebido: R$ {parseFloat(trocoRecebido).toFixed(2)}</div>
                  {(() => {
                    const cashAmount = paymentMethod === 'dinheiro' ? calculateTotal() : parseFloat(mistoValues.dinheiro);
                    const troco = parseFloat(trocoRecebido) - cashAmount;
                    return troco >= 0
                      ? <div className="rf-value" style={{ fontWeight: 700 }}>Troco: R$ {troco.toFixed(2)}</div>
                      : null;
                  })()}
                </>
              )}
              {paymentStatus === 'parcial' && (
                <>
                  <div className="rf-value">
                    Valor pago: R$ {parseFloat(entradaValue || 0).toFixed(2)} ({entradaMethod === 'dinheiro' ? 'Dinheiro' : entradaMethod === 'pix' ? 'PIX' : entradaMethod === 'boleto' ? 'Boleto' : 'Cartão'})
                  </div>
                  {entradaMethod === 'dinheiro' && parseFloat(trocoRecebido) > 0 && (() => {
                    const troco = parseFloat(trocoRecebido) - parseFloat(entradaValue || 0);
                    return troco >= 0
                      ? <div className="rf-value" style={{ fontWeight: 700 }}>Troco: R$ {troco.toFixed(2)}</div>
                      : null;
                  })()}
                  <div className="rf-value" style={{ color: '#dc2626' }}>
                    Restante: R$ {Math.max(0, calculateTotal() - (parseFloat(entradaValue) || 0)).toFixed(2)} na entrega
                  </div>
                </>
              )}
              {paymentStatus === 'a_receber' && (
                <>
                  <div className="rf-value">Status: <span style={{ color: '#dc2626' }}>A RECEBER</span></div>
                  {saleType === 'online' && paymentMethod === 'dinheiro' && parseFloat(trocoRecebido) > calculateTotal() && (() => {
                    const troco = parseFloat(trocoRecebido) - calculateTotal();
                    return (
                      <>
                        <div className="rf-value">Valor a receber: R$ {parseFloat(trocoRecebido).toFixed(2)}</div>
                        <div className="rf-value" style={{ fontWeight: 700 }}>Troco a levar: R$ {troco.toFixed(2)}</div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Tipo de venda */}
            <div className="receipt-field">
              <span className="rf-label">TIPO:</span>
              <span className="rf-value">{saleType === 'presencial' ? 'Presencial' : 'Online'}</span>
            </div>

            {/* Observação */}
            {notes ? (
              <>
                <div className="receipt-divider" />
                <div className="receipt-field-block">
                  <div className="rf-label">OBS:</div>
                  <div className="rf-value">{notes}</div>
                </div>
              </>
            ) : null}
          </div>

          {/* Layout WhatsApp 1080px dinâmico — oculto da tela, capturado como JPG */}
          {renderReceiptWhatsapp()}

          {/* Botões de ação - não imprime */}
          <div className="romaneio-actions no-print">
            <button className="btn-print" onClick={handlePrint}>Imprimir</button>
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
        <button type="button" className="btn-quick-expense" onClick={handleOpenQuickExpense} title="Lançar despesa rápida">
          <FaReceipt size={12} /> Despesa
        </button>
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
                onClick={() => { setSelectedCustomer(null); setCustomerFilter(''); setCustomerWhatsapp(''); setDeliveryAddress(''); }}
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
                ><FaSearch /></button>
                <input
                  type="text"
                  value={customerFilter}
                  onChange={(e) => { setCustomerFilter(e.target.value); setShowCustomerDropdown(true); setCustomerHighlight(-1); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Buscar ou criar cliente..."
                  className="customer-search-input"
                  onKeyDown={(e) => {
                    const total = filteredCustomers.length + (customerFilter && !filteredCustomers.find(c => c.name.toLowerCase() === customerFilter.trim().toLowerCase()) ? 1 : 0);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setCustomerHighlight(h => Math.min(h + 1, total - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setCustomerHighlight(h => Math.max(h - 1, 0));
                    } else if (e.key === 'Enter' && showCustomerDropdown) {
                      e.preventDefault();
                      if (customerHighlight >= 0 && customerHighlight < filteredCustomers.length) {
                        handleSelectCustomer(filteredCustomers[customerHighlight]);
                      } else if (customerHighlight === filteredCustomers.length) {
                        handleQuickAddCustomer();
                      } else if (filteredCustomers.length === 1) {
                        handleSelectCustomer(filteredCustomers[0]);
                      }
                    } else if (e.key === 'Escape') {
                      setShowCustomerDropdown(false);
                      setCustomerHighlight(-1);
                    }
                  }}
                />
                {customerFilter && (
                  <button className="search-clear-btn" onClick={() => { setCustomerFilter(''); setShowCustomerDropdown(false); }}>✕</button>
                )}
              </div>

              {showCustomerDropdown && (
                <div className="customer-dropdown">
                  {filteredCustomers.length > 0
                    ? filteredCustomers.map((c, i) => (
                        <div key={c.id} className={`customer-option${customerHighlight === i ? ' highlighted' : ''}`} onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }} onMouseEnter={() => setCustomerHighlight(i)}>
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
                    <div className={`customer-option create${customerHighlight === filteredCustomers.length ? ' highlighted' : ''}`} onMouseDown={(e) => { e.preventDefault(); handleQuickAddCustomer(); }} onMouseEnter={() => setCustomerHighlight(filteredCustomers.length)}>
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
                <FaBoxOpen /> Catálogo
              </button>
              <button
                className={`toggle-btn ${manualProductMode ? 'active' : ''}`}
                onClick={() => setManualProductMode(true)}
              >
                <FaPen /> Manual
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
                      ref={productNameInputRef}
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

        {/* Desconto */}
        <div className="form-section">
          <label className="section-label">Desconto</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1.5px solid #e0e6ef', borderRadius: 8, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setDiscountType('valor')}
                style={{ padding: '8px 14px', background: discountType === 'valor' ? '#2563eb' : '#f4f6fb', color: discountType === 'valor' ? '#fff' : '#666', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >R$</button>
              <button
                type="button"
                onClick={() => setDiscountType('percentual')}
                style={{ padding: '8px 14px', background: discountType === 'percentual' ? '#2563eb' : '#f4f6fb', color: discountType === 'percentual' ? '#fff' : '#666', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>%</button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount || ''}
              onChange={e => setDiscount(e.target.value)}
              placeholder="0"
              style={{ width: 120, padding: '8px 12px', background: '#fff', border: '1.5px solid #e0e6ef', borderRadius: 8, color: '#333', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Total */}
        <div className="form-section total-section">
          {(parseFloat(discount) || 0) > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#9ca3af', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>R$ {calculateSubtotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#f87171', marginBottom: 8 }}>
                <span>Desconto</span>
                <span>− R$ {(discountType === 'percentual' ? calculateSubtotal() * (parseFloat(discount) || 0) / 100 : parseFloat(discount) || 0).toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="total-label">Total</div>
          <div className="total-value">R$ {calculateTotal().toFixed(2)}</div>
        </div>

        {/* Tipo de venda */}
        <div className="form-section">
          <label className="section-label">Tipo de venda</label>
          <div className="sale-type-toggle">
            <button
              type="button"
              className={`sale-type-btn ${saleType === 'presencial' ? 'active' : ''}`}
              onClick={() => setSaleType('presencial')}
            >
              <FaStore /> Presencial
            </button>
            <button
              type="button"
              className={`sale-type-btn ${saleType === 'online' ? 'active' : ''}`}
              onClick={() => { setSaleType('online'); setHasDelivery(false); }}
            >
              <FaGlobe /> Online
            </button>
          </div>
        </div>

        {/* Entrega — presencial é opcional, online é sempre entrega */}
        {saleType === 'presencial' && (
          <div className="form-section">
            <label className="delivery-check-label">
              <input
                type="checkbox"
                checked={hasDelivery}
                onChange={(e) => {
                  setHasDelivery(e.target.checked);
                  if (!e.target.checked) setDeliveryAddress('');
                }}
              />
              Essa venda tem entrega?
            </label>
          </div>
        )}

        {(saleType === 'online' || (saleType === 'presencial' && hasDelivery)) && (
          <div className="form-section">
            <label className="section-label">Endereço de entrega</label>
            <textarea
              className="address-input"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
              rows={2}
              autoFocus={saleType === 'presencial'}
            />
            {selectedCustomer?.id && deliveryAddress.trim() && deliveryAddress.trim() !== (selectedCustomer?.address || '').trim() && (
              <button
                type="button"
                className="save-address-btn"
                onClick={async () => {
                  const { success } = await updateCustomer(selectedCustomer.id, { address: deliveryAddress.trim() });
                  if (success) {
                    setSelectedCustomer(prev => ({ ...prev, address: deliveryAddress.trim() }));
                    toast.success('Endereço salvo no cadastro do cliente');
                  } else {
                    toast.error('Erro ao salvar endereço');
                  }
                }}
              >
                Salvar endereço no cadastro
              </button>
            )}
          </div>
        )}

        {/* Forma de pagamento */}
        <div className="form-section">
          <label className="section-label">Forma de pagamento</label>
          <div className="payment-options">
            {['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'boleto', 'misto'].map(opt => (
              <button
                key={opt}
                type="button"
                className={`payment-opt-btn ${paymentMethod === opt ? 'active' : ''}`}
                onClick={() => setPaymentMethod(opt)}
              >
                {opt === 'dinheiro' && <><FaMoneyBillWave /> Dinheiro</>}
                {opt === 'pix' && <><FaMobile /> PIX</>}
                {opt === 'cartao_debito' && <><FaCreditCard /> Débito</>}
                {opt === 'cartao_credito' && <><FaCreditCard /> Crédito</>}
                {opt === 'boleto' && 'Boleto'}
                {opt === 'misto' && <><FaRandom /> Misto</>}
              </button>
            ))}
          </div>

          {/* Troco — pagamento total em dinheiro */}
          {paymentMethod === 'dinheiro' && (paymentStatus === 'pago' || paymentStatus === 'a_receber') && (
            <div className="troco-box">
              <div className="troco-row">
                <span className="troco-label">
                  {paymentStatus === 'a_receber' ? 'Valor a receber (troco)' : 'Valor recebido'}
                </span>
                <input
                  type="number"
                  className="misto-input"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={trocoRecebido}
                  onChange={e => setTrocoRecebido(e.target.value)}
                />
              </div>
              {parseFloat(trocoRecebido) > 0 && (
                <div className={`troco-result ${parseFloat(trocoRecebido) >= calculateTotal() ? 'troco-ok' : 'troco-warn'}`}>
                  {parseFloat(trocoRecebido) >= calculateTotal()
                    ? `${paymentStatus === 'a_receber' ? 'Troco a levar' : 'Troco'}: R$ ${(parseFloat(trocoRecebido) - calculateTotal()).toFixed(2)}`
                    : `Faltam R$ ${(calculateTotal() - parseFloat(trocoRecebido)).toFixed(2)}`}
                </div>
              )}
              {paymentStatus === 'pago' && saleType === 'online' && parseFloat(trocoRecebido) >= calculateTotal() && (() => {
                const trocoAtual = (parseFloat(trocoRecebido) - calculateTotal()).toFixed(2);
                const jaLancado = trocoOnlineLancadoValor === trocoAtual;
                return (
                  <button
                    type="button"
                    className="btn-troco-online"
                    onClick={handleLancarTrocoOnline}
                    disabled={trocoSaving || jaLancado}
                  >
                    {jaLancado ? '✓ Lançado' : trocoSaving ? 'Lançando...' : <><FaReceipt size={13} /> Lançar como despesa</>}
                  </button>
                );
              })()}
            </div>
          )}

          {/* Misto — divisão de valores */}
          {paymentMethod === 'misto' && (
            <div className="misto-breakdown">
              {[
                { key: 'dinheiro', label: <><FaMoneyBillWave /> Dinheiro</> },
                { key: 'pix', label: <><FaMobile /> PIX</> },
                { key: 'cartao', label: <><FaCreditCard /> Cartão</> },
              ].map(({ key, label }) => (
                <div key={key} className="misto-row">
                  <span className="misto-label">{label}</span>
                  <input
                    type="number"
                    className="misto-input"
                    placeholder="R$ 0,00"
                    min="0"
                    step="0.01"
                    value={mistoValues[key]}
                    onChange={e => setMistoValues(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
              {(() => {
                const soma = (parseFloat(mistoValues.dinheiro) || 0) + (parseFloat(mistoValues.pix) || 0) + (parseFloat(mistoValues.cartao) || 0);
                const total = calculateTotal();
                const diff = soma - total;
                const exato = Math.abs(diff) < 0.01;
                const sobra = diff > 0.01;
                const falta = diff < -0.01;
                return (
                  <div className="misto-total-row">
                    <span>Total informado:</span>
                    <span className={exato || sobra ? 'misto-ok' : 'misto-warn'}>
                      R$ {soma.toFixed(2)}
                      {' '}
                      {exato && '✓'}
                      {sobra && `✓ (troco R$ ${diff.toFixed(2)})`}
                      {falta && `(falta R$ ${Math.abs(diff).toFixed(2)})`}
                    </span>
                  </div>
                );
              })()}
              {/* Troco para a parte em dinheiro do misto */}
              {parseFloat(mistoValues.dinheiro) > 0 && paymentStatus === 'pago' && (
                <div className="troco-box" style={{ marginTop: 8 }}>
                  <div className="troco-row">
                    <span className="troco-label">Recebido em dinheiro</span>
                    <input
                      type="number"
                      className="misto-input"
                      placeholder="R$ 0,00"
                      min="0"
                      step="0.01"
                      value={trocoRecebido}
                      onChange={e => setTrocoRecebido(e.target.value)}
                    />
                  </div>
                  {parseFloat(trocoRecebido) > 0 && (
                    <div className={`troco-result ${parseFloat(trocoRecebido) >= parseFloat(mistoValues.dinheiro) ? 'troco-ok' : 'troco-warn'}`}>
                      {parseFloat(trocoRecebido) >= parseFloat(mistoValues.dinheiro)
                        ? `Troco: R$ ${(parseFloat(trocoRecebido) - parseFloat(mistoValues.dinheiro)).toFixed(2)}`
                        : `Faltam R$ ${(parseFloat(mistoValues.dinheiro) - parseFloat(trocoRecebido)).toFixed(2)}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status de pagamento */}
        <div className="form-section">
          <label className="section-label">Status do pagamento</label>
          <div className="sale-type-toggle">
            <button type="button" className={`sale-type-btn ${paymentStatus === 'pago' ? 'active' : ''}`} onClick={() => setPaymentStatus('pago')}>
              <FaCheckCircle /> Pago
            </button>
            <button type="button" className={`sale-type-btn ${paymentStatus === 'parcial' ? 'active' : ''}`} onClick={() => setPaymentStatus('parcial')}>
              <FaClock /> Pagamento parcial
            </button>
            <button type="button" className={`sale-type-btn ${paymentStatus === 'a_receber' ? 'active' : ''}`} onClick={() => setPaymentStatus('a_receber')}>
              <FaHourglassHalf /> A receber
            </button>
          </div>

          {paymentStatus === 'parcial' && (
            <div className="misto-breakdown" style={{ marginTop: 12 }}>
              <div className="misto-row">
                <span className="misto-label">Valor pago</span>
                <input
                  type="number"
                  className="misto-input"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={entradaValue}
                  onChange={e => setEntradaValue(e.target.value)}
                />
                <select
                  className="misto-input"
                  value={entradaMethod}
                  onChange={e => setEntradaMethod(e.target.value)}
                  style={{ maxWidth: 130 }}
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">📱 PIX</option>
                  <option value="cartao_debito">💳 Débito</option>
                  <option value="cartao_credito">💳 Crédito</option>
                  <option value="boleto">Boleto</option>
                </select>
              </div>
              <div className="misto-total-row">
                <span>Restante na entrega:</span>
                <span className={parseFloat(entradaValue) > 0 ? 'misto-ok' : 'misto-warn'}>
                  R$ {Math.max(0, calculateTotal() - (parseFloat(entradaValue) || 0)).toFixed(2)}
                </span>
              </div>
              {/* Troco para entrada em dinheiro */}
              {entradaMethod === 'dinheiro' && parseFloat(entradaValue) > 0 && (
                <div className="troco-box" style={{ marginTop: 8 }}>
                  <div className="troco-row">
                    <span className="troco-label">Recebido em dinheiro</span>
                    <input
                      type="number"
                      className="misto-input"
                      placeholder="R$ 0,00"
                      min="0"
                      step="0.01"
                      value={trocoRecebido}
                      onChange={e => setTrocoRecebido(e.target.value)}
                    />
                  </div>
                  {parseFloat(trocoRecebido) > 0 && (
                    <div className={`troco-result ${parseFloat(trocoRecebido) >= parseFloat(entradaValue) ? 'troco-ok' : 'troco-warn'}`}>
                      {parseFloat(trocoRecebido) >= parseFloat(entradaValue)
                        ? `Troco: R$ ${(parseFloat(trocoRecebido) - parseFloat(entradaValue)).toFixed(2)}`
                        : `Faltam R$ ${(parseFloat(entradaValue) - parseFloat(trocoRecebido)).toFixed(2)}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observação */}
        <div className="form-section">
          <label className="section-label">Observação</label>
          <textarea
            className="address-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informações adicionais para o romaneio..."
            rows={2}
          />
        </div>

        {/* Manter orçamento */}
        <div className="form-section">
          <label className="manter-orcamento-check">
            <input
              type="checkbox"
              checked={manterOrcamento}
              onChange={(e) => setManterOrcamento(e.target.checked)}
            />
            <span>Manter orçamento</span>
          </label>
          <span className="manter-orcamento-hint">
            Orçamentos que demoram pra aprovar não somem da lista no dia seguinte.
          </span>
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
            className="btn-primary btn-save-draft"
            onClick={handleSaveBudget}
            disabled={!selectedCustomer || items.length === 0}
          >
            {budgetData ? 'Salvar Alterações' : 'Salvar Orçamento'}
          </button>
          <button
            className="btn-primary btn-generate-sale"
            onClick={handleGenerateSale}
            disabled={items.length === 0 || !paymentMethod || generatingSale}
          >
            {generatingSale ? 'Gerando...' : <><FaCheckCircle /> Gerar Venda</>}
          </button>
        </div>

      </div>

      {showPinGate && (
        <PinGate
          onUnlock={() => { setShowPinGate(false); setView('caixa'); }}
          onClose={() => setShowPinGate(false)}
        />
      )}

      {postSaleModal && (
        <div className="post-sale-overlay">
          <div className="post-sale-modal">
            <div className="post-sale-icon">✅</div>
            <div className="post-sale-title">Venda registrada!</div>
            <div className="post-sale-subtitle">O que deseja fazer agora?</div>
            <div className="post-sale-actions">
              <button
                className="post-sale-btn print"
                onClick={() => {
                  setPostSaleModal(null);
                  setView('romaneio');
                  setTimeout(() => {
                    const afterPrint = () => {
                      window.removeEventListener('afterprint', afterPrint);
                      onApproved && onApproved();
                    };
                    window.addEventListener('afterprint', afterPrint);
                    window.print();
                  }, 400);
                }}
              >
                🖨️ Imprimir Romaneio
              </button>
              <button
                className="post-sale-btn picking"
                onClick={async () => {
                  setPostSaleModal(null);
                  const { data: existing } = await supabase
                    .from('picking')
                    .select('id')
                    .eq('budget_id', postSaleModal.budget.id)
                    .limit(1);
                  if (!existing || existing.length === 0) {
                    await createPickingOrder({
                      budget_id: postSaleModal.budget.id,
                      customer_name: postSaleModal.budget.customer_name,
                      customer_code: postSaleModal.budget.customer_code,
                      status: 'pending'
                    });
                    toast.success('Enviado para separação!');
                  } else {
                    toast('Já está em separação');
                  }
                  onApproved && onApproved();
                }}
              >
                📦 Enviar para Separação
              </button>
              <button
                ref={finalizarBtnRef}
                className="post-sale-btn skip"
                onClick={() => { setPostSaleModal(null); resetForm(); setView('form'); }}
              >
                Finalizar sem mais ações
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickExpenseModal && (
          <div className="cash-modal-overlay" onClick={() => setShowQuickExpenseModal(false)}>
            <div className="cash-modal" onClick={e => e.stopPropagation()}>
              <div className="cash-modal-title"><FaReceipt size={14} /> Lançar despesa rápida</div>
              <div className="cash-modal-field">
                <label>Valor</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  min="0"
                  step="0.01"
                  value={quickExpenseValor}
                  onChange={e => setQuickExpenseValor(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="cash-modal-field">
                <label>Observação / motivo</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Compra de sacola"
                  value={quickExpenseObs}
                  onChange={e => setQuickExpenseObs(e.target.value)}
                />
              </div>
              <div className="cash-modal-actions">
                <button className="cash-modal-cancel" onClick={() => setShowQuickExpenseModal(false)}>Cancelar</button>
                <button
                  className="cash-modal-confirm"
                  onClick={handleConfirmQuickExpense}
                  disabled={quickExpenseSaving}
                >
                  {quickExpenseSaving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
