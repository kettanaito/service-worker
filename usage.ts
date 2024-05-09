import { serviceWorker } from './src/index.js'

async function main() {
  await serviceWorker.register('./worker.js')
  await serviceWorker.ready
  console.log('controller:', serviceWorker.controller)

  serviceWorker.controller?.postMessage('hello!')
}

main()
