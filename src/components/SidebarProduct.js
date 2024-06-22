import { faXmark, faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState, useEffect } from "react";

export default function SidebarProduct({
  id,
  image,
  name,
  rate,
  price,
  removeProductFromCart,
  updateProductQuantity,
  quantity,
}) 
{
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [priceSum, setPriceSum] = useState(price * quantity);

  useEffect(() => {
    setPriceSum(price * localQuantity);
  }, [localQuantity, price]);

  const handleQuantityChange = (newQuantity) => {
    setLocalQuantity(newQuantity);
    updateProductQuantity(id, newQuantity);
  };

  return (
    <div className="sidebar-product">
      <div className="left-side">
        <button
          className="remove-product-btn"
          onClick={() => {
            removeProductFromCart(id);
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <div className="details">
          <h4>{name}</h4>
          <p>Valor: {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <div className="quantity-control">
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(Math.max(localQuantity - 1, 1))}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={localQuantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
            />
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(localQuantity + 1)}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
          {priceSum > price && (
            <p className="price-sum">
              <b>Soma:</b>
              {priceSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>
      </div>

      <div className="right-side">
        <img src={image} alt={name} />
      </div>
    </div>
  );
}
