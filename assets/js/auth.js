// Shared-система автентифікації (клієнтська імітація, без бекенду).
// УВАГА: паролі зберігаються в localStorage у відкритому вигляді — це прийнятно
// лише для навчального проєкту, у реальному продукті так робити не можна.
import { storage } from './storage.js';

const USERS_KEY = 'users';
const SESSION_KEY = 'currentUserEmail';

// Отримати всіх зареєстрованих користувачів
function getUsers() {
  return storage.get(USERS_KEY, []);
}

// Зареєструвати нового користувача. Повертає { success, error? }
function register(name, email, password) {
  const users = getUsers();
  const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    return { success: false, error: 'An account with this email already exists' };
  }

  users.push({ name, email, password });
  storage.set(USERS_KEY, users);
  storage.set(SESSION_KEY, email); // одразу логінимо після реєстрації

  window.dispatchEvent(new CustomEvent('auth:changed'));
  return { success: true };
}

// Увійти. Повертає { success, error? }
function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  storage.set(SESSION_KEY, user.email);
  window.dispatchEvent(new CustomEvent('auth:changed'));
  return { success: true };
}

// Вийти
function logout() {
  storage.remove(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('auth:changed'));
}

// Отримати поточного залогіненого користувача (без пароля) або null
function getCurrentUser() {
  const email = storage.get(SESSION_KEY, null);
  if (!email) return null;

  const user = getUsers().find(u => u.email === email);
  if (!user) return null;

  const { password, ...safeUser } = user; // не повертаємо пароль назовні
  return safeUser;
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

export const auth = {
  register,
  login,
  logout,
  getCurrentUser,
  isLoggedIn
};