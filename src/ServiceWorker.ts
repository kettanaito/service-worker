import type { TransferListItem, Worker } from 'node:worker_threads'

export type ServiceWorkerState =
  | 'parsed'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'redundant'

type PostMessageOptions = {
  transfer: Array<TransferListItem>
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker
 */
export class ServiceWorker extends EventTarget {
  public readonly scriptUrl: string

  readonly #worker: Worker
  #state: ServiceWorkerState

  constructor(scriptUrl: string, worker: Worker) {
    super()
    this.scriptUrl = scriptUrl

    this.#state = 'parsed'
    this.#worker = worker

    this.#worker.on('message', (message) => {
      switch (message.type) {
        case 'worker/statechange': {
          this.state = message.state
          break
        }
      }
    })

    this.#worker.on('error', () => {
      this.dispatchEvent(new Event('error'))
    })
  }

  get state(): ServiceWorkerState {
    return this.#state
  }
  set state(nextState: ServiceWorkerState) {
    this.#state = nextState
    this.dispatchEvent(new Event('statechange'))
  }

  public postMessage(value: any, options?: PostMessageOptions): void
  public postMessage(value: any, transfer?: Array<TransferListItem>): void
  public postMessage(
    value: any,
    optionsOrTransfer?: PostMessageOptions | Array<TransferListItem>,
  ): void {
    if (typeof value === 'undefined') {
      throw new SyntaxError(
        'Failed to execute "postMessage" on ServiceWorker: 1 argument required, but only 0 present.',
      )
    }

    const transferables = Array.isArray(optionsOrTransfer)
      ? optionsOrTransfer
      : optionsOrTransfer?.transfer
    this.#worker.postMessage(value, transferables)
  }
}
