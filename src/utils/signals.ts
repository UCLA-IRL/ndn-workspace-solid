import { EventEmitter } from 'eventemitter3'

interface UpdateEvents<T> {
  update(newValue: T, oldValue: T): void
}

export class Signal<T> extends EventEmitter<UpdateEvents<T>> {
  private val: T

  constructor(initialValue: T) {
    super()
    this.val = initialValue
  }

  public get value() {
    return this.val
  }

  public set value(newValue: T) {
    const oldValue = this.val
    this.val = newValue
    this.emit('update', newValue, oldValue)
  }
}
