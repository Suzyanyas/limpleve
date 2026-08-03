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

export const getDeliveryRoutesByDate = async (date) => {
  try {
    const start = `${date}T00:00:00-03:00`;
    const end   = `${date}T23:59:59.999-03:00`;

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
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar rotas por data:', error);
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

export const updateBudgetPaymentStatus = async (budgetId, paymentStatus) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .update({ payment_status: paymentStatus })
      .eq('id', budgetId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar payment_status do orçamento:', error);
    return { success: false, error };
  }
};

export const updateBudgetManterOrcamento = async (budgetId, manterOrcamento) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .update({ manter_orcamento: manterOrcamento })
      .eq('id', budgetId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar manter_orcamento do orçamento:', error);
    return { success: false, error };
  }
};

// ============================================
// HISTÓRICO DIÁRIO (para o dashboard)
// ============================================

// Extrai a chave 'YYYY-MM-DD' de uma data no calendário de São Paulo, independente
// do fuso horário configurado no navegador/sistema de quem está com o painel aberto.
const spDateKey = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(date);

const ceFortaleza = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

export const getDailyHistory = async (days = 30) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('budgets')
      .select(`
        id, customer_name, total, status, sale_type, payment_status, payment_method, entrada_valor, created_at,
        budget_items(product_name, quantity, total_price)
      `)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupa por data no calendário de São Paulo (independente do fuso do navegador)
    const grouped = {};
    (data || []).forEach(b => {
      const key = spDateKey(new Date(b.created_at));
      if (!grouped[key]) grouped[key] = { date: key, budgets: [], revenue: 0, count: 0, cancelled: 0, aReceber: 0, recebido: 0 };
      grouped[key].budgets.push(b);
      if (b.status === 'cancelled') {
        grouped[key].cancelled++;
      } else if (b.status !== 'draft') {
        grouped[key].revenue += parseFloat(b.total || 0);
        grouped[key].count++;
        if (b.payment_status === 'a_receber') {
          grouped[key].aReceber += parseFloat(b.total || 0);
        }
      }
    });

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Erro ao buscar histórico diário:', error);
    return [];
  }
};

// ============================================
// RELATÓRIO DE VENDAS POR FORMA DE PAGAMENTO
// ============================================

export const PAYMENT_CATEGORIES = ['Dinheiro', 'PIX', 'Cartão', 'Boleto', 'Misto não identificado'];

// Separa uma forma_pagamento (simples ou "misto|forma:valor|...") em categorias do relatório.
// Débito e Crédito são somados como "Cartão". Se a soma das partes do misto não bater
// com o valor real da transação, a diferença cai em "Misto não identificado" (não some dinheiro).
const parseFormaPagamento = (forma, valor) => {
  const valorNum = parseFloat(valor) || 0;

  if (!forma) return [{ categoria: 'Misto não identificado', valor: valorNum }];

  if (forma.startsWith('misto|')) {
    const partes = forma.replace('misto|', '').split('|');
    const valores = { dinheiro: 0, pix: 0, cartao: 0 };
    partes.forEach(p => {
      const [chave, val] = p.split(':');
      if (chave in valores) valores[chave] = parseFloat(val) || 0;
    });

    // O campo "dinheiro" do misto guarda o valor BRUTO entregue em espécie (BudgetManager
    // permite dinheiro > parte necessária e calcula troco - ver o checador "soma > total = troco ok"
    // em BudgetManager.js). Isso pode deixar a soma das partes maior que cash_transactions.valor
    // (que é o total líquido do pedido). Esse excesso é sempre troco, e o troco só existe na
    // parte em dinheiro — por isso é ela que absorve a diferença, nunca "Misto não identificado".
    const somaPartes = valores.dinheiro + valores.pix + valores.cartao;
    const excesso = Math.max(0, somaPartes - valorNum);
    valores.dinheiro = Math.max(0, valores.dinheiro - excesso);

    const resultado = [
      { categoria: 'Dinheiro', valor: valores.dinheiro },
      { categoria: 'PIX', valor: valores.pix },
      { categoria: 'Cartão', valor: valores.cartao }
    ];

    // Sobra real: dinheiro recebido que nenhuma parte identificada cobre (ex.: soma < valor).
    // Nunca deve ficar negativo aqui — se ficar, é uma inconsistência de dados fora do troco
    // normal (ex.: troco maior que a própria parte em dinheiro), e preferimos logar a investigar
    // a esconder dinheiro do relatório.
    const somaAjustada = valores.dinheiro + valores.pix + valores.cartao;
    const sobra = valorNum - somaAjustada;
    if (sobra < -0.01) {
      console.warn('Relatório de pagamento: sobra negativa inesperada em transação misto', { forma, valor, sobra });
    }
    if (sobra > 0.01) {
      resultado.push({ categoria: 'Misto não identificado', valor: sobra });
    }
    return resultado;
  }

  const categoria = forma === 'dinheiro' ? 'Dinheiro'
    : forma === 'pix' ? 'PIX'
    : (forma === 'cartao_debito' || forma === 'cartao_credito') ? 'Cartão'
    : forma === 'boleto' ? 'Boleto'
    : 'Misto não identificado';
  return [{ categoria, valor: valorNum }];
};

