/**
 * Redis Mock Implementation
 * Simulates Redis functionality for unit tests without requiring a real Redis instance
 */

import { jest } from '@jest/globals';

interface MockRedisStore {
  [key: string]: {
    value: string | number;
    expiredAt?: number;
  };
}

export class RedisMock {
  private store: MockRedisStore = {};
  private failOnNextCall = false;

  async get(key: string): Promise<string | null> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    const entry = this.store[key];
    if (!entry) return null;

    // Check expiration
    if (entry.expiredAt && entry.expiredAt < Date.now()) {
      delete this.store[key];
      return null;
    }

    return String(entry.value);
  }

  async set(key: string, value: string | number, options?: { EX?: number; PX?: number }): Promise<'OK'> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    let expiredAt: number | undefined;
    if (options?.EX) {
      expiredAt = Date.now() + options.EX * 1000;
    } else if (options?.PX) {
      expiredAt = Date.now() + options.PX;
    }

    this.store[key] = { value, expiredAt };
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    const entry = this.store[key];

    if (!entry) {
      this.store[key] = { value: 1 };
      return 1;
    }

    // Check expiration
    if (entry.expiredAt && entry.expiredAt < Date.now()) {
      delete this.store[key];
      this.store[key] = { value: 1 };
      return 1;
    }

    const currentValue = Number(entry.value);
    if (isNaN(currentValue)) {
      throw new Error('ERR value is not an integer or out of range');
    }

    this.store[key].value = currentValue + 1;
    return currentValue + 1;
  }

  async incrby(key: string, increment: number): Promise<number> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    const entry = this.store[key];

    if (!entry) {
      this.store[key] = { value: increment };
      return increment;
    }

    // Check expiration
    if (entry.expiredAt && entry.expiredAt < Date.now()) {
      delete this.store[key];
      this.store[key] = { value: increment };
      return increment;
    }

    const currentValue = Number(entry.value);
    if (isNaN(currentValue)) {
      throw new Error('ERR value is not an integer or out of range');
    }

    this.store[key].value = currentValue + increment;
    return currentValue + increment;
  }

  async del(...keys: string[]): Promise<number> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    let count = 0;
    for (const key of keys) {
      if (this.store[key]) {
        delete this.store[key];
        count++;
      }
    }
    return count;
  }

  async ttl(key: string): Promise<number> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    const entry = this.store[key];
    if (!entry) return -2; // Key does not exist

    if (!entry.expiredAt) return -1; // Key exists but has no associated expire

    const ttl = Math.floor((entry.expiredAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    if (this.failOnNextCall) {
      this.failOnNextCall = false;
      throw new Error('Redis connection failed');
    }

    this.store[key] = {
      value,
      expiredAt: Date.now() + seconds * 1000,
    };
    return 'OK';
  }

  // Utility methods for testing
  simulateFailure(): void {
    this.failOnNextCall = true;
  }

  clear(): void {
    this.store = {};
  }

  getAll(): MockRedisStore {
    return { ...this.store };
  }
}

export const createRedisMock = (): RedisMock => {
  return new RedisMock();
};
