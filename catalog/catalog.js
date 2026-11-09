// Логіка сторінки каталогу: фільтри, сортування, пошук, синхронізація з URL
import { initHeader } from '../assets/js/header.js';
import { cart } from '../assets/js/cart.js';
import { favorites } from '../assets/js/favorites.js';
import { formatCurrency, escapeHtml, debounce, getUrlParam } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

let allProducts = [];

// Поточний стан фільтрів (джерело правди, синхронізується з URL)
const state = {
  search: '',
  categories: [],
  brands: [],
  years: [],
  priceMin: null,
  priceMax: null,
  sort: 'default'
};

// ===== Завантаження JSON =====
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ===== Ініціалізація стану з URL (щоб посилання зі старими фільтрами працювали) =====
function loadStateFromUrl() {
  state.search = getUrlParam('search') || '';
  state.categories = (getUrlParam('category') || '').split(',').filter(Boolean);
  state.brands = (getUrlParam('brand') || '').split(',').filter(Boolean);
  state.years = (getUrlParam('year') || '').split(',').filter(Boolean).map(Number);
  state.priceMin = getUrlParam('minPrice') ? Number(getUrlParam('minPrice')) : null;
  state.priceMax = getUrlParam('maxPrice') ? Number(getUrlParam('maxPrice')) : null;
  state.sort = getUrlParam('sort') || 'default';
}

// ===== Запис стану в URL (без перезавантаження сторінки) =====
function syncStateToUrl() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.categories.length) params.set('category', state.categories.join(','));
  if (state.brands.length) params.set('brand', state.brands.join(','));
  if (state.years.length) params.set('year', state.years.join(','));
  if (state.priceMin !== null) params.set('minPrice', state.priceMin);
  if (state.priceMax !== null) params.set('maxPrice', state.priceMax);
  if (state.sort !== 'default') params.set('sort', state.sort);

  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? '?' + query : ''}`;
  history.pushState(state, '', newUrl);
}

// ===== Рендер зірок рейтингу =====
function renderStars(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ===== Картка товару (той самий шаблон, що на index.js) =====
function productCardTemplate(product) {
  const isFav = favorites.has(product.id);
  return `
    <div class="product-card" data-product-id="${product.id}">
      <button class="product-card__fav ${isFav ? 'is-active' : ''}" data-fav-btn aria-label="Toggle favorite">
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

// ===== Побудова фільтрів (checkboxes) з реальних даних товарів =====
function renderFilterCheckboxes(containerSelector, values, selectedValues, groupName) {
  const container = document.querySelector(containerSelector);
  container.innerHTML = values.map(value => `
    <label class="filter-checkbox">
      <input
        type="checkbox"
        name="${groupName}"
        value="${escapeHtml(value)}"
        ${selectedValues.includes(value) ? 'checked' : ''}
      >
      ${escapeHtml(value)}
    </label>
  `).join('');
}

function initFilterOptions() {
  const categories = [...new Set(allProducts.map(p => p.category))];
  const brands = [...new Set(allProducts.map(p => p.brand))];
  const years = [...new Set(allProducts.map(p => p.year))].sort((a, b) => b - a);

  renderFilterCheckboxes('[data-filter-categories]', categories, state.categories, 'category');
  renderFilterCheckboxes('[data-filter-brands]', brands, state.brands, 'brand');
  renderFilterCheckboxes('[data-filter-years]', years, state.years, 'year');

  // Заповнюємо поля пошуку/ціни збереженим станом (напр. при поверненні по кнопці "назад")
  document.querySelector('[data-filter-search]').value = state.search;
  document.querySelector('[data-filter-price-min]').value = state.priceMin ?? '';
  document.querySelector('[data-filter-price-max]').value = state.priceMax ?? '';
  document.querySelector('[data-sort-select]').value = state.sort;
}

// ===== Фільтрація + сортування =====
function getFilteredProducts() {
  let result = allProducts.filter(product => {
    const matchesSearch = !state.search ||
      product.name.toLowerCase().includes(state.search.toLowerCase());

    const matchesCategory = state.categories.length === 0 ||
      state.categories.includes(product.category);

    const matchesBrand = state.brands.length === 0 ||
      state.brands.includes(product.brand);

    const matchesYear = state.years.length === 0 ||
      state.years.includes(product.year);

    const matchesMinPrice = state.priceMin === null || product.price >= state.priceMin;
    const matchesMaxPrice = state.priceMax === null || product.price <= state.priceMax;

    return matchesSearch && matchesCategory && matchesBrand && matchesYear && matchesMinPrice && matchesMaxPrice;
  });

  switch (state.sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    // 'default' — залишаємо порядок з JSON
  }

  return result;
}

