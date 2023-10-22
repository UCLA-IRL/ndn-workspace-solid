
export interface Storage {
  get(key: string): Promise<Uint8Array | undefined>
  put(key: string, value: Uint8Array): Promise<void>
}

export class InMemoryStorage implements Storage {
  private readonly buffer: { [name: string]: Uint8Array } = {}

  async get(key: string) {
    return this.buffer[key]
  }
  async put(key: string, value: Uint8Array) {
    this.buffer[key] = value
  }
}
