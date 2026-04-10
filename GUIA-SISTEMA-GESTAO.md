# 📋 Guia do Sistema de Gestão Limp Leve

## 🎯 Visão Geral

O sistema de gestão foi desenvolvido com base na imagem fornecida e inclui **TODAS** as funcionalidades mostradas:

### ✅ Funcionalidades Implementadas

1. **📋 Orçamentos**
   - Criar novos orçamentos
   - Selecionar clientes (ou criar novos)
   - Adicionar produtos com quantidade e valores
   - Calcular total automaticamente
   - Gerar orçamento
   - Gerar romaneio

2. **📦 Separação**
   - Visualizar pedidos para separar
   - Marcar como separado
   - Status visual (check verde quando separado)

3. **📍 Rotas de Entrega**
   - Próximas rotas (vermelho)
   - Em rota (verde)
   - Concluídas
   - Controle de status

4. **📄 Romaneio**
   - Visualização do pedido completo
   - Data, cliente e código
   - Lista de produtos
   - Endereço editável
   - Valor final
   - Forma de pagamento
   - Botão de impressão
   - Criação de rota

## 🚀 Como Usar

### 1️⃣ Configurar o Banco de Dados (IMPORTANTE!)

Antes de usar o sistema, você precisa executar o script SQL no Supabase:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. **Copie TODO o conteúdo do arquivo `supabase-schema.sql`**
6. Cole no editor SQL
7. Clique em **Run** (ou pressione Ctrl+Enter)
8. Aguarde a confirmação "Success"

### 2️⃣ Acessar o Sistema de Gestão

1. Abra o Painel Administrativo do seu site
2. Clique na aba **🏢 Gestão**
3. Você verá a tela principal com 3 cards:
   - Orçamentos
   - Separação
   - Rota

### 3️⃣ Criar um Orçamento

1. Clique no card **Orçamentos** ou no botão **+**
2. Digite o nome do cliente no campo "Cliente"
   - Se o cliente já existir, selecione da lista
   - Para criar novo cliente, clique em **+ Novo Cliente**
3. Adicione produtos:
   - Digite o nome do produto
   - Selecione da lista
   - Ajuste a quantidade
   - Clique no botão **+** para adicionar
4. Repita o passo 3 para cada produto
5. O total será calculado automaticamente
6. Clique em **Gerar orçamento**

### 4️⃣ Gerar Romaneio

Após criar o orçamento, você pode gerar o romaneio:

1. Clique em **Romaneio** (ou o orçamento já abrirá nesta tela)
2. Visualize todos os dados do pedido
3. Edite o endereço de entrega (clique no campo)
4. Edite a forma de pagamento
5. Clique em **Imprimir** para imprimir o romaneio
6. Clique em **Criar Rota** para adicionar à rota de entrega

### 5️⃣ Separação de Pedidos

1. Vá para o card **Separação** (no dashboard principal)
2. Veja a lista de pedidos pendentes
3. Para separar um pedido, clique em **Separar**
4. O pedido ficará com check verde ✓
5. Para desfazer, clique em **Desfazer**

### 6️⃣ Gestão de Rotas

1. Vá para o card **Rota** (no dashboard principal)
2. Visualize as rotas:
   - **🔴 Próxima rota**: Rotas pendentes
   - **🟢 Em rota**: Rotas em andamento
   - **✅ Concluídas**: Rotas entregues
3. Para iniciar uma rota, clique em **Iniciar**
4. Para concluir, clique em **✓ Concluir**
5. Para cancelar, clique em **✕**

## 📊 Fluxo Completo de Trabalho

```
1. Criar Orçamento
   ↓
2. Gerar Romaneio
   ↓
3. Criar Rota
   ↓
4. Separar Pedido
   ↓
5. Iniciar Rota
   ↓
6. Concluir Entrega
```

## 🎨 Visual do Sistema

O sistema foi desenvolvido seguindo EXATAMENTE o design da imagem:

- **Cores**: Azul principal com gradientes laranja/pêssego para os cards
- **Logo**: "Limp Leve On line"
- **Cards**: Arredondados com sombras
- **Botões**: Modernos e responsivos
- **Ícones**: Intuitivos para cada função

## ⚙️ Estrutura do Banco de Dados

O sistema cria as seguintes tabelas no Supabase:

1. **customers** - Clientes
2. **budgets** - Orçamentos/Pedidos
3. **budget_items** - Itens do orçamento
4. **picking** - Ordens de separação
5. **delivery_routes** - Rotas de entrega

## 🔐 Segurança

- Todas as tabelas têm Row Level Security (RLS) ativado
- Leitura pública permitida
- Modificações apenas para usuários autenticados

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop
- Tablet
- Celular

## 🖨️ Impressão

O romaneio possui estilo de impressão otimizado:
- Remove botões e elementos de navegação
- Mantém apenas informações essenciais
- Formato limpo para impressão

## 💡 Dicas

1. **Sempre execute o script SQL antes de usar** - Sem isso, o sistema não funcionará
2. **Crie alguns clientes de teste primeiro** - Facilita testar o sistema
3. **Use o código do cliente para identificação rápida** - Ex: "D.Ivonete 6789"
4. **Imprima o romaneio antes da entrega** - Documento importante
5. **Atualize o status das rotas em tempo real** - Facilita o controle

## ❓ Resolução de Problemas

### "Erro ao carregar dados"
- Verifique se executou o script SQL no Supabase
- Confirme se as variáveis de ambiente estão configuradas

### "Cliente não aparece na lista"
- Cadastre um novo cliente primeiro
- Verifique se há clientes no banco

### "Produtos não aparecem"
- Certifique-se de ter produtos cadastrados na aba "Produtos"
- Verifique se os produtos estão marcados como disponíveis

## 📞 Suporte

Para qualquer dúvida ou problema, entre em contato com o desenvolvedor.

---

**Sistema desenvolvido especialmente para Limp Leve** 🧼✨
