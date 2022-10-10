import { GameClientV2, readServerMessage, enableDebug } from '@example/game'

import { WS_URL } from './config'

const RECONNECT_IN_MS = 4000

let socket: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

enableDebug(false)

export const socketActions = {
  connect(playerId: string, game: GameClientV2, cb: () => void) {
    const params = new URLSearchParams()
    params.append('playerId', playerId)
    socket = new WebSocket(`${WS_URL}?${params.toString()}`)
    // socket.binaryType = 'arraybuffer'
    socket.onopen = () => {
      console.log('Connection successful :)')
      game.on_client_connected({ playerId })
      cb()
    }
    socket.onerror = ev => {
      console.debug('socket err!', ev)
    }
    socket.onclose = () => {
      game.on_client_disconnect()
      console.log('Websocket disconnected !')
      socket = null
      this.reconnect(playerId, game, cb)
    }
    socket.onmessage = e => {
      readServerMessage(e.data, game)
    }
  },
  reconnect(playerId: string, game: GameClientV2, cb: () => void) {
    if (reconnectTimeout) return
    reconnectTimeout = setTimeout(() => {
      this.connect(playerId, game, cb)
      reconnectTimeout = null
    }, RECONNECT_IN_MS)
  },
  emit(payload: string) {
    socket?.send(payload)
  },
}
