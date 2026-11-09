// Логіка сторінки обраного: об'єднання favorites.js (список id) з products.json
import { initHeader } from '../assets/js/header.js';
import { cart } from '../assets/js/cart.js';
import { favorites } from '../assets/js/favorites.js';
import { formatCurrency, escapeHtml } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

let allProducts = [];

// ===== Завантаження JSON =====
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ===== Рендер зірок рейтингу =====
function renderStars(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ===== Картка товару (той самий шаблон, що в index/catalog/product) =====
function productCardTemplate(product) {
  return `
    <div class="product-card" data-product-id="${product.id}">
      <button class="product-card__fav is-active" data-fav-btn aria-label="Remove from favorites">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.2 6.5 4.1 4.8c2.2-1.3 4.8-.7 6.4 1.1L12 7.4l1.5-1.5c1.6-1.8 4.2-2.4 6.4-1.1 2.9 1.7 3.3 5.3 1.4 8.1C18.7 16.65 12 21 12 21z"/>
        </svg>
      </button>
      <a href="../product/product.html?id=${product.id}">
        <img src="../${product.images[0]}" alt="${escapeHtml(product.name)}" class="product-card__image">
        <div class="product-card__name">${escapeHtml(product.name)}</div>
        <div class="product-card__spec">${escapeHtml(product.specs.cpu)} · ${escapeHtml(product.specs.storage)}</div>
        <div class="product-card__rating">${renderStars(product.rating)} ${product.rating}</div>
      </a>
      <div class="product-card__footer">
        <span class="product-card__price">${formatCurrency(product.price)}</span>
        <button class="product-card__add ${cart.getItems().some(i => i.id === product.id) ? 'is-active' : ''}" data-add-btn aria-label="Add to cart">
          <svg class="icon-plus" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <svg class="icon-check" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ===== Рендер сторінки =====
function render() {
  const favIds = favorites.getItems();
  const favProducts = allProducts.filter(p => favIds.includes(p.id));

  const emptyState = document.querySelector('[data-favorites-empty]');
  const grid = document.querySelector('[data-favorites-grid]');

  if (favProducts.length === 0) {
    emptyState.hidden = false;
    grid.innerHTML = '';
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = favProducts.map(productCardTemplate).join('');
}

// ===== Обробники подій (делегування на сітку) =====
function setupEventListeners() {
  document.querySelector('[data-favorites-grid]').addEventListener('click', (e) => {
    const card = e.target.closest('[data-product-id]');
    if (!card) return;
    const productId = card.dataset.productId;

    if (e.target.closest('[data-fav-btn]')) {
      e.preventDefault();
      favorites.remove(productId); // на цій сторінці кнопка серця тільки видаляє
      toast.info('Removed from favorites');
      render(); // прибираємо картку з сітки одразу
    }

    if (e.target.closest('[data-add-btn]')) {
      e.preventDefault();
      const btn = e.target.closest('[data-add-btn]');
      cart.add(productId, 1);
      toast.success('Added to cart');
      btn.classList.add('is-active');
    }
  });

  // Якщо favorites змінились з іншої сторінки — перерендерити
  window.addEventListener('favorites:updated', render);
}

// ===== INIT =====
async function init() {
  initHeader();

  try {
    allProducts = await fetchJson('../data/products.json');
    setupEventListeners();
    render();
  } catch (err) {
    console.error('Failed to load favorites:', err);
    toast.error('Failed to load favorites');
  }
}

document.addEventListener('DOMContentLoaded', init);