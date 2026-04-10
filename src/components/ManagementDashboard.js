import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getAllBudgets,
  getAllPickingOrders,
  getAllDeliveryRoutes
} from '../services/managementService';
import BudgetManager from './BudgetManager';
import PickingManager from './PickingManager';
import RouteManager from './RouteManager';
import './ManagementDashboard.css';

export default function ManagementDashboard() {
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, budgets, picking, routes
  const [budgets, setBudgets] = useState([]);
  const [pickingOrders, setPickingOrders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [openNewBudget, setOpenNewBudget] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, pickingData, routesData] = await Promise.all([
        getAllBudgets(),
        getAllPickingOrders(),
        getAllDeliveryRoutes()
      ]);

      setBudgets(budgetsData);
      setPickingOrders(pickingData);
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

  const handleCardClick = (view, budget = null, isNew = false) => {
    setActiveView(view);
    setSelectedBudget(budget);
    setOpenNewBudget(isNew);
    setTimeout(() => {
      if (sectionRef.current) {
        const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 16;
        smoothScroll(top, 700);
      }
    }, 60);
  };

  const handleBack = () => {
    setActiveView('dashboard');
    setSelectedBudget(null);
    loadData();
    smoothScroll(0, 600);
  };

  // Filtrar orçamentos por status
  const draftBudgets = budgets.filter(b => b.status === 'draft' || b.status === 'confirmed');
  const pickingPending = pickingOrders.filter(p => p.status === 'pending');
  const pickingPicked = pickingOrders.filter(p => p.status === 'picked');
  const routesNext = routes.filter(r => r.status === 'next');
  const routesInProgress = routes.filter(r => r.status === 'in_progress');

  return (
    <div className="management-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <div className="logo-container">
            <img src="/images/ONLINE.png" alt="LimpLeve Online" className="logo-img" />
          </div>
        </div>
      </div>

      <div className="dashboard-cards">
        {/* Card de Orçamentos */}
        <div className="dashboard-card budgets-card" onClick={() => handleCardClick('budgets', null, true)}>
          <div className="card-header">
            <h3>
              <span className="icon">📋</span>
              Orçamentos
            </h3>
            <div className="card-header-actions">
              <button
                className="btn-new"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, true); }}
                title="Novo orçamento"
              >
                <span className="plus-icon">+</span>
              </button>
              <button
                className="btn-expand"
                onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', null, false); }}
                title="Ver lista"
              >
                ☰
              </button>
            </div>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : draftBudgets.length === 0 ? (
              <div className="empty-state">Nenhum orçamento</div>
            ) : (
              <ul className="items-list">
                {draftBudgets.slice(0, 4).map(budget => (
                  <li
                    key={budget.id}
                    className="item"
                    onClick={(e) => { e.stopPropagation(); handleCardClick('budgets', budget); }}
                  >
                    <span className="checkbox">☐</span>
                    <span className="item-name">{budget.customer_name}</span>
                  </li>
                ))}
                {draftBudgets.length > 4 && (
                  <li className="more-items">
                    ... +{draftBudgets.length - 4} mais
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Card de Separação */}
        <div className="dashboard-card picking-card" onClick={() => handleCardClick('picking')}>
          <div className="card-header">
            <h3>
              <span className="icon">📦</span>
              Separação
            </h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : pickingOrders.length === 0 ? (
              <div className="empty-state">Nenhuma separação</div>
            ) : (
              <ul className="items-list">
                {pickingPicked.slice(0, 2).map(order => (
                  <li 
                    key={order.id} 
                    className="item picked"
                    onClick={() => handleCardClick('picking')}
                  >
                    <span className="checkbox checked">✓</span>
                    <span className="item-name">{order.customer_name}</span>
                  </li>
                ))}
                {pickingPending.slice(0, 2).map(order => (
                  <li 
                    key={order.id} 
                    className="item"
                    onClick={() => handleCardClick('picking')}
                  >
                    <span className="checkbox">☐</span>
                    <span className="item-name">{order.customer_name}</span>
                  </li>
                ))}
                {pickingOrders.length > 4 && (
                  <li className="more-items">
                    ... +{pickingOrders.length - 4} mais
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Card de Rotas */}
        <div className="dashboard-card routes-card" onClick={() => handleCardClick('routes')}>
          <div className="card-header">
            <h3>
              <span className="icon">📍</span>
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
                      <span className="status-icon">🔴</span>
                      Próxima rota
                    </h4>
                    <ul className="items-list">
                      {routesNext.slice(0, 2).map(route => (
                        <li 
                          key={route.id} 
                          className="item"
                          onClick={() => handleCardClick('routes')}
                        >
                          <span className="item-name">{route.customer_name}</span>
                          <span className="status-badge next">⏱️</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {routesInProgress.length > 0 && (
                  <div className="route-section">
                    <h4 className="route-status in-progress">
                      <span className="status-icon">🟢</span>
                      Em rota
                    </h4>
                    <ul className="items-list">
                      {routesInProgress.slice(0, 2).map(route => (
                        <li 
                          key={route.id} 
                          className="item"
                          onClick={() => handleCardClick('routes')}
                        >
                          <span className="item-name">{route.customer_name}</span>
                          <span className="status-badge success">✓</span>
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
              key={`budgets-${openNewBudget}-${selectedBudget?.id ?? 'new'}`}
              onBack={handleBack}
              initialBudget={selectedBudget}
              openNew={openNewBudget}
              onUpdate={loadData}
              onApproved={() => handleCardClick('picking')}
            />
          )}
          {activeView === 'picking' && (
            <PickingManager onBack={handleBack} onUpdate={loadData} />
          )}
          {activeView === 'routes' && (
            <RouteManager onBack={handleBack} onUpdate={loadData} />
          )}
        </div>
      )}
    </div>
  );
}
