import type { MessagePort } from 'node:worker_threads'

export type ClienFrameType = '???'
export type ClientType = 'main' | 'worker'

export interface SerializedClient {
  id: string
  url: string
  type: ClientType
  frameType: ClienFrameType
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Client
 */
export class Client {
  public postMessage: MessagePort['postMessage'] = () => {
    throw new Error(
      'Failed to call Client#postMessage: the "postMessage" method is not implemented',
    )
  }

  constructor(
    public readonly id: string,
    public readonly url: string,
    public readonly type: ClientType,
    public readonly frameType: ClienFrameType,
  ) {}
}
