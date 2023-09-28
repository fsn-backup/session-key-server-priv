// lru-cache.service.ts
import { Injectable } from '@nestjs/common';
import { LRUCache } from './lru-cache';

@Injectable()
export class LruCacheService {
  private readonly opCache: LRUCache<string, any>;

  constructor() {
    this.opCache = new LRUCache(1000);
  }

  getOp(key: string): any {
    return this.opCache.get(key);
  }

  setOp(key: string, value: any): void {
    this.opCache.set(key, value);
  }
}
