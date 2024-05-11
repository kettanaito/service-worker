import { Cache, CacheQueryOptions } from './Cache.js'

interface MultiCacheQueryOptions extends CacheQueryOptions {
  cacheName?: string
}

/**
 * @see https://w3c.github.io/ServiceWorker/#cachestorage-interface
 */
export class CacheStorage {
  #cacheMap: Map<string, Cache>

  constructor() {
    this.#cacheMap = new Map()
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-match
   */
  public match(
    request: RequestInfo,
    options?: MultiCacheQueryOptions,
  ): Promise<Response | undefined> {
    if (options?.cacheName) {
      for (const [cacheName, cache] of this.#cacheMap) {
        if (cacheName === options.cacheName) {
          return cache.match(request, options)
        }
      }
    }

    let promise = Promise.resolve<Response | undefined>(undefined)

    for (const [, cache] of this.#cacheMap) {
      promise = promise.then((response) => {
        if (typeof response !== 'undefined') {
          return response
        }

        return cache.match(request, options)
      })
    }

    return promise
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-has
   */
  public async has(cacheName: string): Promise<boolean> {
    return this.#cacheMap.has(cacheName)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-open
   */
  public async open(cacheName: string): Promise<Cache> {
    return this.#cacheMap.get(cacheName) || new Cache()
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-delete
   */
  public async delete(cacheName: string): Promise<boolean> {
    return this.#cacheMap.delete(cacheName)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-storage-keys
   */
  public async keys(): Promise<Array<string>> {
    return Array.from(this.#cacheMap.keys())
  }
}
