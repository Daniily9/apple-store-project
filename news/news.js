// Логіка сторінки новин: рендер списку, модалка з повною статтею, синхронізація з URL
import { initHeader } from '../assets/js/header.js';
import { formatDate, escapeHtml, getUrlParam } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

let allNews = [];

// ===== Завантаження JSON =====
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ===== Картка новини =====
function newsCardTemplate(item) {
  return `
    <div class="news-card" data-news-id="${item.id}">
      <img src="../${item.images}" alt="${escapeHtml(item.title)}" class="news-card__image">
      <div class="news-card__meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${formatDate(item.date)}</span>
      </div>
      <div class="news-card__title">${escapeHtml(item.title)}</div>
      <p class="news-card__excerpt">${escapeHtml(item.content.slice(0, 90))}...</p>
    </div>
  `;
}

// ===== Рендер сітки =====
function renderNewsGrid() {
  const grid = document.querySelector('[data-news-grid]');
  grid.innerHTML = allNews.map(newsCardTemplate).join('');
}

// ===== МОДАЛКА: відкриття/закриття =====
function openModal(newsId) {
  const item = allNews.find(n => n.id === newsId);
  if (!item) return;

  document.querySelector('[data-modal-meta]').innerHTML = `
    <span>${escapeHtml(item.category)}</span>
    <span>${formatDate(item.date)}</span>
  `;
  document.querySelector('[data-modal-title]').textContent = item.title;
  document.querySelector('[data-modal-body]').textContent = item.content;

  document.querySelector('[data-news-modal]').hidden = false;
  document.body.classList.add('modal-open');

  // Оновлюємо URL, щоб посиланням можна було поділитись
  const newUrl = `${window.location.pathname}?id=${newsId}`;
  history.pushState({ newsId }, '', newUrl);
}

function closeModal() {
  document.querySelector('[data-news-modal]').hidden = true;
  document.body.classList.remove('modal-open');

  // Прибираємо ?id= з URL при закритті
  history.pushState({}, '', window.location.pathname);
}

// ===== Обробники подій =====
function setupEventListeners() {
  // Клік по картці відкриває модалку
  document.querySelector('[data-news-grid]').addEventListener('click', (e) => {
    const card = e.target.closest('[data-news-id]');
    if (!card) return;
    openModal(card.dataset.newsId);
  });

  // Закриття по хрестику або кліку на overlay
  document.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Закриття по Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('[data-news-modal]').hidden) {
      closeModal();
    }
  });

  // Кнопки "назад"/"вперед" браузера — синхронізуємо модалку з URL
  window.addEventListener('popstate', () => {
    const id = getUrlParam('id');
    if (id) {
      openModal(id);
    } else {
      document.querySelector('[data-news-modal]').hidden = true;
      document.body.classList.remove('modal-open');
    }
  });
}

// ===== INIT =====
async function init() {
  initHeader();
  setupEventListeners();

  try {
    allNews = await fetchJson('../data/news.json');
    renderNewsGrid();

    // Якщо сторінка відкрита одразу з ?id=X — показуємо модалку без зайвого pushState
    const initialId = getUrlParam('id');
    if (initialId) {
      const item = allNews.find(n => n.id === initialId);
      if (item) {
        document.querySelector('[data-modal-meta]').innerHTML = `
          <span>${escapeHtml(item.category)}</span>
          <span>${formatDate(item.date)}</span>
        `;
        document.querySelector('[data-modal-title]').textContent = item.title;
        document.querySelector('[data-modal-body]').textContent = item.content;
        document.querySelector('[data-news-modal]').hidden = false;
        document.body.classList.add('modal-open');
      }
    }
  } catch (err) {
    console.error('Failed to load news:', err);
    toast.error('Failed to load news');
  }
}

document.addEventListener('DOMContentLoaded', init);