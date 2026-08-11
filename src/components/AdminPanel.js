import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaTags,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaTrash,
  FaPlus,
  FaSave,
  FaUpload,
  FaLink,
  FaFolderOpen,
  FaChartLine,
  FaBullseye,
  FaStore,
  FaGlobe,
  FaHistory,
  FaClock
} from 'react-icons/fa';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability
} from '../services/productService';
import { getOverviewStats, getDailyHistory, getPaymentMethodReport, PAYMENT_CATEGORIES, updateBudgetStatus, confirmBudgetPayment } from '../services/managementService';
import ManagementDashboard from './ManagementDashboard';
import CashManager from './CashManager';
import OnlineConference from './OnlineConference';
import DeliveryHistory from './DeliveryHistory';
import PendingPayments from './PendingPayments';
import CustomerManager from './CustomerManager';
import AdminLogin from './AdminLogin';
import PinGate from './PinGate';
import PinSettings from './PinSettings';
import { supabase } from '../supabaseClient';
import './AdminPanel.css';

const PRODUCT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Cpath d='M30 65 L45 45 L58 58 L70 40 L80 65 Z' fill='%23bbb'/%3E%3Ccircle cx='38' cy='35' r='7' fill='%23bbb'/%3E%3C/svg%3E";

const MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const currentMonthName = MONTH_NAMES[new Date().getMonth()];

