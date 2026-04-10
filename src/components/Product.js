import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";

export default function Product({
  id,
  image,
  additional_images = [],
  name,
  price,
  fragrances,
  isAvailable,
  addProductToCart,
}) {
  const formattedPrice = price.toFixed(2);
  
  // Garantir que fragrances seja sempre um array
  const fragrancesList = Array.isArray(fragrances) ? fragrances : [];

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(image);
  const [selectedFragrance, setSelectedFragrance] = useState("");

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
    if (fragrancesList.length === 0 || selectedFragrance !== "") {
      addProductToCart(id, selectedFragrance);
    } else {
      console.log("Selecione uma fragrância antes de adicionar ao carrinho.");
    }
  };

  return (
    <>
      <motion.div
        className={`product ${!isAvailable ? "unavailable" : ""}`}
        whileHover={{ y: -8, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="product-image-container"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <img
            src={currentImage}
            alt={name}
            onClick={openPopup}
            className={!isAvailable ? "unavailable" : ""}
          />
        </motion.div>

        <p className="name">{name}</p>

        <div className={`price-container ${price > 50 ? "expensive" : ""}`}>
          <span>R$</span> {formattedPrice}
        </div>

        {fragrancesList.length > 0 && (
          <div className="fragrance-selector">
            <label htmlFor={`fragrance-${id}`}>Escolha uma Fragrância:</label>
            <div className="fragrance-selector-wrapper">
              <select
                id={`fragrance-${id}`}
                value={selectedFragrance}
                onChange={handleFragranceChange}
                disabled={!isAvailable}
              >
                <option value="" disabled>Selecione</option>
                {fragrancesList.map((fragrance, index) => (
                  <option key={index} value={fragrance}>
                    {fragrance}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="buttons">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addToCart}
            className="btn-icon add-to-cart-btn"
            disabled={!isAvailable}
          >
            <span>Adicionar ao carrinho</span>
            <FontAwesomeIcon icon={faCartShopping} />
          </motion.button>
        </div>

        {!isAvailable && (
          <div className="unavailable-overlay">
            <span>Produto Indisponível</span>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isPopupOpen && (
          <motion.div
            className="popup-overlay"
            onClick={closePopup}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="popup-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <button className="close-button" onClick={closePopup}>
                &times;
              </button>
              <img src={currentImage} alt={name} className="expanded-image" />
              <div className="additional-images">
                {additional_images.map((img, index) => (
                  <motion.img
                    key={index}
                    src={img}
                    alt={`${name} ${index + 1}`}
                    onClick={() => setCurrentImage(img)}
                    className="thumbnail"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

