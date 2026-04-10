import React from "react";
import { motion } from "framer-motion";
import Product from "./Product";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ProductsList({ products, addProductToCart }) {
  if (!products || products.length === 0) {
    return (
      <div className="no-products-message">
        <p>Nenhum produto encontrado nesta categoria.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="product-list"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={item}>
          <Product
            {...product}
            addProductToCart={addProductToCart}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

