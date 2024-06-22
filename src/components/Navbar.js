import React, { useState } from "react";
import { Link } from "react-router-dom";
import { faBars, faSearch, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


export default function Navbar({ setShowSidebarCart, selectedProducts, setSearchQuery }) {
  const [show, setShow] = useState(false);

  // Garantir que selectedProducts seja um array
  const products = selectedProducts || [];

  // Função para lidar com cliques nos links do menu
  const handleLinkClick = () => {
    setShow(false);
  };

  const handleSearchChange = (e) => {
  setSearchQuery(e.target.value);
};


  return (
    <div className="nav">
      <div className="inner-content">
      <Link to="/" onClick={handleLinkClick}>
        <img
          src="/images/logo-limpleve.png"
          className="logo"
          alt="logo da empresa"
        />
</Link>
        <nav className={`${show ? "show" : ""}`}>
          <ul>
            <li>
              <Link to="/" onClick={handleLinkClick}>HOME</Link>
            </li>
            <li>
              <Link to="/products/Limpeza Doméstica" onClick={handleLinkClick}>
                LIMPEZA <br /> DOMÉSTICA
              </Link>
            </li>
            <li>
              <Link to="/products/Limpeza Automotiva" onClick={handleLinkClick}>
                LIMPEZA <br /> AUTOMOTIVA
              </Link>
            </li>
            <li>
              <Link to="/products/Equipamentos de Limpeza" onClick={handleLinkClick}>
                EQUIPAMENTOS <br /> PARA <br /> LIMPEZA
              </Link>
            </li>
            <li>
              <Link to="/products/Descartáveis" onClick={handleLinkClick}>DESCARTÁVEIS</Link>
            </li>
          </ul>
        </nav>

        <div className="navs-icon-container">
          <div className="search-input-container">
            <input 
              type="search" 
              placeholder="Procurar" 
              onChange={handleSearchChange}
            />
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <button
            className="shopping-cart"
            onClick={() => setShowSidebarCart(true)}
          >
            <FontAwesomeIcon icon={faShoppingCart} />
            <div className="products-count">{products.length}</div>
          </button>
          <button className="menu-button" onClick={() => setShow(!show)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>
      </div>
    </div>
  );
}
