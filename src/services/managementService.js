import { supabase } from '../supabaseClient';

// ============================================
// CLIENTES
// ============================================

export const getAllCustomers = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }
};

export const getCustomerByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }
};

export const createCustomer = async (customerData) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return { success: false, error };
  }
};

export const updateCustomer = async (id, customerData) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return { success: false, error };
  }
};

export const deleteCustomer = async (id) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    return { success: false, error };
  }
};

// ============================================
// ORÇAMENTOS
// ============================================

export const getAllBudgets = async () => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    return [];
  }
};

export const getBudgetById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price
        ),
        customers (
          id,
          name,
          whatsapp,
          phone
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    return null;
  }
};

export const createBudget = async (budgetData, items) => {
  try {
    // Criar o orçamento
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .insert([budgetData])
      .select()
      .single();
    
    if (budgetError) throw budgetError;

    // Adicionar os itens do orçamento
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        budget_id: budget.id
      }));

      const { error: itemsError } = await supabase
        .from('budget_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }

    return { success: true, data: budget };
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    return { success: false, error };
  }
};


export const deleteBudget = async (id) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    return { success: false, error };
  }
};

// ============================================
// ITENS DO ORÇAMENTO
// ============================================

export const addBudgetItem = async (itemData) => {
  try {
    const { data, error } = await supabase
      .from('budget_items')
      .insert([itemData])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao adicionar item ao orçamento:', error);
    return { success: false, error };
  }
};

export const updateBudgetItem = async (id, itemData) => {
  try {
    const { data, error } = await supabase
      .from('budget_items')
      .update(itemData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao atualizar item do orçamento:', error);
    return { success: false, error };
  }
};

export const deleteBudgetItem = async (id) => {
  try {
    const { error } = await supabase
      .from('budget_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar item do orçamento:', error);
    return { success: false, error };
  }
};

// ============================================
// SEPARAÇÃO
// ============================================

export const getAllPickingOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('picking')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar ordens de separação:', error);
    return [];
  }
};

export const createPickingOrder = async (pickingData) => {
  try {
    const { data, error } = await supabase
      .from('picking')
      .insert([pickingData])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao criar ordem de separação:', error);
    return { success: false, error };
  }
};

export const updatePickingStatus = async (id, status, pickedBy = null) => {
  try {
    const updateData = { status };
    if (status === 'picked') {
      updateData.picked_at = new Date().toISOString();
      if (pickedBy) updateData.picked_by = pickedBy;
    }

    const { data, error } = await supabase
      .from('picking')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao atualizar status de separação:', error);
    return { success: false, error };
  }
};

export const deletePickingOrder = async (id) => {
  try {
    const { error } = await supabase
      .from('picking')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir separação:', error);
    return { success: false, error };
  }
};

export const updatePickingOrder = async (id, fields) => {
  try {
    const { data, error } = await supabase
      .from('picking')
      .update(fields)
      .eq('id', id)
      .select();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar separação:', error);
    return { success: false, error };
  }
};

