import { DeferredPromise } from '@open-draft/deferred-promise'
import { InvalidStateError, NetworkError } from './utils/errors.js'

export interface FetchEventOptions {
  clientId?: string
  request: Request
}

export class FetchEvent extends Event {
  public readonly clientId: string
  public readonly request: Request
  public readonly handled: Promise<void>

  constructor(type: string, options: FetchEventOptions) {
    super(type)
    this.clientId = options.clientId || ''
    this.request = options.request
    this.handled = new DeferredPromise<void>()
  }

  public async respondWith(
    response: Response | Promise<Response>,
  ): Promise<void> {
    if ((this.handled as DeferredPromise<void>).state !== 'pending') {
      throw new InvalidStateError('')
    }

    const endResponse = await response

    if (endResponse.type === 'opaque' && this.request.mode !== 'no-cors') {
      throw new NetworkError('')
    }

    if (
      endResponse.type === 'opaqueredirect' &&
      // @ts-expect-error Missing type.
      this.request.mode !== 'manual'
    ) {
      throw new NetworkError('')
    }

    if (endResponse.type === 'cors' && this.request.mode !== 'same-origin') {
      throw new NetworkError('')
    }
  }
}
