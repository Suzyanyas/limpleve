import { supabase } from '../supabaseClient';

// Buscar todos os produtos
export const getAllProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
};

// Buscar produtos por categoria
export const getProductsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('category', category)
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar produtos por categoria:', error);
    return [];
  }
};

// Buscar produtos disponíveis
export const getAvailableProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('isAvailable', true)
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar produtos disponíveis:', error);
    return [];
  }
};

// Calcula o próximo id inteiro disponível (não reaproveita as posições
// decimais entre produtos, apenas continua a sequência no topo da lista)
export const getNextProductId = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw error;
    const maxId = data?.[0]?.id ?? 0;
    return Math.floor(maxId) + 1;
  } catch (error) {
    console.error('Erro ao calcular próximo id de produto:', error);
    return null;
  }
};

// Criar novo produto
export const createProduct = async (product) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return { success: false, error };
  }
};

// Atualizar produto
export const updateProduct = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return { success: false, error };
  }
};

// Deletar produto
export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    return { success: false, error };
  }
};

// Alterar disponibilidade do produto
export const toggleProductAvailability = async (id, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ isAvailable })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao alterar disponibilidade:', error);
    return { success: false, error };
  }
};
