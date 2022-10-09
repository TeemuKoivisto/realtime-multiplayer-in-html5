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

  requestAnimationFrame = (callback: (deltatime: number) => void, element?: HTMLElement) => {
    if (typeof window !== 'undefined') {
      const frame_time = 60 / 1000
      return window.requestAnimationFrame(callback)
    } else {
      let lastTime = 0
      const frame_time = 45 //on server we run at 45ms, 22hz
      const currTime = Date.now(),
        timeToCall = Math.max(0, frame_time - (currTime - lastTime))
      const id = setTimeout(() => {
        callback(currTime + timeToCall)
      }, timeToCall)
      lastTime = currTime + timeToCall
      return id
    }
  }

  cancelAnimationFrame = (updateid: number) => {
    if (typeof window !== 'undefined') {
      window.cancelAnimationFrame(updateid)
    } else {
      clearTimeout(updateid)
    }
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

  update(t: number) {
    //Work out the delta time
    this.dt = this.lastframetime ? toFixed((t - this.lastframetime) / 1000.0) : 0.016

    //Store the last frame time
    this.lastframetime = t

    //Update the game specifics
    this.server_update()

    //schedule the next update
    this.requestAnimationFrame(this.update.bind(this))
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

    //Send the snapshot to the 'host' player
    if (this.players.self.socket) {
      this.players.self.socket.emit('onserverupdate', this.laststate)
    }

    //Send the snapshot to the 'client' player
    if (this.players.other.socket) {
      this.players.other.socket.emit('onserverupdate', this.laststate)
    }
  }

  stop_update() {
    this.cancelAnimationFrame(this.updateid)
  }

  handle_server_input(client: Client, input: string[], input_time: number, input_seq: number) {
    //Fetch which client this refers to out of the two
    const player_client =
      client.userid == this.players.self.socket?.data.userid
        ? this.players.self
        : this.players.other

    //Store the input on the player instance for processing in the physics loop
    player_client.inputs.push({ inputs: input, time: input_time, seq: input_seq })
  }
}
