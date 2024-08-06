import React, { useState, useEffect } from 'react';
import { faXmark, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function SidebarProduct({
  id,
  image,
  name,
  price,
  fragrance,
  removeProductFromCart,
  updateProductQuantity,
  quantity,
}) {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [priceSum, setPriceSum] = useState(price * quantity);

  // Atualiza a soma do preço sempre que a quantidade ou o preço mudar
  useEffect(() => {
    setPriceSum(price * localQuantity);
  }, [localQuantity, price]);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity > 0) {
      setLocalQuantity(newQuantity);
      updateProductQuantity(id, fragrance, newQuantity);
    }
  };

  return (
    <div className='sidebar-product'>
      <div className='left-side'>
        <button
          className='remove-product-btn'
          onClick={() => removeProductFromCart(id, fragrance)}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <div className='details'>
          <h4>{name}</h4>
          <p>
            Valor: R$ {price.toFixed(2)} <br />
            {fragrance && (
              <>
                Fragrância: {fragrance} <br />
              </>
            )}
          </p>
          <div className='quantity-control'>
            <button
              onClick={() => handleQuantityChange(localQuantity - 1)}
              disabled={localQuantity <= 1}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <span>{localQuantity}</span>
            <button onClick={() => handleQuantityChange(localQuantity + 1)}>
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        </div>
      </div>
      <div className='right-side'>
        <img src={image} alt={name} />
        <div className='price-sum'>Soma: R$ {priceSum.toFixed(2)}</div>
      </div>
    </div>
  );
}
