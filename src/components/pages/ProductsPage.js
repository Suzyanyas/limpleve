import React from 'react';
import Product from '../Product';

export default function ProductsPage({ products, addProductToCart, searchQuery }) {
  return (
    <div className="products-page">
      {products.map((product) => (
        <Product
          key={product.id}
          id={product.id}
          image={product.image}
          additional_images={product.additional_images}
          name={product.name}
          price={product.price}
          fragrances={product.fragrances} // Passando as fragrâncias para o componente Product
          addProductToCart={addProductToCart}
        />
      ))}
    </div>
  );
}
