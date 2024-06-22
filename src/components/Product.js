import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";

export default function Product({
  id,
  image,
  additional_images = [],
  name,
  price,
  addProductToCart,
}) {
  const formattedPrice = price.toFixed(2);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);

  const openPopup = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setCurrentImage(image);
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