// Retorna totais por forma de pagamento agrupados por dia (chave 'YYYY-MM-DD', calendário SP),
// com base no dinheiro efetivamente recebido em cash_transactions (tipo = 'venda').
export const getPaymentMethodReport = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select('id, valor, forma_pagamento, created_at, budgets(customer_name)')
      .eq('tipo', 'venda')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    if (error) throw error;

    const porDia = {};
    const mistoDetalhe = [];
    (data || []).forEach(tx => {
      const key = spDateKey(new Date(tx.created_at));
      if (!porDia[key]) {
        porDia[key] = PAYMENT_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), { date: key, total: 0 });
      }
      parseFormaPagamento(tx.forma_pagamento, tx.valor).forEach(({ categoria, valor }) => {
        porDia[key][categoria] += valor;
        porDia[key].total += valor;
        if (categoria === 'Misto não identificado' && valor > 0.01) {
          mistoDetalhe.push({
            id: tx.id,
            forma_pagamento: tx.forma_pagamento,
            valor: parseFloat(tx.valor) || 0,
            diferenca: valor,
            dateKey: key,
            created_at: tx.created_at,
            customer_name: tx.budgets?.customer_name || null
          });
        }
      });
    });

    return { porDia, mistoDetalhe };
  } catch (error) {
    console.error('Erro ao buscar relatório por forma de pagamento:', error);
    return { porDia: {}, mistoDetalhe: [] };
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
    (new Date(b.created_at) >= todayStart || b.manter_orcamento) &&
    b.status !== 'delivered' &&
    b.status !== 'cancelled'
  );
};

export const getPendingPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        id,
        customer_name,
        total,
        payment_method,
        payment_status,
        entrada_valor,
        sale_type,
        created_at,
        status,
        budget_items (
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .in('payment_status', ['a_receber', 'parcial'])
      .not('status', 'in', '("cancelled","delivered")')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error);
    return [];
  }
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
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [budgetsRes, allBudgetsRes, routesRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('id, total, status, created_at, sale_type, payment_status, entrada_valor, budget_items(product_name, quantity, total_price)')
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('budgets')
        .select('id, total, status'),
      supabase
        .from('delivery_routes')
        .select('id, status, budget_id')
    ]);

    if (budgetsRes.error) throw budgetsRes.error;
    if (allBudgetsRes.error) throw allBudgetsRes.error;

    const budgets = budgetsRes.data || [];
    const allBudgets = allBudgetsRes.data || [];
    const routes = routesRes.data || [];

    // Apenas vendas confirmadas (exclui rascunhos e cancelados)
    const sales = budgets.filter(b => b.status === 'confirmed' || b.status === 'delivered');
    const monthSales = sales.filter(b => b.created_at.startsWith(`${year}-${month}`));
    const weekSales = sales.filter(b => b.created_at >= startOfWeek);

    // Faturamento (apenas vendas confirmadas)
    const allSales = allBudgets.filter(b => b.status === 'confirmed' || b.status === 'delivered');
    const totalRevenue = allSales.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
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
    const today = ceFortaleza(new Date());
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
    const today = ceFortaleza(new Date());
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

export const closeCashSession = async (sessionId, saldo_final, saldo_final_detalhes) => {
  try {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ status: 'fechado', saldo_final, saldo_final_detalhes, closed_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    return { success: false, error };
  }
};

export const updateFundoTarde = async (sessionId, fundo_proximo_turno, fundo_proximo_turno_detalhes) => {
  try {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ fundo_proximo_turno, fundo_proximo_turno_detalhes })
      .eq('id', sessionId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar fundo de troco:', error);
    return { success: false, error };
  }
};

export const getUltimoSaldoFechado = async () => {
  try {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('saldo_final, saldo_final_detalhes')
      .eq('status', 'fechado')
      .not('saldo_final_detalhes', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar último saldo fechado:', error);
    return null;
  }
};

export const getUltimoFundoTarde = async () => {
  try {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('fundo_proximo_turno, fundo_proximo_turno_detalhes')
      .eq('turno', 'tarde')
      .eq('status', 'fechado')
      .not('fundo_proximo_turno', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar fundo de troco anterior:', error);
    return null;
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

export const confirmBudgetPayment = async ({ budgetId, valor, formaPagamento, saleType, observacao }) => {
  try {
    const session = await getOpenSession();

    const txResult = await createCashTransaction({
      session_id: session?.id || null,
      budget_id: budgetId,
      tipo: 'venda',
      valor,
      forma_pagamento: formaPagamento,
      sale_type: saleType,
      payment_status: 'pago',
      observacao,
    });
    if (!txResult.success) {
      throw new Error('falha ao registrar no caixa');
    }

    const { error } = await supabase
      .from('budgets')
      .update({ payment_status: 'pago' })
      .eq('id', budgetId);
    if (error) throw new Error('pagamento registrado no caixa, mas falha ao atualizar o orçamento');

    return { success: true, hadSession: !!session };
  } catch (error) {
    console.error('Erro ao confirmar pagamento do orçamento:', error);
    return { success: false, error: error.message || 'erro desconhecido' };
  }
};

export const getTodaySessions = async () => {
  try {
    const today = ceFortaleza(new Date());
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

export const updateCashSessionSaldoFinal = async (id, saldo_final, saldo_final_detalhes) => {
  try {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ saldo_final, saldo_final_detalhes })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar saldo final:', error);
    return { success: false, error };
  }
};

export const updateCashSessionSaldoInicial = async (id, saldo_inicial, saldo_inicial_detalhes) => {
  try {
    const { error } = await supabase
      .from('cash_sessions')
      .update({ saldo_inicial, saldo_inicial_detalhes })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar saldo inicial:', error);
    return { success: false, error };
  }
};

export const getTodayTransactions = async () => {
  try {
    const today = ceFortaleza(new Date());
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
