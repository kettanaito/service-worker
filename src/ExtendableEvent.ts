const kPendingPromises = Symbol('kPendingPromises')

/**
 * @see https://w3c.github.io/ServiceWorker/#extendableevent-interface
 */
export class ExtendableEvent extends Event {
  [kPendingPromises]: Array<Promise<any>>
  #pendingPromiseCount: number

  constructor(type: string, eventInitDict?: EventInit) {
    super(type, eventInitDict)
    this[kPendingPromises] = []
    this.#pendingPromiseCount = 0
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#wait-until-method
   */
  public waitUntil(promise: Promise<any>): void {
    this[kPendingPromises].push(promise)
    this.#pendingPromiseCount++

    promise.finally(() => {
      queueMicrotask(() => {
        this.#pendingPromiseCount--
      })
    })
  }
}
