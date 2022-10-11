import { Pos } from './game'

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
  [ClientMessageType.leave]: { playerId: string }
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
  start_game = 0,
  end_game = 1,
  tick = 2,
  client_connected = 3,
  client_host = 4,
  client_join = 5,
  player_left = 6,
  client_end = 7,
  client_ping = 8,
  client_color = 9,
}
export type ServerMessage = {
  [ServerMessageType.start_game]: { server_time: number }
  [ServerMessageType.end_game]: boolean
  [ServerMessageType.tick]: Tick
  [ServerMessageType.client_connected]: { playerId: string }
  [ServerMessageType.client_host]: string
  [ServerMessageType.client_join]: {
    server_time: number
    players: {
      isHost: boolean
      playerId: string
      pos: Pos
      color: string
    }[]
  }
  [ServerMessageType.player_left]: { playerId: string; newHostId: string | null }
  [ServerMessageType.client_end]: string
  [ServerMessageType.client_ping]: { playerId: string; ping: string }
  [ServerMessageType.client_color]: { color: string }
}
