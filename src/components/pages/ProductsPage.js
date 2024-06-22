import React from "react";
import ProductsList from "../ProductsList";
import { useParams } from "react-router-dom";

export default function ProductsPage({ products, addProductToCart }) {
  const { category } = useParams();
  const filteredProducts = products.filter(product => product.category === category);

  return (
    <div className="page-inner-content">
      <div className="section-title">
        <h3>{category}</h3>
        <div className="underline"></div>
      </div>

      <div className="main-content">
        <ProductsList products={filteredProducts} addProductToCart={addProductToCart} />
      </div>
    </div>
  );
}
