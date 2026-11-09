// Логіка сторінки кошика: об'єднання cart.js (id+qty+variant) з products.json,
// рендер рядків, +/-, видалення, підрахунок сум, checkout
import { initHeader } from '../assets/js/header.js';
import { cart } from '../assets/js/cart.js';
import { auth } from '../assets/js/auth.js';
import { orders } from '../assets/js/orders.js';
import { formatCurrency, escapeHtml } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

const SHIPPING_COST = 9.99;
const FREE_SHIPPING_THRESHOLD = 500;

let allProducts = [];

// ===== Завантаження JSON =====
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ===== Об'єднання cart items з даними товарів. Ціна/сторедж беруться з variant, якщо він є =====
function getEnrichedCartItems() {
  const items = cart.getItems();
  return items
    .map(item => {
      const product = allProducts.find(p => p.id === item.id);
      if (!product) return null;
      return {
        ...product,
        quantity: item.quantity,
        variant: item.variant, // { ram, storage, price } | null
        color: item.color || null,
        image: item.image || product.images[0],
        price: item.variant ? item.variant.price : product.price
      };
    })
    .filter(Boolean);
}

// ===== Рядок товару в кошику =====
function cartItemTemplate(item) {
  const lineTotal = item.price * item.quantity;
  const specLabel = item.variant
    ? `${item.variant.storage} · ${item.variant.ram} RAM`
    : item.specs.storage;
  const colorLine = item.color
    ? `<p class="cart-item__color">
         <span class="cart-item__dot" style="--swatch: ${/^#[\da-f]{6}$/i.test(item.color.hex) ? item.color.hex : '#000000'}"></span>
         ${escapeHtml(item.color.name)}
       </p>`
    : '';

  // Зберігаємо variant і колір у data-атрибутах для адресації саме цієї позиції
  const variantAttrs = item.variant
    ? `data-variant-storage="${escapeHtml(item.variant.storage)}" data-variant-ram="${escapeHtml(item.variant.ram)}" data-variant-price="${item.variant.price}"`
    : '';
  const colorAttrs = item.color
    ? `data-color-id="${escapeHtml(item.color.id)}"`
    : '';

  return `
    <div class="cart-item" data-cart-item-id="${escapeHtml(item.id)}" ${variantAttrs} ${colorAttrs}>
      <img src="../${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item__image">

      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__spec">${escapeHtml(specLabel)}</div>
        ${colorLine}
        <div class="cart-item__price">${formatCurrency(item.price)} each</div>
      </div>

      <div class="cart-item__controls">
        <div class="cart-item__qty">
          <button data-qty-decrease aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button data-qty-increase aria-label="Increase quantity">+</button>
        </div>
        <button class="cart-item__remove" data-remove-btn aria-label="Remove item">✕</button>
      </div>

      <div class="cart-item__subtotal">${formatCurrency(lineTotal)}</div>
    </div>
  `;
}

// ===== Підрахунок сум =====
function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

// ===== Рендер усієї сторінки =====
function render() {
  const items = getEnrichedCartItems();
  const emptyState = document.querySelector('[data-cart-empty]');
  const content = document.querySelector('[data-cart-content]');

  if (items.length === 0) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  emptyState.hidden = true;
  content.hidden = false;

  document.querySelector('[data-cart-items]').innerHTML = items.map(cartItemTemplate).join('');

  const { subtotal, shipping, total } = calculateTotals(items);
  document.querySelector('[data-subtotal]').textContent = formatCurrency(subtotal);
  document.querySelector('[data-shipping]').textContent = shipping === 0 ? 'Free' : formatCurrency(shipping);
  document.querySelector('[data-total]').textContent = formatCurrency(total);

  const hint = document.querySelector('[data-shipping-hint]');
  if (shipping > 0) {
    const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
    hint.textContent = `Add ${formatCurrency(remaining)} more for free shipping`;
  } else {
    hint.textContent = '';
  }
}

// Дістати variant-об'єкт з data-атрибутів рядка (або null)
function getVariantFromRow(row) {
  if (!row.dataset.variantStorage) return null;
  return {
    storage: row.dataset.variantStorage,
    ram: row.dataset.variantRam,
    price: Number(row.dataset.variantPrice)
  };
}

function getColorFromRow(row) {
  return row.dataset.colorId ? { id: row.dataset.colorId } : null;
}

// ===== Обробники подій =====
function setupEventListeners() {
  document.querySelector('[data-cart-items]').addEventListener('click', (e) => {
    const row = e.target.closest('[data-cart-item-id]');
    if (!row) return;
    const productId = row.dataset.cartItemId;
    const variant = getVariantFromRow(row);
    const color = getColorFromRow(row);
    const currentItem = cart.getItem(productId, variant, color);
    const currentQty = currentItem ? currentItem.quantity : 0;

    if (e.target.closest('[data-qty-increase]')) {
      cart.updateQuantity(productId, currentQty + 1, variant, color);
      render();
    }

    if (e.target.closest('[data-qty-decrease]')) {
      cart.updateQuantity(productId, currentQty - 1, variant, color);
      render();
    }

    if (e.target.closest('[data-remove-btn]')) {
      cart.remove(productId, variant, color);
      toast.info('Item removed from cart');
      render();
    }
  });

  document.querySelector('[data-checkout-btn]').addEventListener('click', () => {
    const user = auth.getCurrentUser();

    if (!user) {
      toast.error('Please sign in to place an order');
      window.location.href = '../auth/auth.html';
      return;
    }

    const items = getEnrichedCartItems();
    const { total } = calculateTotals(items);

    orders.createOrder(user.email, items, total);
    cart.clear();
    toast.success('Order placed!');
    render();
  });

  window.addEventListener('cart:updated', render);
}

// ===== INIT =====
async function init() {
  initHeader();

  try {
    allProducts = await fetchJson('../data/products.json');
    setupEventListeners();
    render();
  } catch (err) {
    console.error('Failed to load cart:', err);
    toast.error('Failed to load cart data');
  }
}

document.addEventListener('DOMContentLoaded', init);