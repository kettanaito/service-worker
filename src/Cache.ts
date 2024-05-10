import { DeferredPromise } from '@open-draft/deferred-promise'

interface CacheQueryOptions {
  ignoreSearch?: boolean
  ignoreMethod?: boolean
  ignoreVary?: boolean
}

interface CacheBatchOperation {
  type: 'put' | 'delete'
  request: Request
  response: Response | null | undefined
  options?: CacheQueryOptions
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Cache
 */
export class Cache {
  #requestResponseList: Array<[Request, Response]>

  constructor() {
    this.#requestResponseList = []
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-add
   */
  public async add(request: RequestInfo): Promise<void> {
    await this.addAll([request])
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-addall
   */
  public async addAll(requests: ReadonlyArray<RequestInfo>): Promise<void> {
    const responsePromises: Array<Promise<Response>> = []
    const requestList: Array<Request> = []

    for (const request of requests) {
      const innerRequest = new Request(request)

      if (!isValidRequestUrlScheme(innerRequest)) {
        throw new TypeError('Request scheme is not valid')
      }
      if (!isGetRequest(innerRequest)) {
        throw new TypeError('Request method is not GET')
      }

      requestList.push(innerRequest)
      const responsePromise = new DeferredPromise<Response>()

      fetch(innerRequest).then((response) => {
        if (
          response.type === 'error' ||
          !response.ok ||
          response.status === 206
        ) {
          responsePromise.reject(new TypeError('Failed to fetch'))
        }

        if (response.headers.has('vary')) {
          const fieldValues = response.headers.get('vary')?.split(',') || []

          for (const fieldValue of fieldValues) {
            if (fieldValue === '*') {
              responsePromise.reject(new TypeError('Failed to fetch'))
            }
          }
        }
      })

      responsePromises.push(responsePromise)
    }

    const allRequestsFinished = Promise.all(responsePromises)

    return allRequestsFinished.then((responses) => {
      const operations = []
      let index = 0

      for (const response of responses) {
        const operation: CacheBatchOperation = {
          type: 'put',
          request: requestList[index],
          response,
        }
        operations.push(operation)
        index++
      }

      const cacheJobPromise = new DeferredPromise<void>()
      let errorData: unknown = null
      try {
        this.#batchCacheOperations(operations)
      } catch (error) {
        errorData = error
      }

      queueMicrotask(() => {
        if (errorData === null) {
          return cacheJobPromise.resolve(undefined)
        }

        cacheJobPromise.reject(errorData)
      })

      return cacheJobPromise
    })
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-put
   */
  public async put(request: RequestInfo, response: Response): Promise<void> {
    const innerRequest =
      request instanceof Request ? request : new Request(request)

    if (!isValidRequestUrlScheme(innerRequest)) {
      throw new TypeError('Request scheme is not valid')
    }

    const innerResponse = response

    if (innerResponse.status === 206) {
      throw new TypeError('Response status is 206')
    }

    if (!validateResponseVaryHeader(response)) {
      throw new TypeError('Response vary header is invalid')
    }

    if (innerResponse.body?.locked) {
      throw new TypeError('Response body is disturbed or locked')
    }

    const clonedResponse = innerResponse.clone()
    let bodyReadPromise: Promise<ArrayBuffer | void> = Promise.resolve()

    if (innerRequest.body !== null) {
      // Read all the bytes of the inner response.
      bodyReadPromise = innerResponse.arrayBuffer()
    }

    const operations: Array<CacheBatchOperation> = []
    const operation: CacheBatchOperation = {
      type: 'put',
      request: innerRequest,
      response: clonedResponse,
    }
    operations.push(operation)

    return bodyReadPromise.then(() => {
      const cacheJobPromise = new DeferredPromise<void>()
      let errorData: unknown = null

      try {
        this.#batchCacheOperations(operations)
      } catch (error) {
        errorData = error
      }

      queueMicrotask(() => {
        if (errorData === null) {
          return cacheJobPromise.resolve(undefined)
        }
        cacheJobPromise.reject(errorData)
      })
    })
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-delete
   */
  public async delete(
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<boolean> {
    let innerRequest: Request | null = null

    if (request instanceof Request) {
      innerRequest = request

      if (!isGetRequest(innerRequest)) {
        return Promise.resolve(false)
      }
    } else if (typeof request === 'string') {
      innerRequest = new Request(request)
    }

    const operations: Array<CacheBatchOperation> = []
    const operation: CacheBatchOperation = {
      type: 'delete',
      request: innerRequest,
      response: null,
      options,
    }
    operations.push(operation)

    const cacheJobPromise = new DeferredPromise<boolean>()
    let errorData: unknown = null
    let requestResponses: Array<[Request, Response]> = []

    try {
      requestResponses = this.#batchCacheOperations(operations)
    } catch (error) {
      errorData = error
    }

    queueMicrotask(() => {
      if (errorData === null) {
        return cacheJobPromise.resolve(requestResponses.length > 0)
      }
      cacheJobPromise.reject(errorData)
    })

    return cacheJobPromise
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-keys
   */
  public async keys(
    request?: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<ReadonlyArray<Request>> {
    let innerRequest: Request | null = null

    if (request instanceof Request) {
      innerRequest = request
      if (!isGetRequest(innerRequest)) {
        return Promise.resolve([])
      }
    } else if (typeof request === 'string') {
      innerRequest = new Request(request)
    }

    const promise = new DeferredPromise<Array<Request>>()
    let requests: Array<Request> = []

    if (typeof request === 'undefined') {
      for (const [request] of this.#requestResponseList) {
        requests.push(request)
      }
    } else {
      const requestResponses = this.#queryCache(innerRequest, options)
      for (const requestResponse of requestResponses) {
        requests.push(requestResponse[0])
      }
    }

    queueMicrotask(() => {
      const requestList: Array<Request> = []
      for (const request of requests) {
        requestList.push(request)
      }
      promise.resolve(requestList)
    })

    return promise
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-match
   */
  public async match(
    request: Request,
    options?: CacheQueryOptions,
  ): Promise<Response | undefined> {
    const allMatches = await this.matchAll(request, options)

    if (Array.isArray(allMatches)) {
      return allMatches[0]
    }
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#cache-matchall
   */
  public async matchAll(
    request?: Request,
    options?: CacheQueryOptions,
  ): Promise<ReadonlyArray<Response>> {
    let innerRequest: Request

    if (typeof request !== 'undefined') {
      innerRequest = request

      if (request.method !== 'GET' && options?.ignoreMethod) {
        return []
      }
    } else if (typeof request === 'string') {
      innerRequest = new Request(request)
    }

    const responses: Array<Response> = []

    if (typeof request === 'undefined') {
      for (const [, response] of this.#requestResponseList) {
        responses.push(response.clone())
      }
    } else {
      const requestResponses = this.#queryCache(innerRequest, options)
      requestResponses.forEach(([, requestResponse]) =>
        responses.push(requestResponse.clone()),
      )
    }

    return Object.freeze(responses)
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#query-cache
   */
  #queryCache(
    requestQuery: Request,
    options?: CacheQueryOptions,
    targetStorage?: Array<[Request, Response]>,
  ): Array<[Request, Response]> {
    const resultList: Array<[Request, Response]> = []
    const storage =
      typeof targetStorage === 'undefined'
        ? this.#requestResponseList
        : targetStorage

    for (const [request, response] of storage) {
      const cachedRequest = request
      const cachedResponse = response

      if (
        this.#requestMatchesCachedItem(
          requestQuery,
          cachedRequest,
          cachedResponse,
          options,
        )
      ) {
        resultList.push([cachedRequest.clone(), cachedResponse.clone()])
      }
    }

    return resultList
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#request-matches-cached-item
   */
  #requestMatchesCachedItem(
    requestQuery: Request,
    request: Request,
    response: Response | null | undefined,
    options?: CacheQueryOptions,
  ): boolean {
    if (options?.ignoreMethod === false && !isGetRequest(request)) {
      return false
    }

    const queryUrl = new URL(requestQuery.url)
    const cachedUrl = new URL(request.url)

    if (options?.ignoreSearch) {
      queryUrl.search = ''
      cachedUrl.search = ''
    }

    // Compare queryUrl cacheUrl without the fragments.
    /**
     * @todo @fixme Implement the URL matching.
     */
    if ('queryUrl' !== 'cachedUrl') {
      return false
    }

    if (
      response == null ||
      options?.ignoreVary ||
      !response.headers.has('vary')
    ) {
      return true
    }

    if (!validateResponseVaryHeader(response)) {
      return false
    }

    return true
  }

  /**
   * @see https://w3c.github.io/ServiceWorker/#batch-cache-operations
   */
  #batchCacheOperations(
    operations: Array<CacheBatchOperation>,
  ): Array<[Request, Response]> {
    const cache = this.#requestResponseList
    const backupCache = [...cache]
    const addedItems = []

    try {
      const resultList: Array<[Request, Response]> = []
      for (const operation of operations) {
        if (operation.type !== 'put' && operation.type !== 'delete') {
          throw new TypeError('Invalid CacheBatchOperation type')
        }

        if (operation.type === 'delete' && operation.response !== null) {
          throw new TypeError(
            'Invalid CacheBatchOperation response for the "delete" operation',
          )
        }

        let requestResponses: Array<[Request, Response]> = []

        if (operation.type === 'delete') {
          requestResponses = this.#queryCache(
            operation.request,
            operation.options,
          )

          for (const requestResponse of requestResponses) {
            this.#deleteRequestResponse(requestResponse[0], requestResponse[1])
          }
        } else if (operation.type === 'put') {
          if (operation.response === null) {
            throw new TypeError(
              'Operation response is required for "put" operation',
            )
          }

          const innerRequest = operation.request

          if (!isValidRequestUrlScheme(innerRequest)) {
            throw new TypeError('Request URL scheme must be "http" or "https"')
          }
          if (!isGetRequest(innerRequest)) {
            throw new TypeError('Request method must be "GET"')
          }

          if (operation.options !== null) {
            throw new TypeError(
              'Operation options must be null for "put" operations',
            )
          }

          requestResponses = this.#queryCache(innerRequest)
          for (const requestResponse of requestResponses) {
            this.#deleteRequestResponse(requestResponse[0], requestResponse[1])
          }

          cache.push([operation.request, operation.response!])
          addedItems.push(operation.request, operation.response)
        }

        resultList.push([operation.request, operation.response!])
      }

      return resultList
    } catch (error) {
      this.#requestResponseList = []
      for (const requestResponse of backupCache) {
        this.#requestResponseList.push(requestResponse)
      }
      throw error
    }
  }

  #deleteRequestResponse(request: Request, response: Response): void {
    this.#requestResponseList = this.#requestResponseList.filter(
      (requestResponse) => {
        return requestResponse[0] !== request && requestResponse[1] !== response
      },
    )
  }
}

function isValidRequestUrlScheme(request: Request): boolean {
  const url = new URL(request.url)
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function isGetRequest(request: Request): boolean {
  return request.method === 'GET'
}

function validateResponseVaryHeader(response: Response): boolean {
  const fieldValues = response.headers.get('vary')?.split(', ') || []

  for (const fieldValue of fieldValues) {
    if (fieldValue === '*') {
      return false
    }
  }

  return true
}
