// Обгортка над localStorage з JSON-серіалізацією
const PREFIX = 'appleStore_';

export const storage = {
  // Отримати значення. Якщо немає — повертає defaultValue
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error(`storage.get error for "${key}":`, e);
      return defaultValue;
    }
  },

  // Зберегти значення (об'єкт/масив автоматично серіалізується)
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`storage.set error for "${key}":`, e);
      return false;
    }
  },

  // Видалити ключ
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  // Перевірити наявність ключа
  has(key) {
    return localStorage.getItem(PREFIX + key) !== null;
  }
};