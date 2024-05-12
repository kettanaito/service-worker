import { Cache } from '../../src/Cache.js'

function url(pathname: string): URL {
  return new URL(pathname, 'http://localhost')
}

it('returns undefined if the cache is empty', async () => {
  const cache = new Cache()
  await expect(cache.match(url('/foo'))).resolves.toBeUndefined()
})

it('returns undefined if no matching request is found', async () => {
  const cache = new Cache()
  await cache.put(url('/foo'), new Response('hello world'))
  await expect(cache.match(url('/bar'))).resolves.toBeUndefined()
})

it('matches cache entry by url', async () => {
  const cache = new Cache()
  await cache.put(url('/foo'), new Response('hello world'))
  await expect(cache.match(url('/foo'))).resolves.toMatchResponse(
    new Response('hello world')
  )
})

it('matches cache entry by request', async () => {
  const cache = new Cache()
  const request = new Request(url('/foo'))
  await cache.put(request, new Response('hello world'))
  await expect(cache.match(request)).resolves.toMatchResponse(
    new Response('hello world')
  )
})

it('returns the first cache hit if multiple entries match', async () => {
  const cache = new Cache()
  const request = new Request(url('/foo'))
  await cache.put(request, new Response('first'))
  await cache.put(request, new Response('second'))
  await expect(cache.match(request)).resolves.toMatchResponse(
    new Response('first')
  )
})

it('matches cache with a new request', async () => {
  const cache = new Cache()
  await cache.put(url('/foo'), new Response('hello world'))
  await expect(cache.match(new Request(url('/foo')))).resolves.toMatchResponse(
    new Response('hello world')
  )
})

it('returns undefined given a HEAD request', async () => {
  const cache = new Cache()
  await cache.put(url('/foo'), new Response('hello world'))
  await expect(
    cache.match(new Request(url('/foo'), { method: 'HEAD' }))
  ).resolves.toBeUndefined()
})

it('ignores search parameters of cached request if "ignoreSearch" is true', async () => {
  const cache = new Cache()
  await cache.put(url('/foo?a=b'), new Response('hello world'))
  await expect(
    cache.match(url('/foo'), { ignoreSearch: true })
  ).resolves.toMatchResponse(new Response('hello world'))
})

it('returns undefined if search parameters do not match', async () => {
  const cache = new Cache()
  await cache.put(url('/foo?a=b'), new Response('hello world'))
  await expect(cache.match(url('/foo?c=d'))).resolves.toBeUndefined()
})

it('matches cache if search parameters match', async () => {
  const cache = new Cache()
  await cache.put(url('/foo?a=b'), new Response('hello world'))
  await expect(cache.match(url('/foo?a=b'))).resolves.toMatchResponse(
    new Response('hello world')
  )
})

it('ignores request method if "ignoreMethod" is true', async () => {
  const cache = new Cache()
  await cache.put(new Request(url('/foo')), new Response('hello world'))
  await expect(
    cache.match(new Request(url('/foo'), { method: 'HEAD' }), {
      ignoreMethod: true,
    })
  ).resolves.toMatchResponse(new Response('hello world'))
})

it('returns undefined given a mismatched response "vary" header', async () => {
  const cache = new Cache()
  await cache.put(
    new Request(url('/foo'), { headers: { 'x-request-id': 'abc' } }),
    new Response('hello', { headers: { vary: 'x-request-id' } })
  )
  await expect(cache.match(url('/foo'))).resolves.toBeUndefined()
  await expect(
    cache.match(
      new Request(url('/foo'), { headers: { 'x-request-id': 'def' } })
    )
  ).resolves.toBeUndefined()
})

it('ignores response "vary" header if "ignoreVary" is true', async () => {
  const cache = new Cache()
  await cache.put(
    new Request(url('/foo'), {
      headers: { 'x-request-id': 'abc' },
    }),
    new Response('hello', { headers: { vary: 'x-request-id' } })
  )
  await expect(
    cache.match(
      new Request(url('/foo'), {
        headers: { 'x-request-id': 'def' },
      }),
      { ignoreVary: true }
    )
  ).resolves.toMatchResponse(
    new Response('hello', { headers: { vary: 'x-request-id' } })
  )
})

it('matches cache entry by url with fragment', async () => {
  const cache = new Cache()
  await cache.put(url('/foo'), new Response('hello world'))
  await expect(cache.match(url('/foo#bar'))).resolves.toMatchResponse(
    new Response('hello world')
  )
})
