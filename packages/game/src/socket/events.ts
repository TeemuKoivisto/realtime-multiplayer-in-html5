import { Pos } from '../types'

export interface Move {
  playerId: string
  input: string[]
  local_time: number
  input_seq: number
}
export enum ClientMessageType {
  join = 0,
  leave = 1,
  move = 2,
  ping = 3,
  color = 4,
}
export type ClientMessage = {
  [ClientMessageType.join]: { playerId: string }
  [ClientMessageType.leave]: string
  [ClientMessageType.move]: Move
  [ClientMessageType.ping]: { ping: number }
  [ClientMessageType.color]: string
}
// case 'connect':
// case 'disconnect':
// case 'onserverupdate':
// case 'onconnected':
// case 'error':
// case 'message':

export interface Tick {
  players: { playerId: string; pos: Pos; last_input_seq: number }[]
  t: number
}

export enum ServerMessageType {
  end = 0,
  tick = 1,
  client_connected = 2,
  client_host = 3,
  client_join = 4,
  client_ready = 5,
  client_end = 6,
  client_ping = 7,
  client_color = 8,
}
export type ServerMessage = {
  [ServerMessageType.end]: boolean
  [ServerMessageType.tick]: Tick
  [ServerMessageType.client_connected]: { playerId: string }
  [ServerMessageType.client_host]: string
  [ServerMessageType.client_host]: string
  [ServerMessageType.client_join]: {
    playerId: string
    pos: Pos
    color: string
  }
  [ServerMessageType.client_ready]: string
  [ServerMessageType.client_end]: string
  [ServerMessageType.client_ping]: { playerId: string; ping: string }
  [ServerMessageType.client_color]: { color: string }
}
