import React from 'react';
import Product from '../Product';
import { useParams } from 'react-router-dom';

export default function ProductsPage({ products, addProductToCart, searchQuery }) {
  const { category } = useParams();

  // Filtrar os produtos com base na categoria da URL
  const filteredProducts = products.filter((product) => {
    return product.category.toLowerCase() === category.toLowerCase();
  });

  return (
    <div className="products-page">
      <div className="product-list">
        {filteredProducts.map((product) => (
          <Product
            key={product.id}
            id={product.id}
            image={product.image}
            additional_images={product.additional_images}
            name={product.name}
            price={product.price}
            fragrances={product.fragrances}
            addProductToCart={addProductToCart}
          />
        ))}
      </div>
    </div>
  );
}
