import * as fs from 'node:fs'
import * as vm from 'node:vm'
import { workerData, parentPort as maybeParentPort } from 'node:worker_threads'
import type { WorkerData } from './ServiceWorkerContainer.js'
import { ServiceWorkerGlobalScope } from './ServiceWorkerGlobalScope.js'
import { InstallEvent } from './InstallEvent.js'
import { ExtendableEvent, kPendingPromises } from './ExtendableEvent.js'

const parentPort = maybeParentPort

if (!parentPort) {
  throw new Error('Failed to run worker: missing parent process')
}

const parentData = workerData as WorkerData

// Create the Service Worker's global scope object (`self`).
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
  setTimeout,
  setInterval,
  console,
})

// Forward messages from the parent process
// as the "message" events on the Service Worker.
parentPort.addListener('message', (data) => {
  globalScope.dispatchEvent(new MessageEvent('message', { data }))
})

async function startServiceWorkerLifeCycle() {
  // Installed event.
  globalScope.serviceWorker.state = 'installing'
  const installEvent = new InstallEvent('install')
  globalScope.dispatchEvent(installEvent)
  await Promise.allSettled(installEvent[kPendingPromises])
  globalScope.serviceWorker.state = 'installed'

  // Activated event.
  globalScope.serviceWorker.state = 'activating'
  const activateEvent = new ExtendableEvent('activate')
  globalScope.dispatchEvent(activateEvent)
  await Promise.allSettled(activateEvent[kPendingPromises])
  globalScope.serviceWorker.state = 'activated'
}
startServiceWorkerLifeCycle()
