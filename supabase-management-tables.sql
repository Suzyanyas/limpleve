-- ============================================
-- TABELAS DO SISTEMA DE GESTÃO LIMPLEVE ONLINE
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar função para atualizar automaticamente o campo updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TABELA DE CLIENTES
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE, -- Ex: "D.Ivonete 6789"
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para clientes
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Permitir leitura pública de customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de customers" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de customers" ON customers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de customers" ON customers FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- TABELA DE ORÇAMENTOS/PEDIDOS
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL, -- Nome para exibição rápida
  customer_code TEXT, -- Código para exibição rápida
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, confirmed, picking, ready, in_route, delivered, cancelled
  payment_method TEXT,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para orçamentos
CREATE INDEX IF NOT EXISTS idx_budgets_customer_id ON budgets(customer_id);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON budgets(created_at DESC);

-- Habilitar RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Políticas para budgets
CREATE POLICY "Permitir leitura pública de budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de budgets" ON budgets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de budgets" ON budgets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de budgets" ON budgets FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- TABELA DE ITENS DO ORÇAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  product_id DECIMAL, -- Referência flexível aos produtos
  product_name TEXT NOT NULL, -- Nome para exibição rápida
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para itens do orçamento
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_product_id ON budget_items(product_id);

-- Habilitar RLS
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Políticas para budget_items
CREATE POLICY "Permitir leitura pública de budget_items" ON budget_items FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de budget_items" ON budget_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de budget_items" ON budget_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de budget_items" ON budget_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- TABELA DE SEPARAÇÃO
-- ============================================

CREATE TABLE IF NOT EXISTS picking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, picked, ready
  picked_at TIMESTAMP WITH TIME ZONE,
  picked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para separação
CREATE INDEX IF NOT EXISTS idx_picking_budget_id ON picking(budget_id);
CREATE INDEX IF NOT EXISTS idx_picking_status ON picking(status);

-- Habilitar RLS
ALTER TABLE picking ENABLE ROW LEVEL SECURITY;

-- Políticas para picking
CREATE POLICY "Permitir leitura pública de picking" ON picking FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de picking" ON picking FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de picking" ON picking FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de picking" ON picking FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_picking_updated_at BEFORE UPDATE ON picking
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- TABELA DE ROTAS DE ENTREGA
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'next', -- next, in_progress, delivered, cancelled
  delivery_date DATE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  driver_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para rotas
CREATE INDEX IF NOT EXISTS idx_routes_budget_id ON delivery_routes(budget_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_delivery_date ON delivery_routes(delivery_date);

-- Habilitar RLS
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- Políticas para delivery_routes
CREATE POLICY "Permitir leitura pública de delivery_routes" ON delivery_routes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de delivery_routes" ON delivery_routes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de delivery_routes" ON delivery_routes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de delivery_routes" ON delivery_routes FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- SCRIPT COMPLETO!
-- ============================================
-- Agora você tem as 5 novas tabelas:
-- 1. customers - Clientes
-- 2. budgets - Orçamentos/Pedidos
-- 3. budget_items - Itens dos orçamentos
-- 4. picking - Separação de pedidos
-- 5. delivery_routes - Rotas de entrega
-- ============================================
