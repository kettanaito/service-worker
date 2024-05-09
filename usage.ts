import { serviceWorker } from './src/index.js'

async function main() {
  await serviceWorker.register('./worker.js')
  await serviceWorker.ready
  serviceWorker.controller?.postMessage('hello!')

  serviceWorker.controller?.addEventListener('message', (message) => {
    console.log('from worker:', message.data)
  })
}

main()
