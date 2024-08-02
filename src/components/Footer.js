import React from "react";
import { Link } from "react-router-dom";


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
      
      </div>
    </footer>
  );
}

