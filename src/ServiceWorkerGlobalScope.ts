import { parentPort } from 'node:worker_threads'
import { Clients } from './Clients.js'
import type { WorkerData } from './ServiceWorkerContainer.js'
import { ServiceWorker } from './ServiceWorker.js'

/**
 * The global object of the Service Worker.
 * Available in the worker as `self`.
 */
export class ServiceWorkerGlobalScope extends EventTarget {
  #parentData: WorkerData

  public clients: Clients
  public serviceWorker: ServiceWorker
  // public cache: unknown
  // public registration: unknown

  constructor(parentData: WorkerData) {
    super()

    this.#parentData = parentData
    this.serviceWorker = this.#createServiceWorker()
    this.clients = new Clients(this.serviceWorker)
  }

  // Create a representation of this Service Worker
  // that will communicate its events to the parent thread.
  #createServiceWorker(): ServiceWorker {
    const serviceWorker = new ServiceWorker(
      this.#parentData.scriptUrl,
      (value, transfer) => {
        /**
         * @todo This should technically post message
         * to itself (the same worker thread)?
         */
        throw new Error('Not implemented')
      },
    )

    serviceWorker.addEventListener('statechange', () => {
      parentPort!.postMessage({
        type: 'worker/statechange',
        state: serviceWorker.state,
      })
    })
    serviceWorker.addEventListener('error', () => {
      parentPort!.postMessage({ type: 'worker/error' })
    })

    process
      .once('uncaughtException', () => {
        serviceWorker.dispatchEvent(new Event('error'))
      })
      .once('unhandledRejection', () => {
        serviceWorker.dispatchEvent(new Event('error'))
      })

    return serviceWorker
  }
}
