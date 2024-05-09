export type ClienFrameType = '???'

export type ClientType = 'main' | 'worker'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Client
 */
export class Client {
  public readonly id: string
  public readonly url: string
  public readonly type: ClientType
  public readonly frameType: ClienFrameType

  constructor() {
    //
  }

  /**
   * Send a message to the client.
   * The message is received in the "message" event
   * on `serviceWorker`.
   */
  public postMessage(): void {
    //
  }
}
