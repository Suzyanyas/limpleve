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
          total,
          payment_method,
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
// ESTATÍSTICAS
// ============================================

export const getOverviewStats = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [budgetsRes, itemsRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('id, total, status, created_at'),
      supabase
        .from('budget_items')
        .select('product_name, quantity, total_price')
    ]);

    if (budgetsRes.error) throw budgetsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const budgets = budgetsRes.data || [];
    const items = itemsRes.data || [];

    // Orçamentos do mês
    const monthBudgets = budgets.filter(b => b.created_at >= startOfMonth);
    const weekBudgets = budgets.filter(b => b.created_at >= startOfWeek);

    // Faturamento total (todos os tempos)
    const totalRevenue = budgets.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);

    // Faturamento do mês
    const monthRevenue = monthBudgets.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);

    // Ticket médio (pedidos que não foram cancelados)
    const validBudgets = budgets.filter(b => b.status !== 'cancelled');
    const avgTicket = validBudgets.length > 0
      ? validBudgets.reduce((sum, b) => sum + parseFloat(b.total || 0), 0) / validBudgets.length
      : 0;

    // Entregues vs cancelados
    const delivered = budgets.filter(b => b.status === 'delivered').length;
    const cancelled = budgets.filter(b => b.status === 'cancelled').length;

    // Produtos mais vendidos
    const productMap = {};
    items.forEach(item => {
      const name = item.product_name;
      if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
      productMap[name].qty += parseInt(item.quantity || 0);
      productMap[name].revenue += parseFloat(item.total_price || 0);
    });
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      monthCount: monthBudgets.length,
      weekCount: weekBudgets.length,
      totalRevenue,
      monthRevenue,
      avgTicket,
      delivered,
      cancelled,
      topProducts
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
};
