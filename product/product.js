// Логіка сторінки товару: рендер даних, галерея, вибір варіанту (RAM/storage),
// quantity, add to cart/favorites, схожі товари
import { initHeader } from '../assets/js/header.js';
import { cart } from '../assets/js/cart.js';
import { favorites } from '../assets/js/favorites.js';
import { formatCurrency, escapeHtml, getUrlParam } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

let currentProduct = null;
let quantity = 1;

// Поточний вибір варіанту (null для товарів без variants)
let selectedVariant = null;
let selectedColor = null;

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

// ===== Показати стан "товар не знайдено" =====
function showNotFound() {
  document.querySelector('[data-not-found]').hidden = false;
  document.querySelector('[data-product-content]').hidden = true;
}

// ===== ГАЛЕРЕЯ =====
function renderGallery(product) {
  const mainImg = document.querySelector('[data-gallery-main]');
  const thumbsContainer = document.querySelector('[data-gallery-thumbs]');

  mainImg.src = `../${product.images[0]}`;
  mainImg.alt = product.name;

  if (product.images.length <= 1) {
    thumbsContainer.hidden = true;
    return;
  }

  thumbsContainer.hidden = false;
  thumbsContainer.innerHTML = product.images.map((img, i) => `
    <button class="product-gallery__thumb ${i === 0 ? 'is-active' : ''}" data-thumb-index="${i}">
      <img src="../${img}" alt="${escapeHtml(product.name)} ${i + 1}">
    </button>
  `).join('');

  thumbsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-thumb-index]');
    if (!btn) return;
    const index = Number(btn.dataset.thumbIndex);
    mainImg.src = `../${product.images[index]}`;
    thumbsContainer.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
  });
}

// ===== ВИБІР ВАРІАНТУ (RAM / Storage) =====

// Знайти variant, що відповідає обраним storage+ram; якщо точного збігу нема — 
// підбираємо перший variant з тим самим storage (напр. якщо RAM-опції не перетинаються)
function resolveVariant(storageValue, ramValue) {
  const exact = currentProduct.variants.find(v => v.storage === storageValue && v.ram === ramValue);
  if (exact) return exact;
  return currentProduct.variants.find(v => v.storage === storageValue) || currentProduct.variants[0];
}

