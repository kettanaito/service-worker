import { Worker } from 'node:worker_threads'
import { DeferredPromise } from '@open-draft/deferred-promise'
import {
  ServiceWorkerRegistration,
  ServiceWorkerRegistrationOptions,
} from './ServiceWorkerRegistration.js'
import { ServiceWorker } from './ServiceWorker.js'

export interface WorkerData {
  scriptUrl: string
  options: ServiceWorkerRegistrationOptions
}

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
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      name: `[worker ${scriptUrl}]`,
      workerData: {
        scriptUrl,
        options,
      } satisfies WorkerData,
    })
    const serviceWorker = this.#createServiceWorker(scriptUrl, worker)
    const registration = new ServiceWorkerRegistration(serviceWorker)
    this.#registration = registration

    serviceWorker.addEventListener('statechange', () => {
      if (serviceWorker.state === 'activating') {
        this.#ready.resolve(registration)
      }
    })

    return registration
  }

  #createServiceWorker(scriptUrl: string, worker: Worker): ServiceWorker {
    const serviceWorker = new ServiceWorker(
      scriptUrl,
      worker.postMessage.bind(worker),
    )

    worker.addListener('message', (message) => {
      switch (message.type) {
        case 'worker/statechange': {
          serviceWorker.state = message.state
          break
        }
        case 'worker/error': {
          serviceWorker.dispatchEvent(new Event('error'))
          break
        }
      }
    })

    return serviceWorker
  }
}
