import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";

export default function Footer() {
  return (
    <footer className="footer">

      <div className="footer-bottom">
      <Link to="/">
            <img
              src="/images/logo-limpleve.png"
              className="footer-logo"
              alt="logo da empresa"
            />
          </Link>
        
        <p>&copy; 2024 Limp Leve.</p>
        <div className="developer">
          <p>Desenvolvido por: Suzy Soares</p>
          <a
            href="https://www.linkedin.com/in/suzy"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faLinkedin} />
          </a>
        </div>
      </div>
    </footer>
  );
}
