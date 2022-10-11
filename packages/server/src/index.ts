import { enableDebug } from '@example/game'
import { app } from './app'
import { config, log } from './common'
import { Server } from './Server'

// enableDebug(true)

const httpServer = app.listen(config.PORT, () => {
  console.log(`App started at port: ${config.PORT}`)
})

const server = new Server(httpServer)

process.on('exit', () => {
  console.log('Shutting down server')
})
