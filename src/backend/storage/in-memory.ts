import { Storage } from './types'

export class InMemoryStorage implements Storage {
  private cache: { [name: string]: Uint8Array } = {}

  async get(key: string) {
    return this.cache[key]
  }

  async set(key: string, value: Uint8Array | undefined) {
    if (typeof value === 'undefined') {
      delete this.cache[key]
    } else {
      this.cache[key] = value
    }
  }

  async has(key: string) {
    return Object.hasOwn(this.cache, key)
  }

  async delete(key: string) {
    if (Object.hasOwn(this.cache, key)) {
      delete this.cache[key]
      return true
    } else {
      return false
    }
  }

  async clear() {
    this.cache = {}
  }

  async close() {}
}
