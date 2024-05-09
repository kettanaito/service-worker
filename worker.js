self.addEventListener('install', (event) => {
  console.log('> [e] install')
})

self.addEventListener('activate', (event) => {
  console.log('> [e] activate')
})

self.addEventListener('message', (event) => {
  console.log('> [e] message', event.data)
})

self.addEventListener('fetch', (event) => {
  console.log('> [e] fetch', event.request.method, event.request.url)
})
