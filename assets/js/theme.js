// Керування темою сайту (light/dark), синхронізовано через storage.js
import { storage } from './storage.js';

const THEME_KEY = 'theme';
const THEMES = { LIGHT: 'light', DARK: 'dark' };

// Застосовує тему до <body>
function applyTheme(theme) {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(`${theme}-theme`);
}

// Визначає системну тему користувача (fallback, якщо нічого не збережено)
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

// Ініціалізація теми при завантаженні сторінки
export function initTheme() {
  const saved = storage.get(THEME_KEY, getSystemTheme());
  applyTheme(saved);
}

// Перемикає тему та зберігає вибір
export function toggleTheme() {
  const current = storage.get(THEME_KEY, getSystemTheme());
  const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  storage.set(THEME_KEY, next);
  applyTheme(next);
  return next;
}

// Отримати поточну тему
export function getCurrentTheme() {
  return storage.get(THEME_KEY, getSystemTheme());
}