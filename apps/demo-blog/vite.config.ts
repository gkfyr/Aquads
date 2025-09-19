import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist'
  },
  plugins: [{
    name: 'serve-sdk',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/sdk/')) return next()
        const rel = req.url.replace(/^\/sdk\//, '')
        const file = path.resolve(process.cwd(), '..', '..', 'packages', 'sdk', 'dist', rel)
        fs.createReadStream(file)
          .on('error', () => { res.statusCode = 404; res.end('Not Found') })
          .pipe(res)
      })
    }
  }]
})