export const createPickingAudit = async (auditData) => {
  try {
    const { error } = await supabase
      .from('picking_audit')
      .insert([auditData]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao gravar auditoria:', error);
    return { success: false, error };
  }
};

// ============================================
// ROTAS DE ENTREGA
// ============================================

export const getAllDeliveryRoutes = async () => {
  try {
    const { data, error } = await supabase
      .from('delivery_routes')
      .select(`
        *,
        budgets (
          id,
          total,
          payment_method,
          payment_status,
          entrada_valor,
          delivery_address,
          budget_items (
            product_name,
            quantity,
            unit_price,
            total_price
          ),
          customers (
            whatsapp
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar rotas de entrega:', error);
    return [];
  }
};

export const createDeliveryRoute = async (routeData) => {
  try {
    const { data, error } = await supabase
      .from('delivery_routes')
      .insert([routeData])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao criar rota de entrega:', error);
    return { success: false, error };
  }
};

export const updateDeliveryRouteStatus = async (id, status) => {
  try {
    const updateData = { status };
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('delivery_routes')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao atualizar status da rota:', error);
    return { success: false, error };
  }
};

export const updateDeliveryRoute = async (id, routeData) => {
  try {
    const { data, error } = await supabase
      .from('delivery_routes')
      .update(routeData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    return { success: false, error };
  }
};

export const deleteDeliveryRoute = async (id) => {
  try {
    const { error } = await supabase
      .from('delivery_routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar rota:', error);
    return { success: false, error };
  }
};

export const updateBudget = async (budgetId, budgetData, items) => {
  try {
    const { error: budgetError } = await supabase
      .from('budgets')
      .update(budgetData)
      .eq('id', budgetId);

    if (budgetError) throw budgetError;

    // Apaga itens antigos e insere os novos
    const { error: deleteError } = await supabase
      .from('budget_items')
      .delete()
      .eq('budget_id', budgetId);

    if (deleteError) throw deleteError;

    const itemsToInsert = items.map(item => ({ ...item, budget_id: budgetId }));
    const { error: itemsError } = await supabase
      .from('budget_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
    return { success: false, error };
  }
};

export const updateBudgetStatus = async (budgetId, status) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .update({ status })
      .eq('id', budgetId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    return { success: false, error };
  }
};

// ============================================
// HISTÓRICO DIÁRIO (para o dashboard)
// ============================================

export const getDailyHistory = async (days = 30) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('budgets')
      .select(`
        id, customer_name, total, status, sale_type, payment_status, created_at,
        budget_items(product_name, quantity, total_price)
      `)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupa por data local
    const grouped = {};
    (data || []).forEach(b => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { date: key, budgets: [], revenue: 0, count: 0, cancelled: 0 };
      grouped[key].budgets.push(b);
      if (b.status === 'cancelled') {
        grouped[key].cancelled++;
      } else {
        grouped[key].revenue += parseFloat(b.total || 0);
        grouped[key].count++;
      }
    });

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Erro ao buscar histórico diário:', error);
    return [];
  }
};

// ============================================
// FILTROS DO DIA (limpeza automática à meia-noite)
// ============================================

const getTodayStart = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export const getTodayBudgets = async () => {
  const all = await getAllBudgets();
  const todayStart = getTodayStart();
  return all.filter(b =>
    new Date(b.created_at) >= todayStart &&
    b.status !== 'delivered' &&
    b.status !== 'cancelled'
  );
};

export const getTodayPickingOrders = async () => {
  const [allPicking, allRoutes] = await Promise.all([
    getAllPickingOrders(),
    getAllDeliveryRoutes()
  ]);
  const todayStart = getTodayStart();
  // Remove separações cujo orçamento já foi entregue
  const deliveredBudgetIds = new Set(
    allRoutes
      .filter(r => r.status === 'delivered')
      .map(r => r.budget_id)
      .filter(Boolean)
  );
  return allPicking
    .filter(p => new Date(p.created_at) >= todayStart)
    .filter(p => !p.budget_id || !deliveredBudgetIds.has(p.budget_id));
};

export const getTodayDeliveryRoutes = async () => {
  const all = await getAllDeliveryRoutes();
  const todayStart = getTodayStart();
  return all.filter(r =>
    new Date(r.created_at) >= todayStart &&
    r.status !== 'delivered' &&
    r.status !== 'cancelled'
  );
};

// ============================================
// ESTATÍSTICAS
// ============================================

export const getOverviewStats = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [budgetsRes, routesRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('id, total, status, created_at, sale_type, payment_status, entrada_valor, budget_items(product_name, quantity, total_price)'),
      supabase
        .from('delivery_routes')
        .select('id, status, budget_id')
    ]);

    if (budgetsRes.error) throw budgetsRes.error;

    const budgets = budgetsRes.data || [];
    const routes = routesRes.data || [];

    // Apenas vendas confirmadas (exclui rascunhos e cancelados)
    const sales = budgets.filter(b => b.status === 'confirmed' || b.status === 'delivered');
    const monthSales = sales.filter(b => b.created_at >= startOfMonth);
    const weekSales = sales.filter(b => b.created_at >= startOfWeek);

    // Faturamento (apenas vendas confirmadas)
    const totalRevenue = sales.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
    const monthRevenue = monthSales.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);

    // Ticket médio
    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    // Entregues = rotas com status delivered
    const delivered = routes.filter(r => r.status === 'delivered').length;
    const cancelled = budgets.filter(b => b.status === 'cancelled').length;

    // Breakdown presencial vs online
    const presencial = sales.filter(b => b.sale_type === 'presencial' || !b.sale_type).length;
    const online = sales.filter(b => b.sale_type === 'online').length;

    // A receber: soma dos valores pendentes
    const aReceberTotal = sales
      .filter(b => b.payment_status === 'a_receber')
      .reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
    const parcialTotal = sales
      .filter(b => b.payment_status === 'parcial')
      .reduce((sum, b) => sum + Math.max(0, parseFloat(b.total || 0) - parseFloat(b.entrada_valor || 0)), 0);
    const pendingTotal = aReceberTotal + parcialTotal;

    // Produtos mais vendidos (de vendas confirmadas, itens já vêm junto com o budget)
    const productMap = {};
    sales.forEach(b => {
      (b.budget_items || []).forEach(item => {
        const name = item.product_name;
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
        productMap[name].qty += parseInt(item.quantity || 0);
        productMap[name].revenue += parseFloat(item.total_price || 0);
      });
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      monthCount: monthSales.length,
      weekCount: weekSales.length,
      totalRevenue,
      monthRevenue,
      avgTicket,
      delivered,
      cancelled,
      presencial,
      online,
      pendingTotal,
      topProducts
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
};

// ============================================
// CAIXA
// ============================================

export const getOpenSession = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'aberto')
      .eq('data', today)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar sessão aberta:', error);
    return null;
  }
};

export const openCashSession = async (turno, saldo_inicial, saldo_inicial_detalhes) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert([{ turno, data: today, saldo_inicial, saldo_inicial_detalhes, status: 'aberto' }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    return { success: false, error };
  }
};

export const closeCashSession = async (sessionId, saldo_final) => {
  try {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ status: 'fechado', saldo_final, closed_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    return { success: false, error };
  }
};

export const getSessionTransactions = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return [];
  }
};

export const createCashTransaction = async (transaction) => {
  try {
    const { data, error } = await supabase
      .from('cash_transactions')
      .insert([transaction])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return { success: false, error };
  }
};

export const getTodaySessions = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('data', today)
      .order('opened_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar sessões do dia:', error);
    return [];
  }
};

export const deleteCashTransaction = async (id) => {
  try {
    const { error } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    return { success: false, error };
  }
};

export const getTodayTransactions = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('*, cash_sessions(data)')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar transações do dia:', error);
    return [];
  }
};

// ============================================
// CONFIGURAÇÕES (PIN)
// ============================================

export const getAppPin = async () => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'admin_pin')
      .maybeSingle();
    if (error) throw error;
    return data?.value || null;
  } catch (error) {
    console.error('Erro ao buscar PIN:', error);
    return null;
  }
};

export const setAppPin = async (pin) => {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'admin_pin', value: pin }, { onConflict: 'key' });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar PIN:', error);
    return { success: false, error };
  }
};
