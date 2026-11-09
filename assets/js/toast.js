// Система toast-повідомлень. Автоматично створює контейнер у DOM.

const CONTAINER_ID = 'toast-container';
const DEFAULT_DURATION = 3000;

// Створює контейнер для тостів, якщо його ще немає
function getContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Показує тост. type: 'success' | 'error' | 'info'
export function showToast(message, type = 'success', duration = DEFAULT_DURATION) {
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Плавна поява (клас додається на наступний кадр)
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Автоматичне зникнення
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

// Хелпери для зручності
export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  info: (msg) => showToast(msg, 'info')
};