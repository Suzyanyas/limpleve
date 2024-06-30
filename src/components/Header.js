import React from 'react';
import { Link } from "react-router-dom";
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";

const sliderData = [
  {
    title: 'Ibilimp',
    description: 'Economia e Roupa Limpa, para o tamanho da sua necessidade.',
    imageUrl: '/images/products/limpbanner2.png',
    link: '/products'
  },
  {
    title: 'Ibilimp 2',
    description: 'Mais uma descrição para o segundo slide.',
    imageUrl: '/images/products/limpbanner.png',
    link: '/products2'
  },
  // Adicione mais slides conforme necessário
];

export default function Header() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 1600,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <header>
      <Slider {...settings}>
        {sliderData.map((slide, index) => (
          <div key={index} className="inner-content">
            <Link to={slide.link}>
              <img src={slide.imageUrl} alt="Products" className="ibilimp" />
            </Link>
          </div>
        ))}
      </Slider>
    </header>
  );
}
