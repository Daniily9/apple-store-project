// Набір універсальних хелперів для всього проєкту

// Форматує число у валюту (напр. 1299 → "1 299,00 €")
export function formatCurrency(amount) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Форматує дату (напр. "2026-08-20" → "20 серпня 2026")
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

// Дістає параметр з URL (напр. ?id=iphone-17 → getUrlParam('id') → "iphone-17")
export function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Екранує HTML-спецсимволи, щоб уникнути XSS при вставці тексту в DOM
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Затримує виклик функції, поки користувач не перестане "стукати" (напр. пошук)
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Генерує унікальний id (напр. для тимчасових елементів у DOM)
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}