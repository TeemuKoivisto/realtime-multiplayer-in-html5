import { v4 as uuidv4 } from 'uuid'
import { IncomingMessage, Server as HTTPServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { GameServer, readClientMessage, writeServerMessage, ServerMessageType } from '@example/game'

import { log } from './common/logger'

import { Connections } from './Connections'
import { Connection } from './types'

interface Options {
  timeout?: number
}

// enableDebug(true)

export class Server {
  nextClientId = 0
  pendingGames: GameServer[] = []
  games = new Map<string, GameServer>()
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
      game = new GameServer()
      game.update(new Date().getTime())
      this.games.set(game.id, game)
      this.pendingGames.push(game)
      this.listenToGameUpdates(game)
    }
    this.connections.add(
      socket,
      request,
      game.id,
      (_conn, data) => readClientMessage(playerId, data, game),
      () => game.on_player_left({ playerId })
    )
    log.debug(`Total games: ${this.games.size}`)
    log.debug(`Players in recent game: ${game.players.length}`)
  }

  listenToGameUpdates = (game: GameServer) => {
    game.on(ServerMessageType.start_game, payload => {
      this.connections.send(writeServerMessage(ServerMessageType.start_game, payload), game.id)
      if (game.isFull) {
        this.pendingGames = this.pendingGames.filter(g => g.id !== game.id)
      }
    })
    game.on(ServerMessageType.end_game, payload => {
      console.log('received end game')
      this.connections.send(writeServerMessage(ServerMessageType.end_game, payload), game.id)
      this.pendingGames = this.pendingGames.filter(g => g.id !== game.id)
      this.games.forEach(g => {
        if (g.id === game.id) {
          game.destroy()
          this.games.delete(g.id)
        }
      })
    })
    game.on(ServerMessageType.tick, payload => {
      this.connections.send(writeServerMessage(ServerMessageType.tick, payload), game.id)
    })
    game.on(ServerMessageType.client_host, payload => {
      console.log('client_host ', payload)
    })
    game.on(ServerMessageType.client_join, payload => {
      // player.send('s.h.'+ String(thegame.gamecore.local_time).replace('.','-'));
      // console.log('server host at  ' + thegame.gamecore.local_time);
      // player.game = thegame;
      // player.hosting = true;

      // this.log('player ' + player.userid + ' created a game with id ' + player.game.id);
      console.log('emit client join ', payload)
      this.connections.send(writeServerMessage(ServerMessageType.client_join, payload), game.id)
    })
    game.on(ServerMessageType.player_left, payload => {
      console.log('player_left ', payload)
      this.connections.send(writeServerMessage(ServerMessageType.player_left, payload), game.id)
      this.pendingGames.push(game)
      if (game.players.length === 0) {
        game.on_pause_game()
      }
    })
    game.on(ServerMessageType.client_end, payload => {
      console.log('client_end ', payload)
    })
    game.on(ServerMessageType.client_ping, payload => {
      this.connections.send(writeServerMessage(ServerMessageType.client_ping, payload), game.id)
    })
    game.on(ServerMessageType.client_color, payload => {
      console.log('client_color ', payload)
    })
  }

  destroy() {
    this.games.forEach(game => {
      game.on_end_game()
    })
    this.connections.close()
    this.httpServer?.close()
    this.wsServer?.close()
  }
}
