const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Defina suas rotas estáticas
const staticLinks = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/products', changefreq: 'weekly', priority: 0.8 },
  // Adicione outras rotas estáticas se necessário
];

// Defina suas rotas dinâmicas baseadas nas categorias
const dynamicLinks = [
  { url: '/products/limpeza-domestica', changefreq: 'weekly', priority: 0.8 },
  { url: '/products/limpeza-automotiva', changefreq: 'weekly', priority: 0.8 },
  { url: '/products/equipamentos-limpeza', changefreq: 'weekly', priority: 0.8 },
  { url: '/products/descartaveis', changefreq: 'weekly', priority: 0.8 },
];

// Suponha que você tenha uma função para obter produtos de um banco de dados ou arquivo JSON
// Aqui está um exemplo fictício:
const getProducts = () => [
  { id: 1, name: 'Água Sanitária FC - 5 Litros', category: 'Limpeza Doméstica' },
  { id: 2, name: 'Água sanitária Ibilimp - 5 Litros', category: 'Limpeza Doméstica' },
  { id: 5, name: 'Amaciante Di Kasa - 5 Litros', category: 'Doméstica de Limpeza' },
  { id: 16, name: 'Limpador de Alumínio Concentrado ALUMAGI - Agius Prime - 20 Litros', category: 'Limpeza Automotiva' },
  // Adicione mais produtos conforme necessário
];

// Obtenha a lista de produtos
const products = getProducts();

// Crie URLs dinâmicas para cada produto
const productLinks = products.map(product => ({
  url: `/products/${product.id}-${encodeURIComponent(product.name.toLowerCase().replace(/\s+/g, '-'))}`,
  changefreq: 'weekly',
  priority: 0.5
}));

// Combine todas as rotas
const links = [...staticLinks, ...dynamicLinks, ...productLinks];

// Ajuste o hostname para o seu domínio
const sitemap = new SitemapStream({ hostname: 'https://limpleve.com.br' });

// Converte o array de links em um stream legível
streamToPromise(
  Readable.from(links).pipe(sitemap)
).then((data) => {
  createWriteStream(path.join(__dirname, 'public', 'sitemap.xml')).write(data);
}).catch((err) => {
  console.error('Error generating sitemap:', err);
});
