import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
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

  const handleCheckout = () => {
    const whatsappMessage = encodeURIComponent(
      `Olá, gostaria de fazer o pedido dos seguintes itens:\n\n${selectedProducts
        .map(
          (product) =>
            `- ${product.name} - ${product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, Quantidade: ${product.quantity}, Total: ${(product.quantity * product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
        )
        .join("\n")}\n\nValor total do pedido: ${calculateTotal(selectedProducts).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}`
    );

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
    window.open(whatsappLink, "_blank");
  };

  const handleClearCart = () => {
    clearCart();
  };

  // Função para calcular o total do carrinho
  const calculateTotal = (products) => {
    return products.reduce((total, product) => {
      return total + (product.price * product.quantity);
    }, 0);
  };

  return (
    <aside className={`sidebar-cart ${showSidebarCart && "show"}`}>
      <div className="top">
        <h3>Seu carrinho</h3>
        <button onClick={() => setShowSidebarCart(false)}>
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>

      <div className="sidebar-products-list">
        {selectedProducts.map((product) => (
          <SidebarProduct
            key={product.id}
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
            <b>Total: </b> {calculateTotal(selectedProducts).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>

          <button onClick={handleCheckout} className="btn-icon">
            <img src={whatsappIcon} alt="WhatsApp" className="whatsapp-icon" />
            <span>Enviar pedido para WhatsApp</span>
          </button>

          <button onClick={handleClearCart} className="btn-icon clear-cart-btn">
            <span>Esvaziar Carrinho</span>
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </>
      )}
    </aside>
  );
}
