import { useState } from "react";
import { Link } from "react-router-dom";
import {
  faBars,
  faSearch,
  faShoppingCart,
  faHome,
  faPumpSoap,
  faCar,
  faBroom,
  faTrash,
  faLock
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Navbar({ setShowSidebarCart, selectedProducts, setSearchQuery }) {
  const [show, setShow] = useState(false);

  const products = selectedProducts || [];

  const handleLinkClick = () => {
    setShow(false);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      {show && <div className="menu-overlay" onClick={() => setShow(false)}></div>}
      <div className="nav">
        <div className="inner-content">
          <Link to="/" onClick={handleLinkClick}>
            <img
              src="/images/logo-limpleve.png"
              className="logo"
              alt="logo da empresa"
            />
          </Link>
          <nav className={`nav-menu ${show ? "show" : ""}`}>
            <ul>
              <li>
                <Link to="/" onClick={handleLinkClick} className="menu-item-link">
                  <FontAwesomeIcon icon={faHome} className="menu-icon" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link to="/products/Limpeza Doméstica" onClick={handleLinkClick} className="menu-item-link">
                  <FontAwesomeIcon icon={faPumpSoap} className="menu-icon" />
                  <span>Limpeza <br /> Doméstica</span>
                </Link>
              </li>
              <li>
                <Link to="/products/Limpeza Automotiva" onClick={handleLinkClick} className="menu-item-link">
                  <FontAwesomeIcon icon={faCar} className="menu-icon" />
                  <span>Limpeza <br /> Automotiva</span>
                </Link>
              </li>
              <li>
                <Link to="/products/Equipamentos de Limpeza" onClick={handleLinkClick} className="menu-item-link">
                  <FontAwesomeIcon icon={faBroom} className="menu-icon" />
                  <span>Equipamentos <br /> Para <br /> Limpeza</span>
                </Link>
              </li>
              <li>
                <Link to="/products/Descartáveis" onClick={handleLinkClick} className="menu-item-link">
                  <FontAwesomeIcon icon={faTrash} className="menu-icon" />
                  <span>Descartáveis</span>
                </Link>
              </li>
            </ul>
          </nav>

          <div className="navs-icon-container">
            <div className="search-input-container">
              <input
                type="search"
                placeholder="Procurar"
                onChange={handleSearchChange}
                aria-label="Buscar produtos"
              />
              <FontAwesomeIcon icon={faSearch} />
            </div>

            <Link to="/admin" className="nav-admin-btn" title="Área Administrativa">
              <FontAwesomeIcon icon={faLock} />
            </Link>

            <button
              className="shopping-cart"
              onClick={() => setShowSidebarCart(true)}
              aria-label="Abrir carrinho de compras"
            >
              <FontAwesomeIcon icon={faShoppingCart} />
              <div className="products-count">{products.length}</div>
            </button>
            <button
              className="menu-button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Fechar menu" : "Abrir menu"}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
