import { Server } from 'socket.io'
import debug from 'debug'
import http from 'http'

import { Lobby } from './Lobby'
import serverConfig from './server-config'
import { gameConfig } from '@example/game-arjan'

import { Client } from './Client'

const log = debug('game:server/index')
debug.enable()

const config = {
  networkTimestep: 1000 / 22,
  PORT: process.env.PORT ?? 4004,
}

function start() {
  const httpServer = http
    .createServer((request, response) => {
      // const uri = url.parse(request.url || '').pathname
      // if (request.method === 'GET' && uri === '/health') {
      //     response.writeHead(200, { 'Content-Type': 'text/plain' })
      //     response.write('OK')
      //     response.end()
      // } else {
      //     response.writeHead(404, { 'Content-Type': 'text/plain' })
      //     response.write('404 Not Found\n')
      //     response.end()
      // }
    })
    .listen(config.PORT, () => {
      console.log(`@example/server started at port: ${config.PORT}`)
    })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
    // transports: ['websocket'],
    pingInterval: 1000 * 60 * 5,
    pingTimeout: 1000 * 60 * 3,
  })
  const lobby = Lobby(io, { config: Object.assign({}, gameConfig, serverConfig) })

  io.on('connection', async socket => {
    console.log('new connection: ', socket.conn.id)
    socket.join('all')
    socket.on('register', data => {
      console.log('register')
      const client = Client({
        name: data.name,
        socket,
      })

      lobby.addClient(client)
    })

    socket.on('error', err => {
      console.log('socket error: ', err)
      log('Client error', err)
    })
  })
}

start()