// ===== Рендер сітки товарів =====
function renderGrid() {
  const filtered = getFilteredProducts();
  const grid = document.querySelector('[data-catalog-grid]');
  const emptyMsg = document.querySelector('[data-catalog-empty]');
  const countEl = document.querySelector('[data-results-count]');

  countEl.textContent = `${filtered.length} products`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }

  emptyMsg.hidden = true;
  grid.innerHTML = filtered.map(productCardTemplate).join('');
}

// ===== Обробники подій фільтрів =====
function setupFilterListeners() {
  // Пошук з debounce, щоб не фільтрувати на кожну натиснуту клавішу
  const searchInput = document.querySelector('[data-filter-search]');
  searchInput.addEventListener('input', debounce((e) => {
    state.search = e.target.value.trim();
    syncStateToUrl();
    renderGrid();
  }, 300));

  // Категорії (делегування на контейнер checkbox'ів)
  document.querySelector('[data-filter-categories]').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    state.categories = getCheckedValues('[data-filter-categories]');
    syncStateToUrl();
    renderGrid();
  });

  // Бренди
  document.querySelector('[data-filter-brands]').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    state.brands = getCheckedValues('[data-filter-brands]');
    syncStateToUrl();
    renderGrid();
  });

  // Роки
  document.querySelector('[data-filter-years]').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    state.years = getCheckedValues('[data-filter-years]').map(Number);
    syncStateToUrl();
    renderGrid();
  });

  // Ціна (min/max)
  const priceMin = document.querySelector('[data-filter-price-min]');
  const priceMax = document.querySelector('[data-filter-price-max]');

  const handlePriceChange = debounce(() => {
    state.priceMin = priceMin.value ? Number(priceMin.value) : null;
    state.priceMax = priceMax.value ? Number(priceMax.value) : null;
    syncStateToUrl();
    renderGrid();
  }, 300);

  priceMin.addEventListener('input', handlePriceChange);
  priceMax.addEventListener('input', handlePriceChange);

  // Сортування
  document.querySelector('[data-sort-select]').addEventListener('change', (e) => {
    state.sort = e.target.value;
    syncStateToUrl();
    renderGrid();
  });

  // Скидання всіх фільтрів
  document.querySelector('[data-filter-reset]').addEventListener('click', () => {
    state.search = '';
    state.categories = [];
    state.brands = [];
    state.years = [];
    state.priceMin = null;
    state.priceMax = null;
    state.sort = 'default';

    initFilterOptions(); // повертає поля вводу до дефолтного вигляду
    syncStateToUrl();
    renderGrid();
  });

  // Клік по картці товару (favorite / add to cart) — делегування
  document.querySelector('[data-catalog-grid]').addEventListener('click', (e) => {
    const card = e.target.closest('[data-product-id]');
    if (!card) return;
    const productId = card.dataset.productId;

    if (e.target.closest('[data-fav-btn]')) {
      e.preventDefault();
      const btn = e.target.closest('[data-fav-btn]');
      const nowActive = favorites.toggle(productId);
      toast[nowActive ? 'success' : 'info'](
        nowActive ? 'Added to favorites' : 'Removed from favorites'
      );
      btn.classList.toggle('is-active', nowActive);
    }

    if (e.target.closest('[data-add-btn]')) {
      e.preventDefault();
      const btn = e.target.closest('[data-add-btn]');
      cart.add(productId, 1);
      toast.success('Added to cart');
      btn.classList.add('is-active');
    }
  });
}

function setupFiltersToggle() {
  const panel = document.getElementById('filtersPanel');
  const toggle = document.querySelector('.filters-toggle');
  const closeBtn = document.querySelector('.filters-close');
  const overlay = document.querySelector('.filters-overlay');

  const open = () => {
    panel.classList.add('is-open');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    panel.classList.remove('is-open');
    overlay.hidden = true;
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);
}

// Хелпер: зібрати значення відмічених checkbox'ів у групі
function getCheckedValues(containerSelector) {
  return [...document.querySelectorAll(`${containerSelector} input:checked`)]
    .map(input => input.value);
}

// ===== Реакція на кнопки "назад"/"вперед" браузера =====
window.addEventListener('popstate', () => {
  loadStateFromUrl();
  initFilterOptions();
  renderGrid();
});

// ===== INIT =====
async function init() {
  initHeader();
  loadStateFromUrl();

  try {
    allProducts = await fetchJson('../data/products.json');
    initFilterOptions();
    setupFilterListeners();
    setupFiltersToggle();
    renderGrid();
  } catch (err) {
    console.error('Failed to load catalog:', err);
    toast.error('Failed to load products');
  }
}

document.addEventListener('DOMContentLoaded', init);