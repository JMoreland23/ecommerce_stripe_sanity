import React, { useState } from 'react';

export default function DeliveryForm({ onDeliveryDetailsSubmit }) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    console.log('Submitting delivery details:', { deliveryDate, deliveryTime }); // Debug log
    onDeliveryDetailsSubmit({ deliveryDate, deliveryTime });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Delivery Date:
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          required
        />
      </label>
      <label>
        Delivery Time:
        <input
          type="time"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          required
        />
      </label>
      <button type="submit">Add Delivery Date to Order</button>
    </form>
  );
}