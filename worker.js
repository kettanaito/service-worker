self.addEventListener('install', (event) => {
  console.log('> [e] install')
})

self.addEventListener('activate', async (event) => {
  console.log('> [e] activate')
  console.log('clients:', await self.clients.matchAll())
})

self.addEventListener('message', (event) => {
  console.log('> [e] message', event.data)
})

self.addEventListener('fetch', (event) => {
  console.log('> [e] fetch', event.request.method, event.request.url)
})
