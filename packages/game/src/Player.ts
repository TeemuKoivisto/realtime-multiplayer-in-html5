import { Input, Pos, Size } from './types'

export class Player {
  playerId: string
  pos: Pos
  ghostPos: Pos
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
  isHost = false

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

  last_input_time = 0
  last_input_seq = 0
  online = false

  constructor(playerId: string, world: { width: number; height: number }) {
    this.playerId = playerId
    //Set up initial values for our state information
    this.pos = { x: 0, y: 0 }
    this.ghostPos = { x: 0, y: 0 }
    this.size = { x: 16, y: 16, hx: 8, hy: 8 }
    this.state = 'not-connected'
    this.color = 'rgba(255,255,255,0.1)'
    this.info_color = 'rgba(255,255,255,0.1)'

    //These are used in moving us around later
    this.old_state = { pos: { x: 0, y: 0 } }
    this.cur_state = { pos: { x: 0, y: 0 } }
    this.state_time = new Date().getTime()

    //Our local history of inputs
    this.inputs = []

    //The world bounds we are confined to
    this.pos_limits = {
      x_min: this.size.hx,
      x_max: world.width - this.size.hx,
      y_min: this.size.hy,
      y_max: world.height - this.size.hy,
    }
  }

  resetPos(pos: Pos) {
    this.pos = pos
    this.ghostPos = pos
  }

  draw(ctx: CanvasRenderingContext2D) {
    //Set the color for this player
    ctx.fillStyle = this.color

    //Draw a rectangle for us
    ctx.fillRect(this.pos.x - this.size.hx, this.pos.y - this.size.hy, this.size.x, this.size.y)

    //Draw a status update
    ctx.fillStyle = this.info_color
    ctx.fillText(this.state, this.pos.x + 10, this.pos.y + 4)
  }
}
