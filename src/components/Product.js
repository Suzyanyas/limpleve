import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";

export default function Product({
  id,
  image,
  additional_images = [],
  name,
  price,
  fragrances = [],
  addProductToCart,
}) {
  const formattedPrice = price.toFixed(2);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const [selectedFragrance, setSelectedFragrance] = useState(""); // Estado para armazenar a fragrância selecionada

  const openPopup = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setCurrentImage(image);
  };

  const handleFragranceChange = (e) => {
    setSelectedFragrance(e.target.value);
  };

  const addToCart = () => {
    // Se o produto não tiver fragrâncias ou se uma fragrância foi selecionada, adicione ao carrinho
    if (fragrances.length === 0 || selectedFragrance !== "") {
      addProductToCart(id, selectedFragrance); // Passar o ID do produto e a fragrância selecionada (se houver) para a função addProductToCart
    } else {
      // Lógica para lidar com nenhum fragrância selecionada (opcional)
      console.log("Selecione uma fragrância antes de adicionar ao carrinho.");
    }
  };

  return (
    <div className="product">
      <img src={currentImage} alt={name} onClick={openPopup} />
      <p className="name">{name}</p>
      <div className={price > 50 ? "price-container expensive" : "price-container"}>
        <span>R$</span> {formattedPrice}
      </div>

      {fragrances.length > 0 && (
        <div className="fragrance-selector">
          <label htmlFor={`fragrance-${id}`}>Escolha uma fragrância:</label>
          <select
            id={`fragrance-${id}`}
            value={selectedFragrance}
            onChange={handleFragranceChange}
          >
            <option value="">Selecione uma fragrância</option>
            {fragrances.map((fragrance, index) => (
              <option key={index} value={fragrance}>
                {fragrance}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="buttons">
        <button onClick={addToCart} className="btn-icon add-to-cart-btn">
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
