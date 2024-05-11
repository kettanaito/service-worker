self.addEventListener('install', (event) => {
  console.log('> [e] install')
  event.waitUntil(
    new Promise((resolve) => {
      setTimeout(resolve, 2000)
    }),
  )
})

self.addEventListener('activate', async (event) => {
  console.log('> [e] activate')

  const clients = await self.clients.matchAll()
  clients[0].postMessage('hi from worker!')
})

self.addEventListener('message', (event) => {
  console.log('> [e] message from main:', event.data)
})

self.addEventListener('fetch', (event) => {
  console.log('> [e] fetch', event.request.method, event.request.url)
})
