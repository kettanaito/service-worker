import { ServiceWorker } from './ServiceWorker.js'

export interface ServiceWorkerRegistrationOptions {}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration
 */
export class ServiceWorkerRegistration extends EventTarget {
  readonly #serviceWorker: ServiceWorker

  constructor(serviceWorker: ServiceWorker) {
    super()
    this.#serviceWorker = serviceWorker
  }

  public get installing(): ServiceWorker | null {
    if (this.#serviceWorker.state === 'installing') {
      return this.#serviceWorker
    }
    return null
  }

  public get waiting(): ServiceWorker | null {
    if (this.#serviceWorker.state === 'installed') {
      return this.#serviceWorker
    }
    return null
  }

  public get active(): ServiceWorker | null {
    if (
      this.#serviceWorker.state === 'activating' ||
      this.#serviceWorker.state === 'activated'
    ) {
      return this.#serviceWorker
    }
    return null
  }
}
