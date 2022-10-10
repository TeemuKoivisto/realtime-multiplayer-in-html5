import { Observable } from 'lib0/observable'

import { Game } from './Game'
import { PlayerV2 } from './PlayerV2'
import { toFixed, pos, v_add, v_sub, v_mul_scalar, lerp, v_lerp } from './utils/pos'
import {
  ClientMessageType,
  ClientMessage,
  ServerMessage,
  ServerMessageType,
  Tick,
} from './socket/events'

export class GameServerV2 extends Game {
  server = true
  players: PlayerV2[] = []
  active = false
  laststate: Tick = {
    players: [],
    t: Date.now(),
  }
  obs = new Observable<ServerMessageType>()

  constructor() {
    super()
    this.server_time = 0
  }

  add_player(data: ClientMessage[ClientMessageType.join]) {
    const player = new PlayerV2(data.playerId, this.world)
    if (this.players.length === 0) {
      player.pos = { x: 20, y: 20 }
    } else if (this.players.length === 1) {
      player.pos = { x: 500, y: 200 }
    }
    this.players.push(player)
    this.emit(ServerMessageType.client_join, {
      playerId: player.playerId,
      pos: player.pos,
      color: player.color,
    })
  }

  update_physics() {
    this.players = this.players.map(p => {
      p.old_state.pos = pos(p.pos)
      const new_dir = this.process_input(p)
      p.pos = v_add(p.old_state.pos, new_dir)
      this.check_collision(p)
      p.inputs = []
      return p
    })
  }

  server_update() {
    //Update the state of our local clock to match the timer
    this.server_time = this.local_time

    this.laststate = {
      players: this.players.map(p => ({
        playerId: p.playerId,
        pos: p.pos,
        last_input_seq: p.last_input_seq,
      })),
      t: this.server_time, // our current local time on the server
    } as Tick

    //Make a snapshot of the current state, for updating the clients
    // this.laststate = {
    //   hp: this.players.self.pos, //'host position', the game creators position
    //   cp: this.players.other.pos, //'client position', the person that joined, their position
    //   his: this.players.self.last_input_seq, //'host input sequence', the last input we processed for the host
    //   cis: this.players.other.last_input_seq, //'client input sequence', the last input we processed for the client
    //   t: this.server_time, // our current local time on the server
    // } as Tick

    this.emit(ServerMessageType.tick, this.laststate)
  }

  stop_update() {
    this.cancelAnimationFrame(this.updateid)
  }

  on_client_move(payload: ClientMessage[ClientMessageType.move]) {
    this.players = this.players.map(p => {
      if (p.playerId === payload.playerId) {
        p.inputs.push({ inputs: payload.input, time: payload.local_time, seq: payload.input_seq })
      }
      return p
    })
  }

  end_game() {
    this.emit(ServerMessageType.end, true)
  }

  emit<K extends keyof ServerMessage>(action: K, payload: ServerMessage[K]) {
    this.obs.emit(action, [payload])
  }

  on<K extends keyof ServerMessage>(action: K, cb: (payload: ServerMessage[K]) => void) {
    this.obs.on(action, cb)
  }
}
