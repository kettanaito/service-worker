import { Worker } from 'node:worker_threads'
import { DeferredPromise } from '@open-draft/deferred-promise'
import {
  ServiceWorkerRegistration,
  ServiceWorkerRegistrationOptions,
} from './ServiceWorkerRegistration.js'
import { ServiceWorker } from './ServiceWorker.js'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer
 */
export class ServiceWorkerContainer {
  #registration?: ServiceWorkerRegistration
  readonly #ready: DeferredPromise<ServiceWorkerRegistration>

  constructor() {
    this.#ready = new DeferredPromise<ServiceWorkerRegistration>()
  }

  public get ready(): Promise<ServiceWorkerRegistration> {
    return this.#ready
  }

  public get controller(): ServiceWorker | null {
    return this.#registration?.active || null
  }

  async register(
    scriptUrl: string,
    options: ServiceWorkerRegistrationOptions = {},
  ) {
    const worker = new Worker(
      new URL('./ServiceWorkerGlobalScope.ts', import.meta.url),
      {
        name: `[worker ${scriptUrl}]`,
        workerData: {
          scriptUrl,
        },
      },
    )
    const serviceWorker = new ServiceWorker(scriptUrl, worker)
    const registration = new ServiceWorkerRegistration(serviceWorker)
    this.#registration = registration

    // Resolve the "ready" Promise once the worker is activating.
    serviceWorker.addEventListener('statechange', () => {
      if (serviceWorker.state === 'activating') {
        this.#ready.resolve(registration)
      }
    })

    return registration
  }
}
