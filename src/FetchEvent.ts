import { DeferredPromise } from '@open-draft/deferred-promise'
import { InvalidStateError, NetworkError } from './utils/errors.js'
import { ExtendableEvent } from './ExtendableEvent.js'

export const kClientId = Symbol('kClientId')
export const kRequest = Symbol('kRequest')

export class FetchEvent extends ExtendableEvent {
  public readonly handled: Promise<void>;

  [kClientId]: string = undefined as any;
  [kRequest]: Request = undefined as any

  constructor(type: string, options: EventInit) {
    super(type, options)
    this.handled = new DeferredPromise<void>()
  }

  get clientId(): string {
    return this[kClientId]
  }

  get request(): Request {
    return this[kRequest]
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
