-- SQL para criar a tabela de produtos no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id DECIMAL PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  fragrances JSONB,
  isAvailable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_isAvailable ON products(isAvailable);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Habilitar Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública (todos podem ver os produtos)
CREATE POLICY "Permitir leitura pública" ON products
  FOR SELECT
  USING (true);

-- Política: Permitir inserção apenas para usuários autenticados
CREATE POLICY "Permitir inserção autenticada" ON products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir atualização apenas para usuários autenticados
CREATE POLICY "Permitir atualização autenticada" ON products
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir deleção apenas para usuários autenticados
CREATE POLICY "Permitir deleção autenticada" ON products
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Criar função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE products IS 'Tabela de produtos do e-commerce';
COMMENT ON COLUMN products.id IS 'ID único do produto';
COMMENT ON COLUMN products.name IS 'Nome do produto';
COMMENT ON COLUMN products.image IS 'URL da imagem do produto';
COMMENT ON COLUMN products.rating IS 'Avaliação do produto (1-5)';
COMMENT ON COLUMN products.price IS 'Preço do produto';
COMMENT ON COLUMN products.category IS 'Categoria do produto';
COMMENT ON COLUMN products.fragrances IS 'Array de fragrâncias disponíveis (JSON)';
COMMENT ON COLUMN products.isAvailable IS 'Indica se o produto está disponível para venda';

-- ============================================
-- TABELAS DO SISTEMA DE GESTÃO
-- ============================================

-- Criar tabela de clientes
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

-- Criar tabela de orçamentos/pedidos
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

-- Criar tabela de itens do orçamento
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  product_id DECIMAL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL, -- Nome para exibição rápida
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para itens do orçamento
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_product_id ON budget_items(product_id);

-- Criar tabela de separação
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

-- Criar tabela de rotas
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

-- Habilitar RLS para todas as novas tabelas
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- Políticas para customers
CREATE POLICY "Permitir leitura pública de customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de customers" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de customers" ON customers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de customers" ON customers FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para budgets
CREATE POLICY "Permitir leitura pública de budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de budgets" ON budgets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de budgets" ON budgets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de budgets" ON budgets FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para budget_items
CREATE POLICY "Permitir leitura pública de budget_items" ON budget_items FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de budget_items" ON budget_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de budget_items" ON budget_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de budget_items" ON budget_items FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para picking
CREATE POLICY "Permitir leitura pública de picking" ON picking FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de picking" ON picking FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de picking" ON picking FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de picking" ON picking FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para delivery_routes
CREATE POLICY "Permitir leitura pública de delivery_routes" ON delivery_routes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção autenticada de delivery_routes" ON delivery_routes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização autenticada de delivery_routes" ON delivery_routes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir deleção autenticada de delivery_routes" ON delivery_routes FOR DELETE USING (auth.role() = 'authenticated');

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_picking_updated_at BEFORE UPDATE ON picking
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
