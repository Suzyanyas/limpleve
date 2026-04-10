import React from "react";
import { motion } from "framer-motion";
import { FiHome, FiTruck, FiTool, FiPackage } from "react-icons/fi";
import Header from "../Header";
import ProductsList from "../ProductsList";

// Ícones para cada categoria
const categoryIcons = {
  'Limpeza Doméstica': <FiHome size={24} />,
  'Limpeza Automotiva': <FiTruck size={24} />,
  'Equipamentos de Limpeza': <FiTool size={24} />,
  'Descartáveis': <FiPackage size={24} />
};

// Componente de seção de categoria moderna
const CategorySection = ({ id, title, products, addProductToCart, index }) => {
  return (
    <motion.div
      id={id}
      className="category-section"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <div className="section-title-modern">
        <div className="icon-wrapper">
          {categoryIcons[title]}
        </div>
        <h3>{title}</h3>
        <div className="title-underline"></div>
      </div>
      <div className="main-content">
        <ProductsList
          addProductToCart={addProductToCart}
          products={products}
        />
      </div>
    </motion.div>
  );
};

export default function HomePage({ products, addProductToCart }) {
  const domesticCleaningProducts = products.filter(product => product.category === 'Limpeza Doméstica');
  const automotiveCleaningProducts = products.filter(product => product.category === 'Limpeza Automotiva');
  const cleaningEquipmentProducts = products.filter(product => product.category === 'Equipamentos de Limpeza');
  const disposableProducts = products.filter(product => product.category === 'Descartáveis');

  const categories = [
    { id: 'limpeza-domestica', title: 'Limpeza Doméstica', products: domesticCleaningProducts },
    { id: 'limpeza-automotiva', title: 'Limpeza Automotiva', products: automotiveCleaningProducts },
    { id: 'equipamentos-limpeza', title: 'Equipamentos de Limpeza', products: cleaningEquipmentProducts },
    { id: 'descartaveis', title: 'Descartáveis', products: disposableProducts }
  ];

  return (
    <>
      <Header />
      <div className="page-inner-content-modern">

        {/* Categorias */}
        {categories.map((category, index) => (
          <CategorySection
            key={category.id}
            id={category.id}
            title={category.title}
            products={category.products}
            addProductToCart={addProductToCart}
            index={index}
          />
        ))}
      </div>
    </>
  );
}
