import { ExtendableEvent, kPendingPromises } from '../../src/ExtendableEvent.js'

it('extends Event', () => {
  expect(new ExtendableEvent('event')).toBeInstanceOf(Event)
})

it('has no pending promises by default', () => {
  const event = new ExtendableEvent('event')
  expect(event[kPendingPromises]).toEqual([])
})

it('adds a pending promise when called ".waitUntil()"', () => {
  const event = new ExtendableEvent('event')
  const promise = Promise.resolve()
  event.waitUntil(promise)
  expect(event[kPendingPromises]).toEqual([promise])
})

it('adds multiple promises with ".waitUntil()"', () => {
  const event = new ExtendableEvent('foo')
  const promiseOne = Promise.resolve(123)
  const promiseTwo = Promise.resolve('abc')
  event.waitUntil(promiseOne)
  event.waitUntil(promiseTwo)
  expect(event[kPendingPromises]).toEqual([promiseOne, promiseTwo])
})

it('ignores promise rejections', () => {
  const event = new ExtendableEvent('event')
  const promise = Promise.reject()
  event.waitUntil(promise.catch(() => {}))
  expect(event[kPendingPromises]).toEqual([promise])
})
