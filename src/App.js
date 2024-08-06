import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/pages/HomePage';
import ProductsPage from './components/pages/ProductsPage';
import SidebarCart from './components/SidebarCart';
import Footer from './components/Footer';
import ScrollToTopButton from './components/ScrollToTopButton';

const CategoryProductsPage = ({ addProductToCart }) => {
  const { category } = useParams();
  const [categoryProducts, setCategoryProducts] = useState([]);

  useEffect(() => {
    fetch('/db.json')
      .then((res) => res.json())
      .then((data) => {
        const filteredProducts = data.products.filter((product) => product.category.toLowerCase() === category.toLowerCase());
        setCategoryProducts(filteredProducts);
      });
  }, [category]);

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
    fetch('/db.json')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products);
      });
  }, []);

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
          </Routes>
        </main>
        <Footer />
        <ScrollToTopButton />
      </div>
    </Router>
  );
}

export default App;
