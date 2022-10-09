import { GameServer } from '@example/game'
import { app } from './app'
import { config, log } from './common'
import { Server } from './Server'
import { SocketIO } from './socket-io'

const httpServer = app.listen(config.PORT, () => {
  log.info(`App started at port: ${config.PORT}`)
})

const game = new GameServer()
const server = new Server(game)
const io = new SocketIO(httpServer, server)

process.on('exit', () => {
  log.info('Shutting down server')
})
