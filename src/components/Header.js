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
            <div className="banner-overlay">
              <motion.div
                className="banner-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2>{bannerImage.title}</h2>
                <p>{bannerImage.description}</p>
              </motion.div>
            </div>
          </motion.div>
        </Link>
      </div>
    </header>
  );
}

