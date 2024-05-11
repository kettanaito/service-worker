import { serviceWorker } from './src/index.js'

async function main() {
  await serviceWorker.register('./worker.js')
  await serviceWorker.ready

  const response = await fetch('https://example.com/resource')
  console.log('[usage] response:', response.status, await response.text())
}

main()
