// Shared-система кошика: зберігання, підрахунки, API для сторінок
// Елемент кошика зберігає вибрані variant і color як знімки на момент додавання.
import { storage } from './storage.js';

const CART_KEY = 'cart';

// Порівняння варіантів (null === null, або збіг storage+ram)
function variantsEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.storage === b.storage && a.ram === b.ram;
}

function colorsEqual(a, b) {
  return (a?.id ?? null) === (b?.id ?? null);
}

// Отримати весь кошик (масив елементів)
function getItems() {
  return storage.get(CART_KEY, []);
}

// Зберегти кошик і сповістити про зміну (для header.js та інших слухачів)
function saveItems(items) {
  storage.set(CART_KEY, items);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
}

// Знайти індекс конкретної позиції (id + variant + color) в кошику
function findIndex(items, productId, variant, color) {
  return items.findIndex(item =>
    item.id === productId &&
    variantsEqual(item.variant, variant) &&
    colorsEqual(item.color, color)
  );
}

// Знайти саму позицію (зручно для сторінок, щоб не імпортувати variantsEqual окремо)
function getItem(productId, variant = null, color = null) {
  return getItems().find(item =>
    item.id === productId &&
    variantsEqual(item.variant, variant) &&
    colorsEqual(item.color, color)
  ) || null;
}

// Додати товар у кошик або збільшити кількість тієї самої конфігурації
function add(productId, quantity = 1, variant = null, color = null, image = null) {
  const items = getItems();
  const index = findIndex(items, productId, variant, color);

  if (index > -1) {
    items[index].quantity += quantity;
  } else {
    items.push({ id: productId, quantity, variant, color, image });
  }

  saveItems(items);
}

// Видалити конкретну позицію (id + variant + color)
function remove(productId, variant = null, color = null) {
  const items = getItems().filter(item => !(
    item.id === productId &&
    variantsEqual(item.variant, variant) &&
    colorsEqual(item.color, color)
  ));
  saveItems(items);
}

// Оновити кількість конкретної позиції (0 або менше — видаляє)
function updateQuantity(productId, quantity, variant = null, color = null) {
  if (quantity <= 0) {
    remove(productId, variant, color);
    return;
  }
  const items = getItems();
  const index = findIndex(items, productId, variant, color);
  if (index > -1) {
    items[index].quantity = quantity;
    saveItems(items);
  }
}

// Загальна кількість одиниць товару в кошику (для іконки в header)
function getQuantity() {
  return getItems().reduce((sum, item) => sum + item.quantity, 0);
}

// Очистити кошик повністю (напр. після оформлення замовлення)
function clear() {
  saveItems([]);
}

export const cart = {
  getItems,
  getItem,
  add,
  remove,
  updateQuantity,
  getQuantity,
  clear
};