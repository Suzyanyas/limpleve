# 📸 Como Usar o Upload de Imagens no Painel Administrativo

## 🎯 Opções Disponíveis

No formulário de adicionar/editar produtos, você tem **duas opções** para adicionar imagens:

### 1. 🔗 **URL** (Modo Padrão)
- Cole o caminho da imagem que já está na pasta `public/images/products/`
- Exemplo: `/images/products/produto-exemplo.png`
- Ideal para imagens que já estão no servidor

### 2. 📤 **Upload** (Novo!)
- Faça upload de uma imagem diretamente do seu computador
- Veja o preview antes de salvar
- Gera automaticamente um nome único para o arquivo

---

## 📋 Passo a Passo - Upload de Imagem

### **1. No Painel Administrativo:**
1. Clique em "➕ Adicionar Produto" ou edite um produto existente
2. Na seção "Imagem do Produto", clique na aba **"📤 Upload"**
3. Clique no botão **"📁 Escolher Imagem"**
4. Selecione a imagem do seu computador
5. Veja o preview da imagem
6. Anote o nome do arquivo que aparecerá (ex: `product-1234567890-meuProduto.png`)

### **2. Salvando a Imagem no Servidor:**

⚠️ **IMPORTANTE**: Após fazer o upload, você precisará salvar manualmente a imagem na pasta correta.

**Opções:**

#### **Opção A - Via FTP/Hospedagem:**
1. Acesse seu servidor via FTP (FileZilla, cPanel, etc.)
2. Navegue até a pasta: `public/images/products/`
3. Faça upload da imagem com o nome **exato** mostrado no painel
4. Exemplo: `product-1711234567890-agua-sanitaria.png`

#### **Opção B - Localmente (Desenvolvimento):**
1. Abra a pasta do projeto
2. Vá para: `public/images/products/`
3. Cole a imagem com o nome **exato** mostrado no painel
4. A imagem estará disponível imediatamente

### **3. Finalizando:**
1. Após salvar a imagem na pasta, volte ao painel
2. Clique em "➕ Criar Produto" ou "💾 Atualizar Produto"
3. Pronto! ✅

---

## 🔍 Validações Automáticas

O sistema valida automaticamente:
- ✅ **Tipo de arquivo**: Apenas imagens (JPG, PNG, GIF, WebP, etc.)
- ✅ **Tamanho máximo**: 5MB por imagem
- ✅ **Nome único**: Evita conflitos com timestamp

---

## 💡 Dicas

1. **Nomes de arquivo**: Use nomes descritivos e sem espaços
   - ✅ Bom: `detergente-lavanda-5L.png`
   - ❌ Evite: `foto final versão 2.jpg`

2. **Formato recomendado**: PNG para produtos (melhor qualidade)

3. **Otimize as imagens**: Comprima antes de fazer upload
   - Use ferramentas online como TinyPNG, Compressor.io
   - Recomendado: 800x800px, menos de 200KB

4. **Preview**: Sempre verifique o preview antes de salvar

---

## 🛠️ Melhorias Futuras

Planejado para próximas versões:
- ✨ Upload automático direto para o servidor
- 🗑️ Deletar imagens antigas automaticamente
- ✂️ Redimensionar imagens automaticamente
- 📁 Gerenciador de arquivos integrado

---

## ❓ Problemas Comuns

### A imagem não aparece no site:
1. Verifique se o nome do arquivo está **exatamente** igual ao caminho salvo
2. Confirme que a imagem está na pasta `public/images/products/`
3. Limpe o cache do navegador (Ctrl + F5)
4. Verifique as permissões da pasta (deve ter permissão de leitura)

### Erro "Por favor, selecione um arquivo válido":
- O arquivo não é uma imagem
- Tente converter para PNG ou JPG

### Erro "A imagem deve ter no máximo 5MB":
- Comprima a imagem usando ferramentas online
- Ou reduza a resolução

---

## 📞 Suporte

Se tiver dúvidas ou problemas, consulte o desenvolvedor responsável.
