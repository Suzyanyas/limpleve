import { useState, useEffect, useRef } from 'react';
import { FaClipboardList, FaPlus, FaBars, FaRegSquare, FaMapMarkerAlt, FaCircle, FaCheck, FaGlobe, FaStore } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getTodayBudgets,
  getTodayDeliveryRoutes,
  getBudgetById
} from '../services/managementService';
import BudgetManager from './BudgetManager';
import RouteManager from './RouteManager';
import './ManagementDashboard.css';

export default function ManagementDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [budgets, setBudgets] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [newBudgetSaleType, setNewBudgetSaleType] = useState(null);
  const [budgetNavCount, setBudgetNavCount] = useState(0);
  const sectionRef = useRef(null);

  // Lê estado da URL
  const activeView = searchParams.get('view') || 'dashboard';
  const openNewBudget = searchParams.get('new') === 'true';
  const budgetId = searchParams.get('budgetId');

  useEffect(() => {
    loadData();
  }, []);

  // Timer de meia-noite: recarrega os dados quando vira o dia
  useEffect(() => {
    const scheduleRefresh = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const ms = midnight - now;
      return setTimeout(() => {
        loadData();
        scheduleRefresh();
      }, ms);
    };
    const timer = scheduleRefresh();
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando a view muda para budgets com budgetId, carrega o orçamento
  useEffect(() => {
    if (activeView === 'budgets' && budgetId) {
      const found = budgets.find(b => b.id === budgetId);
      if (found) {
        setSelectedBudget(found);
      } else {
        getBudgetById(budgetId).then(b => { if (b) setSelectedBudget(b); });
      }
    } else if (activeView !== 'budgets') {
      setSelectedBudget(null);
    }
  }, [activeView, budgetId, budgets]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, routesData] = await Promise.all([
        getTodayBudgets(),
        getTodayDeliveryRoutes()
      ]);

      setBudgets(budgetsData);
      setRoutes(routesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const smoothScroll = (targetY, duration = 600) => {
    const start = window.scrollY;
    const distance = targetY - start;
    let startTime = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const handleCardClick = (view, budget = null, isNew = false, saleType = null) => {
    const params = { view };
    if (isNew) params.new = 'true';
    if (budget?.id) params.budgetId = budget.id;
    setSelectedBudget(budget);
    setNewBudgetSaleType(saleType);
    if (view === 'budgets') setBudgetNavCount(c => c + 1);
    setSearchParams(params, { replace: false });
    setTimeout(() => {
      if (sectionRef.current) {
        const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 16;
        smoothScroll(top, 700);
      }
    }, 60);
  };

  const handleBack = () => {
    setSelectedBudget(null);
    setSearchParams({}, { replace: true });
    loadData();
    smoothScroll(0, 600);
  };

  // Filtrar orçamentos por status
  const draftBudgets = budgets.filter(b => b.status === 'draft' || b.status === 'confirmed');
  const onlineBudgets = draftBudgets.filter(b => (b.sale_type || 'presencial') === 'online');
  const presencialBudgets = draftBudgets.filter(b => (b.sale_type || 'presencial') === 'presencial');
  const routesNext = routes.filter(r => r.status === 'next');
  const routesInProgress = routes.filter(r => r.status === 'in_progress');

  // Orçamento inicial para o BudgetManager
  const initialBudget = budgetId ? selectedBudget : null;

  return (
    <div className="management-dashboard">
      <div className="dashboard-cards">
        {/* Card de Orçamentos Online */}
        <div className="dashboard-card budgets-online-card" onClick={() => handleCardClick('budgets', null, true, 'online')}>
          <div className="card-header">
            <h3>
              <span className="card-title-text">
                <FaClipboardList className="icon" />
                Orçamentos
              </span>
              <span className="card-type-badge">
                Online
                <FaGlobe />
              </span>
            </h3>
            <div className="card-header-actions">
              <button
                className="btn-new"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, true, 'online'); }}
                title="Novo orçamento online"
              >
                <FaPlus className="plus-icon" />
              </button>
              <button
                className="btn-expand"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, false); }}
                title="Ver lista"
              >
                <FaBars />
              </button>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : onlineBudgets.length === 0 ? (
              <div className="empty-state">Nenhum orçamento</div>
            ) : (
              <ul className="items-list">
                {onlineBudgets.map(budget => (
                  <li
                    key={budget.id}
                    className="item"
                    onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', budget); }}
                  >
                    <FaRegSquare className="checkbox" />
                    <span className="item-name" title={budget.customer_name}>{budget.customer_name}</span>
                    {budget.total != null && (
                      <span className="item-total">
                        R$ {parseFloat(budget.total).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    {budget.payment_status === 'a_receber' && (
                      <span className="item-badge-areceber">A receber</span>
                    )}
                    {budget.payment_status === 'parcial' && (
                      <span className="item-badge-parcial">Parcial</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Card de Orçamentos Presencial */}
        <div className="dashboard-card budgets-presencial-card" onClick={() => handleCardClick('budgets', null, true, 'presencial')}>
          <div className="card-header">
            <h3>
              <span className="card-title-text">
                <FaClipboardList className="icon" />
                Orçamentos
              </span>
              <span className="card-type-badge">
                Presencial
                <FaStore />
              </span>
            </h3>
            <div className="card-header-actions">
              <button
                className="btn-new"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, true, 'presencial'); }}
                title="Novo orçamento presencial"
              >
                <FaPlus className="plus-icon" />
              </button>
              <button
                className="btn-expand"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, false); }}
                title="Ver lista"
              >
                <FaBars />
              </button>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : presencialBudgets.length === 0 ? (
              <div className="empty-state">Nenhum orçamento</div>
            ) : (
              <ul className="items-list">
                {presencialBudgets.map(budget => (
                  <li
                    key={budget.id}
                    className="item"
                    onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', budget); }}
                  >
                    <FaRegSquare className="checkbox" />
                    <span className="item-name" title={budget.customer_name}>{budget.customer_name}</span>
                    {budget.total != null && (
                      <span className="item-total">
                        R$ {parseFloat(budget.total).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    {budget.payment_status === 'a_receber' && (
                      <span className="item-badge-areceber">A receber</span>
                    )}
                    {budget.payment_status === 'parcial' && (
                      <span className="item-badge-parcial">Parcial</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Card de Rotas */}
        <div className="dashboard-card routes-card" onClick={() => handleCardClick('routes')}>
          <div className="card-header">
            <h3>
              <FaMapMarkerAlt className="icon" />
              Rota
            </h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : routes.length === 0 ? (
              <div className="empty-state">Nenhuma rota</div>
            ) : (
              <div className="routes-lists">
                {routesNext.length > 0 && (
                  <div className="route-section">
                    <h4 className="route-status next">
                      <FaCircle className="status-icon" style={{ color: '#e53e3e' }} />
                      Próxima rota
                    </h4>
                    <ul className="items-list">
                      {routesNext.map(route => (
                        <li
                          key={route.id}
                          className="item"
                          onClick={() => handleCardClick('routes')}
                        >
                          <span className="item-name">
                            {route.customer_name}
                            {route.budgets?.sale_type === 'online' && (
                              <span style={{ marginLeft: '6px', background: 'rgba(30,90,180,0.5)', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>Online</span>
                            )}
                            {route.budgets?.sale_type === 'presencial' && (
                              <span style={{ marginLeft: '6px', background: 'rgba(76,175,80,0.4)', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>Presencial</span>
                            )}
                          </span>
                          <span className="status-badge next">⏱️</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {routesInProgress.length > 0 && (
                  <div className="route-section">
                    <h4 className="route-status in-progress">
                      <FaCircle className="status-icon" style={{ color: '#38a169' }} />
                      Em rota
                    </h4>
                    <ul className="items-list">
                      {routesInProgress.map(route => (
                        <li
                          key={route.id}
                          className="item"
                          onClick={() => handleCardClick('routes')}
                        >
                          <span className="item-name">
                            {route.customer_name}
                            {route.budgets?.sale_type === 'online' && (
                              <span style={{ marginLeft: '6px', background: 'rgba(30,90,180,0.5)', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>Online</span>
                            )}
                            {route.budgets?.sale_type === 'presencial' && (
                              <span style={{ marginLeft: '6px', background: 'rgba(76,175,80,0.4)', borderRadius: '20px', padding: '2px 7px', fontSize: '11px' }}>Presencial</span>
                            )}
                          </span>
                          <FaCheck className="status-badge success" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seções deslizantes abaixo dos cards */}
      {activeView !== 'dashboard' && (
        <div ref={sectionRef} className="inline-section">
          {activeView === 'budgets' && (
            <BudgetManager
              key={`budgets-${openNewBudget}-${budgetId ?? 'new'}-${newBudgetSaleType ?? 'none'}-${budgetNavCount}`}
              onBack={handleBack}
              initialBudget={initialBudget}
              openNew={openNewBudget}
              initialSaleType={newBudgetSaleType}
              onUpdate={loadData}
              onApproved={handleBack}
            />
          )}
          {activeView === 'routes' && (
            <RouteManager onBack={handleBack} onUpdate={loadData} />
          )}
        </div>
      )}
    </div>
  );
}