export default function AdminPanel() {
  const [session, setSession] = useState(undefined); // undefined = verificando, null = não logado
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    image: '',
    images: [], // Array para múltiplas imagens
    price: 0,
    category: 'Limpeza Doméstica',
    fragrances: [],
    isAvailable: true
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('management');
  const [pinGateTarget, setPinGateTarget] = useState(null);
  const [cashSubTab, setCashSubTab] = useState('presencial');
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'url' ou 'upload'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [overviewStats, setOverviewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(7);
  const [expandedDay, setExpandedDay] = useState(null);
  const [paymentReportMode, setPaymentReportMode] = useState('diario');
  const [paymentReportBuckets, setPaymentReportBuckets] = useState([]);
  const [paymentReportLoading, setPaymentReportLoading] = useState(false);
  const [mistoModalData, setMistoModalData] = useState(null); // null | { titulo, itens }
  const [budgetDetailModal, setBudgetDetailModal] = useState(null); // null | budget object
  const [budgetDetailLoading, setBudgetDetailLoading] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = PRODUCT_IMAGE_PLACEHOLDER;
  };

  useEffect(() => {
    document.body.style.overflow = showForm ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const prevSessionRef = useRef(undefined);
  useEffect(() => {
    // Só carrega produtos quando passa de sem sessão para com sessão (primeiro login)
    // Evita recarregar ao trocar de aba (Supabase TOKEN_REFRESHED dispara onAuthStateChange)
    if (session && !prevSessionRef.current) {
      loadProducts();
    }
    prevSessionRef.current = session;
  }, [session]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterAvailability, searchTerm]);

  useEffect(() => {
    if (activeTab === 'stats' && session) {
      setStatsLoading(true);
      getOverviewStats().then(data => {
        setOverviewStats(data);
        setStatsLoading(false);
      });
      loadDailyHistory(historyDays);
      loadPaymentReport(paymentReportMode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session]);

  const loadDailyHistory = async (days) => {
    setDailyLoading(true);
    const data = await getDailyHistory(days);
    setDailyHistory(data);
    setDailyLoading(false);
  };

  const handleHistoryDaysChange = (days) => {
    setHistoryDays(days);
    setExpandedDay(null);
    loadDailyHistory(days);
  };

  // Chave local 'YYYY-MM-DD' para uma data (evita problemas de fuso ao comparar com Date puro)
  const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // Segunda-feira da semana da data informada
  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diffToMonday = (d.getDay() + 6) % 7; // domingo=0 -> 6, segunda=1 -> 0, ...
    d.setDate(d.getDate() - diffToMonday);
    return d;
  };

  const emptyCategoryTotals = () => PAYMENT_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), { total: 0 });

  const loadPaymentReport = async (mode) => {
    setPaymentReportLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1); // exclusivo

      let startDate;
      let buckets; // [{ key, label }] na ordem em que serão exibidos (mais recente primeiro)

      if (mode === 'diario') {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        buckets = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          buckets.push({ key: dayKey(d), label: formatDayLabel(dayKey(d)) });
        }
      } else if (mode === 'semanal') {
        const currentWeekStart = startOfWeek(today);
        startDate = new Date(currentWeekStart);
        startDate.setDate(startDate.getDate() - 7 * 5); // últimas 6 semanas
        buckets = [];
        for (let i = 0; i < 6; i++) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setDate(weekStart.getDate() - 7 * i);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          buckets.push({
            key: `week-${dayKey(weekStart)}`,
            label: `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
            rangeStart: weekStart,
            rangeEnd: weekEnd
          });
        }
      } else {
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = new Date(currentMonthStart);
        startDate.setMonth(startDate.getMonth() - 5); // últimos 6 meses
        buckets = [];
        for (let i = 0; i < 6; i++) {
          const monthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1);
          buckets.push({
            key: `month-${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
            label: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
            monthIndex: monthStart.getMonth(),
            year: monthStart.getFullYear()
          });
        }
      }

      const { porDia, mistoDetalhe } = await getPaymentMethodReport(startDate, endDate);

      const pertenceAoBucket = (dateKey, bucket) => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const data = new Date(y, m - 1, d);
        if (mode === 'diario') return dateKey === bucket.key;
        if (mode === 'semanal') return data >= bucket.rangeStart && data <= bucket.rangeEnd;
        return data.getFullYear() === bucket.year && data.getMonth() === bucket.monthIndex;
      };

      const filled = buckets.map(bucket => {
        const totals = emptyCategoryTotals();
        Object.values(porDia).forEach(dia => {
          if (pertenceAoBucket(dia.date, bucket)) {
            PAYMENT_CATEGORIES.forEach(cat => { totals[cat] += dia[cat] || 0; });
            totals.total += dia.total || 0;
          }
        });
        const detalhe = mistoDetalhe.filter(item => pertenceAoBucket(item.dateKey, bucket));
        return { key: bucket.key, label: bucket.label, ...totals, mistoDetalhe: detalhe };
      });

      setPaymentReportBuckets(filled);
    } catch (error) {
      console.error('Erro ao carregar relatório por forma de pagamento:', error);
      toast.error('Erro ao carregar relatório por forma de pagamento');
    } finally {
      setPaymentReportLoading(false);
    }
  };

  const handlePaymentReportModeChange = (mode) => {
    setPaymentReportMode(mode);
    loadPaymentReport(mode);
  };

  const openMistoModal = (titulo, itens) => {
    if (!itens || itens.length === 0) return;
    setMistoModalData({ titulo, itens });
  };

  const formatMistoDateTime = (isoString) => {
    const d = new Date(isoString);
    const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    return `${data} às ${hora}`;
  };

  const toTitleCase = (str) => (str || '')
    .toLowerCase()
    .split(' ')
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');

  const formatBRL = (valor) => `R$ ${(parseFloat(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PAYMENT_METHOD_LABELS = {
    dinheiro: 'Dinheiro', pix: 'PIX',
    cartao_debito: 'Débito', cartao_credito: 'Crédito',
    boleto: 'Boleto'
  };

  const formatPaymentMethodSummary = (paymentMethod) => {
    if (!paymentMethod) return null;
    if (paymentMethod.startsWith('misto|')) return 'Misto';
    return PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
  };

  const PAYMENT_CATEGORY_CLASS = {
    'Dinheiro': 'dinheiro',
    'PIX': 'pix',
    'Cartão': 'cartao',
    'Boleto': 'boleto',
    'Misto não identificado': 'misto'
  };

  const formatDayLabel = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === today.getTime()) return 'Hoje';
    if (d.getTime() === yesterday.getTime()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  };

  const loadProducts = async () => {
    setLoading(true);
    const data = await getAllProducts();
    setProducts(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      isAvailable: formData.isAvailable,
      fragrances: formData.fragrances.length > 0 ? formData.fragrances : null,
      image: formData.image || null,
    };
    // Só inclui id se for um número válido (edição)
    const parsedId = parseFloat(formData.id);
    if (!isNaN(parsedId) && parsedId > 0) productData.id = parsedId;

    if (editingProduct) {
      const result = await updateProduct(editingProduct.id, productData);
      if (result.success) {
        toast.success('Produto atualizado com sucesso!', {
          duration: 3000,
          position: 'top-right',
        });
        loadProducts();
        resetForm();
      } else {
        toast.error('Erro ao atualizar: ' + result.error.message);
      }
    } else {
      const result = await createProduct(productData);
      if (result.success) {
        toast.success('Produto criado com sucesso!', {
          duration: 3000,
          position: 'top-right',
        });
        loadProducts();
        resetForm();
      } else {
        toast.error('Erro ao criar: ' + result.error.message);
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      fragrances: product.fragrances || [],
      images: product.images || []
    });
    setShowForm(true);
    setImagePreview(product.image);
    setUploadMethod('upload');
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error(`Arquivo ${file.name} não é uma imagem válida`);
        return false;
      }
      // Validar tamanho (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} deve ter no máximo 5MB`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploadingImage(true);
    try {
      const uploaded = [];
      for (let index = 0; index < validFiles.length; index++) {
        const file = validFiles[index];
        const timestamp = Date.now() + index;
        const fileName = `product-${timestamp}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);
        if (uploadError) {
          toast.error(`Erro ao enviar ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        uploaded.push({ url: data.publicUrl, name: fileName });
      }

      if (uploaded.length > 0) {
        // Primeira imagem como principal
        setImagePreview(uploaded[0].url);
        setFormData((prev) => ({
          ...prev,
          image: uploaded[0].url,
          images: uploaded
        }));
        toast.success(`${uploaded.length} imagem(ns) enviada(s) com sucesso!`);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUrlChange = (url) => {
    setFormData({ ...formData, image: url });
    setImagePreview(url);
  };

  const handleRemoveImage = async () => {
    const currentImage = formData.image;
    setFormData((prev) => ({ ...prev, image: '' }));
    setImagePreview('');

    if (currentImage && currentImage.startsWith('https://') && currentImage.includes('supabase.co/storage')) {
      const marker = '/assets/';
      const markerIndex = currentImage.indexOf(marker);
      if (markerIndex !== -1) {
        const filePath = currentImage.substring(markerIndex + marker.length);
        const { error } = await supabase.storage.from('assets').remove([filePath]);
        if (error) {
          toast.error('Erro ao remover imagem do armazenamento: ' + error.message);
        }
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success('Produto deletado com sucesso!');
        loadProducts();
      } else {
        toast.error('Erro ao deletar: ' + result.error.message);
      }
    }
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    const result = await toggleProductAvailability(id, !currentStatus);
    if (result.success) {
      toast.success(!currentStatus ? 'Produto disponível' : 'Produto indisponível');
      loadProducts();
    } else {
      toast.error('Erro ao alterar disponibilidade: ' + result.error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      image: '',
      images: [],
      price: 0,
      category: 'Limpeza Doméstica',
      fragrances: [],
      isAvailable: true
    });
    setEditingProduct(null);
    setShowForm(false);
    setImagePreview('');
    setUploadMethod('upload');
  };

  const handleFragranceChange = (value) => {
    const fragrances = value.split(',').map(f => f.trim()).filter(f => f);
    setFormData({ ...formData, fragrances });
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesAvailability = filterAvailability === 'all' || 
      (filterAvailability === 'available' && product.isAvailable) ||
      (filterAvailability === 'unavailable' && !product.isAvailable);
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toString().includes(searchTerm);
    
    return matchesCategory && matchesAvailability && matchesSearch;
  });

  // Paginação
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = [...new Set(products.map(p => p.category))];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Sessão encerrada');
  };

  const handleBudgetConfirmPayment = async (b) => {
    setBudgetDetailLoading(true);
    const valor = b.payment_status === 'parcial'
      ? Math.max(0, parseFloat(b.total || 0) - parseFloat(b.entrada_valor || 0))
      : parseFloat(b.total || 0);
    const result = await confirmBudgetPayment({
      budgetId: b.id,
      valor,
      formaPagamento: b.payment_method || 'dinheiro',
      saleType: b.sale_type || 'presencial',
      observacao: `${b.customer_name} — confirmação via histórico`,
    });
    setBudgetDetailLoading(false);
    if (result.success) {
      toast.success('Recebimento confirmado!');
      setBudgetDetailModal(prev => ({ ...prev, payment_status: 'pago' }));
      loadDailyHistory(historyDays);
    } else {
      toast.error('Erro ao confirmar recebimento: ' + (result.error || ''));
    }
  };

  const handleBudgetCancel = async (b) => {
    if (!window.confirm(`Cancelar orçamento de ${b.customer_name}?`)) return;
    setBudgetDetailLoading(true);
    const result = await updateBudgetStatus(b.id, 'cancelled');
    setBudgetDetailLoading(false);
    if (result.success) {
      toast.success('Orçamento cancelado!');
      setBudgetDetailModal(prev => ({ ...prev, status: 'cancelled' }));
      loadDailyHistory(historyDays);
    } else {
      toast.error('Erro ao cancelar orçamento');
    }
  };

  const handleBudgetEdit = (b) => {
    setBudgetDetailModal(null);
    setActiveTab('management');
    setSearchParams({ view: 'budgets', budgetId: String(b.id) });
  };

  if (session === undefined) {
    return <div className="admin-loading">Verificando acesso...</div>;
  }

  if (!session) {
    return <AdminLogin onLogin={() => {}} />;
  }

  if (loading) {
    return <div className="admin-loading">Carregando produtos...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-left" />
        <h1 className="admin-title">Painel de Gestão</h1>
        <button className="btn-logout" onClick={handleLogout}>↩ Sair</button>

        {/* Abas dentro do header */}
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'management' ? 'active' : ''}`}
            onClick={() => setActiveTab('management')}
          >
            LimpLeve Online
          </button>
          <button
            className={`tab-button ${activeTab === 'caixa' ? 'active' : ''}`}
            onClick={() => setPinGateTarget('caixa')}
          >
            Caixa
          </button>
          <button
            className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Produtos
          </button>
          <button
            className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            Clientes
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setPinGateTarget('settings')}
          >
            Configurações
          </button>
          <button
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setPinGateTarget('stats')}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Clientes */}
      {activeTab === 'customers' && (
        <div className="tab-content">
          <CustomerManager />
        </div>
      )}

      {/* Conteúdo da Aba de Gestão (LimpLeve Online) */}
      {activeTab === 'management' && (
        <div className="tab-content management-tab">
          <ManagementDashboard />
        </div>
      )}

      {/* Aba Caixa */}
      {activeTab === 'caixa' && (
        <div className="tab-content">
          <div className="admin-subtabs">
            <button
              className={`subtab-button ${cashSubTab === 'presencial' ? 'active' : ''}`}
              onClick={() => setCashSubTab('presencial')}
            >
              <FaStore size={13} style={{ marginRight: 5 }} /> Presencial
            </button>
            <button
              className={`subtab-button ${cashSubTab === 'online' ? 'active' : ''}`}
              onClick={() => setCashSubTab('online')}
            >
              <FaGlobe size={13} style={{ marginRight: 5 }} /> Online
            </button>
            <button
              className={`subtab-button ${cashSubTab === 'historico' ? 'active' : ''}`}
              onClick={() => setCashSubTab('historico')}
            >
              <FaHistory size={13} style={{ marginRight: 5 }} /> Histórico
            </button>
          </div>
          {cashSubTab === 'presencial' && (
            <CashManager onBack={() => setActiveTab('management')} />
          )}
          {cashSubTab === 'online' && (
            <OnlineConference onBack={() => setActiveTab('management')} />
          )}
          {cashSubTab === 'historico' && (
            <CashManager mode="historico" onBack={() => setActiveTab('management')} />
          )}
        </div>
      )}

      {/* Conteúdo da Aba de Produtos */}
      {activeTab === 'products' && (
        <div className="tab-content">
          {showForm && (
        <div className="product-modal-overlay" onClick={resetForm}>
        <div className="product-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="product-modal-close"
            onClick={resetForm}
            aria-label="Fechar"
          >
            ✕
          </button>
          <h2>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-row">
              <div className="form-group">
                <label>ID do Produto *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                  disabled={editingProduct !== null}
                />
              </div>
              <div className="form-group">
                <label>Nome do Produto *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>Imagem do Produto *</label>
                
                {/* Abas de método */}
                <div className="image-method-tabs">
                  <button
                    type="button"
                    className={`method-tab ${uploadMethod === 'upload' ? 'active' : ''}`}
                    onClick={() => setUploadMethod('upload')}
                  >
                    <FaUpload size={12} /> Fazer Upload da Img
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${uploadMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setUploadMethod('url')}
                  >
                    <FaLink size={12} /> URL
                  </button>
                </div>

                {/* Input de URL */}
                {uploadMethod === 'url' && (
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    required
                    placeholder="/images/products/nome-imagem.png"
                  />
                )}

                {/* Input de Upload */}
                {uploadMethod === 'upload' && (
                  <div className="upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      id="image-upload"
                      className="file-input"
                      multiple
                      disabled={uploadingImage}
                    />
                    <label htmlFor="image-upload" className="file-label">
                      {uploadingImage ? 'Enviando...' : <><FaFolderOpen size={12} /> Escolher Imagens</>}
                    </label>
                    {formData.images && formData.images.length > 0 && (
                      <div className="file-names">
                        <span className="file-count">{formData.images.length} imagem(ns) selecionada(s)</span>
                        {formData.images.map((img, idx) => (
                          <span key={idx} className="file-name">{img.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview da Imagem */}
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    {formData.image && (
                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={handleRemoveImage}
                      >
                        <FaTrash size={12} /> Remover imagem
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="Limpeza Doméstica">Limpeza Doméstica</option>
                  <option value="Limpeza Automotiva">Limpeza Automotiva</option>
                  <option value="Equipamentos de Limpeza">Equipamentos de Limpeza</option>
                  <option value="Descartáveis">Descartáveis</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Fragrâncias (separadas por vírgula)</label>
              <input
                type="text"
                value={formData.fragrances.join(', ')}
                onChange={(e) => handleFragranceChange(e.target.value)}
                placeholder="Ex: Lavanda, Limão, Neutro"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={!formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: !e.target.checked })}
                />
                Produto Indisponível
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingProduct ? <><FaSave size={12} /> Atualizar</> : <><FaPlus size={12} /> Criar</>} Produto
              </button>
              <button type="button" onClick={resetForm} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </form>
        </div>
        </div>
      )}

      <div className="admin-filters">
        <div className="filter-group">
          <label><FaSearch size={12} /> Buscar:</label>
          <input
            type="text"
            placeholder="Nome ou ID do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label><FaTags size={12} /> Categoria:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Todas</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label><FaFilter size={12} /> Disponibilidade:</label>
          <select value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)}>
            <option value="all">Todos</option>
            <option value="available">Disponíveis</option>
            <option value="unavailable">Indisponíveis</option>
          </select>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-badge stat-total">
          <span className="stat-number">{products.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-badge stat-available">
          <span className="stat-number">{products.filter(p => p.isAvailable).length}</span>
          <span className="stat-label">Disponíveis</span>
        </div>
        <div className="stat-badge stat-unavailable">
          <span className="stat-number">{products.filter(p => !p.isAvailable).length}</span>
          <span className="stat-label">Indisponíveis</span>
        </div>
        <div className="stat-badge stat-filtered">
          <span className="stat-number">{filteredProducts.length}</span>
          <span className="stat-label">Filtrados</span>
        </div>
      </div>

      <div className="add-product-section">
        <button
          className="btn-add-product"
          onClick={() => setShowForm(true)}
        >
<FaPlus size={12} /> Adicionar Produto
        </button>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Imagem</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map(product => (
              <tr key={product.id} className={!product.isAvailable ? 'unavailable' : ''}>
                <td>{product.id}</td>
                <td>
                  <img
                    src={product.image || PRODUCT_IMAGE_PLACEHOLDER}
                    alt={product.name}
                    className="product-thumb"
                    onError={handleImageError}
                  />
                </td>
                <td>
                  <div className="product-name">{product.name}</div>
                  {product.fragrances && product.fragrances.length > 0 && (
                    <div className="product-fragrances">
                      {product.fragrances.join(', ')}
                    </div>
                  )}
                </td>
                <td>{product.category}</td>
                <td>R$ {product.price.toFixed(2)}</td>
                <td>
                  <span className={`status-badge ${product.isAvailable ? 'available' : 'unavailable'}`}>
                    {product.isAvailable ? <><FaCheckCircle size={12} /> Disponível</> : <><FaTimesCircle size={12} /> Indisponível</>}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(product)}
                      className="btn-edit"
                      title="Editar"
                    >
                      <FaEdit size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      className="btn-toggle"
                      title={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
                    >
                      {product.isAvailable ? <FaEye size={13} /> : <FaEyeSlash size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="btn-delete"
                      title="Deletar"
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Layout de Cards para Mobile */}
      <div className="products-cards-mobile">
        {currentProducts.map(product => (
          <div key={product.id} className={`product-card-mobile ${!product.isAvailable ? 'unavailable' : ''}`}>
            <div className="product-card-header">
              <div className="product-card-image">
                <img
                  src={product.image || PRODUCT_IMAGE_PLACEHOLDER}
                  alt={product.name}
                  onError={handleImageError}
                />
              </div>
              <div className="product-card-info">
                <div className="product-card-id">ID: {product.id}</div>
                <div className="product-card-name">{product.name}</div>
                {product.fragrances && product.fragrances.length > 0 && (
                  <div className="product-card-fragrances">
                    {product.fragrances.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="product-card-details">
              <div className="product-card-detail">
                <div className="product-card-detail-label">Categoria</div>
                <div className="product-card-detail-value">{product.category}</div>
              </div>
              <div className="product-card-detail">
                <div className="product-card-detail-label">Preço</div>
                <div className="product-card-detail-value">R$ {product.price.toFixed(2)}</div>
              </div>
              <div className="product-card-detail">
                <div className="product-card-detail-label">Status</div>
                <div className="product-card-detail-value">
                  <span className={`status-badge ${product.isAvailable ? 'available' : 'unavailable'}`}>
                    {product.isAvailable ? <><FaCheckCircle size={12} /> Disponível</> : <><FaTimesCircle size={12} /> Indisponível</>}
                  </span>
                </div>
              </div>
            </div>

            <div className="product-card-actions">
              <button
                onClick={() => handleEdit(product)}
                className="btn-edit"
                title="Editar"
              >
                <FaEdit size={13} /> Editar
              </button>
              <button
                onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                className="btn-toggle"
                title={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
              >
                {product.isAvailable ? <><FaEyeSlash size={13} /> Ocultar</> : <><FaEye size={13} /> Mostrar</>}
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="btn-delete"
                title="Deletar"
              >
                <FaTrash size={13} /> Deletar
              </button>
            </div>
          </div>
        ))}
      </div>

          {/* Paginação */}
          {filteredProducts.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Mostrando {indexOfFirstProduct + 1} - {Math.min(indexOfLastProduct, filteredProducts.length)} de {filteredProducts.length} produtos
              </div>
              
              <div className="pagination-controls">
                <button 
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  ← Anterior
                </button>
                
                <div className="pagination-pages">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    // Mostrar apenas algumas páginas ao redor da página atual
                    if (
                      pageNumber === 1 || 
                      pageNumber === totalPages || 
                      (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => paginate(pageNumber)}
                          className={`pagination-number ${currentPage === pageNumber ? 'active' : ''}`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                      return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button 
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Próxima →
                </button>
              </div>
              
              <div className="pagination-per-page">
                <label>Produtos por página:</label>
                <select 
                  value={productsPerPage} 
                  onChange={(e) => {
                    setProductsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Conteúdo da Aba de Configurações */}
      {activeTab === 'settings' && (
        <div className="tab-content">
          <PinSettings />
        </div>
      )}

      {/* Modal PIN */}
      {pinGateTarget && (
        <PinGate
          onUnlock={() => {
            setActiveTab(pinGateTarget);
            setPinGateTarget(null);
          }}
          onClose={() => setPinGateTarget(null)}
        />
      )}

      {/* Modal de detalhe das transações "Misto não identificado" */}
      {mistoModalData && (
        <div className="cash-modal-overlay" onClick={() => setMistoModalData(null)}>
          <div className="cash-modal payment-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="cash-modal-title">{mistoModalData.titulo}</div>
            <div className="payment-detail-list">
              {mistoModalData.itens.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="payment-detail-item">
                  <div className="payment-detail-item-header">
                    <div className="payment-detail-item-when">
                      {item.customer_name && (
                        <span className="payment-detail-item-customer">{toTitleCase(item.customer_name)}</span>
                      )}
                      <span className="payment-detail-item-datetime">{formatMistoDateTime(item.created_at)}</span>
                    </div>
                    <span className="payment-detail-item-total">Total: {formatBRL(item.valor)}</span>
                  </div>
                  <div className="payment-detail-item-forma">{item.forma_pagamento || '(sem forma de pagamento registrada)'}</div>
                  <div className="payment-detail-item-diff">Diferença não identificada: {formatBRL(item.diferenca)}</div>
                </div>
              ))}
            </div>
            <button className="cash-modal-cancel" style={{ marginTop: 16, width: '100%' }} onClick={() => setMistoModalData(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba de Dashboard */}
      {activeTab === 'stats' && (
        <div className="tab-content stats-tab">
          {statsLoading || !overviewStats ? (
            <div className="stats-loading">Carregando estatísticas...</div>
          ) : (
            <>
              <div className="stats-top-grid">

                {/* Coluna 1 — Métricas principais */}
                <div className="overview-cards overview-cards--col">
                  <div className="ov-card blue">
                    <div className="ov-icon"><FaChartLine /></div>
                    <div className="ov-info">
                      <div className="ov-combined-row">
                        <div className="ov-combined-item">
                          <span className="ov-value">{overviewStats.monthCount}</span>
                          <span className="ov-label">Vendas em {currentMonthName}</span>
                          <span className="ov-sub">{overviewStats.weekCount} nos últ. 7 dias</span>
                        </div>
                        <div className="ov-combined-divider" />
                        <div className="ov-combined-item">
                          <span className="ov-value">R$ {overviewStats.monthRevenue.toFixed(2)}</span>
                          <span className="ov-label">Faturado em {currentMonthName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ov-card purple">
                    <div className="ov-icon"><FaBullseye /></div>
                    <div className="ov-info">
                      <span className="ov-value">R$ {overviewStats.avgTicket.toFixed(2)}</span>
                      <span className="ov-label">Ticket médio</span>
                    </div>
                    <div className="ov-sub">Por venda confirmada</div>
                  </div>
                </div>

                {/* Coluna 2 — Operacional */}
                <div className="overview-cards overview-cards--col">
                  <div className="ov-card split">
                    <div className="ov-split-item delivered">
                      <div className="ov-icon"><FaStore /></div>
                      <span className="ov-split-value">{overviewStats.presencial}</span>
                      <span className="ov-split-label">Presencial</span>
                    </div>
                    <div className="ov-split-divider" />
                    <div className="ov-split-item">
                      <div className="ov-icon"><FaGlobe /></div>
                      <span className="ov-split-value">{overviewStats.online}</span>
                      <span className="ov-split-label">Online</span>
                    </div>
                  </div>

                  {overviewStats.pendingTotal > 0 && (
                    <div className="ov-card orange">
                      <div className="ov-icon"><FaClock /></div>
                      <div className="ov-info">
                        <span className="ov-value">R$ {overviewStats.pendingTotal.toFixed(2)}</span>
                        <span className="ov-label">A receber</span>
                      </div>
                      <div className="ov-sub">Valores pendentes de cobrança</div>
                    </div>
                  )}
                </div>

                {/* Coluna 3 — Produtos Mais Vendidos */}
                <div>
                  <h2 className="stats-section-title">Produtos Mais Vendidos</h2>
                  {overviewStats.topProducts.length === 0 ? (
                    <p className="stats-empty">Nenhum dado de produtos ainda.</p>
                  ) : (
                    <div className="top-products">
                      {overviewStats.topProducts.map((p, i) => {
                        const max = overviewStats.topProducts[0].qty;
                        const pct = Math.round((p.qty / max) * 100);
                        return (
                          <div key={p.name} className="top-product-row">
                            <span className="tp-rank">#{i + 1}</span>
                            <div className="tp-info">
                              <div className="tp-header">
                                <span className="tp-name">{p.name}</span>
                                <span className="tp-qty">{p.qty} un.</span>
                              </div>
                              <div className="tp-bar-bg">
                                <div className="tp-bar-fill" style={{width: `${pct}%`}} />
                              </div>
                            </div>
                            <span className="tp-revenue">R$ {p.revenue.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="stats-middle-grid">

              {/* Histórico por dia */}
              <div>
              <div className="daily-history-header">
                <h2 className="stats-section-title">Histórico por Dia</h2>
                <div className="daily-period-tabs">
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      className={`period-tab ${historyDays === d ? 'active' : ''}`}
                      onClick={() => handleHistoryDaysChange(d)}
                    >
                      {d === 7 ? '7 dias' : d === 14 ? '14 dias' : '30 dias'}
                    </button>
                  ))}
                </div>
              </div>

              {dailyLoading ? (
                <div className="stats-loading">Carregando histórico...</div>
              ) : dailyHistory.length === 0 ? (
                <p className="stats-empty">Nenhuma venda nos últimos {historyDays} dias.</p>
              ) : (
                <div className="daily-history-list">
                  {dailyHistory.map(day => (
                    <div key={day.date} className="daily-day-block">
                      <button
                        className={`daily-day-header ${expandedDay === day.date ? 'expanded' : ''}`}
                        onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                      >
                        <div className="daily-day-left">
                          <span className="daily-day-label">{formatDayLabel(day.date)}</span>
                          <span className="daily-day-date">{day.date.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="daily-day-right">
                          <span className="daily-day-count">{day.count} venda{day.count !== 1 ? 's' : ''}</span>
                          <span className="daily-day-revenue">R$ {day.revenue.toFixed(2)}</span>
                          {day.aReceber > 0 && (
                            <span className="daily-day-a-receber">A receber: R$ {day.aReceber.toFixed(2)}</span>
                          )}
                          {day.cancelled > 0 && (
                            <span className="daily-day-cancelled">{day.cancelled} cancel.</span>
                          )}
                          <span className="daily-day-arrow">{expandedDay === day.date ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {expandedDay === day.date && (
                        <div className="daily-orders-list">
                          {day.budgets.map(b => (
                            <div key={b.id} className={`daily-order-row ${b.status === 'cancelled' ? 'cancelled' : ''}`}>
                              <div className="daily-order-info">
                                <span className="daily-order-name">{b.customer_name}</span>
                                <span className={`daily-order-status status-${b.status}`}>
                                  {b.status === 'confirmed' ? 'Confirmado'
                                    : b.status === 'delivered' ? 'Entregue'
                                    : b.status === 'cancelled' ? 'Cancelado'
                                    : b.status === 'draft' ? 'Rascunho'
                                    : b.status}
                                </span>
                                {b.payment_status === 'pago' && (
                                  <span className="daily-order-ps ps-pago">Pago</span>
                                )}
                                {b.payment_status === 'a_receber' && (
                                  <span className="daily-order-ps ps-a-receber">A receber</span>
                                )}
                                {b.payment_status === 'parcial' && (
                                  <span className="daily-order-ps ps-parcial">Parcial</span>
                                )}
                              </div>
                              <div className="daily-order-meta">
                                <span className="daily-order-type">
                                  {b.sale_type === 'online' ? 'Online' : 'Presencial'}
                                </span>
                                {formatPaymentMethodSummary(b.payment_method) && (
                                  <span className="daily-order-payment">
                                    {formatPaymentMethodSummary(b.payment_method)}
                                  </span>
                                )}
                                <span className="daily-order-time">
                                  {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                </span>
                                <span className="daily-order-total">
                                  R$ {parseFloat(b.total || 0).toFixed(2)}
                                </span>
                              </div>
                              {b.budget_items && b.budget_items.length > 0 && (
                                <div className="daily-order-items">
                                  {b.budget_items.map((item, idx) => (
                                    <span key={idx} className="daily-order-item">
                                      {item.quantity}x {item.product_name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <button
                                className="budget-detail-modal-btn-view"
                                onClick={() => setBudgetDetailModal(b)}
                              >
                                Ver orçamento
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              </div>{/* fim coluna Histórico por Dia */}

              {/* Vendas por Forma de Pagamento */}
              <div>
              <div className="payment-report-header">
                <h2 className="stats-section-title">Vendas por Forma de Pagamento</h2>
                <div className="daily-period-tabs">
                  {[
                    { key: 'diario', label: 'Diário' },
                    { key: 'semanal', label: 'Semanal' },
                    { key: 'mensal', label: 'Mensal' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      className={`period-tab ${paymentReportMode === opt.key ? 'active' : ''}`}
                      onClick={() => handlePaymentReportModeChange(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentReportLoading ? (
                <div className="stats-loading">Carregando relatório...</div>
              ) : paymentReportBuckets.every(b => b.total === 0) ? (
                <p className="stats-empty">Nenhuma venda no período.</p>
              ) : (
                <>
                  {/* Cards de resumo do período atual (hoje / semana atual / mês atual) */}
                  <div className="payment-summary-cards">
                    {(() => {
                      const currentBucket = paymentReportBuckets[0];
                      return PAYMENT_CATEGORIES.map(cat => {
                        const total = currentBucket ? (currentBucket[cat] || 0) : 0;
                        if (cat === 'Misto não identificado' && total === 0) return null;
                        const isMisto = cat === 'Misto não identificado';
                        const CardTag = isMisto ? 'button' : 'div';
                        return (
                          <CardTag
                            key={cat}
                            className={`payment-card ${PAYMENT_CATEGORY_CLASS[cat]}${isMisto ? ' payment-card-clickable' : ''}`}
                            {...(isMisto ? {
                              onClick: () => openMistoModal(
                                `Misto não identificado (${currentBucket.label})`,
                                currentBucket.mistoDetalhe
                              )
                            } : {})}
                          >
                            <div className="payment-card-info">
                              <span className="payment-card-value">{formatBRL(total)}</span>
                              <span className="payment-card-label">{cat}{isMisto ? ' (ver detalhe)' : ''}</span>
                            </div>
                          </CardTag>
                        );
                      });
                    })()}
                  </div>

                  {/* Comparativo por período */}
                  <div className="payment-period-list">
                    {paymentReportBuckets.map(bucket => (
                      <div key={bucket.key} className="payment-period-row">
                        <div className="payment-period-header">
                          <span className="payment-period-label">{bucket.label}</span>
                          <span className="payment-period-total">{formatBRL(bucket.total)}</span>
                        </div>
                        <div className="payment-bar-bg">
                          {bucket.total > 0 && PAYMENT_CATEGORIES.map(cat => (
                            bucket[cat] > 0 && (
                              <div
                                key={cat}
                                className={`payment-bar-segment ${PAYMENT_CATEGORY_CLASS[cat]}`}
                                style={{ width: `${(bucket[cat] / bucket.total) * 100}%` }}
                                title={`${cat}: ${formatBRL(bucket[cat])}`}
                              />
                            )
                          ))}
                        </div>
                        {bucket.total > 0 && (
                          <div className="payment-period-breakdown">
                            {PAYMENT_CATEGORIES.map(cat => {
                              if (!(bucket[cat] > 0)) return null;
                              const isMisto = cat === 'Misto não identificado';
                              const ItemTag = isMisto ? 'button' : 'span';
                              return (
                                <ItemTag
                                  key={cat}
                                  className={`payment-breakdown-item ${PAYMENT_CATEGORY_CLASS[cat]}${isMisto ? ' payment-breakdown-clickable' : ''}`}
                                  {...(isMisto ? {
                                    onClick: () => openMistoModal(`Misto não identificado (${bucket.label})`, bucket.mistoDetalhe)
                                  } : {})}
                                >
                                  {isMisto ? 'Misto' : cat}: {formatBRL(bucket[cat])}
                                </ItemTag>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              </div>{/* fim coluna Vendas por Forma de Pagamento */}

              </div>{/* fim stats-middle-grid */}
            </>
          )}

          <div className="stats-bottom-grid">
            <DeliveryHistory />
            <PendingPayments />
          </div>
        </div>
      )}

      {budgetDetailModal && (() => {
        const b = budgetDetailModal;
        const statusLabel = {
          confirmed: 'Confirmado', delivered: 'Entregue',
          cancelled: 'Cancelado', draft: 'Rascunho'
        };
        const psLabel = { pago: 'Pago', a_receber: 'A receber', parcial: 'Parcial' };
        const psClass = { pago: 'ps-pago', a_receber: 'ps-a-receber', parcial: 'ps-parcial' };
        return (
          <div className="budget-detail-overlay" onClick={() => setBudgetDetailModal(null)}>
            <div className="budget-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="budget-detail-modal-header">
                <span className="budget-detail-modal-title">{b.customer_name}</span>
                <button className="budget-detail-modal-close" onClick={() => setBudgetDetailModal(null)}>✕</button>
              </div>

              <div className="budget-detail-modal-badges">
                <span className={`daily-order-status status-${b.status}`}>
                  {statusLabel[b.status] || b.status}
                </span>
                {b.payment_status && psLabel[b.payment_status] && (
                  <span className={`daily-order-ps ${psClass[b.payment_status]}`}>
                    {psLabel[b.payment_status]}
                  </span>
                )}
                <span className="daily-order-type">
                  {b.sale_type === 'online' ? 'Online' : 'Presencial'}
                </span>
              </div>

              <div className="budget-detail-modal-section">
                <span className="budget-detail-modal-label">Data / Hora</span>
                <span className="budget-detail-modal-value">
                  {new Date(b.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {formatPaymentMethodSummary(b.payment_method) && (
                <div className="budget-detail-modal-section">
                  <span className="budget-detail-modal-label">Forma de Pagamento</span>
                  <span className="budget-detail-modal-value">{formatPaymentMethodSummary(b.payment_method)}</span>
                </div>
              )}

              {b.budget_items && b.budget_items.length > 0 && (
                <div className="budget-detail-modal-section">
                  <span className="budget-detail-modal-label">Itens</span>
                  <div className="budget-detail-modal-items">
                    {b.budget_items.map((item, idx) => (
                      <div key={idx} className="budget-detail-modal-item">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>R$ {parseFloat(item.total_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="budget-detail-modal-total">
                <span>Total</span>
                <span>R$ {parseFloat(b.total || 0).toFixed(2)}</span>
              </div>

              {(b.payment_status === 'a_receber' || b.payment_status === 'parcial' || (b.status !== 'cancelled' && b.status !== 'delivered')) && (
                <div className="budget-detail-modal-actions">
                  {(b.payment_status === 'a_receber' || b.payment_status === 'parcial') && (
                    <button
                      className="budget-detail-action-btn confirm-payment"
                      onClick={() => handleBudgetConfirmPayment(b)}
                      disabled={budgetDetailLoading}
                    >
                      Confirmar recebimento
                    </button>
                  )}
                  {b.status !== 'delivered' && b.status !== 'cancelled' && (
                    <button
                      className="budget-detail-action-btn edit"
                      onClick={() => handleBudgetEdit(b)}
                      disabled={budgetDetailLoading}
                    >
                      Editar
                    </button>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'delivered' && (
                    <button
                      className="budget-detail-action-btn cancel"
                      onClick={() => handleBudgetCancel(b)}
                      disabled={budgetDetailLoading}
                    >
                      Cancelar orçamento
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
