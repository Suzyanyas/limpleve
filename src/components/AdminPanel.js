import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability
} from '../services/productService';
import { getOverviewStats, getDailyHistory } from '../services/managementService';
import ManagementDashboard from './ManagementDashboard';
import CustomerManager from './CustomerManager';
import AdminLogin from './AdminLogin';
import PinGate from './PinGate';
import PinSettings from './PinSettings';
import { supabase } from '../supabaseClient';
import './AdminPanel.css';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'url' ou 'upload'
  const [overviewStats, setOverviewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dailyHistory, setDailyHistory] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(7);
  const [expandedDay, setExpandedDay] = useState(null);

  const smoothScrollToTop = () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > 1) {
      window.requestAnimationFrame(smoothScrollToTop);
      window.scrollTo(0, currentScroll - currentScroll / 8);
    } else {
      window.scrollTo(0, 0);
    }
  };

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

  const formatDayLabel = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === today.getTime()) return 'Hoje';
    if (d.getTime() === yesterday.getTime()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
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
        toast.success('✅ Produto atualizado com sucesso!', {
          duration: 3000,
          position: 'top-right',
        });
        loadProducts();
        resetForm();
      } else {
        toast.error('❌ Erro ao atualizar: ' + result.error.message);
      }
    } else {
      const result = await createProduct(productData);
      if (result.success) {
        toast.success('✅ Produto criado com sucesso!', {
          duration: 3000,
          position: 'top-right',
        });
        loadProducts();
        resetForm();
      } else {
        toast.error('❌ Erro ao criar: ' + result.error.message);
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
    
    // Scroll suave para o topo onde está o formulário
    setTimeout(() => {
      smoothScrollToTop();
    }, 100);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const imagePaths = [];
      const previews = [];
      let processedCount = 0;

      files.forEach((file, index) => {
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo ${file.name} não é uma imagem válida`);
          return;
        }

        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} deve ter no máximo 5MB`);
          return;
        }

        // Criar preview
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result);
          
          // Gerar nome do arquivo
          const timestamp = Date.now() + index;
          const fileName = `product-${timestamp}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
          const imagePath = `/images/products/${fileName}`;
          imagePaths.push({ path: imagePath, name: fileName });
          
          processedCount++;
          
          // Quando todas as imagens forem processadas
          if (processedCount === files.length) {
            // Primeira imagem como principal
            setImagePreview(previews[0]);
            setFormData({ 
              ...formData, 
              image: imagePaths[0].path,
              images: imagePaths
            });
            
            const fileNames = imagePaths.map(img => img.name).join(', ');
            toast.success(`⚠️ ${files.length} imagem(ns) selecionada(s). Salve manualmente na pasta public/images/products/ com os nomes: ${fileNames}`, {
              duration: 10000
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleImageUrlChange = (url) => {
    setFormData({ ...formData, image: url });
    setImagePreview(url);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success('🗑️ Produto deletado com sucesso!');
        loadProducts();
      } else {
        toast.error('❌ Erro ao deletar: ' + result.error.message);
      }
    }
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    const result = await toggleProductAvailability(id, !currentStatus);
    if (result.success) {
      toast.success(!currentStatus ? '✅ Produto disponível' : '❌ Produto indisponível');
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

      {/* Conteúdo da Aba de Produtos */}
      {activeTab === 'products' && (
        <div className="tab-content">
          {showForm && (
        <div className="product-form-container">
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
                    📤 Fazer Upload da Img
                  </button>
                  <button
                    type="button"
                    className={`method-tab ${uploadMethod === 'url' ? 'active' : ''}`}
                    onClick={() => setUploadMethod('url')}
                  >
                    🔗 URL
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
                    />
                    <label htmlFor="image-upload" className="file-label">
                      📁 Escolher Imagens
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
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                />
                Produto Disponível
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingProduct ? '💾 Atualizar' : '➕ Criar'} Produto
              </button>
              <button type="button" onClick={resetForm} className="btn-cancel">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-filters">
        <div className="filter-group">
          <label>🔍 Buscar:</label>
          <input
            type="text"
            placeholder="Nome ou ID do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>📁 Categoria:</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Todas</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>✅ Disponibilidade:</label>
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

      {!showForm && (
        <div className="add-product-section">
          <button 
            className="btn-add-product"
            onClick={() => {
              setShowForm(true);
              setTimeout(() => {
                smoothScrollToTop();
              }, 100);
            }}
          >
            ➕ Adicionar Produto
          </button>
        </div>
      )}

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
                  <img src={product.image} alt={product.name} className="product-thumb" />
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
                    {product.isAvailable ? '✅ Disponível' : '❌ Indisponível'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(product)}
                      className="btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      className="btn-toggle"
                      title={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
                    >
                      {product.isAvailable ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="btn-delete"
                      title="Deletar"
                    >
                      🗑️
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
                <img src={product.image} alt={product.name} />
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
                    {product.isAvailable ? '✅ Disponível' : '❌ Indisponível'}
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
                ✏️ Editar
              </button>
              <button
                onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                className="btn-toggle"
                title={product.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
              >
                {product.isAvailable ? '👁️ Ocultar' : '👁️ Mostrar'}
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="btn-delete"
                title="Deletar"
              >
                🗑️ Deletar
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

      {/* Conteúdo da Aba de Dashboard */}
      {activeTab === 'stats' && (
        <div className="tab-content stats-tab">
          {statsLoading || !overviewStats ? (
            <div className="stats-loading">Carregando estatísticas...</div>
          ) : (
            <>
              <h2 className="stats-section-title">Visão Geral</h2>

              {/* Cards de resumo */}
              <div className="overview-cards">
                <div className="ov-card blue">
                  <div className="ov-icon">📋</div>
                  <div className="ov-info">
                    <span className="ov-value">{overviewStats.monthCount}</span>
                    <span className="ov-label">Vendas este mês</span>
                  </div>
                  <div className="ov-sub">{overviewStats.weekCount} nos últimos 7 dias</div>
                </div>

                <div className="ov-card green">
                  <div className="ov-icon">💰</div>
                  <div className="ov-info">
                    <span className="ov-value">R$ {overviewStats.monthRevenue.toFixed(2)}</span>
                    <span className="ov-label">Faturamento este mês</span>
                  </div>
                  <div className="ov-sub">Total geral: R$ {overviewStats.totalRevenue.toFixed(2)}</div>
                </div>

                <div className="ov-card purple">
                  <div className="ov-icon">🎯</div>
                  <div className="ov-info">
                    <span className="ov-value">R$ {overviewStats.avgTicket.toFixed(2)}</span>
                    <span className="ov-label">Ticket médio</span>
                  </div>
                  <div className="ov-sub">Por venda confirmada</div>
                </div>

                <div className="ov-card split">
                  <div className="ov-split-item delivered">
                    <span className="ov-split-value">{overviewStats.delivered}</span>
                    <span className="ov-split-label">✅ Entregues</span>
                  </div>
                  <div className="ov-split-divider" />
                  <div className="ov-split-item cancelled">
                    <span className="ov-split-value">{overviewStats.cancelled}</span>
                    <span className="ov-split-label">❌ Cancelados</span>
                  </div>
                </div>

                <div className="ov-card split">
                  <div className="ov-split-item delivered">
                    <span className="ov-split-value">{overviewStats.presencial}</span>
                    <span className="ov-split-label">Presencial</span>
                  </div>
                  <div className="ov-split-divider" />
                  <div className="ov-split-item">
                    <span className="ov-split-value">{overviewStats.online}</span>
                    <span className="ov-split-label">Online</span>
                  </div>
                </div>

                {overviewStats.pendingTotal > 0 && (
                  <div className="ov-card orange">
                    <div className="ov-icon">⏳</div>
                    <div className="ov-info">
                      <span className="ov-value">R$ {overviewStats.pendingTotal.toFixed(2)}</span>
                      <span className="ov-label">A receber</span>
                    </div>
                    <div className="ov-sub">Valores pendentes de cobrança</div>
                  </div>
                )}
              </div>

              {/* Produtos mais vendidos */}
              <h2 className="stats-section-title" style={{marginTop: '32px'}}>Produtos Mais Vendidos</h2>
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

              {/* Histórico por dia */}
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
                              </div>
                              <div className="daily-order-meta">
                                <span className="daily-order-type">
                                  {b.sale_type === 'online' ? 'Online' : 'Presencial'}
                                </span>
                                <span className="daily-order-time">
                                  {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
