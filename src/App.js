import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import HomePage from './components/pages/HomePage';
import ProductsPage from './components/pages/ProductsPage';
import SidebarCart from './components/SidebarCart';
import Footer from './components/Footer';
import ScrollToTopButton from './components/ScrollToTopButton';
import AdminPanel from './components/AdminPanel';
import { getAllProducts, getProductsByCategory } from './services/productService';

// Detecta token de convite/recuperação no hash e redireciona para /admin
const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=invite') || hash.includes('type=recovery') || hash.includes('access_token'))) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  return null;
};

const CategoryProductsPage = ({ addProductToCart }) => {
  const { category } = useParams();
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCategoryProducts = async () => {
    setLoading(true);
    const data = await getProductsByCategory(category);
    setCategoryProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategoryProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Carregando produtos...</div>;
  }

  return (
    <ProductsPage
      products={categoryProducts}
      addProductToCart={addProductToCart}
    />
  );
};

function App() {
  const [products, setProducts] = useState([]);
  const [showSidebarCart, setShowSidebarCart] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cartao');
  const [changeNeeded, setChangeNeeded] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getAllProducts();
    setProducts(data);
  };

  useEffect(() => {
    const total = selectedProducts.reduce((sum, product) => sum + product.price * product.quantity, 0);
    setCartTotal(total);
  }, [selectedProducts]);

  const addProductToCart = (id, fragrance) => {
    const productToAdd = products.find((product) => product.id === id);
    const productInCart = selectedProducts.find(
      (product) => product.id === id && product.fragrance === fragrance
    );

    if (productInCart) {
      const updatedProducts = selectedProducts.map((product) =>
        product.id === id && product.fragrance === fragrance
          ? { ...product, quantity: product.quantity + 1 }
          : product
      );
      setSelectedProducts(updatedProducts);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { ...productToAdd, quantity: 1, fragrance: fragrance || '' },
      ]);
    }
  };

  const removeProductFromCart = (id, fragrance) => {
    const newSelectedProducts = selectedProducts.filter(
      (product) => !(product.id === id && product.fragrance === fragrance)
    );

    setSelectedProducts(newSelectedProducts);
  };

  const updateProductQuantity = (id, fragrance, quantity) => {
    const updatedProducts = selectedProducts.map((product) =>
      product.id === id && product.fragrance === fragrance
        ? { ...product, quantity }
        : product
    );

    setSelectedProducts(updatedProducts);
  };

  const clearCart = () => {
    setSelectedProducts([]);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Router>
      <AuthRedirect />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className='App'>
        <Navbar
          selectedProducts={selectedProducts}
          setShowSidebarCart={setShowSidebarCart}
          setSearchQuery={setSearchQuery}
        />
        <SidebarCart
          removeProductFromCart={removeProductFromCart}
          updateProductQuantity={updateProductQuantity}
          clearCart={clearCart}
          cartTotal={cartTotal}
          selectedProducts={selectedProducts}
          setShowSidebarCart={setShowSidebarCart}
          showSidebarCart={showSidebarCart}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          changeNeeded={changeNeeded}
          setChangeNeeded={setChangeNeeded}
          changeAmount={changeAmount}
          setChangeAmount={setChangeAmount}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
        />

        <main>
          <Routes>
            <Route
              path='/'
              element={
                <HomePage
                  addProductToCart={addProductToCart}
                  products={filteredProducts}
                  setShowSidebarCart={setShowSidebarCart}
                />
              }
            />
            <Route
              path='/products'
              element={
                <ProductsPage
                  products={filteredProducts}
                  addProductToCart={addProductToCart}
                  searchQuery={searchQuery}
                />
              }
            />
            <Route
              path='/products/:category'
              element={<CategoryProductsPage addProductToCart={addProductToCart} />}
            />
            <Route
              path='/admin'
              element={<AdminPanel />}
            />
          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton />
      </div>
    </Router>
  );
}

export default App;
