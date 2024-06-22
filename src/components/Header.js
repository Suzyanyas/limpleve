import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from 'react';
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header>
    <div className="inner-content">
      <div className="left-side">
        <h2>Ibilimp</h2>
        <p>
         Economia e Roupa Limpa, para o tamanho da sua necessidade.
        </p>
        <Link to="/products" className="see-more-btn">
          <span>Ver Agora</span>
          <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      </div>
      <div className="right-side">
        <img src="/images/products/ibilimp.png" alt="Products" className="ibilimp" />
      </div>
    </div>
  </header>
  );
    
  
}
