import React from "react";
import Header from "../Header";
import ProductsList from "../ProductsList";

export default function HomePage({ products, addProductToCart }) {
  const domesticCleaningProducts = products.filter(product => product.category === 'Limpeza Doméstica');
  const automotiveCleaningProducts = products.filter(product => product.category === 'Limpeza Automotiva');
  const cleaningEquipmentProducts = products.filter(product => product.category === 'Equipamentos de Limpeza');
  const disposableProducts = products.filter(product => product.category === 'Descartáveis');

  return (
    <>
      <Header />
      <div className="page-inner-content">
        {/* Categoria Limpeza Doméstica */}
        <div id="limpeza-domestica" className="section-title">
          <h3>Limpeza Doméstica</h3>
          <div className="underline"></div>
        </div>
        <div className="main-content">
          <ProductsList
            addProductToCart={addProductToCart}
            products={domesticCleaningProducts}
          />
        </div>

        {/* Categoria Limpeza Automotiva */}
        <div id="limpeza-automotiva" className="section-title">
          <h3>Limpeza Automotiva</h3>
          <div className="underline"></div>
        </div>
        <div className="main-content">
          <ProductsList
            addProductToCart={addProductToCart}
            products={automotiveCleaningProducts}
          />
        </div>

        {/* Categoria Equipamentos de Limpeza */}
        <div id="equipamentos-limpeza" className="section-title">
          <h3>Equipamentos de Limpeza</h3>
          <div className="underline"></div>
        </div>
        <div className="main-content">
          <ProductsList
            addProductToCart={addProductToCart}
            products={cleaningEquipmentProducts}
          />
        </div>

        {/* Categoria Descartáveis */}
        <div id="descartaveis" className="section-title">
          <h3>Descartáveis</h3>
          <div className="underline"></div>
        </div>
        <div className="main-content">
          <ProductsList
            addProductToCart={addProductToCart}
            products={disposableProducts}
          />
        </div>
      </div>
    </>
  );
}
