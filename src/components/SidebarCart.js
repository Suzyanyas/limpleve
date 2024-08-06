import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
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
  const [paymentMethod, setPaymentMethod] = useState("cartao");
  const [changeNeeded, setChangeNeeded] = useState(false);
  const [changeAmount, setChangeAmount] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const calculateTotal = (products) => {
    return products.reduce((total, product) => {
      return total + product.price * product.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    const formattedChangeAmount = changeAmount.startsWith("R$")
      ? changeAmount
      : `R$ ${changeAmount}`;

    const paymentDetails =
      paymentMethod === "dinheiro" && changeNeeded
        ? `\n\nPagamento em Dinheiro. Precisa de troco para: ${formattedChangeAmount}`
        : `\n\nMétodo de pagamento: ${
            paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
          }`;

    const whatsappMessage = encodeURIComponent(
      `Olá, gostaria de fazer o pedido dos seguintes itens:\n\n${selectedProducts
        .map(
          (product) =>
            `- ${product.name} - R$ ${product.price.toFixed(
              2
            )}, Quantidade: ${product.quantity}, Total: R$ ${(
              product.quantity * product.price
            ).toFixed(2)}${
              product.fragrance ? `, Fragrância: ${product.fragrance}` : ""
            }`
        )
        .join("\n")}\n\nValor total do pedido: R$ ${calculateTotal(
        selectedProducts
      ).toFixed(2)}${paymentDetails}\n\nEndereço de entrega: ${deliveryAddress}`
    );

    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
    window.open(whatsappLink, "_blank");
  };

  const handleClearCart = () => {
    clearCart();
  };

  const handleFocus = () => {
    if (!changeAmount.startsWith("R$")) {
      setChangeAmount("R$ " + changeAmount);
    }
  };

  const handleBlur = () => {
    if (changeAmount === "R$ " || changeAmount === "R$") {
      setChangeAmount("");
    }
  };

  return (
    <aside className={`sidebar-cart ${showSidebarCart && "show"}`}>
      <div className="top">
        <h3>Seu carrinho</h3>
        <button onClick={() => setShowSidebarCart(false)}>
          <FontAwesomeIcon icon={faTimes} />
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

          <div className="delivery-address">
            <label>Endereço de entrega:</label>
            <input
              type="text"
              placeholder="Digite seu endereço"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="delivery-input"
            />
          </div>

          <div className="payment-method">
            <label className="payment-title">Forma de pagamento:</label>
            <label className="payment-option">
              <input
                type="radio"
                value="cartao"
                checked={paymentMethod === "cartao"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-input"
              />
              <span className="payment-label">Cartão</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                value="pix"
                checked={paymentMethod === "pix"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-input"
              />
              <span className="payment-label">Pix</span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                value="dinheiro"
                checked={paymentMethod === "dinheiro"}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="payment-input"
              />
              <span className="payment-label">Dinheiro</span>
            </label>

            {paymentMethod === "dinheiro" && (
              <div className="change-needed">
                <label>
                  <input
                    type="checkbox"
                    checked={changeNeeded}
                    onChange={(e) => setChangeNeeded(e.target.checked)}
                    className="change-checkbox"
                  />
                  Precisa de troco?
                </label>
                {changeNeeded && (
                  <input
                    type="text"
                    placeholder="Troco para quanto?"
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(e.target.value)}
                    className="change-input"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                )}
              </div>
            )}
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
