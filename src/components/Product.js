import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Product({
  id,
  image,
  additional_images = [],
  name,
  rate,
  price,
  addProductToCart,
}) {
  // Formata o preço com duas casas decimais
  const formattedPrice = price.toFixed(2);
  const navigate = useNavigate();

  const handleBuyNow = () => {
    addProductToCart(id);
    navigate("/cart/checkout");
  };

  // Estado para controlar a exibição do popup e a imagem atual
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);

  // Função para abrir o popup
  const openPopup = () => {
    setIsPopupOpen(true);
  };

  // Função para fechar o popup e redefinir a imagem principal
  const closePopup = () => {
    setIsPopupOpen(false);
    setCurrentImage(image); // Redefine para a imagem principal
  };

  return (
    <div className="product">
      <img src={currentImage} alt={name} onClick={openPopup} />
      <p className="name">{name}</p>
      <div className={price > 50 ? "price-container expensive" : "price-container"}>
        <span>R$</span> {formattedPrice}
      </div>

      <div className="buttons">
        <button onClick={() => addProductToCart(id)} className="btn-icon add-to-cart-btn">
          <span>Adicionar ao carrinho</span>
          <FontAwesomeIcon icon={faCartShopping} />
        </button>
      </div>

      {isPopupOpen && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={closePopup}>
              &times;
            </button>
            <img src={currentImage} alt={name} className="expanded-image" />
            <div className="additional-images">
              {additional_images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${name} ${index + 1}`}
                  onClick={() => setCurrentImage(img)}
                  className="thumbnail"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
