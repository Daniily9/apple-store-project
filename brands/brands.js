// Логіка сторінки брендів: рендер карток, підрахунок товарів на бренд
import { initHeader } from '../assets/js/header.js';
import { escapeHtml } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

// ===== Завантаження JSON =====
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ===== Картка бренду =====
function brandCardTemplate(brand, productCount) {
  const initial = brand.name.charAt(0).toUpperCase();

  return `
    <a href="../catalog/catalog.html?brand=${encodeURIComponent(brand.name)}" class="brand-card">
      <div class="brand-card__logo">${initial}</div>
      <div class="brand-card__body">
        <div class="brand-card__name">${escapeHtml(brand.name)}</div>
        <p class="brand-card__description">${escapeHtml(brand.description)}</p>
        <span class="brand-card__count">${productCount} products</span>
      </div>
    </a>
  `;
}

// ===== Рендер сітки брендів =====
function renderBrands(brands, products) {
  const grid = document.querySelector('[data-brands-grid]');

  grid.innerHTML = brands.map(brand => {
    const productCount = products.filter(p => p.brand === brand.name).length;
    return brandCardTemplate(brand, productCount);
  }).join('');
}

// ===== INIT =====
async function init() {
  initHeader();

  try {
    const [brands, products] = await Promise.all([
      fetchJson('../data/brands.json'),
      fetchJson('../data/products.json')
    ]);

    renderBrands(brands, products);
  } catch (err) {
    console.error('Failed to load brands:', err);
    toast.error('Failed to load brands');
  }
}

document.addEventListener('DOMContentLoaded', init);