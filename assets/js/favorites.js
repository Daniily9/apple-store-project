// Shared-система обраного (тільки список id, без кількості)
import { storage } from './storage.js';

const FAVORITES_KEY = 'favorites';

// Отримати масив id обраних товарів
function getItems() {
  return storage.get(FAVORITES_KEY, []);
}

// Зберегти й сповістити слухачів (напр. header.js, product.js для оновлення сердечка)
function saveItems(items) {
  storage.set(FAVORITES_KEY, items);
  window.dispatchEvent(new CustomEvent('favorites:updated', { detail: { items } }));
}

// Перевірити, чи товар в обраному
function has(productId) {
  return getItems().includes(productId);
}

// Додати в обране
function add(productId) {
  if (has(productId)) return;
  const items = getItems();
  items.push(productId);
  saveItems(items);
}

// Видалити з обраного
function remove(productId) {
  const items = getItems().filter(id => id !== productId);
  saveItems(items);
}

// Перемкнути стан (зручно для кліку на сердечко)
function toggle(productId) {
  if (has(productId)) {
    remove(productId);
    return false; // тепер НЕ в обраному
  } else {
    add(productId);
    return true; // тепер в обраному
  }
}

// Кількість обраних товарів (для іконки в header, якщо треба)
function getCount() {
  return getItems().length;
}

export const favorites = {
  getItems,
  has,
  add,
  remove,
  toggle,
  getCount
};