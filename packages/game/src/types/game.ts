import { Socket } from 'socket.io'
import { GameServer } from '../GameServer'

export interface Client {
  userid: string
}
export interface Pos {
  x: number
  y: number
}
export interface Size {
  x: number
  y: number
  hx: number
  hy: number
}
export interface Input {
  inputs: string[]
  time: number
  seq: number
}
export interface Item {
  pos: Pos
  pos_limits: {
    x_min: number
    x_max: number
    y_min: number
    y_max: number
  }
}
export interface Update {
  t: number
  hp: Pos
  cp: Pos
  his: string
  cis: string
}
export interface GameInstance {
  id: string
  player_host: Socket
  player_client: Socket | null
  player_count: number
  active?: boolean
  gamecore?: GameServer
}
