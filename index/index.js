// Логіка головної сторінки: завантаження даних, рендер секцій, hero-слайдер
import { initHeader } from '../assets/js/header.js';
import { cart } from '../assets/js/cart.js';
import { favorites } from '../assets/js/favorites.js';
import { formatCurrency, escapeHtml } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

// Дані слайдів (маркетинговий контент, не з JSON)
const HERO_SLIDES = [
  {
    badge: 'New',
    title: 'iPhone 17 Pro',
    subtitle: 'The ultimate iPhone. Engineered for performance.',
    price: 'From €1,199',
    image: '../assets/images/hero-iphone-17-pro.png',
    link: '../product/product.html?id=prod-001'
  },
  {
    badge: 'New',
    title: 'iPad Pro',
    subtitle: 'Supercharged by the M4 chip. Unbelievably thin.',
    price: 'From €1,099',
    image: '../assets/images/hero-ipad-pro.png',
    link: '../product/product.html?id=prod-005'
  },
  {
    badge: 'New',
    title: 'MacBook Pro',
    subtitle: 'Mind-blowing. Head-turning. Best-in-class.',
    price: 'From €1,999',
    image: '../assets/images/hero-macbook-pro.png',
    link: '../product/product.html?id=prod-009'
  },
  {
    badge: 'New',
    title: 'Apple Watch Ultra 2',
    subtitle: 'Adventure awaits. Are you ready?',
    price: 'From €899',
    image: '../assets/images/hero-watch-ultra.png',
    link: '../product/product.html?id=prod-017'
  }
];

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

// ===== HERO SLIDER (справжня карусель через transform на треку) =====
function renderHeroTrack() {
  const track = document.querySelector('[data-hero-track]');
  track.innerHTML = HERO_SLIDES.map(slide => `
    <div class="hero__slide">
      <div class="hero__content">
        <span class="hero__badge">${escapeHtml(slide.badge)}</span>
        <h1 class="hero__title">${escapeHtml(slide.title)}</h1>
        <p class="hero__subtitle">${escapeHtml(slide.subtitle)}</p>
        <span class="hero__price">${escapeHtml(slide.price)}</span>
        <div class="hero__actions">
          <a href="${slide.link}" class="btn btn--dark">Buy now</a>
          <a href="${slide.link}" class="btn btn--outline">Learn more</a>
        </div>
      </div>
      <img src="${slide.image}" alt="${escapeHtml(slide.title)}" class="hero__slide-image">
    </div>
  `).join('');
}

function initHeroSlider() {
  const track = document.querySelector('[data-hero-track]');
  const dotsContainer = document.querySelector('[data-hero-dots]');
  let current = 0;
  let autoplayTimer = null;

  function renderDots() {
    dotsContainer.innerHTML = HERO_SLIDES
      .map((_, i) => `<button class="hero__dot ${i === current ? 'is-active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`)
      .join('');
  }

  function goToSlide(index) {
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    renderDots();
    resetAutoplay();
  }

  function nextSlide() {
    goToSlide((current + 1) % HERO_SLIDES.length);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    if (HERO_SLIDES.length > 1) {
      autoplayTimer = setInterval(nextSlide, 5000);
    }
  }

  renderHeroTrack();
  renderDots();
  resetAutoplay();

  dotsContainer.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-index]');
    if (!dot) return;
    goToSlide(Number(dot.dataset.index));
  });
}

// ===== CATEGORY GRID =====
function renderCategories(categories) {
  const grid = document.querySelector('[data-categories-grid]');
  grid.innerHTML = categories.map(cat => `
    <a href="../catalog/catalog.html?category=${encodeURIComponent(cat.name)}" class="category-card">
      <img src="../${cat.image}" alt="${escapeHtml(cat.name)}" class="category-card__image">
      <div class="category-card__name">${escapeHtml(cat.name)}</div>
    </a>
  `).join('');
}

// ===== PRODUCT CARD (спільний шаблон для bestsellers і featured) =====
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

function renderProductGrid(selector, products) {
  const grid = document.querySelector(selector);
  grid.innerHTML = products.map(productCardTemplate).join('');

  // Делегування подій — один listener на весь грід
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
      cart.add(productId, 1);
      toast.success('Added to cart');
      btn.classList.add('is-active');
    }
  });
}

// ===== NEWS GRID =====
function renderNews(newsItems) {
  const grid = document.querySelector('[data-news-grid]');
  grid.innerHTML = newsItems.slice(0, 4).map(item => `
    <a href="../news/news.html?id=${item.id}" class="news-card">
      <img src="../${item.images}" alt="${escapeHtml(item.title)}" class="news-card__image">
      <div class="news-card__meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <div class="news-card__title">${escapeHtml(item.title)}</div>
      <p class="news-card__excerpt">${escapeHtml(item.content.slice(0, 60))}...</p>
    </a>
  `).join('');
}

// ===== INIT =====
async function init() {
  initHeader();
  initHeroSlider();

  try {
    const [products, categories, news] = await Promise.all([
      fetchJson('../data/products.json'),
      fetchJson('../data/categories.json'),
      fetchJson('../data/news.json')
    ]);

    renderCategories(categories);

    // Bestsellers: сортуємо за рейтингом, беремо топ-4
    const bestsellers = [...products].sort((a, b) => b.rating - a.rating).slice(0, 4);
    renderProductGrid('[data-bestsellers-grid]', bestsellers);

    // Featured: наступні 4 товари (можна замінити на власне поле "featured" в JSON пізніше)
    const featured = products.slice(4, 8);
    renderProductGrid('[data-featured-grid]', featured);

    renderNews(news);
  } catch (err) {
    console.error('Failed to load homepage data:', err);
    toast.error('Failed to load data');
  }
}

document.addEventListener('DOMContentLoaded', init);