import * as fs from 'node:fs'
import * as vm from 'node:vm'
import { workerData, parentPort as maybeParentPort } from 'node:worker_threads'
import type { WorkerData } from './ServiceWorkerContainer.js'
import { ServiceWorkerGlobalScope } from './ServiceWorkerGlobalScope.js'
import { FetchEvent } from './FetchEvent.js'

const parentPort = maybeParentPort

if (!parentPort) {
  throw new Error('Failed to run worker: missing parent process')
}

const parentData = workerData as WorkerData

const globalScope = new ServiceWorkerGlobalScope(parentData)

process.once('uncaughtException', () => {
  globalScope.serviceWorker.dispatchEvent(new Event('error'))
})

const content = fs.readFileSync(parentData.scriptUrl, 'utf8')

parentPort.postMessage({
  type: 'worker/statechange',
  state: 'parsed',
})

// Run the worker script within the controller global scope.
const script = new vm.Script(content)

script.runInNewContext({
  global: globalScope,
  globalThis: globalScope,
  self: globalScope,
  console,
})

globalScope.serviceWorker.state = 'installing'
globalScope.dispatchEvent(new Event('install' /* @todo Client ref */))

globalScope.serviceWorker.state = 'installed'
globalScope.serviceWorker.state = 'activating'
globalScope.serviceWorker.state = 'activated'

globalScope.dispatchEvent(new Event('activate' /* @todo Client ref */))

// Forward messages from the parent process
// as the "message" events on the Service Worker.
parentPort.addListener('message', (data) => {
  globalScope.dispatchEvent(new MessageEvent('message', { data }))
})

// Test.
// process.nextTick(() => {
//   globalScope.dispatchEvent(
//     new FetchEvent('fetch', {
//       request: new Request('https://example.com'),
//     }),
//   )
// })
