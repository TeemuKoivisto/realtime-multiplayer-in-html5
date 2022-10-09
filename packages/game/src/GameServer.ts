import { Socket } from 'socket.io'

import { Game } from './Game'
import { Player } from './Player'
import { toFixed, pos, v_add, v_sub, v_mul_scalar, lerp, v_lerp } from './utils/pos'
import { Client, GameInstance } from './types/game'

export class GameServer extends Game {
  server = true
  players: { self: Player; other: Player }
  instance?: GameInstance
  active = false

  constructor(instance?: GameInstance) {
    super()
    this.instance = instance
    this.players = {
      self: new Player(this, instance?.player_host),
      other: new Player(this, instance?.player_client || undefined),
    }
    this.players.self.pos = { x: 20, y: 20 }
    this.server_time = 0
    this.laststate = {}
  }

  update_physics() {
    //Handle player one
    this.players.self.old_state.pos = pos(this.players.self.pos)
    const new_dir = this.process_input(this.players.self)
    this.players.self.pos = v_add(this.players.self.old_state.pos, new_dir)

    //Handle player two
    this.players.other.old_state.pos = pos(this.players.other.pos)
    const other_new_dir = this.process_input(this.players.other)
    this.players.other.pos = v_add(this.players.other.old_state.pos, other_new_dir)

    //Keep the physics position in the world
    this.check_collision(this.players.self)
    this.check_collision(this.players.other)

    this.players.self.inputs = [] //we have cleared the input buffer, so remove this
    this.players.other.inputs = [] //we have cleared the input buffer, so remove this
  }

  server_update() {
    //Update the state of our local clock to match the timer
    this.server_time = this.local_time

    //Make a snapshot of the current state, for updating the clients
    this.laststate = {
      hp: this.players.self.pos, //'host position', the game creators position
      cp: this.players.other.pos, //'client position', the person that joined, their position
      his: this.players.self.last_input_seq, //'host input sequence', the last input we processed for the host
      cis: this.players.other.last_input_seq, //'client input sequence', the last input we processed for the client
      t: this.server_time, // our current local time on the server
    }
    // console.log('self ', this.players.self.last_input_seq)
    // console.log('other ', this.players.other.last_input_seq)
    //Send the snapshot to the 'host' player
    if (this.players.self.socket) {
      this.players.self.emit('onserverupdate', this.laststate)
    }

    //Send the snapshot to the 'client' player
    if (this.players.other.socket) {
      this.players.other.emit('onserverupdate', this.laststate)
    }
  }

  stop_update() {
    this.cancelAnimationFrame(this.updateid)
  }

  handle_server_input(client: Socket, input: string[], input_time: number, input_seq: number) {
    //Fetch which client this refers to out of the two
    const item = { inputs: input, time: input_time, seq: input_seq }
    //Store the input on the player instance for processing in the physics loop
    if (client.data.userid == this.players.self.socket?.data.userid) {
      this.players.self.inputs.push(item)
    } else {
      this.players.other.inputs.push(item)
    }
  }
}
