// Shared-система історії замовлень, прив'язана до email користувача
import { storage } from './storage.js';

const ORDERS_KEY = 'orders';

function getAllOrders() {
  return storage.get(ORDERS_KEY, []);
}

// Замовлення конкретного користувача, найновіші перші
function getOrdersByEmail(email) {
  return getAllOrders()
    .filter(order => order.userEmail === email)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Створити нове замовлення. items — масив enriched cart items (з ціною/назвою)
function createOrder(userEmail, items, total) {
  const orders = getAllOrders();
  const order = {
    id: `order-${Date.now()}`,
    userEmail,
    date: new Date().toISOString(),
    items: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      variant: item.variant || null,
      color: item.color || null
    })),
    total
  };

  orders.push(order);
  storage.set(ORDERS_KEY, orders);
  return order;
}

export const orders = {
  getOrdersByEmail,
  createOrder
};