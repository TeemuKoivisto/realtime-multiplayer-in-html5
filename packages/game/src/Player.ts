import { v4 as uuidv4 } from 'uuid'
import { Socket } from 'socket.io'

import { Game } from './Game'

import { Input, Pos, Size } from './types/game'

export class Player {
  game: Game
  socket?: Socket
  pos: Pos
  size: Size
  state:
    | 'dest_pos'
    | 'server_pos'
    | 'not-connected'
    | 'connecting'
    | 'connected'
    | 'hosting.waiting for a player'
    | 'connected.joined.waiting'
    | 'local_pos(hosting)'
    | 'local_pos(joined)'
  color: string
  info_color: string
  id: string = uuidv4()
  userid: string = uuidv4()

  old_state: { pos: Pos }
  cur_state: { pos: Pos }
  state_time: number

  inputs: Input[] = []
  pos_limits: {
    x_min: number
    x_max: number
    y_min: number
    y_max: number
  }

  host = false
  last_input_time = 0
  last_input_seq = 0
  online = false

  constructor(game: Game, socket?: Socket) {
    //Store the instance, if any
    this.socket = socket
    this.game = game

    //Set up initial values for our state information
    this.pos = { x: 0, y: 0 }
    this.size = { x: 16, y: 16, hx: 8, hy: 8 }
    this.state = 'not-connected'
    this.color = 'rgba(255,255,255,0.1)'
    this.info_color = 'rgba(255,255,255,0.1)'
    this.id = uuidv4()

    //These are used in moving us around later
    this.old_state = { pos: { x: 0, y: 0 } }
    this.cur_state = { pos: { x: 0, y: 0 } }
    this.state_time = new Date().getTime()

    //Our local history of inputs
    this.inputs = []

    //The world bounds we are confined to
    this.pos_limits = {
      x_min: this.size.hx,
      x_max: this.game.world.width - this.size.hx,
      y_min: this.size.hy,
      y_max: this.game.world.height - this.size.hy,
    }

    //The 'host' of a game gets created with a player instance since
    //the server already knows who they are. If the server starts a game
    //with only a host, the other player is set up in the 'else' below
    if (socket) {
      this.pos = { x: 20, y: 20 }
    } else {
      this.pos = { x: 500, y: 200 }
    }
  }

  emit(event: string, data: any) {
    // console.log(`emit ${event} `, data)
    this.socket?.emit(event, data)
  }

  draw() {
    if (!this.game.ctx) return
    //Set the color for this player
    this.game.ctx.fillStyle = this.color

    //Draw a rectangle for us
    this.game.ctx.fillRect(
      this.pos.x - this.size.hx,
      this.pos.y - this.size.hy,
      this.size.x,
      this.size.y
    )

    //Draw a status update
    this.game.ctx.fillStyle = this.info_color
    this.game.ctx.fillText(this.state, this.pos.x + 10, this.pos.y + 4)
  }
}
