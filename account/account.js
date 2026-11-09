// Логіка сторінки акаунту: дані профілю, історія замовлень, вихід
import { initHeader } from '../assets/js/header.js';
import { auth } from '../assets/js/auth.js';
import { orders } from '../assets/js/orders.js';
import { formatCurrency, formatDate, escapeHtml } from '../assets/js/utils.js';
import { toast } from '../assets/js/toast.js';

function renderProfile(user) {
  document.querySelector('[data-account-name]').textContent = `Hi, ${user.name}`;
  document.querySelector('[data-account-email]').textContent = user.email;
}

function orderCardTemplate(order) {
  const itemsHtml = order.items.map(item => {
    const variantLabel = item.variant ? ` · ${item.variant.storage}` : '';
    const colorLabel = item.color ? ` · ${item.color.name}` : '';
    return `
      <div class="order-card__item-row">
        <span class="order-card__item-name">${escapeHtml(item.name)}${escapeHtml(variantLabel)}${escapeHtml(colorLabel)} × ${item.quantity}</span>
        <span class="order-card__item-meta">${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="order-card">
      <div class="order-card__header">
        <span class="order-card__id">${escapeHtml(order.id)}</span>
        <span class="order-card__date">${formatDate(order.date)}</span>
      </div>
      <div class="order-card__items">${itemsHtml}</div>
      <div class="order-card__total">
        <span>Total</span>
        <span>${formatCurrency(order.total)}</span>
      </div>
    </div>
  `;
}

function renderOrders(userEmail) {
  const userOrders = orders.getOrdersByEmail(userEmail);
  const list = document.querySelector('[data-orders-list]');
  const emptyState = document.querySelector('[data-orders-empty]');

  if (userOrders.length === 0) {
    emptyState.hidden = false;
    list.innerHTML = '';
    return;
  }

  emptyState.hidden = true;
  list.innerHTML = userOrders.map(orderCardTemplate).join('');
}

function setupLogout() {
  document.querySelector('[data-logout-btn]').addEventListener('click', () => {
    auth.logout();
    toast.info('Logged out');
    window.location.href = '../index/index.html';
  });
}

function init() {
  initHeader();

  const user = auth.getCurrentUser();
  if (!user) {
    // Не залогінені — немає доступу до акаунту, відправляємо на вхід
    window.location.href = '../auth/auth.html';
    return;
  }

  renderProfile(user);
  renderOrders(user.email);
  setupLogout();
}

document.addEventListener('DOMContentLoaded', init);