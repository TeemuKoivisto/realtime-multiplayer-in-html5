import { v4 as uuidv4 } from 'uuid'
import { IncomingMessage } from 'http'
import WebSocket from 'ws'

import { log } from './common/logger'

import { Connection } from './types'

interface Options {
  ping_timeout?: number
}

const EMPTY_SET = new Set<Connection>()

export class Connections {
  connections = new Map<string, Connection>()
  rooms = new Map<string, Set<Connection>>()

  opts: Required<Options>

  constructor(opts?: Options) {
    this.opts = Object.assign(
      {
        ping_timeout: 30000,
      },
      opts
    )
  }

  getRoomConnections(room: string) {
    return this.rooms.get(room) || EMPTY_SET
  }

  add(
    socket: WebSocket,
    request: IncomingMessage,
    room: string,
    onMessage: (conn: Connection, data: Buffer) => void,
    onClose: () => void
  ) {
    const conn = {
      id: uuidv4(),
      socket,
      rooms: ['*', room],
      request,
      pongReceived: true,
    }
    // socket.binaryType = 'arraybuffer'
    const closeConnection = () => {
      this.connections.delete(conn.id)
      this.removeConnectionFromRoom(conn, room)
      onClose()
    }
    socket.on('close', code => {
      log.debug('Received connection close: ' + code)
      closeConnection()
    })
    socket.on('message', (data: Buffer) => onMessage(conn, data))
    socket.on('pong', () => {
      log.debug('Received pong for: ' + conn.id)
      this.updateConnectionPong(conn.id)
      // TODO basically conn.pongReceived = true should work without explicit setting??
    })
    this.connections.set(conn.id, conn)
    this.addConnectionToRoom(conn, room)
    this.initConnectionPing(conn.id, closeConnection)
    return conn
  }

  send(data: any, room: string) {
    const connections = this.getRoomConnections(room)
    connections.forEach(conn => {
      conn.socket.send(data)
    })
  }

  addConnectionToRoom(conn: Connection, room: string) {
    const existing = this.rooms.get(room)
    if (existing) {
      this.rooms.set(room, existing.add(conn))
    } else {
      this.rooms.set(room, new Set([conn]))
    }
  }

  removeConnectionFromRoom(conn: Connection, room: string) {
    const existing = this.rooms.get(room)
    if (existing) {
      existing.delete(conn)
      // TODO keep existing immutable -> create new Set with deleted values
      existing.size === 0 && this.rooms.delete(room)
    }
  }

  updateConnectionPong(connId: string) {
    const conn = this.connections.get(connId)
    if (conn) {
      conn.pongReceived = true
      // TODO not immutable...
    }
  }

  initConnectionPing(connId: string, onClose: () => void) {
    const pingInterval = setInterval(() => {
      const conn = this.connections.get(connId)
      if (!conn) {
        clearInterval(pingInterval)
      } else if (!conn?.pongReceived) {
        log.debug('Ping failed, closing connection: ' + connId.slice(0, 5))
        onClose()
        clearInterval(pingInterval)
      } else {
        // log.debug('Ping success: ' + connId.slice(0, 5))
      }
    }, this.opts.ping_timeout)
  }
}
