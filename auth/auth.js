// Логіка сторінки auth: перемикання вкладок, обробка форм входу/реєстрації
import { initHeader } from '../assets/js/header.js';
import { auth } from '../assets/js/auth.js';
import { toast } from '../assets/js/toast.js';

// ===== Перемикання вкладок Sign In / Create Account =====
function setupTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === target));
      forms.forEach(f => f.hidden = f.dataset.form !== target);
    });
  });
}

// ===== Форма входу =====
function setupLoginForm() {
  const form = document.querySelector('[data-form="login"]');
  const errorEl = document.querySelector('[data-login-error]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    const result = auth.login(email, password);

    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    toast.success('Welcome back!');
    window.location.href = '../account/account.html';
  });
}

// ===== Форма реєстрації =====
function setupRegisterForm() {
  const form = document.querySelector('[data-form="register"]');
  const errorEl = document.querySelector('[data-register-error]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    const result = auth.register(name, email, password);

    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    toast.success('Account created!');
    window.location.href = '../account/account.html';
  });
}

// ===== INIT =====
function init() {
  initHeader();

  // Якщо вже залогінені — одразу на account, немає сенсу показувати форму входу
  if (auth.isLoggedIn()) {
    window.location.href = '../account/account.html';
    return;
  }

  setupTabs();
  setupLoginForm();
  setupRegisterForm();
}

document.addEventListener('DOMContentLoaded', init);