function renderVariantSelectors() {
  const container = document.querySelector('[data-variant-selectors]');

  if (!currentProduct.variants || currentProduct.variants.length === 0) {
    container.innerHTML = '';
    return;
  }

  const storages = [...new Set(currentProduct.variants.map(v => v.storage))];
  const rams = [...new Set(currentProduct.variants.map(v => v.ram))];

  // Ініціалізуємо тільки один раз — інакше кожен ре-рендер після кліку
  // затирав би щойно обраний варіант назад на перший
  if (!selectedVariant) {
    selectedVariant = currentProduct.variants[0];
  }

  let html = `
    <div class="variant-group" data-variant-group="storage">
      <div class="variant-group__label"><span>Storage</span> <span>${escapeHtml(selectedVariant.storage)}</span></div>
      <div class="variant-buttons">
        ${storages.map(s => `
          <button class="variant-btn ${s === selectedVariant.storage ? 'is-active' : ''}" data-storage-value="${escapeHtml(s)}">
            ${escapeHtml(s)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  if (rams.length > 1) {
    html += `
      <div class="variant-group" data-variant-group="ram">
        <div class="variant-group__label"><span>Memory</span> <span>${escapeHtml(selectedVariant.ram)}</span></div>
        <div class="variant-buttons">
          ${rams.map(r => `
            <button class="variant-btn ${r === selectedVariant.ram ? 'is-active' : ''}" data-ram-value="${escapeHtml(r)}">
              ${escapeHtml(r)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  updatePriceAndSpecsFromVariant();
}

function renderColors(product) {
  const container = document.querySelector('[data-color-selector]');

  if (!product.colors?.length) {
    container.innerHTML = '';
    selectedColor = null;
    return;
  }

  if (!selectedColor) {
    selectedColor = product.colors[0];
  }

  container.innerHTML = `
    <div class="color-picker">
      <p class="color-picker__label">Колір: <strong data-color-name>${escapeHtml(selectedColor.name)}</strong></p>
      <div class="color-picker__list" role="radiogroup" aria-label="Вибір кольору">
        ${product.colors.map(color => {
          const isActive = color.id === selectedColor.id;
          const swatch = /^#[\da-f]{6}$/i.test(color.hex) ? color.hex : '#000000';
          return `
            <button type="button"
                    class="color-swatch ${isActive ? 'is-active' : ''}"
                    style="--swatch: ${swatch}"
                    data-color="${escapeHtml(color.id)}"
                    role="radio"
                    aria-checked="${isActive}"
                    aria-label="${escapeHtml(color.name)}"
                    title="${escapeHtml(color.name)}"></button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function setupColorListeners() {
  const container = document.querySelector('[data-color-selector]');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-swatch');
    if (!btn || !container.contains(btn)) return;

    selectedColor = currentProduct.colors.find(color => color.id === btn.dataset.color);
    if (!selectedColor) return;

    container.querySelectorAll('.color-swatch').forEach(swatch => {
      const isActive = swatch === btn;
      swatch.classList.toggle('is-active', isActive);
      swatch.setAttribute('aria-checked', String(isActive));
    });

    container.querySelector('[data-color-name]').textContent = selectedColor.name;

    const mainImg = document.querySelector('[data-gallery-main]');
    mainImg.src = `../${selectedColor.image}`;
    document.querySelectorAll('.product-gallery__thumb').forEach(thumb => {
      thumb.classList.remove('is-active');
    });
  });
}

// Оновити ціну і специфікації відповідно до обраного варіанту
function updatePriceAndSpecsFromVariant() {
  const price = selectedVariant ? selectedVariant.price : currentProduct.price;
  document.querySelector('[data-product-price]').textContent = formatCurrency(price);

  // Специфікації: підміняємо storage/ram обраними значеннями, решту залишаємо як є
  const specs = { ...currentProduct.specs };
  if (selectedVariant) {
    specs.storage = selectedVariant.storage;
    specs.ram = selectedVariant.ram;
  }
  renderSpecsList(specs);
}

function renderSpecsList(specs) {
  const specsList = document.querySelector('[data-product-specs]');
  specsList.innerHTML = Object.entries(specs)
    .filter(([, value]) => value && value !== 'N/A')
    .map(([key, value]) => `
      <dt>${escapeHtml(key.toUpperCase())}</dt>
      <dd>${escapeHtml(value)}</dd>
    `).join('');
}

// ===== ІНФО-БЛОК =====
function renderProductInfo(product) {
  document.querySelector('[data-product-brand]').textContent = product.brand;
  document.querySelector('[data-product-name]').textContent = product.name;
  document.querySelector('[data-product-rating]').textContent =
    `${renderStars(product.rating)} ${product.rating}`;

  selectedVariant = null; // скидаємо перед першою ініціалізацією для нового товару
  renderVariantSelectors();
  renderColors(product);

  if (!product.variants) {
    document.querySelector('[data-product-price]').textContent = formatCurrency(product.price);
    renderSpecsList(product.specs);
  }

  setupVariantListeners(); // ← додати один раз, окремо від рендеру
  updateFavButton();
}

// Обробник кліків по кнопках варіантів — вішається ОДИН раз, не при кожному рендері
function setupVariantListeners() {
  const container = document.querySelector('[data-variant-selectors]');

  container.addEventListener('click', (e) => {
    if (!currentProduct.variants) return;

    const storageBtn = e.target.closest('[data-storage-value]');
    const ramBtn = e.target.closest('[data-ram-value]');
    if (!storageBtn && !ramBtn) return;

    const newStorage = storageBtn ? storageBtn.dataset.storageValue : selectedVariant.storage;
    const newRam = ramBtn ? ramBtn.dataset.ramValue : selectedVariant.ram;

    selectedVariant = resolveVariant(newStorage, newRam);
    renderVariantSelectors(); // тепер safe: більше не скидає selectedVariant, бо він уже не null
  });
}

function updateFavButton() {
  const btn = document.querySelector('[data-fav-btn]');
  const isFav = favorites.has(currentProduct.id);
  btn.classList.toggle('is-active', isFav);
}

// ===== QUANTITY SELECTOR =====
function updateQuantityDisplay() {
  document.querySelector('[data-qty-value]').textContent = quantity;
}

function setupQuantitySelector() {
  document.querySelector('[data-qty-decrease]').addEventListener('click', () => {
    if (quantity > 1) quantity--;
    updateQuantityDisplay();
  });

  document.querySelector('[data-qty-increase]').addEventListener('click', () => {
    quantity++;
    updateQuantityDisplay();
  });
}

// ===== ACTIONS: ADD TO CART / FAVORITES =====
function setupActions() {
  document.querySelector('[data-add-to-cart]').addEventListener('click', () => {
    const color = selectedColor
      ? { id: selectedColor.id, name: selectedColor.name, hex: selectedColor.hex }
      : null;
    const image = selectedColor?.image ?? currentProduct.images?.[0] ?? currentProduct.image;
    cart.add(currentProduct.id, quantity, selectedVariant, color, image);
    const variantLabel = selectedVariant ? ` (${selectedVariant.storage})` : '';
    toast.success(`Added ${quantity} × ${currentProduct.name}${variantLabel} to cart`);
    quantity = 1;
    updateQuantityDisplay();
  });

  document.querySelector('[data-fav-btn]').addEventListener('click', () => {
    const nowActive = favorites.toggle(currentProduct.id);
    toast[nowActive ? 'success' : 'info'](
      nowActive ? 'Added to favorites' : 'Removed from favorites'
    );
    updateFavButton();
  });
}

// ===== СХОЖІ ТОВАРИ =====
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

function renderRelatedProducts(allProducts, product) {
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const grid = document.querySelector('[data-related-grid]');
  grid.innerHTML = related.map(productCardTemplate).join('');

  grid.addEventListener('click', (e) => {
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
      cart.add(productId, 1); // схожі товари додаються без варіанту (базова ціна)
      toast.success('Added to cart');
      btn.classList.add('is-active');
    }
  });
}

// ===== INIT =====
async function init() {
  initHeader();

  const productId = getUrlParam('id');
  if (!productId) {
    showNotFound();
    return;
  }

  try {
    const allProducts = await fetchJson('../data/products.json');
    const product = allProducts.find(p => p.id === productId);

    if (!product) {
      showNotFound();
      return;
    }

    currentProduct = product;

    document.querySelector('[data-not-found]').hidden = true;
    document.querySelector('[data-product-content]').hidden = false;

    renderGallery(product);
    renderProductInfo(product);
    setupColorListeners();
    setupQuantitySelector();
    setupActions();
    renderRelatedProducts(allProducts, product);

    document.title = `${product.name} — Apple Store`;
  } catch (err) {
    console.error('Failed to load product:', err);
    toast.error('Failed to load product data');
  }
}

document.addEventListener('DOMContentLoaded', init);