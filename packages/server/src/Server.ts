import { v4 as uuidv4 } from 'uuid'
import { IncomingMessage, Server as HTTPServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import {
  GameServerV2,
  readClientMessage,
  writeServerMessage,
  enableDebug,
  ServerMessageType,
} from '@example/game'

import { log } from './common/logger'

import { Connections } from './Connections'
import { Connection } from './types'

interface Options {
  timeout?: number
}

// enableDebug(true)

export class Server {
  nextClientId = 0
  pendingGames: GameServerV2[] = []
  games = new Map<string, GameServerV2>()
  httpServer?: HTTPServer
  wsServer?: WebSocketServer
  connections = new Connections()
  opts: Required<Options>

  constructor(server: HTTPServer, opts?: Options) {
    this.opts = Object.assign(
      {
        timeout: 30000,
      },
      opts
    )
    this.wsServer = new WebSocketServer({ noServer: true })
    this.wsServer.on('connection', this.onConnection)
    this.httpServer = server
    this.httpServer.on('upgrade', (request, socket, head) => {
      this.wsServer?.handleUpgrade(request, socket, head, ws => {
        this.wsServer?.emit('connection', ws, request)
      })
    })
  }

  onConnection = async (socket: WebSocket, request: IncomingMessage) => {
    log.debug(`New websocket connection: (number ${this.nextClientId++})`)
    const url = new URL(request.url || '', 'http://' + request.headers.host)
    const playerId = url.searchParams.get('playerId') || uuidv4()
    let game = this.pendingGames[0]
    if (!game) {
      log.debug('create new game')
      game = new GameServerV2()
      game.update(new Date().getTime())
      this.games.set(game.id, game)
      this.pendingGames.push(game)
      this.listenToGameUpdates(game)
    }
    this.connections.add(
      socket,
      request,
      game.id,
      (conn, data) => readClientMessage(playerId, data, game),
      () => game!.end_game()
    )
    log.debug(`Total games: ${this.games.size}`)
  }

  listenToGameUpdates = (game: GameServerV2) => {
    for (const key in ServerMessageType) {
      try {
        const val = parseInt(key)
        game.on(val, payload => {})
      } catch (err) {}
    }
    game.on(ServerMessageType.tick, payload => {
      this.connections.send(writeServerMessage(ServerMessageType.tick, payload), game.id)
    })
    game.on(ServerMessageType.client_host, payload => {
      console.log('client_host ', payload)
    })
    game.on(ServerMessageType.client_join, payload => {
      console.log('client_join ', payload)
    })
    game.on(ServerMessageType.client_ready, payload => {
      console.log('client_ready ', payload)
    })
    game.on(ServerMessageType.client_end, payload => {
      console.log('client_end ', payload)
    })
    game.on(ServerMessageType.client_ping, payload => {
      console.log('client_ping ', payload)
      this.connections.send(writeServerMessage(ServerMessageType.client_ping, payload), game.id)
    })
    game.on(ServerMessageType.client_color, payload => {
      console.log('client_color ', payload)
    })
  }

  destroy() {
    this.games.forEach(game => {
      game.end_game()
    })
    this.httpServer?.close()
    this.wsServer?.close()
  }
}
