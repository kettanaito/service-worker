import * as fs from 'node:fs'
import * as vm from 'node:vm'
import { workerData, parentPort as maybeParentPort } from 'node:worker_threads'
import { FetchEvent } from './FetchEvent.js'

const parentPort = maybeParentPort
if (!parentPort) {
  throw new Error('Failed to run worker: missing parent process')
}

class ServiceWorkerGlobalScope extends EventTarget {}

const self = new ServiceWorkerGlobalScope()

const content = fs.readFileSync(workerData.scriptUrl, 'utf8')

// Run the worker script within the controller global scope.
const script = new vm.Script(content)

script.runInNewContext({
  self,
  console,
  // clients,
  // cache,
  // etc...
})

parentPort.postMessage({
  type: 'worker/statechange',
  state: 'installing',
})
self.dispatchEvent(new Event('install' /* @todo Client ref */))

parentPort.postMessage({
  type: 'worker/statechange',
  state: 'installed',
})
parentPort.postMessage({
  type: 'worker/statechange',
  state: 'activating',
})

parentPort.postMessage({
  type: 'worker/statechange',
  state: 'activated',
})
self.dispatchEvent(new Event('activate' /* @todo Client ref */))

parentPort.addListener('message', (data) => {
  self.dispatchEvent(new MessageEvent('message', { data }))
})

// Test.
// process.nextTick(() => {
//   self.dispatchEvent(
//     new FetchEvent('fetch', {
//       request: new Request('https://example.com'),
//     }),
//   )
// })
