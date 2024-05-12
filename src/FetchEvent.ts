import { DeferredPromise } from '@open-draft/deferred-promise'
import { ExtendableEvent } from './ExtendableEvent.js'
import { InvalidStateError } from './utils/errors.js'

export interface FetchEventInit extends EventInit {
  request: Request
  preloadResponse?: Promise<void>
  clientId?: string
  resultingClientId?: string
  replacesClientId?: string
  handled?: Promise<void>
}

const kRespondWithEntered = Symbol('kRespondWithEntered')
const kWaitToRespond = Symbol('kWaitToRespond')
const kRespondWithError = Symbol('kRespondWithError')
export const kResponsePromise = Symbol('kResponsePromise')

/**
 * @see https://w3c.github.io/ServiceWorker/#fetchevent-interface
 */
export class FetchEvent extends ExtendableEvent {
  public readonly clientId: string
  public readonly request: Request
  public readonly preloadResponse: Promise<void>
  public readonly resultingClientId: string
  public readonly replacesClientId: string
  public readonly handled: Promise<void>;

  [kRespondWithEntered]?: boolean;
  [kWaitToRespond]?: boolean;
  [kRespondWithError]?: boolean;
  [kResponsePromise]: DeferredPromise<Response>

  constructor(type: string, options: FetchEventInit) {
    super(type, options)
    this.clientId = options.clientId || ''
    this.request = options.request
    this.preloadResponse = options.preloadResponse || Promise.resolve()
    this.resultingClientId = options.resultingClientId || ''
    this.replacesClientId = options.replacesClientId || ''
    this.handled = options.handled || new DeferredPromise<void>()

    this[kResponsePromise] = new DeferredPromise<Response>()
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#fetch-event-respondwith
   */
  public async respondWith(
    response: Promise<Response> | Response,
  ): Promise<void> {
    if (this[kRespondWithEntered]) {
      throw new InvalidStateError('Cannot call respondWith() multiple times')
    }

    const innerResponse = Promise.resolve(response)
    this.waitUntil(innerResponse)

    // This flag is never unset because a single FetchEvent
    // can be responded to only once.
    this[kRespondWithEntered] = true
    this[kWaitToRespond] = true

    /**
     * @note This is a simplified implementation of the spec.
     */
    innerResponse
      .then((response) => {
        // Returning non-Response from ".respondWith()"
        // results in a network error.
        if (!(response instanceof Response)) {
          this[kRespondWithError] = true
          this.#handleFetch(Response.error())
        } else {
          this.#handleFetch(response)
        }

        this[kWaitToRespond] = undefined
      })
      .catch(() => {
        this[kRespondWithError] = true
        this[kWaitToRespond] = undefined
      })
  }

  #handleFetch(response: Response): void {
    this[kResponsePromise].resolve(response)
  }
}
