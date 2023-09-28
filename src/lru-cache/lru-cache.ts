export class LRUCache<K, V> {
  private readonly limit: number;
  private readonly map: Map<K, V> = new Map();
  private readonly waitMap: Map<K, (value: V) => void> = new Map();

  constructor(limit: number) {
    this.limit = limit;
  }

  async get(key: K): Promise<V> {
    const value = this.map.get(key);
    if (value) {
      this.map.delete(key);
      this.map.set(key, value);
      return value;
    } else {
      return new Promise((resolve) => {
        this.waitMap.set(key, resolve);
      });
    }
  }

  set(key: K, value: V): void {
    if (this.map.size >= this.limit) {
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, value);

    if (this.waitMap.has(key)) {
      const resolveFn = this.waitMap.get(key)!;
      resolveFn(value);
      this.waitMap.delete(key);
    }
  }
}
