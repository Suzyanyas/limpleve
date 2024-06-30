import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/pages/HomePage';
import ProductsPage from './components/pages/ProductsPage';
import SidebarCart from './components/SidebarCart';
import Footer from './components/Footer';
import ScrollToTopButton from './components/ScrollToTopButton';

function App() {
  const [products, setProducts] = useState([]);
  const [showSidebarCart, setShowSidebarCart] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/db.json')
      .then((res) => res.json())
      .then((data) => {
        console.log(data.products); // Verifique se os produtos estão sendo carregados corretamente
        setProducts(data.products);
      });
  }, []);

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
    setCartTotal((prevTotal) => prevTotal + productToAdd.price);
  };

  const removeProductFromCart = (id, fragrance) => {
    const productToRemove = selectedProducts.find(
      (product) => product.id === id && product.fragrance === fragrance
    );
    const newSelectedProducts = selectedProducts.filter(
      (product) => !(product.id === id && product.fragrance === fragrance)
    );

    setSelectedProducts(newSelectedProducts);
    setCartTotal(
      (prevTotal) =>
        prevTotal - productToRemove.price * productToRemove.quantity
    );
  };

  const updateProductQuantity = (id, fragrance, quantity) => {
    const updatedProducts = selectedProducts.map((product) =>
      product.id === id && product.fragrance === fragrance
        ? { ...product, quantity }
        : product
    );

    setSelectedProducts(updatedProducts);
    const productToUpdate = products.find((product) => product.id === id);
    const productInCart = selectedProducts.find(
      (product) => product.id === id && product.fragrance === fragrance
    );
    const priceDifference =
      productToUpdate.price * (quantity - productInCart.quantity);
    setCartTotal((prevTotal) => prevTotal + priceDifference);
  };

  const clearCart = () => {
    setSelectedProducts([]);
    setCartTotal(0);
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
                  products={products}
                  addProductToCart={addProductToCart}
                  searchQuery={searchQuery}
                />
              }
            />
            <Route
              path='/products/:category'
              element={
                <ProductsPage
                  products={products}
                  addProductToCart={addProductToCart}
                  searchQuery={searchQuery}
                />
              }
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
