import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faTrash } from "@fortawesome/free-solid-svg-icons"; // Importa os ícones de 'X' e lixeira
import SidebarProduct from "./SidebarProduct";
import whatsappIcon from "../images/iconwhatsapp.png";

export default function SidebarCart({
  setShowSidebarCart,
  showSidebarCart,
  selectedProducts,
  cartTotal,
  removeProductFromCart,
  updateProductQuantity,
  clearCart,
}) {
  const whatsappNumber = "+5588992702014";

  // Função para calcular o total do carrinho
  const calculateTotal = (products) => {
    return products.reduce((total, product) => {
      return total + product.price * product.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    const whatsappMessage = encodeURIComponent(
      `Olá, gostaria de fazer o pedido dos seguintes itens:\n\n${selectedProducts
        .map(
          (product) =>
            `- ${product.name} - R$ ${product.price.toFixed(2)}, Quantidade: ${product.quantity}, Total: R$ ${(product.quantity * product.price).toFixed(2)}, Fragrância: ${product.fragrance}`
        )
        .join("\n")}\n\nValor total do pedido: R$ ${calculateTotal(selectedProducts).toFixed(2)}`
    );

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
    window.open(whatsappLink, "_blank");
  };

  const handleClearCart = () => {
    clearCart();
  };

  return (
    <aside className={`sidebar-cart ${showSidebarCart && "show"}`}>
      <div className="top">
        <h3>Seu carrinho</h3>
        <button onClick={() => setShowSidebarCart(false)}>
          <FontAwesomeIcon icon={faTimes} /> {/* Substitui o ícone de lixeira pelo ícone de 'X' */}
        </button>
      </div>

      <div className="sidebar-products-list">
        {selectedProducts.map((product) => (
          <SidebarProduct
            key={`${product.id}-${product.fragrance}`}
            {...product}
            removeProductFromCart={removeProductFromCart}
            updateProductQuantity={updateProductQuantity}
          />
        ))}
      </div>

      {cartTotal === 0 ? (
        <p>Seu carrinho está vazio</p>
      ) : (
        <>
          <div className="total-container">
            <b>Total: </b> R$ {calculateTotal(selectedProducts).toFixed(2)}
          </div>

          <button onClick={handleCheckout} className="btn-icon">
            <img src={whatsappIcon} alt="WhatsApp" className="whatsapp-icon" />
            <span>Enviar pedido para WhatsApp</span>
          </button>

          <button onClick={handleClearCart} className="btn-icon clear-cart-btn">
            <span>Esvaziar Carrinho</span>
            <FontAwesomeIcon icon={faTrash} /> {/* Mantém o ícone de lixeira */}
          </button>
        </>
      )}
    </aside>
  );
}
