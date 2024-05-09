import type { MessagePort } from 'node:worker_threads'

export type ServiceWorkerState =
  | 'parsed'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'redundant'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker
 */
export class ServiceWorker extends EventTarget {
  #state: ServiceWorkerState

  public readonly scriptUrl: string
  public postMessage: MessagePort['postMessage']

  constructor(scriptUrl: string, postMessage: MessagePort['postMessage']) {
    super()
    this.#state = '' as ServiceWorkerState
    this.scriptUrl = scriptUrl
    this.postMessage = postMessage.bind(this)
  }

  get state(): ServiceWorkerState {
    return this.#state
  }

  set state(nextState: ServiceWorkerState) {
    this.#state = nextState

    if (nextState !== 'parsed') {
      this.dispatchEvent(new Event('statechange'))
    }
  }
}
