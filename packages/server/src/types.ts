import { IncomingMessage } from 'http'
import WebSocket from 'ws'

export type Connection = {
  id: string
  socket: WebSocket
  rooms: string[]
  pongReceived: boolean
  request: IncomingMessage
}
