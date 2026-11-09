// Логіка header'а: тема, лічильник кошика/обраного, мобільне меню, пошук з автопідказками
import { initTheme, toggleTheme } from './theme.js';
import { cart } from './cart.js';
import { favorites } from './favorites.js';
import { auth } from './auth.js';
import { escapeHtml, debounce } from './utils.js';

const MAX_SUGGESTIONS = 5;

function updateCartCount() {
  const el = document.querySelector('[data-cart-count]');
  if (!el) return;
  const qty = cart.getQuantity();
  el.textContent = qty;
  el.hidden = qty === 0;
}

function updateFavoritesCount() {
  const el = document.querySelector('[data-favorites-count]');
  if (!el) return;
  const count = favorites.getCount();
  el.textContent = count;
  el.hidden = count === 0;
}

// Оновлює посилання/іконку акаунту залежно від стану входу
function updateAccountLink() {
  const link = document.querySelector('[data-account-link]');
  if (!link) return;

  const user = auth.getCurrentUser();
  if (user) {
    link.href = '../account/account.html';
    link.setAttribute('aria-label', `Account (${user.name})`);
  } else {
    link.href = '../auth/auth.html';
    link.setAttribute('aria-label', 'Sign in');
  }
}

function setupThemeToggle() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  btn.addEventListener('click', () => toggleTheme());
}

function setupMobileMenu() {
  const toggleBtn = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggleBtn.classList.toggle('is-open', isOpen);
    toggleBtn.textContent = isOpen ? '✕' : '☰';
  });
}

function setupSearch() {
  const toggleBtn = document.querySelector('[data-search-toggle]');
  const input = document.querySelector('[data-search-input]');
  if (!toggleBtn || !input) return;

  // Обгортаємо input у контейнер для абсолютно позиціонованого dropdown-списку.
  const wrapper = document.createElement('div');
  wrapper.className = 'header-search-wrapper';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const dropdown = document.createElement('div');
  dropdown.className = 'header-search-dropdown';
  wrapper.appendChild(dropdown);

  let productsCache = null;

  async function ensureProducts() {
    if (productsCache) return productsCache;
    try {
      const res = await fetch('../data/products.json');
      productsCache = await res.json();
    } catch (err) {
      console.error('Failed to load products for search suggestions:', err);
      productsCache = [];
    }
    return productsCache;
  }

  function closeDropdown() {
    dropdown.innerHTML = '';
    dropdown.classList.remove('is-open');
  }

  function renderSuggestions(matches) {
    if (matches.length === 0) {
      closeDropdown();
      return;
    }

    dropdown.innerHTML = matches.map(p => `
      <button class="header-search-suggestion" data-suggestion-id="${p.id}">
        <img src="../${p.images[0]}" alt="">
        <span>${escapeHtml(p.name)}</span>
      </button>
    `).join('');
    dropdown.classList.add('is-open');
  }

  const handleInput = debounce(async () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      closeDropdown();
      return;
    }

    const products = await ensureProducts();
    const matches = products
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, MAX_SUGGESTIONS);

    renderSuggestions(matches);
  }, 200);

  input.addEventListener('input', handleInput);

  dropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-suggestion-id]');
    if (!btn) return;
    window.location.href = `../product/product.html?id=${btn.dataset.suggestionId}`;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
      return;
    }
    if (e.key !== 'Enter') return;
    const query = input.value.trim();
    if (!query) return;
    window.location.href = `../catalog/catalog.html?search=${encodeURIComponent(query)}`;
  });

  toggleBtn.addEventListener('click', () => {
    input.classList.toggle('is-open');
    if (input.classList.contains('is-open')) {
      input.focus();
    } else {
      closeDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.classList.contains('is-open')) return;
    if (e.target.closest('[data-search-toggle]') || e.target.closest('.header-search-wrapper')) return;
    input.classList.remove('is-open');
    closeDropdown();
  });
}

// Головна функція ініціалізації header — викликати на кожній сторінці
export function initHeader() {
  initTheme();
  updateCartCount();
  updateFavoritesCount();
  updateAccountLink();
  setupThemeToggle();
  setupMobileMenu();
  setupSearch();

  window.addEventListener('cart:updated', updateCartCount);
  window.addEventListener('favorites:updated', updateFavoritesCount);
  window.addEventListener('auth:changed', updateAccountLink);
}