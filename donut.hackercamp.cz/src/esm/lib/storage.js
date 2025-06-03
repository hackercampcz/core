class MemoryStorage {
  #data;

  constructor() {
    this.#data = new Map();
  }

  get length() {
    return this.#data.size;
  }

  clear() {
    this.#data.clear();
  }

  key(index) {
    return Array.from(this.#data.keys())[index];
  }

  getItem(key) {
    return this.#data.get(key);
  }

  setItem(key, value) {
    this.#data.set(key, value);
  }

  removeItem(key) {
    this.#data.delete(key);
  }
}

export const memoryStorage = new MemoryStorage();

export class SafeStorage {
  #fallback = memoryStorage;
  #storage;

  constructor(storage) {
    this.#storage = storage;
  }

  get length() {
    return this.#storage?.length ?? this.#fallback.length;
  }

  clear() {
    if (this.#storage) {
      this.#storage.clear();
    }
    this.#fallback.clear();
  }

  key(index) {
    return this.#storage?.key(index) ?? Array.from(this.#fallback.keys())[index];
  }

  getItem(key) {
    return this.#storage?.getItem(key) ?? this.#fallback.getItem(key);
  }

  setItem(key, value) {
    if (this.#storage) {
      this.#storage.setItem(key, value);
    }
    this.#fallback.setItem(key, value);
  }

  removeItem(key) {
    if (this.#storage) {
      this.#storage.removeItem(key);
    }
    this.#fallback.removeItem(key);
  }
}
