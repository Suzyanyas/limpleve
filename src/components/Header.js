import React from 'react';
import { Link } from "react-router-dom";

const bannerImage = {
  title: 'Ibilimp',
  description: 'Economia e Roupa Limpa, para o tamanho da sua necessidade.',
  imageUrl: '/images/products/outrasimg/bannerlimpleve.png',
  link: '/products'
};

export default function Header() {
  return (
    <header>
      <div className="inner-content">
        <Link to={bannerImage.link}>
          <img src={bannerImage.imageUrl} alt={bannerImage.title} className="ibilimp" />
        </Link>
      </div>
    </header>
  );
}
