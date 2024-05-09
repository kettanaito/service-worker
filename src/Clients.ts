import { Client, ClientType } from './Client.js'
import type { ServiceWorker } from './ServiceWorker.js'
import { isWithinScope } from './utils/isWithinScope.js'

interface MatchAllOptions {
  includeUncontrolled?: boolean
  type?: ClientType
}

export class Clients {
  readonly #serviceWorker: ServiceWorker
  readonly #clients = new Map<string, Client>()

  constructor(serviceWorker: ServiceWorker) {
    this.#serviceWorker = serviceWorker
  }

  /**
   * Get a Service Worker matching a given `id`.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Clients/get
   */
  public async get(id: string): Promise<Client | undefined> {
    return this.#clients.get(id)
  }

  /**
   * Return a list of clients.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll
   */
  public async matchAll(options?: MatchAllOptions): Promise<Array<Client>> {
    const clients: Array<Client> = []

    for (const [, client] of this.#clients) {
      if (options?.type && client.type !== options.type) {
        break
      }

      if (options?.includeUncontrolled) {
        break
      }

      clients.push(client)
    }

    return clients
  }

  /**
   * Set the current Service Worker as the controller
   * for all the clients within its scope.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
   */
  public async claim(): Promise<undefined> {
    for (const [, client] of this.#clients) {
      if (isWithinScope(client.url, this.#serviceWorker.scope))
        if (client.url) {
          /**
           * @todo Set the current worker as the controller
           * for all the clients that lie within its scope.
           */
        }
    }
  }

  public async openWindow(): Promise<void> {
    // Browser-specific method, nothing to implement.
    return
  }
}
