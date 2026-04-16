import React from 'react';
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const bannerImage = {
  title: 'Ibilimp',
  description: 'Economia e Roupa Limpa, para o tamanho da sua necessidade.',
  imageUrl: '/images/products/outrasimg/bannerlimpleve.png',
  link: '/products'
};

export default function Header() {
  return (
    <header className="banner-header">
      <div className="inner-content">
        <Link to={bannerImage.link} className="banner-link">
          <motion.div
            className="banner-container"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <img src={bannerImage.imageUrl} alt={bannerImage.title} className="banner-image" />
          </motion.div>
        </Link>
      </div>
    </header>
  );
}

